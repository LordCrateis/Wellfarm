# Website inference

Run `npm run dev` from the repository root. After saving a crop and uploading its
JPG/PNG, the website calls `POST /api/scans/:scanId/analysis`. The existing scan
workflow is retained rather than introducing a second upload endpoint.

The API invokes `.venv/Scripts/python.exe` on Windows (`.venv/bin/python` elsewhere).
Set `PYTHON` to another interpreter if needed. Install `requirements-ml.txt` in that
environment. No paid inference service or model download is used.

The default run is `models/artifacts/wellfarm-v1/efficientnetv2-s-crop-heads-field-aug-v1`.
`VISION_RUN_DIRECTORY` can point to another trusted crop-head run containing
`best.pt`, `run_config.json`, and `label_map.json`. Checkpoints are trusted local
files only. A process loads the checkpoint per uncached photo, uses evaluation
preprocessing and the selected crop's head, and returns three scores. The API
allows one inference at a time with a two-minute timeout.

In dedicated Supabase mode, crop photos are private Storage objects and results
are saved as JSONB with the Postgres scan record. The API downloads a temporary
copy only while local Python inference runs and removes it afterwards. In local
auth mode, the original local image and `.analysis.json` cache remain available
for offline development. `GET /api/scans/:scanId/analysis` retrieves either form;
repeat POSTs reuse the saved result. Replacing the photo resets the scan to pending
and requires a fresh analysis. Changing the configured model does not rewrite
historical results.

Scores below 0.70 or a first/second score gap below 0.15 trigger uncertainty.
These are heuristic display thresholds, not calibrated accuracy guarantees.
Severity uses reported affected area, not disease confidence. Image checks only
validate decoding and resolution; this model cannot reliably reject unrelated
images. The user must select the correct crop.

Verification: build the API, then run
`node services/vision/scripts/test_scan_integration.mjs` from the repository root.
It uses port 18081, a temporary database/upload directory, and a held-out cotton
photo to test upload, prediction and retrieval. It does not modify user scans.
