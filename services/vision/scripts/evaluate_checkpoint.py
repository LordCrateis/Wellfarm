#!/usr/bin/env python3
"""Evaluate a cached Wellfarm checkpoint with farmer-provided crop filtering."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch import nn

from train_model import (
    DEFAULT_DATASET,
    DEFAULT_OUTPUT,
    ManifestDataset,
    build_model,
    class_weights,
    evaluate,
    make_loader,
    make_transforms,
    read_manifest,
    utc_now,
    write_evaluation,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-name", default="efficientnetv2-s-v1")
    parser.add_argument("--checkpoint", choices=("best.pt", "last.pt"), default="best.pt")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    args = parser.parse_args()

    run_dir = args.output_dir / args.run_name
    config = json.loads((run_dir / "run_config.json").read_text(encoding="utf-8"))
    label_document = json.loads((run_dir / "label_map.json").read_text(encoding="utf-8"))
    labels: list[str] = label_document["labels"]
    label_to_index: dict[str, int] = label_document["label_to_index"]
    samples = read_manifest(args.dataset_dir / "test.csv")

    if args.device == "auto":
        args.device = "cuda" if torch.cuda.is_available() else "cpu"
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA was requested but is not available.")
    device = torch.device(args.device)

    _train_transform, evaluation_transform = make_transforms(int(config["image_size"]))
    dataset = ManifestDataset(samples, label_to_index, evaluation_transform)
    # make_loader only requires these attributes from its namespace argument.
    args.seed = int(config["seed"])
    loader = make_loader(dataset, args, shuffle=False)

    model = build_model(len(labels), pretrained=False).to(device)
    checkpoint_path = run_dir / args.checkpoint
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state"])
    criterion = nn.CrossEntropyLoss(weight=class_weights(samples, labels, device), label_smoothing=0.05)

    summary, confusion, per_class = evaluate(
        model,
        loader,
        criterion,
        device,
        labels,
        restrict_to_crop=True,
    )
    summary.update(
        {
            "checkpoint": args.checkpoint,
            "checkpoint_best_validation_macro_f1": checkpoint.get("best_macro_f1"),
            "evaluated_at": utc_now(),
            "selection_rule": "highest-scoring labels belonging to the farmer-provided crop",
        }
    )
    write_evaluation(run_dir, "test_crop_filtered", summary, confusion, per_class, labels)
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
