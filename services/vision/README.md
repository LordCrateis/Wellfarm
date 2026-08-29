# Vision Service

The vision service preprocesses crop images and returns structured candidate labels. It must never convert raw scores directly into high-impact treatment advice.

## Expected output

- Supported crop and probable issue labels
- Calibrated confidence score
- Model and preprocessing versions
- Image-quality flags
- Out-of-distribution or unsupported-image indication

## Prototype constraints

- Limit the label set to classes with adequate licensed examples.
- Split training and evaluation data by source to reduce leakage.
- Show top candidates and uncertainty in the demo.
- Save evaluation metrics and confusion matrices with each candidate model.
- Keep large weights outside Git; document how to retrieve them.

