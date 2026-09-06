# Field Augmentation — Candidate v1

Date: 2026-09-06

## Purpose

The first crop-head model performs well on curated held-out images but remains
much weaker on PlantDoc field photographs. This experiment tests whether a
short continuation under harder, phone-like image conditions improves field
robustness without sacrificing the existing winner.

## Baseline to beat

The source checkpoint is
`efficientnetv2-s-crop-heads-v1/best.pt`:

- validation macro-F1: 97.23%;
- held-out test accuracy: 83.61%;
- held-out macro-F1: 80.78%;
- top-3 accuracy: 92.49%;
- PlantDoc accuracy: 49.78%.

The new run copies this checkpoint into its own `best.pt` before training and
inherits its validation macro-F1 as the selection threshold. An augmented
epoch replaces it only when validation macro-F1 improves. Consequently, a
failed experiment retains an exact usable copy of the current winner.

## Training changes

The two-epoch continuation fine-tunes the full EfficientNetV2-S network at a
conservative `0.000005` learning rate. Training images may receive stronger
random crops, perspective and rotation changes, uneven shadow, lighting and
color shifts, grayscale, blur, autocontrast, JPEG compression, and random
occlusion.

Half of training batches additionally receive either MixUp or CutMix. Pairing
is restricted to examples of the same crop, so the crop-selected classifier
head and mixed target always remain semantically valid.

```bash
npm run model:train-field-aug
```

The run is resumable under
`models/artifacts/wellfarm-v1/efficientnetv2-s-crop-heads-field-aug-v1`.
Inspect its cached progress with:

```bash
npm run model:status -- efficientnetv2-s-crop-heads-field-aug-v1
```

## Selection rule

Validation macro-F1 selects the checkpoint; the held-out test and PlantDoc
results are reported afterward, not used to choose weights. The augmented
candidate should replace the baseline only if it improves field-oriented
performance without a material regression in overall accuracy or macro-F1.
Neither benchmark proves real-world diagnostic reliability, so independent
farmer-taken images are still required before any deployment claim.
