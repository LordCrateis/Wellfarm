# PlantDoc Curation Overlay v1

Date: 2026-09-04
Status: generated and evaluated; original dataset preserved

## Purpose

This overlay converts the PlantDoc audit into explicit, reproducible decisions
without editing downloaded images or invalidating the manifests used to train
Wellfarm model v1.

Each of the 1,386 mapped PlantDoc images receives a row in the local review
manifest with its original label, recommended label, class-level decision,
reason, and empty fields for later human review.

## Decisions

| Decision | Images | Meaning |
| --- | ---: | --- |
| Keep | 578 | Provisionally suitable for a screened external benchmark |
| Relabel | 188 | Corn leaf blight corrected to maize Northern Leaf Blight |
| Review | 618 | Quarantined until an image-level decision is defensible |
| Exclude | 2 | Unusable multi-condition spider-mite collages |

The seven classes admitted to the screened benchmark are maize gray leaf spot,
maize Northern Leaf Blight, tomato early blight, tomato late blight, tomato leaf
mold, tomato Septoria leaf spot, and tomato yellow leaf curl virus.

## Screened benchmark result

The existing epoch-6 `best.pt` checkpoint was evaluated without retraining.
Farmer-provided crop filtering was applied exactly as intended in the product.

| Metric | Result |
| --- | ---: |
| Images | 766 |
| Classes with support | 7 |
| Top-1 accuracy | 67.10% |
| Macro-F1 | 70.67% |
| Balanced accuracy | 71.25% |
| Top-3 accuracy | 90.08% |
| Tomato accuracy | 80.12% |
| Maize accuracy | 40.71% |

This is not a replacement for the full 1,386-image PlantDoc stress-test result.
It covers only two crops and seven provisionally accepted labels. Both figures
must remain visible:

- full noisy PlantDoc stress test: 47.76% crop-filtered top-1 accuracy;
- conservative screened subset: 67.10% crop-filtered top-1 accuracy.

Correcting `Corn leaf blight` to Northern Leaf Blight raised recall on those 188
images from 9.0% under the wrong target to 29.8% under the corrected target.
That confirms the ontology bug mattered, while also showing that maize field
generalization remains poor.

## Reproduce locally

```bash
npm run model:curate-plantdoc
npm run model:evaluate-plantdoc-screened
```

Generated files remain ignored by Git:

- `data/processed/wellfarm-v1/plantdoc-review-v1.csv`
- `data/processed/wellfarm-v1/plantdoc-screened-test-v1.csv`
- `data/processed/wellfarm-v1/plantdoc-curation-v1-summary.json`
- `models/artifacts/wellfarm-v1/efficientnetv2-s-v1/metrics/plantdoc_screened_v1*`

The tracked class-level policy is
`services/vision/config/plantdoc-curation-v1.json`. Any future human reviewer
can fill `reviewer_decision`, `reviewer_label`, and `reviewer_notes` in the
generated review CSV. A later curation version must preserve v1 for provenance.
