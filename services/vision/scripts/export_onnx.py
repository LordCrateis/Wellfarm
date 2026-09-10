#!/usr/bin/env python3
"""Export the trained crop-head checkpoint as one portable ONNX model."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from torch import nn

from train_crop_heads import CropHeadEfficientNetV2S


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_RUN = REPO_ROOT / "models/artifacts/wellfarm-v1/efficientnetv2-s-crop-heads-field-aug-v1"
DEFAULT_MODEL = REPO_ROOT / "models/releases/wellfarm-vision-v1.onnx"
DEFAULT_MANIFEST = REPO_ROOT / "models/releases/wellfarm-vision-v1.json"


class PortableCropHeads(nn.Module):
    """Export-friendly graph with one named output per crop."""

    def __init__(self, model: CropHeadEfficientNetV2S, crops: list[str]) -> None:
        super().__init__()
        self.features = model.features
        self.avgpool = model.avgpool
        self.dropout = model.dropout
        self.heads = model.heads
        self.crops = crops

    def forward(self, images: torch.Tensor) -> tuple[torch.Tensor, ...]:
        features = self.features(images)
        embeddings = self.dropout(self.avgpool(features).flatten(1))
        return tuple(self.heads[crop](embeddings) for crop in self.crops)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def export(run_dir: Path, model_path: Path, manifest_path: Path) -> dict:
    config = json.loads((run_dir / "run_config.json").read_text(encoding="utf-8"))
    labels = json.loads((run_dir / "label_map.json").read_text(encoding="utf-8"))["labels"]
    checkpoint = torch.load(run_dir / "best.pt", map_location="cpu", weights_only=False)
    trained = CropHeadEfficientNetV2S(labels)
    trained.load_state_dict(checkpoint["model_state"])
    trained.eval()

    crops = list(trained.crop_indices)
    portable = PortableCropHeads(trained, crops).eval()
    image_size = int(config["image_size"])
    example = torch.randn(1, 3, image_size, image_size)
    output_names = [f"logits_{crop}" for crop in crops]
    model_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        portable,
        example,
        model_path,
        input_names=["images"],
        output_names=output_names,
        dynamic_axes={
            "images": {0: "batch"},
            **{name: {0: "batch"} for name in output_names},
        },
        opset_version=18,
        do_constant_folding=True,
        dynamo=False,
    )

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    with torch.inference_mode():
        expected = portable(example)
    actual = session.run(None, {"images": example.numpy()})
    max_difference = max(
        float(np.max(np.abs(wanted.numpy() - received)))
        for wanted, received in zip(expected, actual)
    )
    if max_difference > 1e-4:
        raise RuntimeError(f"ONNX parity check failed: max difference {max_difference}")

    crop_labels = {
        crop: [labels[index] for index in trained.crop_indices[crop]]
        for crop in crops
    }
    manifest = {
        "format": "onnx",
        "version": run_dir.name,
        "architecture": config["architecture"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "file": model_path.name,
        "bytes": model_path.stat().st_size,
        "sha256": sha256(model_path),
        "download_url": "https://api.github.com/repos/LordCrateis/Wellfarm/releases/assets/555599275",
        "input": {
            "name": "images",
            "image_size": image_size,
            "resize_size": round(image_size * 1.14),
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        },
        "crops": {
            crop: {"output": output_name, "labels": crop_labels[crop]}
            for crop, output_name in zip(crops, output_names)
        },
        "validation": {"max_absolute_logit_difference": max_difference},
    }
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    arguments = parser.parse_args()
    print(json.dumps(export(arguments.run_dir.resolve(), arguments.model.resolve(), arguments.manifest.resolve()), indent=2))
