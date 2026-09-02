# Vision Service

The vision service preprocesses crop images and returns structured candidate labels. It must never convert raw scores directly into high-impact treatment advice.

## Expected output

- Supported crop and probable issue labels
- Calibrated confidence score
- Model and preprocessing versions
- Image-quality flags
- Out-of-distribution or unsupported-image indication

## Model constraints

- Limit the label set to classes with adequate licensed examples.
- Split training and evaluation data by source to reduce leakage.
- Show top candidates and uncertainty in the product.
- Save evaluation metrics and confusion matrices with each candidate model.
- Keep large weights outside Git; document how to retrieve them.

## Model v1 scope

The tracked source of truth is `services/vision/config/model-v1.json`. Model v1 accepts eight crops:

| Crop | Labels | Unique images |
| --- | ---: | ---: |
| Cotton | 7 | 2,127 |
| Maize | 6 | 6,154 |
| Potato | 7 | 4,702 |
| Rice | 7 | 14,516 |
| Soybean | 5 | 5,623 |
| Sugarcane | 7 | 2,972 |
| Tomato | 10 | 25,918 |
| Wheat | 5 | 999 |

All 54 retained labels have at least 50 unique images. Groundnut and onion are unsupported in model v1 because their current local sources do not provide trustworthy normalized labels.

## Prepare the local dataset

The preparation script maps the downloaded sources to stable Wellfarm labels,
removes exact duplicates with SHA-256, and writes deterministic CSV manifests.
It reads `data/raw` without modifying any source image.

```bash
npm run dataset:prepare
```

The npm launcher searches `PYTHON`, a project `.venv`, system Python, and the
bundled Codex Python runtime. You can also invoke the Python script directly.
Unchanged files are reused from a local content-hash cache on later runs.

Generated files are written to `data/processed/wellfarm-v1` (ignored by Git):

- `manifest.csv` — every usable image and its normalized metadata
- `train.csv`, `validation.csv`, `test.csv` — ready-to-load splits
- `labels.json` — model label catalogue
- `summary.json` — counts, split policy, exclusions, and data-quality findings

PlantDoc is used as a field-image test source when a matching label exists in
another dataset. Otherwise, exact-duplicate groups are split 70/15/15. Onion is
excluded until its raw sample/day folders can be assigned trustworthy labels.

To create framework-friendly image folders without consuming another full copy
of the dataset, use hardlinks:

```bash
python services/vision/scripts/prepare_dataset.py --materialize hardlink
```

Run the dependency-free unit tests with:

```bash
npm run test:dataset
```

## Train model v1

Training uses an ImageNet-pretrained EfficientNetV2-S classifier with mild
field-image augmentation, inverse-square-root class weighting, a frozen-head
warm-up, full fine-tuning, early stopping, and evaluation by class, crop, and
source. Install the local dependencies once:

```bash
npm run model:setup
```

First verify the complete pipeline on a tiny balanced sample:

```bash
npm run model:smoke
```

Then start the real run:

```bash
npm run model:train
```

The CPU-friendly defaults use batch size 8, 224px images, one head-only epoch,
and up to seven fine-tuning epochs. On a machine with an NVIDIA CUDA runtime,
the same command selects CUDA automatically. Override settings after `--`:

```bash
npm run model:train -- --batch-size 16 --workers 6 --epochs 10
```

Training state is cached in
`models/artifacts/wellfarm-v1/efficientnetv2-s-v1` (ignored by Git):

- `last.pt` — periodic resumable checkpoint;
- `best.pt` — checkpoint with the best validation macro-F1;
- `progress.json` — current state and latest scores;
- `history.jsonl` — one machine-readable record per completed epoch;
- `metrics/*.json` — validation and held-out test summaries;
- `metrics/*_per_class.csv` — precision, recall, and F1 for every label;
- `metrics/*_confusion_matrix.csv` — full error matrix;
- `run_config.json` and `label_map.json` — exact reproducibility metadata.

Stopping with Ctrl+C is safe. Repeat the same command to resume. Use a distinct
`--run-name` whenever changing important hyperparameters; an existing run always
resumes with its cached weights.

Inspect progress without loading PyTorch:

```bash
npm run model:status
```
