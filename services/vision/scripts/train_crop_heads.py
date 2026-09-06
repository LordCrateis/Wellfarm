#!/usr/bin/env python3
"""Fine-tune one shared EfficientNetV2-S backbone with crop-specific heads."""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import random
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageEnhance
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_v2_s

from train_model import (
    DEFAULT_DATASET,
    DEFAULT_OUTPUT,
    IMAGENET_MEAN,
    IMAGENET_STD,
    ManifestDataset,
    append_jsonl,
    atomic_json,
    balanced_subset,
    class_weights,
    make_loader,
    make_transforms,
    metrics_from_confusion,
    read_manifest,
    restore_checkpoint,
    save_checkpoint,
    seed_everything,
    utc_now,
    write_evaluation,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_GLOBAL_RUN = DEFAULT_OUTPUT / "efficientnetv2-s-v1"


class RandomShadow:
    """Darken a random half-plane to mimic uneven field lighting."""

    def __init__(self, probability: float = 0.25, minimum_brightness: float = 0.45) -> None:
        self.probability = probability
        self.minimum_brightness = minimum_brightness

    def __call__(self, image: Image.Image) -> Image.Image:
        if random.random() >= self.probability:
            return image
        from PIL import ImageDraw

        width, height = image.size
        left = random.randint(0, height)
        right = random.randint(0, height)
        mask = Image.new("L", image.size, 0)
        ImageDraw.Draw(mask).polygon(
            [(0, left), (width, right), (width, height), (0, height)],
            fill=random.randint(120, 230),
        )
        darkened = ImageEnhance.Brightness(image).enhance(
            random.uniform(self.minimum_brightness, 0.80)
        )
        return Image.composite(darkened, image, mask)


class RandomJpegCompression:
    """Round-trip a PIL image through JPEG to simulate phone uploads."""

    def __init__(self, probability: float = 0.18, quality: tuple[int, int] = (35, 85)) -> None:
        self.probability = probability
        self.quality = quality

    def __call__(self, image: Image.Image) -> Image.Image:
        if random.random() >= self.probability:
            return image
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=random.randint(*self.quality))
        buffer.seek(0)
        with Image.open(buffer) as compressed:
            return compressed.convert("RGB").copy()


def make_field_transforms(image_size: int) -> tuple[transforms.Compose, transforms.Compose]:
    """Build harder, phone-like training transforms and an unchanged evaluator."""

    _basic_train, evaluation = make_transforms(image_size)
    training = transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size, scale=(0.55, 1.0), ratio=(0.65, 1.45)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomApply(
                [transforms.RandomPerspective(distortion_scale=0.25, p=1.0)], p=0.25
            ),
            transforms.RandomRotation(18),
            RandomShadow(),
            transforms.ColorJitter(
                brightness=0.32, contrast=0.32, saturation=0.25, hue=0.04
            ),
            transforms.RandomGrayscale(p=0.03),
            transforms.RandomApply(
                [transforms.GaussianBlur(kernel_size=5, sigma=(0.1, 2.0))], p=0.18
            ),
            transforms.RandomAutocontrast(p=0.12),
            RandomJpegCompression(),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
            transforms.RandomErasing(
                p=0.20, scale=(0.02, 0.12), ratio=(0.3, 3.3), value=0
            ),
        ]
    )
    return training, evaluation


def crop_label_indices(labels: list[str]) -> dict[str, list[int]]:
    result: dict[str, list[int]] = defaultdict(list)
    for index, label in enumerate(labels):
        if "__" not in label:
            raise ValueError(f"Label must use crop__condition format: {label}")
        crop, _condition = label.split("__", 1)
        result[crop].append(index)
    if not result:
        raise ValueError("At least one label is required.")
    return dict(sorted(result.items()))


class CropHeadEfficientNetV2S(nn.Module):
    """Shared visual features with one condition classifier per known crop."""

    def __init__(self, labels: list[str]) -> None:
        super().__init__()
        base = efficientnet_v2_s(weights=None)
        self.features = base.features
        self.avgpool = base.avgpool
        self.dropout = base.classifier[0]
        input_features = base.classifier[1].in_features
        self.labels = labels
        self.crop_indices = crop_label_indices(labels)
        self.heads = nn.ModuleDict(
            {
                crop: nn.Linear(input_features, len(indices))
                for crop, indices in self.crop_indices.items()
            }
        )

    def forward(self, images: torch.Tensor, crops: list[str] | tuple[str, ...]) -> torch.Tensor:
        features = self.features(images)
        embeddings = self.avgpool(features).flatten(1)
        embeddings = self.dropout(embeddings)
        logits = embeddings.new_full(
            (embeddings.shape[0], len(self.labels)),
            torch.finfo(embeddings.dtype).min,
        )
        for crop, global_indices in self.crop_indices.items():
            positions = [index for index, sample_crop in enumerate(crops) if sample_crop == crop]
            if not positions:
                continue
            position_tensor = torch.tensor(positions, dtype=torch.long, device=embeddings.device)
            index_tensor = torch.tensor(global_indices, dtype=torch.long, device=embeddings.device)
            local_logits = self.heads[crop](embeddings.index_select(0, position_tensor))
            logits[position_tensor[:, None], index_tensor[None, :]] = local_logits
        unknown = sorted(set(crops) - set(self.crop_indices))
        if unknown:
            raise ValueError(f"No classifier head exists for crops: {unknown}")
        return logits


def initialize_from_global_checkpoint(
    model: CropHeadEfficientNetV2S,
    checkpoint_path: Path,
    checkpoint_labels: list[str],
    device: torch.device,
) -> None:
    if checkpoint_labels != model.labels:
        raise SystemExit("Global checkpoint labels do not exactly match crop-head labels.")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    state: dict[str, torch.Tensor] = checkpoint["model_state"]
    feature_state = {
        key.removeprefix("features."): value
        for key, value in state.items()
        if key.startswith("features.")
    }
    model.features.load_state_dict(feature_state)
    global_weight = state["classifier.1.weight"]
    global_bias = state["classifier.1.bias"]
    with torch.no_grad():
        for crop, indices in model.crop_indices.items():
            index_tensor = torch.tensor(indices, dtype=torch.long, device=global_weight.device)
            model.heads[crop].weight.copy_(global_weight.index_select(0, index_tensor))
            model.heads[crop].bias.copy_(global_bias.index_select(0, index_tensor))


def initialize_from_crop_head_checkpoint(
    model: CropHeadEfficientNetV2S,
    checkpoint_path: Path,
    device: torch.device,
) -> float:
    """Load an existing crop-head winner and return its validation threshold."""

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state"])
    return float(checkpoint.get("best_macro_f1", -1.0))


def set_phase(model: CropHeadEfficientNetV2S, phase: str) -> None:
    for parameter in model.features.parameters():
        parameter.requires_grad = phase == "fine_tune"
    for parameter in model.heads.parameters():
        parameter.requires_grad = True


def make_optimizer(model: nn.Module, phase: str, head_lr: float, fine_tune_lr: float) -> torch.optim.Optimizer:
    return torch.optim.AdamW(
        (parameter for parameter in model.parameters() if parameter.requires_grad),
        lr=head_lr if phase == "head" else fine_tune_lr,
        weight_decay=1e-4,
    )


def phase_for_epoch(epoch: int, head_epochs: int) -> str:
    return "head" if epoch < head_epochs else "fine_tune"


def crop_safe_permutation(crops: list[str] | tuple[str, ...], device: torch.device) -> torch.Tensor:
    """Shuffle examples only against examples of the same crop."""

    permutation = torch.arange(len(crops), device=device)
    grouped: dict[str, list[int]] = defaultdict(list)
    for index, crop in enumerate(crops):
        grouped[crop].append(index)
    for positions in grouped.values():
        position_tensor = torch.tensor(positions, dtype=torch.long, device=device)
        shuffled = position_tensor[torch.randperm(len(positions), device=device)]
        permutation[position_tensor] = shuffled
    return permutation


def apply_crop_safe_batch_mix(
    images: torch.Tensor,
    targets: torch.Tensor,
    crops: list[str] | tuple[str, ...],
    probability: float,
    mixup_alpha: float,
    cutmix_alpha: float,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    """Apply MixUp or CutMix without ever combining different crop species."""

    if probability <= 0 or random.random() >= probability:
        return images, targets, targets, 1.0
    permutation = crop_safe_permutation(crops, images.device)
    if random.random() < 0.5:
        mix = float(np.random.beta(mixup_alpha, mixup_alpha))
        return (
            mix * images + (1.0 - mix) * images[permutation],
            targets,
            targets[permutation],
            mix,
        )

    mix = float(np.random.beta(cutmix_alpha, cutmix_alpha))
    height, width = images.shape[-2:]
    cut_ratio = math.sqrt(1.0 - mix)
    cut_width, cut_height = round(width * cut_ratio), round(height * cut_ratio)
    center_x, center_y = random.randrange(width), random.randrange(height)
    x1, x2 = max(center_x - cut_width // 2, 0), min(center_x + cut_width // 2, width)
    y1, y2 = max(center_y - cut_height // 2, 0), min(center_y + cut_height // 2, height)
    mixed = images.clone()
    mixed[:, :, y1:y2, x1:x2] = images[permutation, :, y1:y2, x1:x2]
    mix = 1.0 - ((x2 - x1) * (y2 - y1) / (width * height))
    return mixed, targets, targets[permutation], mix


def train_epoch(
    model: CropHeadEfficientNetV2S,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    epoch: int,
    starting_batch: int,
    checkpoint_every: int,
    checkpoint_path: Path,
    phase: str,
    best_macro_f1: float,
    stale_epochs: int,
    progress_path: Path,
    batch_mix_probability: float,
    mixup_alpha: float,
    cutmix_alpha: float,
) -> float:
    model.train()
    if phase == "head":
        model.features.eval()
    running_loss = 0.0
    processed = 0
    total_batches = len(loader)
    started = time.monotonic()

    for batch_index, (images, targets, crops, _sources) in enumerate(loader):
        if batch_index < starting_batch:
            continue
        images = images.to(device, non_blocking=device.type == "cuda")
        targets = targets.to(device, non_blocking=device.type == "cuda")
        images, targets_a, targets_b, mix = apply_crop_safe_batch_mix(
            images,
            targets,
            crops,
            batch_mix_probability,
            mixup_alpha,
            cutmix_alpha,
        )
        optimizer.zero_grad(set_to_none=True)
        logits = model(images, crops)
        loss = mix * criterion(logits, targets_a) + (1.0 - mix) * criterion(logits, targets_b)
        loss.backward()
        optimizer.step()

        batch_size = targets.size(0)
        running_loss += float(loss.item()) * batch_size
        processed += batch_size
        next_batch = batch_index + 1
        if next_batch % checkpoint_every == 0:
            save_checkpoint(
                checkpoint_path,
                model,
                optimizer,
                epoch,
                next_batch,
                phase,
                best_macro_f1,
                stale_epochs,
            )
            elapsed = max(time.monotonic() - started, 0.001)
            completed_batches = max(next_batch - starting_batch, 1)
            remaining = elapsed / completed_batches * (total_batches - next_batch)
            atomic_json(
                progress_path,
                {
                    "status": "training",
                    "updated_at": utc_now(),
                    "epoch": epoch + 1,
                    "batch": next_batch,
                    "batches_in_epoch": total_batches,
                    "phase": phase,
                    "loss_so_far": running_loss / max(processed, 1),
                    "estimated_seconds_remaining_in_epoch": round(remaining),
                },
            )
            print(
                f"epoch={epoch + 1} batch={next_batch}/{total_batches} "
                f"loss={running_loss / max(processed, 1):.4f}",
                flush=True,
            )
    return running_loss / max(processed, 1)


@torch.inference_mode()
def evaluate_crop_heads(
    model: CropHeadEfficientNetV2S,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    labels: list[str],
) -> tuple[dict[str, Any], np.ndarray, list[dict[str, Any]]]:
    model.eval()
    confusion = np.zeros((len(labels), len(labels)), dtype=np.int64)
    losses = 0.0
    sample_count = 0
    top3_correct = 0
    groups: dict[str, list[int]] = defaultdict(lambda: [0, 0])

    for images, targets, crops, sources in loader:
        images = images.to(device, non_blocking=device.type == "cuda")
        targets = targets.to(device, non_blocking=device.type == "cuda")
        logits = model(images, crops)
        loss = criterion(logits, targets)
        predictions = logits.argmax(dim=1)
        top3 = logits.topk(min(3, len(labels)), dim=1).indices
        top3_correct += int((top3 == targets.unsqueeze(1)).any(dim=1).sum().item())
        losses += float(loss.item()) * targets.size(0)
        sample_count += targets.size(0)
        true_values = targets.cpu().numpy()
        predicted_values = predictions.cpu().numpy()
        np.add.at(confusion, (true_values, predicted_values), 1)
        for true_value, predicted_value, crop, source in zip(true_values, predicted_values, crops, sources):
            for group in (f"crop:{crop}", f"source:{source}"):
                groups[group][1] += 1
                if true_value == predicted_value:
                    groups[group][0] += 1

    summary = metrics_from_confusion(confusion)
    summary.update(
        {
            "loss": losses / max(sample_count, 1),
            "top3_accuracy": top3_correct / max(sample_count, 1),
            "samples": sample_count,
            "architecture": "shared_efficientnetv2_s_with_crop_specific_heads",
            "groups": {
                group: {"accuracy": correct / max(total, 1), "samples": total}
                for group, (correct, total) in sorted(groups.items())
            },
        }
    )
    per_class = []
    true_positive = np.diag(confusion).astype(np.float64)
    support = confusion.sum(axis=1).astype(np.float64)
    predicted = confusion.sum(axis=0).astype(np.float64)
    precision = np.divide(true_positive, predicted, out=np.zeros_like(true_positive), where=predicted > 0)
    recall = np.divide(true_positive, support, out=np.zeros_like(true_positive), where=support > 0)
    f1 = np.divide(2 * precision * recall, precision + recall, out=np.zeros_like(precision), where=(precision + recall) > 0)
    for index, label in enumerate(labels):
        per_class.append(
            {
                "label": label,
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
        )
    for internal_key in ("precision", "recall", "f1", "support"):
        del summary[internal_key]
    return summary, confusion, per_class


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-name", default="efficientnetv2-s-crop-heads-v1")
    parser.add_argument("--global-run-dir", type=Path, default=DEFAULT_GLOBAL_RUN)
    parser.add_argument("--init-crop-head-run-dir", type=Path, default=None)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--head-epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--workers", type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument("--head-lr", type=float, default=5e-4)
    parser.add_argument("--fine-tune-lr", type=float, default=1e-5)
    parser.add_argument("--patience", type=int, default=2)
    parser.add_argument("--checkpoint-every-batches", type=int, default=100)
    parser.add_argument("--augmentation", choices=("basic", "field"), default="basic")
    parser.add_argument("--batch-mix-probability", type=float, default=0.0)
    parser.add_argument("--mixup-alpha", type=float, default=0.2)
    parser.add_argument("--cutmix-alpha", type=float, default=1.0)
    parser.add_argument("--limit-per-class", type=int, default=None)
    parser.add_argument("--seed", type=int, default=20260904)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--fresh", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.epochs < 1 or not 0 <= args.head_epochs <= args.epochs:
        raise SystemExit("Require epochs >= 1 and 0 <= head-epochs <= epochs.")
    if not 0 <= args.batch_mix_probability <= 1:
        raise SystemExit("batch-mix-probability must be between 0 and 1.")
    if args.mixup_alpha <= 0 or args.cutmix_alpha <= 0:
        raise SystemExit("MixUp and CutMix alpha values must be positive.")
    if args.device == "auto":
        args.device = "cuda" if torch.cuda.is_available() else "cpu"
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA was requested but is not available.")
    device = torch.device(args.device)
    seed_everything(args.seed)

    global_label_map = json.loads((args.global_run_dir / "label_map.json").read_text(encoding="utf-8"))
    labels: list[str] = global_label_map["labels"]
    label_to_index: dict[str, int] = global_label_map["label_to_index"]
    train_samples = balanced_subset(read_manifest(args.dataset_dir / "train.csv"), args.limit_per_class, args.seed)
    validation_samples = balanced_subset(read_manifest(args.dataset_dir / "validation.csv"), args.limit_per_class, args.seed + 1)
    test_samples = balanced_subset(read_manifest(args.dataset_dir / "test.csv"), args.limit_per_class, args.seed + 2)
    if args.augmentation == "field":
        train_transform, evaluation_transform = make_field_transforms(args.image_size)
    else:
        train_transform, evaluation_transform = make_transforms(args.image_size)
    train_dataset = ManifestDataset(train_samples, label_to_index, train_transform)
    validation_dataset = ManifestDataset(validation_samples, label_to_index, evaluation_transform)
    test_dataset = ManifestDataset(test_samples, label_to_index, evaluation_transform)

    run_dir = args.output_dir / args.run_name
    last_checkpoint = run_dir / "last.pt"
    best_checkpoint = run_dir / "best.pt"
    if args.fresh and run_dir.exists():
        raise SystemExit(f"Run already exists: {run_dir}")
    run_dir.mkdir(parents=True, exist_ok=True)
    run_config_path = run_dir / "run_config.json"
    config = {
        **vars(args),
        "dataset_dir": str(args.dataset_dir.resolve()),
        "output_dir": str(args.output_dir.resolve()),
        "global_run_dir": str(args.global_run_dir.resolve()),
        "init_crop_head_run_dir": (
            str(args.init_crop_head_run_dir.resolve()) if args.init_crop_head_run_dir else None
        ),
        "device": str(device),
        "architecture": "shared_efficientnetv2_s_with_crop_specific_heads",
        "crops": {crop: len(indices) for crop, indices in crop_label_indices(labels).items()},
        "class_count": len(labels),
        "sample_counts": {"train": len(train_samples), "validation": len(validation_samples), "test": len(test_samples)},
        "created_or_resumed_at": utc_now(),
    }
    if not run_config_path.exists():
        config["created_at"] = utc_now()
    else:
        previous = json.loads(run_config_path.read_text(encoding="utf-8"))
        config["created_at"] = previous.get("created_at")
        if last_checkpoint.exists():
            locked_keys = (
                "epochs",
                "head_epochs",
                "batch_size",
                "image_size",
                "head_lr",
                "fine_tune_lr",
                "limit_per_class",
                "seed",
                "class_count",
                "global_run_dir",
                "init_crop_head_run_dir",
                "augmentation",
                "batch_mix_probability",
                "mixup_alpha",
                "cutmix_alpha",
            )
            mismatches = {
                key: {"cached": previous.get(key), "requested": config.get(key)}
                for key in locked_keys
                if previous.get(key) != config.get(key)
            }
            if mismatches:
                raise SystemExit(
                    "Cached crop-head settings do not match this command. Use a new --run-name. "
                    f"Differences: {json.dumps(mismatches, sort_keys=True)}"
                )
    atomic_json(run_config_path, config)
    atomic_json(run_dir / "label_map.json", global_label_map)
    atomic_json(run_dir / "progress.json", {"status": "initializing", "updated_at": utc_now()})

    model = CropHeadEfficientNetV2S(labels).to(device)
    starting_epoch = 0
    starting_batch = 0
    best_macro_f1 = -1.0
    stale_epochs = 0
    current_phase = phase_for_epoch(0, args.head_epochs)
    set_phase(model, current_phase)
    optimizer = make_optimizer(model, current_phase, args.head_lr, args.fine_tune_lr)
    if last_checkpoint.exists():
        probe = torch.load(last_checkpoint, map_location="cpu", weights_only=False)
        current_phase = probe["phase"]
        set_phase(model, current_phase)
        optimizer = make_optimizer(model, current_phase, args.head_lr, args.fine_tune_lr)
        checkpoint = restore_checkpoint(last_checkpoint, model, optimizer, device)
        starting_epoch = int(checkpoint["epoch"])
        starting_batch = int(checkpoint["next_batch"])
        best_macro_f1 = float(checkpoint["best_macro_f1"])
        stale_epochs = int(checkpoint["stale_epochs"])
        print(f"Resuming at epoch={starting_epoch + 1}, batch={starting_batch}", flush=True)
    else:
        if args.init_crop_head_run_dir:
            source_checkpoint = args.init_crop_head_run_dir / "best.pt"
            if not source_checkpoint.exists():
                raise SystemExit(f"Missing crop-head initializer: {source_checkpoint}")
            best_macro_f1 = initialize_from_crop_head_checkpoint(
                model,
                source_checkpoint,
                device,
            )
            save_checkpoint(
                best_checkpoint,
                model,
                optimizer,
                0,
                0,
                current_phase,
                best_macro_f1,
                stale_epochs,
            )
            source_metrics = args.init_crop_head_run_dir / "metrics" / "best_validation.json"
            if source_metrics.exists():
                inherited_metrics = json.loads(source_metrics.read_text(encoding="utf-8"))
                inherited_metrics["inherited_from"] = str(args.init_crop_head_run_dir.resolve())
                atomic_json(run_dir / "metrics" / "best_validation.json", inherited_metrics)
            print(
                "Initialized from crop-head winner; it remains best.pt unless this run improves "
                f"on validation macro-F1={best_macro_f1:.4f}",
                flush=True,
            )
        else:
            initialize_from_global_checkpoint(
                model,
                args.global_run_dir / "best.pt",
                labels,
                device,
            )
            print("Initialized backbone and all crop heads from global best.pt", flush=True)

    criterion = nn.CrossEntropyLoss(weight=class_weights(train_samples, labels, device))
    validation_loader = make_loader(validation_dataset, args, shuffle=False)
    try:
        for epoch in range(starting_epoch, args.epochs):
            phase = phase_for_epoch(epoch, args.head_epochs)
            if phase != current_phase:
                current_phase = phase
                set_phase(model, phase)
                optimizer = make_optimizer(model, phase, args.head_lr, args.fine_tune_lr)
                starting_batch = 0
            train_loader = make_loader(train_dataset, args, shuffle=True, epoch=epoch)
            epoch_started = time.monotonic()
            train_loss = train_epoch(
                model,
                train_loader,
                criterion,
                optimizer,
                device,
                epoch,
                starting_batch if epoch == starting_epoch else 0,
                args.checkpoint_every_batches,
                last_checkpoint,
                phase,
                best_macro_f1,
                stale_epochs,
                run_dir / "progress.json",
                args.batch_mix_probability,
                args.mixup_alpha,
                args.cutmix_alpha,
            )
            validation, confusion, per_class = evaluate_crop_heads(model, validation_loader, criterion, device, labels)
            validation.update(
                {
                    "epoch": epoch + 1,
                    "phase": phase,
                    "train_loss": train_loss,
                    "elapsed_seconds": round(time.monotonic() - epoch_started, 2),
                    "evaluated_at": utc_now(),
                }
            )
            write_evaluation(run_dir, "validation_latest", validation, confusion, per_class, labels)
            append_jsonl(run_dir / "history.jsonl", validation)
            if validation["macro_f1"] > best_macro_f1:
                best_macro_f1 = validation["macro_f1"]
                stale_epochs = 0
                save_checkpoint(best_checkpoint, model, optimizer, epoch + 1, 0, phase, best_macro_f1, stale_epochs)
                atomic_json(run_dir / "metrics" / "best_validation.json", validation)
            else:
                stale_epochs += 1
            save_checkpoint(last_checkpoint, model, optimizer, epoch + 1, 0, phase, best_macro_f1, stale_epochs)
            atomic_json(
                run_dir / "progress.json",
                {
                    "status": "evaluated",
                    "updated_at": utc_now(),
                    "completed_epochs": epoch + 1,
                    "total_epochs": args.epochs,
                    "best_macro_f1": best_macro_f1,
                    "latest_validation": validation,
                },
            )
            print(
                f"epoch={epoch + 1}/{args.epochs} phase={phase} train_loss={train_loss:.4f} "
                f"val_macro_f1={validation['macro_f1']:.4f} val_accuracy={validation['accuracy']:.4f}",
                flush=True,
            )
            starting_batch = 0
            if stale_epochs >= args.patience:
                print(f"Early stopping after {stale_epochs} non-improving epochs.", flush=True)
                break

        best = torch.load(best_checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(best["model_state"])
        test_loader = make_loader(test_dataset, args, shuffle=False)
        test, confusion, per_class = evaluate_crop_heads(model, test_loader, criterion, device, labels)
        test.update({"checkpoint": "best.pt", "evaluated_at": utc_now()})
        write_evaluation(run_dir, "test", test, confusion, per_class, labels)
        atomic_json(
            run_dir / "progress.json",
            {
                "status": "completed",
                "updated_at": utc_now(),
                "best_validation_macro_f1": best_macro_f1,
                "test": test,
                "run_dir": str(run_dir.resolve()),
            },
        )
        print(f"Crop-head training complete. Results: {run_dir}", flush=True)
        return 0
    except KeyboardInterrupt:
        atomic_json(
            run_dir / "progress.json",
            {
                "status": "interrupted",
                "updated_at": utc_now(),
                "resume_command": "npm run model:train-crop-heads",
                "checkpoint": str(last_checkpoint.resolve()),
            },
        )
        print("Interrupted. Repeat the same command to resume.", file=sys.stderr)
        return 130
    except Exception as error:
        atomic_json(
            run_dir / "progress.json",
            {"status": "failed", "updated_at": utc_now(), "error": str(error)},
        )
        raise


if __name__ == "__main__":
    raise SystemExit(main())
