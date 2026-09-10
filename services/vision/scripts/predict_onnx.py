#!/usr/bin/env python3
"""Classify a crop image with the portable Wellfarm ONNX model."""

from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps


def prepare_image(image_path: Path, manifest: dict) -> tuple[np.ndarray, bool]:
    settings = manifest["input"]
    target = int(settings["image_size"])
    resize = int(settings["resize_size"])
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        with Image.open(image_path) as source:
            if source.format not in ("JPEG", "PNG"):
                raise ValueError("Only JPEG and PNG images are supported")
            image = ImageOps.exif_transpose(source).convert("RGB")
            small = min(image.size) < 224
            width, height = image.size
            if width <= height:
                resized_size = (resize, int(resize * height / width))
            else:
                resized_size = (int(resize * width / height), resize)
            resized = image.resize(resized_size, Image.Resampling.BILINEAR)
            left = round((resized.width - target) / 2)
            top = round((resized.height - target) / 2)
            cropped = resized.crop((left, top, left + target, top + target))
            pixels = np.asarray(cropped, dtype=np.float32) / 255.0
    mean = np.asarray(settings["mean"], dtype=np.float32)
    std = np.asarray(settings["std"], dtype=np.float32)
    normalized = (pixels - mean) / std
    return np.transpose(normalized, (2, 0, 1))[None, ...], small


def predict(model_path: Path, manifest_path: Path, image_path: Path, crop: str) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    crop = crop.lower()
    crop_config = manifest["crops"].get(crop)
    if not crop_config:
        raise ValueError("Unsupported crop")
    tensor, small = prepare_image(image_path, manifest)
    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    logits = session.run([crop_config["output"]], {manifest["input"]["name"]: tensor})[0][0]
    probabilities = np.exp(logits - np.max(logits))
    probabilities /= probabilities.sum()
    top = np.argsort(probabilities)[::-1][: min(3, len(probabilities))]
    candidates = [
        {
            "condition": crop_config["labels"][index].split("__", 1)[1].replace("_", " ").capitalize(),
            "confidence": float(probabilities[index]),
        }
        for index in top
    ]
    gap = probabilities[top[0]] - probabilities[top[1]] if len(top) > 1 else 1.0
    return {
        "candidates": candidates,
        "lowConfidence": float(probabilities[top[0]]) < 0.7 or float(gap) < 0.15,
        "smallImage": small,
        "version": manifest["version"],
        "runtime": "onnxruntime",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--crop", required=True)
    arguments = parser.parse_args()
    print(json.dumps(predict(arguments.model, arguments.manifest, arguments.image, arguments.crop), allow_nan=False))
