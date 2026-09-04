#!/usr/bin/env python3
"""Create non-destructive PlantDoc review and screened benchmark manifests."""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
DATASET_DIR = REPO_ROOT / "data" / "processed" / "wellfarm-v1"
CONFIG_PATH = REPO_ROOT / "services" / "vision" / "config" / "plantdoc-curation-v1.json"
REVIEW_PATH = DATASET_DIR / "plantdoc-review-v1.csv"
SCREENED_PATH = DATASET_DIR / "plantdoc-screened-test-v1.csv"
SUMMARY_PATH = DATASET_DIR / "plantdoc-curation-v1-summary.json"
VALID_ACTIONS = {"keep", "relabel", "review", "exclude"}


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    temporary.replace(path)


def validate_rules(rules: dict[str, dict[str, str]], source_classes: set[str], labels: set[str]) -> None:
    missing = sorted(source_classes - set(rules))
    extra = sorted(set(rules) - source_classes)
    invalid_actions = sorted(
        source_class for source_class, rule in rules.items() if rule.get("action") not in VALID_ACTIONS
    )
    invalid_labels = sorted(
        source_class for source_class, rule in rules.items() if rule.get("label") not in labels
    )
    if missing or extra or invalid_actions or invalid_labels:
        raise SystemExit(
            "Invalid PlantDoc curation rules: "
            + json.dumps(
                {
                    "missing_source_classes": missing,
                    "extra_source_classes": extra,
                    "invalid_actions": invalid_actions,
                    "labels_absent_from_model": invalid_labels,
                },
                sort_keys=True,
            )
        )


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    rules: dict[str, dict[str, str]] = config["rules"]
    labels_document = json.loads((DATASET_DIR / "labels.json").read_text(encoding="utf-8"))
    labels = set(labels_document["labels"])
    source_rows = [row for row in load_csv(DATASET_DIR / "test.csv") if row["source"] == "plantdoc"]
    source_classes = {row["source_class"] for row in source_rows}
    validate_rules(rules, source_classes, labels)

    review_rows: list[dict[str, str]] = []
    screened_rows: list[dict[str, str]] = []
    counts: Counter[str] = Counter()
    relabel_counts: Counter[str] = Counter()
    original_fields = list(source_rows[0]) if source_rows else []

    for row in sorted(source_rows, key=lambda item: (item["source_class"], item["path"])):
        rule = rules[row["source_class"]]
        action = rule["action"]
        corrected_label = rule["label"]
        corrected_crop, corrected_condition = corrected_label.split("__", 1)
        counts[action] += 1
        if corrected_label != row["label"]:
            relabel_counts[f"{row['label']} -> {corrected_label}"] += 1
        review_rows.append(
            {
                "image_id": row["image_id"],
                "path": row["path"],
                "source_partition": row["source_partition"],
                "source_class": row["source_class"],
                "original_label": row["label"],
                "recommended_label": corrected_label,
                "decision": action,
                "reason": rule["reason"],
                "reviewer_decision": "",
                "reviewer_label": "",
                "reviewer_notes": "",
            }
        )
        if action not in {"keep", "relabel"}:
            continue
        screened = dict(row)
        screened.update(
            {
                "crop": corrected_crop,
                "condition": corrected_condition,
                "label": corrected_label,
                "split": "test",
            }
        )
        screened_rows.append(screened)

    review_fields = [
        "image_id",
        "path",
        "source_partition",
        "source_class",
        "original_label",
        "recommended_label",
        "decision",
        "reason",
        "reviewer_decision",
        "reviewer_label",
        "reviewer_notes",
    ]
    write_csv(REVIEW_PATH, review_rows, review_fields)
    write_csv(SCREENED_PATH, screened_rows, original_fields)
    summary = {
        "version": config["version"],
        "policy": config["policy"],
        "source_images": len(source_rows),
        "screened_benchmark_images": len(screened_rows),
        "counts_by_action": dict(sorted(counts.items())),
        "relabels": dict(sorted(relabel_counts.items())),
        "review_manifest": str(REVIEW_PATH.resolve()),
        "screened_manifest": str(SCREENED_PATH.resolve()),
        "raw_files_modified": False,
        "original_manifests_modified": False,
    }
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
