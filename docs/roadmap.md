# Wellfarm Roadmap

## Foundation

- Maintain the farmer scan, history, location, and live-weather flows.
- Replace fixture crop analysis with a trained EfficientNetV2-S model.
- Keep sample regional data visibly identified.
- Remove obsolete external-role and case-routing surfaces.

## Vision model

- Model v1 scope is locked to eight adequately labeled crops and 54 labels.
- Train EfficientNetV2-S on the normalized 54-label manifest.
- Evaluate by crop, condition, source, and class imbalance.
- Add confidence calibration and unsupported-image rejection.
- Export the selected model to ONNX with versioned preprocessing.
- Connect inference to the scan API.

## Product quality

- Complete responsive behavior and accessibility review.
- Finish translations for major Indian languages.
- Add user-controlled deletion and export of scan history.
- Document severity rules and model limitations inside the product.
- Add automated API, data-pipeline, and end-to-end tests.

## Portfolio release

- Deploy the web application and API on sustainable free tiers.
- Publish model evaluation results and a reproducible setup guide.
- Add screenshots, architecture notes, and technical decisions.
- Keep all external submission, referral, certification, and commercial workflows out of scope.
