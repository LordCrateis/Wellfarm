#!/usr/bin/env python3
"""Train and evaluate Wellfarm's EfficientNetV2-S crop-condition model.

Every run is resumable and writes machine-readable progress, metrics, and
checkpoints under models/artifacts (ignored by Git). The script deliberately
keeps experiment metadata separate from large model weights so results can be
reviewed without loading PyTorch.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import random
import sys
import time
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    import numpy as np
    import torch
    from PIL import Image, UnidentifiedImageError
    from torch import nn
    from torch.utils.data import DataLoader, Dataset
    from torchvision import transforms
    from torchvision.models import EfficientNet_V2_S_Weights, efficientnet_v2_s
except ImportError as error:
    raise SystemExit(
        "ML dependencies are missing. Run `npm run model:setup` first. "
        f"Original error: {error}"
    ) from error


REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATASET = REPO_ROOT / "data" / "processed" / "wellfarm-v1"
DEFAULT_OUTPUT = REPO_ROOT / "models" / "artifacts" / "wellfarm-v1"
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


@dataclass(frozen=True)
class Sample:
    path: str
    label: str
    crop: str
    source: str


class ManifestDataset(Dataset):
    def __init__(
        self,
        samples: list[Sample],
        label_to_index: dict[str, int],
        transform: transforms.Compose,
    ) -> None:
        self.samples = samples
        self.label_to_index = label_to_index
        self.transform = transform

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int, str, str]:
        sample = self.samples[index]
        image_path = REPO_ROOT / Path(sample.path)
        try:
            with Image.open(image_path) as image:
                tensor = self.transform(image.convert("RGB"))
        except (OSError, UnidentifiedImageError) as error:
            raise RuntimeError(f"Unreadable training image: {image_path}") from error
        return tensor, self.label_to_index[sample.label], sample.crop, sample.source


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(temporary, path)


def append_jsonl(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(value, sort_keys=True) + "\n")


def read_manifest(path: Path) -> list[Sample]:
    if not path.exists():
        raise SystemExit(f"Missing manifest: {path}. Run `npm run dataset:prepare` first.")
    with path.open("r", encoding="utf-8", newline="") as handle:
        return [
            Sample(
                path=row["path"],
                label=row["label"],
                crop=row["crop"],
                source=row["source"],
            )
            for row in csv.DictReader(handle)
        ]


def balanced_subset(samples: list[Sample], per_label: int | None, seed: int) -> list[Sample]:
    if not per_label:
        return samples
    grouped: dict[str, list[Sample]] = defaultdict(list)
    for sample in samples:
        grouped[sample.label].append(sample)
    rng = random.Random(seed)
    selected: list[Sample] = []
    for label in sorted(grouped):
        choices = grouped[label][:]
        rng.shuffle(choices)
        selected.extend(choices[:per_label])
    rng.shuffle(selected)
    return selected


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def worker_seed(worker_id: int) -> None:
    worker_value = torch.initial_seed() % (2**32)
    random.seed(worker_value)
    np.random.seed(worker_value)


def make_transforms(image_size: int) -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(image_size, scale=(0.72, 1.0), ratio=(0.8, 1.25)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(12),
            transforms.ColorJitter(brightness=0.18, contrast=0.18, saturation=0.12, hue=0.02),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    evaluation_transform = transforms.Compose(
        [
            transforms.Resize(round(image_size * 1.14)),
            transforms.CenterCrop(image_size),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
        ]
    )
    return train_transform, evaluation_transform


def build_model(class_count: int, pretrained: bool) -> nn.Module:
    weights = EfficientNet_V2_S_Weights.DEFAULT if pretrained else None
    model = efficientnet_v2_s(weights=weights)
    input_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(input_features, class_count)
    return model


def set_phase(model: nn.Module, phase: str) -> None:
    train_backbone = phase == "fine_tune"
    for parameter in model.features.parameters():
        parameter.requires_grad = train_backbone
    for parameter in model.classifier.parameters():
        parameter.requires_grad = True


def phase_for_epoch(epoch: int, head_epochs: int) -> str:
    return "head" if epoch < head_epochs else "fine_tune"


def make_optimizer(model: nn.Module, phase: str, head_lr: float, fine_tune_lr: float) -> torch.optim.Optimizer:
    learning_rate = head_lr if phase == "head" else fine_tune_lr
    return torch.optim.AdamW(
        (parameter for parameter in model.parameters() if parameter.requires_grad),
        lr=learning_rate,
        weight_decay=1e-4,
    )


def class_weights(samples: Iterable[Sample], labels: list[str], device: torch.device) -> torch.Tensor:
    counts = Counter(sample.label for sample in samples)
    # Inverse-square-root weighting tempers extreme imbalance without allowing
    # the smallest classes to dominate every update.
    weights = [1.0 / math.sqrt(max(counts[label], 1)) for label in labels]
    mean = sum(weights) / len(weights)
    return torch.tensor([weight / mean for weight in weights], dtype=torch.float32, device=device)


def save_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    next_batch: int,
    phase: str,
    best_macro_f1: float,
    stale_epochs: int,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    torch.save(
        {
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "epoch": epoch,
            "next_batch": next_batch,
            "phase": phase,
            "best_macro_f1": best_macro_f1,
            "stale_epochs": stale_epochs,
            "torch_rng_state": torch.get_rng_state(),
            "numpy_rng_state": np.random.get_state(),
            "python_rng_state": random.getstate(),
        },
        temporary,
    )
    os.replace(temporary, path)


def restore_checkpoint(
    path: Path,
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> dict[str, Any]:
    checkpoint = torch.load(path, map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state"])
    optimizer.load_state_dict(checkpoint["optimizer_state"])
    torch.set_rng_state(checkpoint["torch_rng_state"])
    np.random.set_state(checkpoint["numpy_rng_state"])
    random.setstate(checkpoint["python_rng_state"])
    return checkpoint


def train_epoch(
    model: nn.Module,
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
) -> tuple[float, int]:
    model.train()
    if phase == "head":
        # Keep BatchNorm statistics fixed while the pretrained backbone is
        # frozen; only the replacement classifier should learn in this phase.
        model.features.eval()
    running_loss = 0.0
    processed = 0
    total_batches = len(loader)
    started = time.monotonic()

    for batch_index, (images, targets, _crops, _sources) in enumerate(loader):
        if batch_index < starting_batch:
            continue
        images = images.to(device, non_blocking=device.type == "cuda")
        targets = targets.to(device, non_blocking=device.type == "cuda")
        optimizer.zero_grad(set_to_none=True)
        logits = model(images)
        loss = criterion(logits, targets)
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
            completed_batches = next_batch - starting_batch
            remaining_seconds = (elapsed / max(completed_batches, 1)) * (total_batches - next_batch)
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
                    "estimated_seconds_remaining_in_epoch": round(remaining_seconds),
                },
            )
            print(
                f"epoch={epoch + 1} batch={next_batch}/{total_batches} "
                f"loss={running_loss / max(processed, 1):.4f}",
                flush=True,
            )

    return running_loss / max(processed, 1), total_batches


def metrics_from_confusion(confusion: np.ndarray) -> dict[str, Any]:
    true_positive = np.diag(confusion).astype(np.float64)
    support = confusion.sum(axis=1).astype(np.float64)
    predicted = confusion.sum(axis=0).astype(np.float64)
    precision = np.divide(true_positive, predicted, out=np.zeros_like(true_positive), where=predicted > 0)
    recall = np.divide(true_positive, support, out=np.zeros_like(true_positive), where=support > 0)
    f1 = np.divide(2 * precision * recall, precision + recall, out=np.zeros_like(precision), where=(precision + recall) > 0)
    present = support > 0
    if not present.any():
        present = np.ones_like(support, dtype=bool)
    return {
        "accuracy": float(true_positive.sum() / max(confusion.sum(), 1)),
        "balanced_accuracy": float(recall[present].mean()),
        "macro_precision": float(precision[present].mean()),
        "macro_recall": float(recall[present].mean()),
        "macro_f1": float(f1[present].mean()),
        "classes_with_support": int(present.sum()),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "support": support,
    }


@torch.inference_mode()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    labels: list[str],
    restrict_to_crop: bool = False,
) -> tuple[dict[str, Any], np.ndarray, list[dict[str, Any]]]:
    model.eval()
    confusion = np.zeros((len(labels), len(labels)), dtype=np.int64)
    losses = 0.0
    sample_count = 0
    top3_correct = 0
    groups: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0, 0])
    evaluation_criterion = nn.CrossEntropyLoss() if restrict_to_crop else criterion

    for images, targets, crops, sources in loader:
        images = images.to(device, non_blocking=device.type == "cuda")
        targets = targets.to(device, non_blocking=device.type == "cuda")
        logits = model(images)
        if restrict_to_crop:
            allowed = torch.tensor(
                [
                    [label.startswith(f"{crop}__") for label in labels]
                    for crop in crops
                ],
                dtype=torch.bool,
                device=device,
            )
            logits = logits.masked_fill(~allowed, torch.finfo(logits.dtype).min)
        # Label smoothing assigns probability mass to masked-out classes and
        # makes crop-conditioned loss meaningless, so use plain NLL there.
        loss = evaluation_criterion(logits, targets)
        predictions = logits.argmax(dim=1)
        top3 = logits.topk(min(3, len(labels)), dim=1).indices
        top3_correct += int((top3 == targets.unsqueeze(1)).any(dim=1).sum().item())
        losses += float(loss.item()) * targets.size(0)
        sample_count += targets.size(0)

        true_values = targets.cpu().numpy()
        predicted_values = predictions.cpu().numpy()
        np.add.at(confusion, (true_values, predicted_values), 1)
        for true_value, predicted_value, crop, source in zip(true_values, predicted_values, crops, sources):
            groups[(f"crop:{crop}", "accuracy")][1] += 1
            groups[(f"source:{source}", "accuracy")][1] += 1
            if true_value == predicted_value:
                groups[(f"crop:{crop}", "accuracy")][0] += 1
                groups[(f"source:{source}", "accuracy")][0] += 1

    summary = metrics_from_confusion(confusion)
    summary.update(
        {
            "loss": losses / max(sample_count, 1),
            "top3_accuracy": top3_correct / max(sample_count, 1),
            "samples": sample_count,
            "crop_filtering": restrict_to_crop,
        }
    )
    per_class = [
        {
            "label": label,
            "precision": float(summary["precision"][index]),
            "recall": float(summary["recall"][index]),
            "f1": float(summary["f1"][index]),
            "support": int(summary["support"][index]),
        }
        for index, label in enumerate(labels)
    ]
    summary["groups"] = {
        group: {"accuracy": correct / max(total, 1), "samples": total}
        for (group, _metric), (correct, total) in sorted(groups.items())
    }
    for internal_key in ("precision", "recall", "f1", "support"):
        del summary[internal_key]
    return summary, confusion, per_class


def write_evaluation(run_dir: Path, split: str, summary: dict[str, Any], confusion: np.ndarray, per_class: list[dict[str, Any]], labels: list[str]) -> None:
    metrics_dir = run_dir / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    atomic_json(metrics_dir / f"{split}.json", summary)
    with (metrics_dir / f"{split}_per_class.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["label", "precision", "recall", "f1", "support"])
        writer.writeheader()
        writer.writerows(per_class)
    with (metrics_dir / f"{split}_confusion_matrix.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["actual\\predicted", *labels])
        for label, row in zip(labels, confusion.tolist()):
            writer.writerow([label, *row])


def make_loader(dataset: Dataset, args: argparse.Namespace, shuffle: bool, epoch: int = 0) -> DataLoader:
    generator = torch.Generator()
    generator.manual_seed(args.seed + epoch)
    return DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=shuffle,
        num_workers=args.workers,
        pin_memory=args.device == "cuda",
        persistent_workers=args.workers > 0,
        worker_init_fn=worker_seed,
        generator=generator,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-dir", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--run-name", default="efficientnetv2-s-v1")
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--head-epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--image-size", type=int, default=224)
    parser.add_argument("--workers", type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument("--head-lr", type=float, default=1e-3)
    parser.add_argument("--fine-tune-lr", type=float, default=2e-5)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--checkpoint-every-batches", type=int, default=100)
    parser.add_argument("--limit-per-class", type=int, default=None)
    parser.add_argument("--seed", type=int, default=20260902)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--no-pretrained", action="store_true")
    parser.add_argument("--fresh", action="store_true", help="Refuse to overwrite or resume an existing run.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.epochs < 1 or not 0 <= args.head_epochs <= args.epochs:
        raise SystemExit("Require epochs >= 1 and 0 <= head-epochs <= epochs.")
    if args.checkpoint_every_batches < 1:
        raise SystemExit("checkpoint-every-batches must be at least 1.")

    if args.device == "auto":
        args.device = "cuda" if torch.cuda.is_available() else "cpu"
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA was requested but is not available.")
    device = torch.device(args.device)
    seed_everything(args.seed)

    labels_document = json.loads((args.dataset_dir / "labels.json").read_text(encoding="utf-8"))
    labels = sorted(labels_document["labels"])
    label_to_index = {label: index for index, label in enumerate(labels)}
    train_samples = balanced_subset(read_manifest(args.dataset_dir / "train.csv"), args.limit_per_class, args.seed)
    validation_samples = balanced_subset(read_manifest(args.dataset_dir / "validation.csv"), args.limit_per_class, args.seed + 1)
    test_samples = balanced_subset(read_manifest(args.dataset_dir / "test.csv"), args.limit_per_class, args.seed + 2)
    unknown_labels = sorted({sample.label for sample in train_samples + validation_samples + test_samples} - set(labels))
    if unknown_labels:
        raise SystemExit(f"Manifests contain labels absent from labels.json: {unknown_labels}")

    run_dir = args.output_dir / args.run_name
    last_checkpoint = run_dir / "last.pt"
    best_checkpoint = run_dir / "best.pt"
    if args.fresh and run_dir.exists():
        raise SystemExit(f"Run already exists: {run_dir}. Choose a new --run-name or omit --fresh to resume.")
    run_dir.mkdir(parents=True, exist_ok=True)

    train_transform, evaluation_transform = make_transforms(args.image_size)
    train_dataset = ManifestDataset(train_samples, label_to_index, train_transform)
    validation_dataset = ManifestDataset(validation_samples, label_to_index, evaluation_transform)
    test_dataset = ManifestDataset(test_samples, label_to_index, evaluation_transform)

    run_config_path = run_dir / "run_config.json"
    run_config = {
        **vars(args),
        "dataset_dir": str(args.dataset_dir.resolve()),
        "output_dir": str(args.output_dir.resolve()),
        "created_or_resumed_at": utc_now(),
        "torch_version": torch.__version__,
        "torchvision_model": "efficientnet_v2_s",
        "pretrained_weights": None if args.no_pretrained else "EfficientNet_V2_S_Weights.DEFAULT",
        "device": str(device),
        "class_count": len(labels),
        "sample_counts": {"train": len(train_samples), "validation": len(validation_samples), "test": len(test_samples)},
        "normalization": {"mean": IMAGENET_MEAN, "std": IMAGENET_STD},
    }
    if last_checkpoint.exists() and run_config_path.exists():
        previous_config = json.loads(run_config_path.read_text(encoding="utf-8"))
        resume_locked_keys = (
            "batch_size",
            "image_size",
            "head_epochs",
            "head_lr",
            "fine_tune_lr",
            "limit_per_class",
            "seed",
            "no_pretrained",
            "class_count",
        )
        mismatches = {
            key: {"cached": previous_config.get(key), "requested": run_config.get(key)}
            for key in resume_locked_keys
            if previous_config.get(key) != run_config.get(key)
        }
        if mismatches:
            raise SystemExit(
                "This run's cached training settings do not match the command. "
                f"Use a new --run-name. Differences: {json.dumps(mismatches, sort_keys=True)}"
            )
        run_config["created_at"] = previous_config.get("created_at", previous_config.get("created_or_resumed_at"))
    else:
        run_config["created_at"] = utc_now()
    atomic_json(run_config_path, run_config)
    atomic_json(run_dir / "label_map.json", {"labels": labels, "label_to_index": label_to_index})
    atomic_json(run_dir / "progress.json", {"status": "initializing", "updated_at": utc_now()})

    # A checkpoint already contains every weight, so resuming must not trigger
    # an unnecessary network download of the ImageNet initialization.
    model = build_model(
        len(labels),
        pretrained=not args.no_pretrained and not last_checkpoint.exists(),
    ).to(device)
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
        print(f"Resuming {run_dir} at epoch={starting_epoch + 1}, batch={starting_batch}", flush=True)

    criterion = nn.CrossEntropyLoss(weight=class_weights(train_samples, labels, device), label_smoothing=0.05)
    validation_loader = make_loader(validation_dataset, args, shuffle=False)

    try:
        for epoch in range(starting_epoch, args.epochs):
            phase = phase_for_epoch(epoch, args.head_epochs)
            if phase != current_phase:
                current_phase = phase
                set_phase(model, current_phase)
                optimizer = make_optimizer(model, current_phase, args.head_lr, args.fine_tune_lr)
                starting_batch = 0

            train_loader = make_loader(train_dataset, args, shuffle=True, epoch=epoch)
            epoch_started = time.monotonic()
            train_loss, total_batches = train_epoch(
                model,
                train_loader,
                criterion,
                optimizer,
                device,
                epoch,
                starting_batch if epoch == starting_epoch else 0,
                args.checkpoint_every_batches,
                last_checkpoint,
                current_phase,
                best_macro_f1,
                stale_epochs,
                run_dir / "progress.json",
            )
            validation, confusion, per_class = evaluate(model, validation_loader, criterion, device, labels)
            validation.update(
                {
                    "epoch": epoch + 1,
                    "phase": current_phase,
                    "train_loss": train_loss,
                    "elapsed_seconds": round(time.monotonic() - epoch_started, 2),
                    "evaluated_at": utc_now(),
                }
            )
            write_evaluation(run_dir, "validation_latest", validation, confusion, per_class, labels)
            append_jsonl(run_dir / "history.jsonl", validation)

            improved = validation["macro_f1"] > best_macro_f1
            if improved:
                best_macro_f1 = validation["macro_f1"]
                stale_epochs = 0
                save_checkpoint(best_checkpoint, model, optimizer, epoch + 1, 0, current_phase, best_macro_f1, stale_epochs)
                atomic_json(run_dir / "metrics" / "best_validation.json", validation)
            else:
                stale_epochs += 1

            save_checkpoint(last_checkpoint, model, optimizer, epoch + 1, 0, current_phase, best_macro_f1, stale_epochs)
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
                f"epoch={epoch + 1}/{args.epochs} phase={current_phase} "
                f"train_loss={train_loss:.4f} val_macro_f1={validation['macro_f1']:.4f} "
                f"val_accuracy={validation['accuracy']:.4f}",
                flush=True,
            )
            starting_batch = 0
            if stale_epochs >= args.patience:
                print(f"Early stopping after {stale_epochs} epochs without improvement.", flush=True)
                break

        if not best_checkpoint.exists():
            raise RuntimeError("Training completed without producing a best checkpoint.")
        best = torch.load(best_checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(best["model_state"])
        test_loader = make_loader(test_dataset, args, shuffle=False)
        test_summary, test_confusion, test_per_class = evaluate(model, test_loader, criterion, device, labels)
        test_summary.update({"checkpoint": "best.pt", "evaluated_at": utc_now()})
        write_evaluation(run_dir, "test", test_summary, test_confusion, test_per_class, labels)
        atomic_json(
            run_dir / "progress.json",
            {
                "status": "completed",
                "updated_at": utc_now(),
                "best_validation_macro_f1": best_macro_f1,
                "test": test_summary,
                "run_dir": str(run_dir.resolve()),
            },
        )
        print(f"Training complete. Results: {run_dir}", flush=True)
        return 0
    except KeyboardInterrupt:
        atomic_json(
            run_dir / "progress.json",
            {
                "status": "interrupted",
                "updated_at": utc_now(),
                "resume_command": f"npm run model:train -- --run-name {args.run_name}",
                "checkpoint": str(last_checkpoint.resolve()),
            },
        )
        print("Interrupted. Run the same command to resume from last.pt.", file=sys.stderr)
        return 130
    except Exception as error:
        atomic_json(run_dir / "progress.json", {"status": "failed", "updated_at": utc_now(), "error": str(error)})
        raise


if __name__ == "__main__":
    raise SystemExit(main())
