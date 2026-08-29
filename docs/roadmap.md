# Roadmap

## Phase 0 — repository and design foundation

- Agree on supported crops, diseases, pests, and languages.
- Document system boundaries, API contracts, and demo assumptions.
- Evaluate public datasets and their licenses.
- Prepare simulated district, weather, scan, and laboratory data.

## Phase 1 — Round 1 prototype

- Build the farmer photo-upload journey.
- Integrate a small pretrained or fine-tuned image classifier.
- Generate a Marathi or other regional-language advisory from structured sample input.
- Build the officials' district-severity dashboard using synthetic data.
- Demonstrate a cache hit, retraining event, weather signature, and lab referral.
- Prepare an end-to-end scripted demo with visible simulation labels.

## Phase 2 — pilot-ready system

- Add authentication and role-based access for farmers, officials, and labs.
- Add secure object storage, a geospatial database, queues, and observability.
- Integrate validated weather data and a laboratory registry.
- Evaluate the model with regionally representative field samples.
- Add consent, audit logging, retention controls, and human review.

## Phase 3 — regional pilot

- Pilot in a small number of Maharashtra districts.
- Track diagnostic precision, referral turnaround, advisory usefulness, and adoption.
- Compare model predictions with expert and laboratory verification.
- Improve accessibility, offline behavior, and local-language content.

## Future production direction

- Expand crop and disease coverage only after measured validation.
- Introduce controlled incremental retraining with model approval and rollback.
- Publish monitoring for data drift, class imbalance, and geographic bias.
- Connect verified outbreak signals to government response workflows.

