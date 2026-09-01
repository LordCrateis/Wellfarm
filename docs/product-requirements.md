# Product Requirements — Wellfarm

## Product definition

- **Name:** Wellfarm
- **Type:** Open portfolio project
- **Primary surface:** Responsive web application
- **Companion surface:** Regional insights within the same site
- **Owner:** Shivam Tamboli

Wellfarm helps a user document visible crop symptoms, receive an explainable image-based indication, add live weather context, and follow changes through a private fieldbook. A separate insights area visualizes aggregate patterns from clearly identified sample or local data.

## Product principles

1. **Useful without pretending certainty.** Results are ranked indications, not definitive diagnoses.
2. **Privacy by default.** Exact coordinates are kept out of regional views.
3. **No hidden external workflow.** The application never sends cases to laboratories, officials, companies, or third parties.
4. **Evidence before advice.** Guidance is generated from structured model and weather evidence with explicit limitations.
5. **Accessible across India.** The interface supports major Indian languages and mobile layouts without requiring audio features.

## Primary user journeys

### Crop scan

1. Upload or photograph an affected plant.
2. Grant approximate location permission or continue without it.
3. Choose the crop, affected plant part, growth stage, and visible symptoms.
4. Receive ranked candidate conditions, confidence, image-quality warnings, and weather context.
5. Save the result to the personal fieldbook.

### Fieldbook

- Review previous scans and images.
- Compare conditions, confidence, weather, and dates.
- Repeat a scan when symptoms change.
- Export or delete personal records locally.

### Regional insights

- Explore state and district crop-health patterns from sample or locally aggregated records.
- Filter by crop, condition, severity, and time.
- See the evidence behind severity calculations.
- Never expose exact farm coordinates or claim an official surveillance feed.

## Supported crop direction

Rice, wheat, maize, cotton, sugarcane, soybean, groundnut, tomato, potato, and onion remain the target crop set. A crop is enabled in the classifier only when licensed, labeled, and sufficiently representative training data are available.

## Intelligence requirements

- Midweight EfficientNetV2-S image classifier.
- Crop-aware ranked outputs rather than one unqualified label.
- Out-of-distribution and poor-image detection.
- Model version and preprocessing version attached to every prediction.
- Gemini may explain structured findings but must not replace the vision model.
- Weather supplied by Open-Meteo and clearly separated from model evidence.
- Severity derived from documented rules using confidence, report density, recency, and weather context.

## Explicitly out of scope

- Laboratory routing, referrals, sample collection, or certification.
- Sending farmer scans to officials or external organizations.
- Government authentication or operational response workflows.
- Pesticide dosage, brand recommendations, or guaranteed treatment plans.
- Marketplace, payments, subscriptions, lead generation, or business operations.
- Claims of official endorsement, nationwide deployment, or verified outbreak detection.

## Quality requirements

- Mobile-first and keyboard accessible.
- Major Indian language support with English fallback.
- Location and API failures must have clear recovery states.
- Uploaded images and coordinates must never enter Git.
- Sample regional data must be labeled as sample data.
- Evaluation must report per-class and per-source performance, not only aggregate accuracy.
- No exact duplicate may cross training, validation, and test splits.

## Success criteria

- A user can complete a crop scan and retrieve it from history.
- Live location and weather work when permission and network access are available.
- The trained classifier returns calibrated candidates for supported crops.
- Unsupported images produce an honest unable-to-identify response.
- Regional insights communicate patterns without revealing individuals or implying authority.
- The repository can be installed, tested, and understood as a serious standalone portfolio project.
