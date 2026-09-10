# Wellfarm

Wellfarm is an open portfolio project for exploring practical crop-health software. It combines image-based crop issue classification, local weather context, private scan history, and regional pattern visualization in one accessible web application.

The project is designed to show careful product engineering around uncertain machine-learning results. Wellfarm presents ranked indications with confidence and limitations; it does not claim definitive diagnosis or prescribe chemical treatment.

## Product scope

- Photograph or upload an affected crop image.
- Capture approximate location from the browser with the user's permission.
- Add crop and symptom context to an image.
- Return ranked crop-condition candidates from the vision pipeline.
- Explain results in clear language with visible uncertainty.
- Save private scan history, crop photos, and model results through Supabase.
- Add live weather context through Open-Meteo.
- Explore privacy-reduced regional patterns aggregated from saved farmer scans.
- Inspect model provenance, dataset coverage, and known limitations.

## Deliberate boundaries

Wellfarm is a personal portfolio application, not a government system, medical-style diagnostic service, laboratory network, or commercial operation. It does not:

- send scans or cases to laboratories, officials, businesses, or other third parties;
- create referrals, assignments, certifications, or field-service requests;
- recommend pesticide brands, dosages, or guaranteed treatments;
- imply government endorsement or official surveillance coverage;
- sell farmer data or provide a marketplace.

Users may independently consult a qualified local agricultural professional when a crop problem is severe or uncertain. Wellfarm does not contact anyone on the user's behalf.

## Repository structure

```text
apps/                  Product application boundaries
data/                  Schemas, local datasets, and generated manifests
docs/                  Product requirements, architecture, and decisions
packages/              Shared contracts
platform/replit/       Runnable web application and local API
services/              Vision, advisory, intelligence, and API modules
infrastructure/        Deployment notes
```

Large training datasets, generated manifests, model weights, uploads, databases, and secrets remain outside Git. Production scan records and crop photos are stored in Supabase rather than bundled with a deployment.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173). The launcher starts both the web application and its local API.

With `AUTH_PROVIDER=supabase` and `SUPABASE_PROJECT_MODE=dedicated`, the API uses
the private `wellfarm_scans` Postgres table and `wellfarm-scan-images` Storage
bucket. The service-role key must remain server-side. Local-auth development and
isolated tests continue to use SQLite and `data/uploads`.

Verify the live persistence configuration without retaining test data:

```bash
npm run test:supabase-persistence
```

## Prepare the vision dataset

Place source archives under `data/archives` and extracted originals under `data/raw`, then run:

```bash
npm run dataset:prepare
```

The pipeline normalizes labels, removes exact duplicates, prevents duplicate leakage across splits, and writes manifests under `data/processed/wellfarm-v1`.

## Current direction

Model v1 is explicitly scoped to rice, wheat, maize, cotton, sugarcane, soybean, tomato, and potato: 63,011 unique usable images across 54 labels. Groundnut and onion remain unsupported until trustworthy labeled sources are available.

The repository includes a resumable EfficientNetV2-S training and evaluation pipeline plus a shared-backbone crop-specific-head model initialized from the best global checkpoint. The API runs this model for uploaded photos and stores its result with the scan. See `services/vision/README.md` for training commands, cached checkpoints, and machine-readable result files. Honest out-of-distribution handling remains an explicit limitation.

The current experiment continues from the crop-head winner under stronger
phone and field-image augmentation while retaining that winner as an automatic
fallback. See `docs/model/field-augmentation-v1.md` for the benchmark and
selection policy.

## License

Repository code and documentation are available under the [MIT License](LICENSE). Third-party datasets and models retain their own licenses and must be reviewed separately.
