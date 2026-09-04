#!/usr/bin/env python3
"""Audit Wellfarm's mapped PlantDoc field holdout without modifying data."""

from __future__ import annotations

import csv
import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageOps, UnidentifiedImageError


REPO_ROOT = Path(__file__).resolve().parents[3]
DATASET_DIR = REPO_ROOT / "data" / "processed" / "wellfarm-v1"
RUN_DIR = REPO_ROOT / "models" / "artifacts" / "wellfarm-v1" / "efficientnetv2-s-v1"
OUTPUT_PATH = RUN_DIR / "audits" / "plantdoc.json"
SAMPLE_DIR = RUN_DIR / "audits" / "plantdoc_samples"


def percentile(values: list[int], fraction: float) -> float:
    if not values:
        return 0.0
    position = (len(values) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    weight = position - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def load_per_class(path: Path) -> dict[str, dict[str, Any]]:
    return {
        row["label"]: {
            "precision": float(row["precision"]),
            "recall": float(row["recall"]),
            "f1": float(row["f1"]),
            "support": int(row["support"]),
        }
        for row in load_rows(path)
    }


def write_contact_sheet(label: str, rows: list[dict[str, str]]) -> str:
    """Write a deterministic 12-image visual sample for manual label review."""
    columns, rows_count = 4, 3
    cell_width, cell_height = 240, 190
    title_height = 34
    sheet = Image.new("RGB", (columns * cell_width, title_height + rows_count * cell_height), "white")
    draw = ImageDraw.Draw(sheet)
    draw.text((10, 10), f"{label} ({len(rows)} mapped images)", fill="black")
    if len(rows) <= columns * rows_count:
        selected = rows
    else:
        selected = [
            rows[round(index * (len(rows) - 1) / (columns * rows_count - 1))]
            for index in range(columns * rows_count)
        ]
    for index, row in enumerate(selected):
        with Image.open(REPO_ROOT / row["path"]) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((cell_width - 10, cell_height - 28))
            x = (index % columns) * cell_width + (cell_width - image.width) // 2
            y = title_height + (index // columns) * cell_height + 2
            sheet.paste(image, (x, y))
            filename = Path(row["path"]).name[:34]
            draw.text(((index % columns) * cell_width + 5, y + image.height + 3), filename, fill="black")
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    output = SAMPLE_DIR / f"{label}.jpg"
    sheet.save(output, quality=88)
    return str(output.resolve())


def main() -> int:
    manifest = [row for row in load_rows(DATASET_DIR / "manifest.csv") if row["source"] == "plantdoc"]
    metrics = load_per_class(RUN_DIR / "metrics" / "test_crop_filtered_per_class.csv")
    summary = json.loads((DATASET_DIR / "summary.json").read_text(encoding="utf-8"))

    widths: list[int] = []
    heights: list[int] = []
    byte_sizes: list[int] = []
    modes: Counter[str] = Counter()
    invalid: list[str] = []
    below_224_short_edge = 0
    by_label: dict[str, list[dict[str, str]]] = defaultdict(list)
    by_partition: Counter[str] = Counter()

    for row in manifest:
        by_label[row["label"]].append(row)
        by_partition[row["source_partition"]] += 1
        path = REPO_ROOT / row["path"]
        byte_sizes.append(path.stat().st_size)
        try:
            with Image.open(path) as image:
                image.load()
                widths.append(image.width)
                heights.append(image.height)
                modes[image.mode] += 1
                if min(image.width, image.height) < 224:
                    below_224_short_edge += 1
        except (OSError, UnidentifiedImageError) as error:
            invalid.append(f"{row['path']}: {error}")

    plantdoc_conflicts = []
    for conflict in summary["diagnostics"]["conflicts"]:
        if any("/plantdoc/" in path.replace("\\", "/") for path in conflict["paths"]):
            plantdoc_conflicts.append(conflict)

    widths.sort()
    heights.sort()
    byte_sizes.sort()
    label_report = {}
    for label, rows in sorted(by_label.items()):
        label_report[label] = {
            "images": len(rows),
            "source_classes": sorted({row["source_class"] for row in rows}),
            "source_partitions": dict(sorted(Counter(row["source_partition"] for row in rows).items())),
            "crop_filtered_test": metrics.get(label),
            "visual_sample": write_contact_sheet(label, rows),
        }

    audit = {
        "scope": {
            "unique_mapped_images": len(manifest),
            "mapped_labels": len(by_label),
            "split": sorted({row["split"] for row in manifest}),
            "source_partitions": dict(sorted(by_partition.items())),
        },
        "integrity": {
            "readable_images": len(manifest) - len(invalid),
            "invalid_images": invalid,
            "modes": dict(sorted(modes.items())),
            "width_px": {
                "min": min(widths, default=0),
                "p10": round(percentile(widths, 0.10), 1),
                "median": statistics.median(widths) if widths else 0,
                "p90": round(percentile(widths, 0.90), 1),
                "max": max(widths, default=0),
            },
            "height_px": {
                "min": min(heights, default=0),
                "p10": round(percentile(heights, 0.10), 1),
                "median": statistics.median(heights) if heights else 0,
                "p90": round(percentile(heights, 0.90), 1),
                "max": max(heights, default=0),
            },
            "file_bytes": {
                "min": min(byte_sizes, default=0),
                "median": statistics.median(byte_sizes) if byte_sizes else 0,
                "max": max(byte_sizes, default=0),
            },
            "images_below_224_on_short_edge": below_224_short_edge,
        },
        "contradictory_exact_duplicate_groups_removed": {
            "count": len(plantdoc_conflicts),
            "groups": plantdoc_conflicts,
        },
        "labels": label_report,
        "findings": [
            {
                "severity": "critical",
                "id": "corn-blight-ontology",
                "finding": "PlantDoc Corn leaf blight is currently mapped to maize__leaf_blight, while external PlantDoc literature identifies this class as Northern Leaf Blight.",
                "recommendation": "Remap it to maize__northern_leaf_blight and remove the unsupported duplicate maize blight concept unless another source proves it distinct.",
            },
            {
                "severity": "high",
                "id": "contradictory-duplicates",
                "finding": f"{len(plantdoc_conflicts)} exact-image groups carry conflicting PlantDoc labels; the preparation pipeline correctly removes them.",
                "recommendation": "Keep these files excluded and retain the conflict list as dataset provenance.",
            },
            {
                "severity": "high",
                "id": "tiny-spider-mite-holdout",
                "finding": "Only two unique PlantDoc two-spotted-spider-mite files survive and both are comparison collages rather than clean independent examples.",
                "recommendation": "Exclude both from the benchmark and obtain a larger external field test set.",
            },
            {
                "severity": "high",
                "id": "contaminated-generic-healthy-labels",
                "finding": "Soyabean leaf and Tomato leaf are interpreted as healthy, but deterministic visual samples include symptomatic, yellowing, deficient, and possibly wrong-species leaves.",
                "recommendation": "Do not treat these source folders as clean healthy ground truth without per-image curation.",
            },
            {
                "severity": "high",
                "id": "ambiguous-corn-rust",
                "finding": "PlantDoc Corn rust leaf is mapped to common rust, while the visual sample includes files explicitly named southern rust.",
                "recommendation": "Curate individual images or use an unspecified maize-rust label; do not score the folder as pure common rust.",
            },
            {
                "severity": "medium",
                "id": "web-image-artifacts",
                "finding": "Multiple mapped classes contain comparison collages, infographics, stock-photo watermarks, isolated backgrounds, and inconsistent framing.",
                "recommendation": "Tag these artifacts and keep a clean field-photo benchmark separate from a broad web-image stress test.",
            },
        ],
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(audit, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(audit, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
