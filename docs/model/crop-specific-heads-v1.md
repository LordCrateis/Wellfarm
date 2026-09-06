# Crop-Specific Heads — Candidate v1

Date: 2026-09-05

## Architecture

This candidate retains one EfficientNetV2-S feature extractor and replaces the
single 54-way classifier with eight crop-specific condition classifiers:

| Crop | Conditions |
| --- | ---: |
| Cotton | 7 |
| Maize | 6 |
| Potato | 7 |
| Rice | 7 |
| Soybean | 5 |
| Sugarcane | 7 |
| Tomato | 10 |
| Wheat | 5 |

The farmer-provided crop selects the only head allowed to produce scores. This
makes crop context part of the architecture instead of applying a mask after a
global prediction.

## Initialization

The shared backbone is copied from the trained global epoch-6 `best.pt`. Each
crop head receives the corresponding rows from the global classifier's weight
and bias tensors. Before any new training, this is mathematically equivalent to
the crop-filtered global model.

The verification command checked one validation image from every supported
crop. All eight predictions matched, and the largest permitted-logit difference
was `0.0000019073`, within floating-point tolerance.

```bash
npm run model:verify-crop-heads
```

## Training strategy

The default candidate run performs four resumable epochs:

1. one epoch refining only the eight classifier heads;
2. up to three epochs fine-tuning the shared backbone at a lower learning rate;
3. early stopping after two non-improving validation epochs;
4. final evaluation using the best validation macro-F1 checkpoint.

```bash
npm run model:train-crop-heads
```

Progress, history, checkpoints, per-class metrics, crop/source accuracy, and
confusion matrices are cached under
`models/artifacts/wellfarm-v1/efficientnetv2-s-crop-heads-v1`.

The completed tiny smoke run used two images per class at 96px and verified
initialization, gradients, periodic checkpointing, validation, and test output.
Its scores are deliberately not treated as model-quality evidence.

## Completed result

The selected epoch-1 checkpoint reached 97.23% validation macro-F1. On the
untouched 5,516-image test set it reached 83.61% accuracy, 80.78% macro-F1,
83.21% balanced accuracy, and 92.49% top-3 accuracy. PlantDoc accuracy was
49.78%. This beat the crop-filtered global checkpoint by 0.82 percentage points
in overall accuracy, 1.58 points in macro-F1, and 2.02 points on PlantDoc, but
the absolute field-photo result remains the principal weakness.
