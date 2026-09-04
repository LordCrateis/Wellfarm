#!/usr/bin/env python3
"""Prove crop-head initialization preserves global crop-filtered logits."""

from __future__ import annotations

import json

import torch
from PIL import Image

from train_crop_heads import CropHeadEfficientNetV2S, DEFAULT_GLOBAL_RUN, initialize_from_global_checkpoint
from train_model import DEFAULT_DATASET, REPO_ROOT, build_model, make_transforms, read_manifest


@torch.inference_mode()
def main() -> int:
    label_map = json.loads((DEFAULT_GLOBAL_RUN / "label_map.json").read_text(encoding="utf-8"))
    labels: list[str] = label_map["labels"]
    checkpoint_path = DEFAULT_GLOBAL_RUN / "best.pt"
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)

    global_model = build_model(len(labels), pretrained=False)
    global_model.load_state_dict(checkpoint["model_state"])
    global_model.eval()
    crop_model = CropHeadEfficientNetV2S(labels)
    initialize_from_global_checkpoint(crop_model, checkpoint_path, labels, torch.device("cpu"))
    crop_model.eval()

    samples_by_crop = {}
    for sample in read_manifest(DEFAULT_DATASET / "validation.csv"):
        samples_by_crop.setdefault(sample.crop, sample)
    _train_transform, transform = make_transforms(96)
    crops = sorted(samples_by_crop)
    tensors = []
    for crop in crops:
        with Image.open(REPO_ROOT / samples_by_crop[crop].path) as image:
            tensors.append(transform(image.convert("RGB")))
    images = torch.stack(tensors)
    global_logits = global_model(images)
    crop_logits = crop_model(images, crops)

    maximum_difference = 0.0
    matching_predictions = True
    for row, crop in enumerate(crops):
        indices = crop_model.crop_indices[crop]
        global_crop_logits = global_logits[row, indices]
        crop_specific_logits = crop_logits[row, indices]
        maximum_difference = max(
            maximum_difference,
            float((global_crop_logits - crop_specific_logits).abs().max().item()),
        )
        matching_predictions = matching_predictions and (
            int(global_crop_logits.argmax().item()) == int(crop_specific_logits.argmax().item())
        )
    result = {
        "crops_checked": crops,
        "maximum_logit_difference": maximum_difference,
        "crop_filtered_predictions_match": matching_predictions,
    }
    print(json.dumps(result, indent=2, sort_keys=True))
    if maximum_difference > 1e-5 or not matching_predictions:
        raise SystemExit("Crop-head initialization does not preserve the global model.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
