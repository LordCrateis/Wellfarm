#!/usr/bin/env python3
"""Build normalized Wellfarm image manifests from local raw datasets.

The script is dependency-free. It does not modify source images and does not
copy them unless --materialize is explicitly requested.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
DEFAULT_SEED = "wellfarm-v1"
SPLIT_RATIOS = (0.70, 0.15, 0.15)
FIELD_HOLDOUT_SOURCE = "plantdoc"
MODEL_SCOPE_PATH = Path(__file__).resolve().parents[1] / "config" / "model-v1.json"


@dataclass(frozen=True)
class Candidate:
    path: Path
    source: str
    source_class: str
    crop: str
    condition: str
    category: str
    source_partition: str = "unspecified"

    @property
    def label(self) -> str:
        return f"{self.crop}__{self.condition}"


@dataclass(frozen=True)
class Record:
    image_id: str
    sha256: str
    path: str
    source: str
    source_class: str
    crop: str
    condition: str
    label: str
    category: str
    source_partition: str
    split: str


LABEL_CATEGORIES = {
    "healthy": "healthy",
    "herbicide_damage": "abiotic",
    "dried_leaf": "abiotic",
    "fall_armyworm": "pest",
    "jassid_damage": "pest",
    "mawa": "pest",
    "mites": "pest",
    "two_spotted_spider_mite": "pest",
}


def category_for(condition: str) -> str:
    return LABEL_CATEGORIES.get(condition, "disease")


def image_files(directory: Path) -> Iterator[Path]:
    if not directory.exists():
        return
    for path in sorted(directory.rglob("*"), key=lambda item: item.as_posix().casefold()):
        if path.is_file() and path.suffix.casefold() in IMAGE_EXTENSIONS and path.stat().st_size > 0:
            yield path


def candidates_from_class_directories(
    source: str,
    root: Path,
    classes: dict[str, tuple[str, str]],
    source_partition: str = "unspecified",
) -> Iterator[Candidate]:
    for source_class, (crop, condition) in classes.items():
        class_directory = root / source_class
        for path in image_files(class_directory):
            yield Candidate(
                path=path,
                source=source,
                source_class=source_class,
                crop=crop,
                condition=condition,
                category=category_for(condition),
                source_partition=source_partition,
            )


def collect_cotton(raw: Path) -> Iterator[Candidate]:
    root = raw / "cotton_sar_cld" / "Cotton Leaf Disease Detection Dataset" / "Original Dataset"
    classes = {
        "Bacterial Blight": ("cotton", "bacterial_blight"),
        "Curl Virus": ("cotton", "leaf_curl_virus"),
        "Healthy Leaf": ("cotton", "healthy"),
        "Herbicide Growth Damage": ("cotton", "herbicide_damage"),
        "Leaf Hopper Jassids": ("cotton", "jassid_damage"),
        "Leaf Redding": ("cotton", "leaf_reddening"),
        "Leaf Variegation": ("cotton", "leaf_variegation"),
    }
    yield from candidates_from_class_directories("cotton_sar_cld", root, classes)


def collect_maize(raw: Path) -> Iterator[Candidate]:
    root = raw / "maize_mld" / "Maize dataset"
    classes = {
        "Fall_Armyworm": ("maize", "fall_armyworm"),
        "Gray_Spot": ("maize", "gray_leaf_spot"),
        "Healthy": ("maize", "healthy"),
        "Leaf_Blight": ("maize", "leaf_blight"),
    }
    yield from candidates_from_class_directories("maize_mld", root, classes)


def collect_potato(raw: Path) -> Iterator[Candidate]:
    root = raw / "potato_leaf" / "Potato Leaf Disease Dataset"
    classes = {
        "Bacterial Soft Rot": ("potato", "bacterial_soft_rot"),
        "Fungal Late Blight": ("potato", "late_blight"),
        "Healthy": ("potato", "healthy"),
        "Viral Leaf Roll": ("potato", "leaf_roll_virus"),
        "Viral PVX": ("potato", "potato_virus_x"),
        "Viral PVY": ("potato", "potato_virus_y"),
    }
    yield from candidates_from_class_directories("potato_leaf", root, classes)


def collect_rice_field(raw: Path) -> Iterator[Candidate]:
    # Annotation visuals duplicate the source photos and must not enter training.
    root = raw / "rice_field_bd" / "RiceLeafDiseaseBD" / "Original images"
    classes = {
        "Blast": ("rice", "blast"),
        "Brown spot": ("rice", "brown_spot"),
        "Healthy": ("rice", "healthy"),
        "Leaf smut": ("rice", "leaf_smut"),
        "Rice Tungro": ("rice", "tungro"),
        "Sheath blight": ("rice", "sheath_blight"),
    }
    yield from candidates_from_class_directories("rice_field_bd", root, classes)


def collect_rice_sethy(raw: Path) -> Iterator[Candidate]:
    root = raw / "rice_sethy" / "Rice Leaf Disease Images"
    classes = {
        "Bacterialblight": ("rice", "bacterial_blight"),
        "Blast": ("rice", "blast"),
        "Brownspot": ("rice", "brown_spot"),
        "Tungro": ("rice", "tungro"),
    }
    yield from candidates_from_class_directories("rice_sethy", root, classes)


def collect_soybean(raw: Path) -> Iterator[Candidate]:
    root = (
        raw
        / "soybean_multiclass"
        / "Multi-Class Soybean Leaf Disease Dataset Healthy a"
        / "Soyabean leaf desease dataset"
    )
    classes = {
        "Bacterial Blight": ("soybean", "bacterial_blight"),
        "Cercospora Leaf Blight": ("soybean", "cercospora_leaf_blight"),
        "Healthy": ("soybean", "healthy"),
        "Rust": ("soybean", "rust"),
        "Sudden Death Syndrome": ("soybean", "sudden_death_syndrome"),
    }
    yield from candidates_from_class_directories("soybean_multiclass", root, classes)


def collect_sugarcane(raw: Path) -> Iterator[Candidate]:
    root = raw / "sugarcane_disease"
    classes = {
        "Diseases/BrownRust": ("sugarcane", "brown_rust"),
        "Diseases/Mawa": ("sugarcane", "mawa"),
        "Diseases/Mites": ("sugarcane", "mites"),
        "Diseases/RedSpot": ("sugarcane", "red_spot"),
        "Diseases/YellowLeaf": ("sugarcane", "yellow_leaf"),
        "Dried Leaves": ("sugarcane", "dried_leaf"),
        "Healthy Leaves": ("sugarcane", "healthy"),
    }
    yield from candidates_from_class_directories("sugarcane_disease", root, classes)


def collect_tomato(raw: Path) -> Iterator[Candidate]:
    root = raw / "tomato_field" / "Tomato_Leaf_Dataset"
    classes = {
        "Tomato_Early_blight": ("tomato", "early_blight"),
        "Tomato_Healthy": ("tomato", "healthy"),
        "Tomato_leaf_late_blight": ("tomato", "late_blight"),
        "Tomato_leaf_yellow_curl_virus": ("tomato", "yellow_leaf_curl_virus"),
        "Tomato_mold_leaf": ("tomato", "leaf_mold"),
        "Tomato_septora_leaf_spot": ("tomato", "septoria_leaf_spot"),
    }
    yield from candidates_from_class_directories("tomato_field", root, classes)


def collect_wheat(raw: Path) -> Iterator[Candidate]:
    root = raw / "wheat_zenodo"
    prefix_map = {
        "BrownRust": "brown_rust",
        "Healthy": "healthy",
        "Mildew": "powdery_mildew",
        "Septoria": "septoria",
        "YellowRust": "yellow_rust",
    }
    for path in image_files(root):
        match = re.match(r"^([A-Za-z]+)\d", path.stem)
        if not match or match.group(1) not in prefix_map:
            continue
        source_class = match.group(1)
        condition = prefix_map[source_class]
        yield Candidate(path, "wheat_zenodo", source_class, "wheat", condition, category_for(condition))


PLANTVILLAGE_CLASSES = {
    "Corn___Cercospora_leaf_spot Gray_leaf_spot": ("maize", "gray_leaf_spot"),
    "Corn___Common_rust": ("maize", "common_rust"),
    "Corn___healthy": ("maize", "healthy"),
    "Corn___Northern_Leaf_Blight": ("maize", "northern_leaf_blight"),
    "Potato___Early_blight": ("potato", "early_blight"),
    "Potato___healthy": ("potato", "healthy"),
    "Potato___Late_blight": ("potato", "late_blight"),
    "Soybean___healthy": ("soybean", "healthy"),
    "Tomato___Bacterial_spot": ("tomato", "bacterial_spot"),
    "Tomato___Early_blight": ("tomato", "early_blight"),
    "Tomato___healthy": ("tomato", "healthy"),
    "Tomato___Late_blight": ("tomato", "late_blight"),
    "Tomato___Leaf_Mold": ("tomato", "leaf_mold"),
    "Tomato___Septoria_leaf_spot": ("tomato", "septoria_leaf_spot"),
    "Tomato___Spider_mites Two-spotted_spider_mite": ("tomato", "two_spotted_spider_mite"),
    "Tomato___Target_Spot": ("tomato", "target_spot"),
    "Tomato___Tomato_mosaic_virus": ("tomato", "mosaic_virus"),
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": ("tomato", "yellow_leaf_curl_virus"),
}


def collect_plantvillage(raw: Path) -> Iterator[Candidate]:
    root = raw / "plantvillage" / "Plant_leave_diseases_dataset_without_augmentation"
    yield from candidates_from_class_directories("plantvillage", root, PLANTVILLAGE_CLASSES)


PLANTDOC_CLASSES = {
    "Corn Gray leaf spot": ("maize", "gray_leaf_spot"),
    "Corn leaf blight": ("maize", "leaf_blight"),
    "Corn rust leaf": ("maize", "common_rust"),
    "Potato leaf early blight": ("potato", "early_blight"),
    "Potato leaf late blight": ("potato", "late_blight"),
    "Soyabean leaf": ("soybean", "healthy"),
    "Tomato Early blight leaf": ("tomato", "early_blight"),
    "Tomato leaf": ("tomato", "healthy"),
    "Tomato leaf bacterial spot": ("tomato", "bacterial_spot"),
    "Tomato leaf late blight": ("tomato", "late_blight"),
    "Tomato leaf mosaic virus": ("tomato", "mosaic_virus"),
    "Tomato leaf yellow virus": ("tomato", "yellow_leaf_curl_virus"),
    "Tomato mold leaf": ("tomato", "leaf_mold"),
    "Tomato Septoria leaf spot": ("tomato", "septoria_leaf_spot"),
    "Tomato two spotted spider mites leaf": ("tomato", "two_spotted_spider_mite"),
}


def collect_plantdoc(raw: Path) -> Iterator[Candidate]:
    root = raw / "plantdoc" / "PlantDoc-Dataset-master"
    for partition in ("train", "test"):
        yield from candidates_from_class_directories(
            "plantdoc", root / partition, PLANTDOC_CLASSES, source_partition=partition
        )


COLLECTORS: tuple[Callable[[Path], Iterable[Candidate]], ...] = (
    collect_cotton,
    collect_maize,
    collect_potato,
    collect_rice_field,
    collect_rice_sethy,
    collect_soybean,
    collect_sugarcane,
    collect_tomato,
    collect_wheat,
    collect_plantvillage,
    collect_plantdoc,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_hash_cache(path: Path) -> dict[str, dict[str, object]]:
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def write_hash_cache(path: Path, cache: dict[str, dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, sort_keys=True) + "\n", encoding="utf-8")


def deterministic_order(seed: str, label: str, value: str) -> str:
    return hashlib.sha256(f"{seed}:{label}:{value}".encode("utf-8")).hexdigest()


def ratio_counts(total: int, ratios: tuple[float, float, float] = SPLIT_RATIOS) -> tuple[int, int, int]:
    if total <= 0:
        return 0, 0, 0
    if total == 1:
        return 1, 0, 0
    if total == 2:
        return 1, 1, 0
    validation = max(1, round(total * ratios[1]))
    test = max(1, round(total * ratios[2]))
    train = total - validation - test
    if train < 1:
        train = 1
        if validation >= test and validation > 1:
            validation -= 1
        elif test > 1:
            test -= 1
    return train, validation, test


def assign_splits(candidates: list[tuple[Candidate, str]], seed: str) -> dict[str, str]:
    """Assign one split per unique SHA, using PlantDoc as a field holdout when possible."""
    by_label: dict[str, list[tuple[Candidate, str]]] = defaultdict(list)
    for candidate, digest in candidates:
        by_label[candidate.label].append((candidate, digest))

    assignments: dict[str, str] = {}
    for label, items in sorted(by_label.items()):
        holdout = [item for item in items if item[0].source == FIELD_HOLDOUT_SOURCE]
        development = [item for item in items if item[0].source != FIELD_HOLDOUT_SOURCE]

        if holdout and development:
            for _, digest in holdout:
                assignments[digest] = "test"
            ordered = sorted(development, key=lambda item: deterministic_order(seed, label, item[1]))
            validation_count = max(1, round(len(ordered) * 0.15)) if len(ordered) > 1 else 0
            for index, (_, digest) in enumerate(ordered):
                assignments[digest] = "validation" if index < validation_count else "train"
            continue

        ordered = sorted(items, key=lambda item: deterministic_order(seed, label, item[1]))
        train_count, validation_count, _ = ratio_counts(len(ordered))
        for index, (_, digest) in enumerate(ordered):
            if index < train_count:
                split = "train"
            elif index < train_count + validation_count:
                split = "validation"
            else:
                split = "test"
            assignments[digest] = split
    return assignments


def repo_relative(path: Path, repo_root: Path) -> str:
    return path.resolve().relative_to(repo_root.resolve()).as_posix()


def build_records(
    candidates: Iterable[Candidate],
    repo_root: Path,
    seed: str,
    hash_cache: dict[str, dict[str, object]] | None = None,
) -> tuple[list[Record], dict[str, object]]:
    hash_cache = hash_cache if hash_cache is not None else {}
    by_hash: dict[str, list[Candidate]] = defaultdict(list)
    scanned = 0
    cache_hits = 0
    new_hashes = 0
    for candidate in candidates:
        scanned += 1
        relative_path = repo_relative(candidate.path, repo_root)
        stat = candidate.path.stat()
        cached = hash_cache.get(relative_path)
        if (
            cached
            and cached.get("size") == stat.st_size
            and cached.get("mtime_ns") == stat.st_mtime_ns
            and isinstance(cached.get("sha256"), str)
        ):
            digest = str(cached["sha256"])
            cache_hits += 1
        else:
            digest = sha256_file(candidate.path)
            hash_cache[relative_path] = {
                "size": stat.st_size,
                "mtime_ns": stat.st_mtime_ns,
                "sha256": digest,
            }
            new_hashes += 1
        by_hash[digest].append(candidate)
        if scanned % 5000 == 0:
            print(
                f"Hashed/loaded {scanned} files (cache hits={cache_hits}, new hashes={new_hashes})",
                flush=True,
            )

    conflicts: list[dict[str, object]] = []
    unique: list[tuple[Candidate, str]] = []
    duplicate_files = 0
    for digest, copies in sorted(by_hash.items()):
        labels = sorted({copy.label for copy in copies})
        if len(labels) > 1:
            conflicts.append(
                {
                    "sha256": digest,
                    "labels": labels,
                    "paths": [repo_relative(copy.path, repo_root) for copy in copies],
                }
            )
            continue
        preferred = sorted(
            copies,
            key=lambda copy: (
                copy.source == FIELD_HOLDOUT_SOURCE,
                repo_relative(copy.path, repo_root).casefold(),
            ),
        )[0]
        unique.append((preferred, digest))
        duplicate_files += len(copies) - 1

    assignments = assign_splits(unique, seed)
    records = [
        Record(
            image_id=digest[:20],
            sha256=digest,
            path=repo_relative(candidate.path, repo_root),
            source=candidate.source,
            source_class=candidate.source_class,
            crop=candidate.crop,
            condition=candidate.condition,
            label=candidate.label,
            category=candidate.category,
            source_partition=candidate.source_partition,
            split=assignments[digest],
        )
        for candidate, digest in unique
    ]
    records.sort(key=lambda record: (record.split, record.label, record.source, record.path.casefold()))
    diagnostics = {
        "scanned_candidate_files": scanned,
        "unique_usable_images": len(records),
        "exact_duplicate_files_removed": duplicate_files,
        "conflicting_hash_groups_removed": len(conflicts),
        "hash_cache_hits": cache_hits,
        "new_hashes_computed": new_hashes,
        "conflicts": conflicts,
    }
    return records, diagnostics


def write_csv(path: Path, records: list[Record]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(asdict(records[0]).keys()) if records else [field.name for field in Record.__dataclass_fields__.values()]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(asdict(record) for record in records)


def load_model_scope(path: Path = MODEL_SCOPE_PATH) -> dict[str, object]:
    scope = json.loads(path.read_text(encoding="utf-8"))
    crops = scope.get("supported_crops")
    minimum = scope.get("minimum_images_per_label")
    if not isinstance(crops, list) or not crops or not all(isinstance(crop, str) for crop in crops):
        raise ValueError(f"Invalid supported_crops in {path}")
    if len(crops) != len(set(crops)):
        raise ValueError(f"Duplicate supported crop in {path}")
    if not isinstance(minimum, int) or minimum < 1:
        raise ValueError(f"Invalid minimum_images_per_label in {path}")
    return scope


def validate_model_scope(records: list[Record], scope: dict[str, object]) -> dict[str, object]:
    supported = list(scope["supported_crops"])
    supported_set = set(supported)
    crop_counts = Counter(record.crop for record in records)
    label_counts = Counter(record.label for record in records)
    labels_by_crop: dict[str, set[str]] = defaultdict(set)
    for record in records:
        labels_by_crop[record.crop].add(record.label)

    missing = sorted(supported_set - set(crop_counts))
    unexpected = sorted(set(crop_counts) - supported_set)
    minimum = int(scope["minimum_images_per_label"])
    undercovered = sorted(label for label, count in label_counts.items() if count < minimum)
    if missing or unexpected or undercovered:
        problems = []
        if missing:
            problems.append(f"missing supported crops: {', '.join(missing)}")
        if unexpected:
            problems.append(f"unconfigured crops: {', '.join(unexpected)}")
        if undercovered:
            problems.append(f"labels below {minimum} images: {', '.join(undercovered)}")
        raise ValueError("Model v1 scope validation failed: " + "; ".join(problems))

    return {
        "dataset_version": scope["dataset_version"],
        "model_family": scope["model_family"],
        "minimum_images_per_label": minimum,
        "label_count": len(label_counts),
        "image_count": len(records),
        "crops": {
            crop: {
                "image_count": crop_counts[crop],
                "label_count": len(labels_by_crop[crop]),
            }
            for crop in supported
        },
        "excluded_crops": scope.get("excluded_crops", {}),
    }


def write_outputs(
    output: Path,
    records: list[Record],
    diagnostics: dict[str, object],
    seed: str,
    model_scope: dict[str, object],
) -> None:
    output.mkdir(parents=True, exist_ok=True)
    write_csv(output / "manifest.csv", records)
    for split in ("train", "validation", "test"):
        write_csv(output / f"{split}.csv", [record for record in records if record.split == split])

    labels: dict[str, dict[str, object]] = {}
    for record in records:
        labels.setdefault(
            record.label,
            {
                "crop": record.crop,
                "condition": record.condition,
                "category": record.category,
                "count": 0,
            },
        )["count"] += 1
    (output / "labels.json").write_text(
        json.dumps({"model_scope": model_scope, "labels": labels}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    split_counts = Counter(record.split for record in records)
    source_counts = Counter(record.source for record in records)
    label_counts = Counter(record.label for record in records)
    summary = {
        "version": "wellfarm-v1",
        "seed": seed,
        "split_policy": {
            "field_holdout_source": FIELD_HOLDOUT_SOURCE,
            "default_ratios": {"train": 0.70, "validation": 0.15, "test": 0.15},
            "duplicate_policy": "SHA-256 exact duplicates are retained once and cannot cross splits",
        },
        "counts": {
            "total": len(records),
            "by_split": dict(sorted(split_counts.items())),
            "by_source": dict(sorted(source_counts.items())),
            "by_label": dict(sorted(label_counts.items())),
        },
        "model_scope": model_scope,
        "diagnostics": diagnostics,
        "excluded": {
            "onion_leaf": "Raw files have sample/day groups but no trustworthy class labels.",
            "ip102": "Downloaded archive contains metadata only and no images.",
            "non_target_plantvillage_plantdoc_classes": "Only Wellfarm target crops are mapped.",
            "rice_annotation_visuals": "Visual overlays duplicate originals and are not training inputs.",
        },
    }
    (output / "summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def materialize(records: list[Record], repo_root: Path, output: Path, mode: str) -> None:
    images_root = output / "images"
    for record in records:
        source = repo_root / Path(record.path)
        destination = images_root / record.split / record.label / f"{record.image_id}{source.suffix.casefold()}"
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists():
            continue
        if mode == "hardlink":
            try:
                os.link(source, destination)
            except OSError:
                shutil.copy2(source, destination)
        else:
            shutil.copy2(source, destination)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    script = Path(__file__).resolve()
    default_repo_root = script.parents[3]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=default_repo_root)
    parser.add_argument("--raw", type=Path, help="Raw dataset directory; defaults to <repo>/data/raw")
    parser.add_argument("--output", type=Path, help="Output directory; defaults to <repo>/data/processed/wellfarm-v1")
    parser.add_argument("--seed", default=DEFAULT_SEED)
    parser.add_argument("--materialize", choices=("none", "hardlink", "copy"), default="none")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    repo_root = args.repo_root.resolve()
    raw = (args.raw or repo_root / "data" / "raw").resolve()
    output = (args.output or repo_root / "data" / "processed" / "wellfarm-v1").resolve()
    if not raw.is_dir():
        print(f"Raw dataset directory not found: {raw}", file=sys.stderr)
        return 2

    candidates: list[Candidate] = []
    for collector in COLLECTORS:
        collected = list(collector(raw))
        print(f"{collector.__name__}: {len(collected)} candidates", flush=True)
        candidates.extend(collected)
    if not candidates:
        print("No mapped images were found.", file=sys.stderr)
        return 3

    cache_path = output / "hash-cache.json"
    hash_cache = load_hash_cache(cache_path)
    print(f"Hashing {len(candidates)} candidates and removing exact duplicates...", flush=True)
    records, diagnostics = build_records(candidates, repo_root, args.seed, hash_cache)
    write_hash_cache(cache_path, hash_cache)
    try:
        model_scope = validate_model_scope(records, load_model_scope())
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 4
    write_outputs(output, records, diagnostics, args.seed, model_scope)
    if args.materialize != "none":
        print(f"Materializing split folders using {args.materialize}...")
        materialize(records, repo_root, output, args.materialize)

    counts = Counter(record.split for record in records)
    print(
        f"Prepared {len(records)} unique images: "
        f"train={counts['train']}, validation={counts['validation']}, test={counts['test']}"
    )
    print(f"Manifest: {output / 'manifest.csv'}")
    print(f"Summary:  {output / 'summary.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
