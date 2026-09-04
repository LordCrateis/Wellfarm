# PlantDoc Holdout Audit — Wellfarm Model v1

Date: 2026-09-04  
Status: completed, no dataset labels changed

## Verdict

PlantDoc remains useful as a difficult external stress test, but the current
mapping is not clean enough to be treated as precise field-diagnosis ground
truth. The observed 47.76% crop-filtered PlantDoc accuracy measures a mixture
of model domain shift and benchmark label noise.

The audit covered all 1,386 unique PlantDoc images mapped into Wellfarm's 15
matching labels. Every retained file is readable. All mapped PlantDoc images
are held in the test split, so none leaked into model training or validation.

## Quantitative findings

| Check | Result |
| --- | ---: |
| Unique mapped images | 1,386 |
| Mapped labels | 15 |
| Readable images | 1,386 |
| Images below 224 px on the short edge | 82 |
| Contradictory exact-duplicate groups already removed | 9 |
| Median dimensions | 667 × 540 px |
| Crop-filtered PlantDoc accuracy | 47.76% |

The nine excluded contradiction groups include five early-vs-late potato
blight conflicts, three maize gray-spot-vs-blight conflicts, and one tomato
bacterial-spot-vs-Septoria conflict. The existing preparation pipeline handled
these correctly by excluding every conflicted hash.

## Mapping and label-quality findings

### 1. Maize blight ontology is wrong

PlantDoc `Corn leaf blight` is currently mapped to
`maize__leaf_blight`, even though the visual sample is dominated by Northern
Corn Leaf Blight and published cross-dataset work explicitly treats PlantDoc's
blight class as Northern Leaf Blight. The class should be remapped to
`maize__northern_leaf_blight`; the duplicate generic maize-blight concept should
then be reconsidered. The [PlantDoc project](https://github.com/pratikkayal/PlantDoc-Dataset)
lists the source class as `Corn leaf blight`, while an independent
[cross-dataset study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13039305/)
documents that PlantDoc blight is known as Northern Leaf Blight.

### 2. Generic healthy folders are contaminated

`Soyabean leaf` and `Tomato leaf` were interpreted as healthy because their
source names contain no disease. Deterministic visual samples show that this is
not safe: they include spotted, yellowing, deficient, possibly mildewed, badly
stressed, and potentially wrong-species leaves. Neither folder should be used
as clean healthy ground truth without per-image curation.

### 3. Corn rust is not a pure common-rust class

`Corn rust leaf` is mapped to `maize__common_rust`, but the visual sample
contains multiple filenames explicitly referring to southern rust. It should
either be curated image by image or represented as an unspecified maize-rust
stress-test label.

### 4. Spider-mite evidence is unusable

Only two unique PlantDoc images survive for tomato two-spotted spider mite.
Both are comparison collages containing several conditions, not clean
independent mite examples. They should be excluded from the field benchmark,
and no class-level conclusion should be drawn from their 0% score.

### 5. Web-image artifacts are common

The deterministic samples contain infographics, multi-image collages,
stock-photo watermarks, isolated leaves, inconsistent backgrounds, and highly
variable framing. This reflects PlantDoc's web-collected nature. These examples
can remain useful as an adversarial web-image stress test, but they should not
be mixed with a curated phone-camera field benchmark.

## Weak PlantDoc classes after crop filtering

| Wellfarm label | Support | Recall | F1 |
| --- | ---: | ---: | ---: |
| Tomato bacterial spot | 109 | 0.9% | 1.8% |
| Tomato mosaic virus | 54 | 7.4% | 8.2% |
| Maize leaf blight | 188 | 9.0% | 15.2% |
| Maize common rust | 116 | 15.5% | 25.7% |
| Maize gray leaf spot | 65 | 72.3% | 33.0% |
| Potato early blight | 111 | 29.7% | 42.9% |
| Potato late blight | 100 | 49.0% | 54.7% |

The maize numbers must be recalculated after correcting the blight and rust
ontology. Tomato bacterial spot and mosaic virus need per-image review before
we attribute their failures entirely to the model.

## Recommended next dataset revision

1. Preserve the current raw PlantDoc holdout and audit output for provenance.
2. Create a reviewed manifest with explicit `keep`, `exclude`, and `uncertain`
   decisions per image; never modify the downloaded source folders.
3. Correct PlantDoc corn leaf blight to Northern Leaf Blight.
4. Exclude the two spider-mite collages and all known contradictory hashes.
5. Manually curate generic healthy, corn rust, tomato bacterial spot, tomato
   mosaic virus, and potato blight before using them for headline metrics.
6. Report two results separately: curated field-photo performance and the full
   noisy PlantDoc stress-test performance.

The machine-readable audit and deterministic sample sheets are generated
locally with:

```bash
npm run model:audit-plantdoc
```

They are written beneath the ignored model run directory and do not modify raw
images, manifests, splits, or checkpoints.
