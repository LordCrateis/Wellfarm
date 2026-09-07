"""Classify one stored image using the same preprocessing as held-out evaluation."""
import argparse
import json
from pathlib import Path
import warnings

import torch
from PIL import Image, ImageOps
from train_crop_heads import CropHeadEfficientNetV2S
from train_model import make_transforms


def predict(run_dir: Path, image_path: Path, crop: str) -> dict:
    torch.set_num_threads(2)
    config = json.loads((run_dir / "run_config.json").read_text())
    labels = json.loads((run_dir / "label_map.json").read_text())["labels"]
    model = CropHeadEfficientNetV2S(labels)
    crop = crop.lower()
    if crop not in model.crop_indices:
        raise ValueError("Unsupported crop")
    checkpoint = torch.load(run_dir / "best.pt", map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["model_state"])
    model.eval()
    _, transform = make_transforms(config["image_size"])
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(image_path) as source:
            if source.format not in ("JPEG", "PNG"):
                raise ValueError("Only JPEG and PNG images are supported")
            image = ImageOps.exif_transpose(source).convert("RGB")
            small = min(image.size) < 224
            tensor = transform(image).unsqueeze(0)
    with torch.inference_mode():
        scores = model(tensor, [crop]).softmax(dim=1)[0]
        values, indices = scores.topk(min(3, len(model.crop_indices[crop])))
    candidates = [
        {"condition": labels[index].split("__", 1)[1].replace("_", " ").capitalize(),
         "confidence": float(value)}
        for value, index in zip(values.tolist(), indices.tolist())
    ]
    return {"candidates": candidates, "lowConfidence": values[0].item() < 0.7
            or (values[0] - values[1]).item() < 0.15,
            "smallImage": small, "version": run_dir.name}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--crop", required=True)
    args = parser.parse_args()
    print(json.dumps(predict(args.run_dir, args.image, args.crop), allow_nan=False))
