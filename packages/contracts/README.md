# Shared Contracts

This package is the source of truth for API payloads, events, severity labels, model metadata, and simulation markers shared by the apps and services.

Before implementation, convert the draft JSON schemas under `data/schemas` into generated TypeScript and Python types. Contract changes should remain backward compatible within a published API version.

Every analytical record must expose provenance:

- `data_source`: `field`, `laboratory`, `public_dataset`, or `simulated`
- `model_version`: the model that produced an inference
- `observed_at`: event time rather than processing time
- `verified`: whether a qualified human or laboratory confirmed the label

