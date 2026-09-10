# Website inference

Run `npm run dev` from the repository root. After saving a crop and uploading its
JPG/PNG, the website calls `POST /api/scans/:scanId/analysis`. The existing scan
workflow is retained rather than introducing a second upload endpoint.

The API invokes `.venv/Scripts/python.exe` on Windows (`.venv/bin/python` elsewhere).
Set `PYTHON` to another interpreter if needed. Production needs only the small
`requirements-inference.txt` runtime; training and export use `requirements-ml.txt`.
No paid inference service is used.

Production defaults to ONNX Runtime. The tracked release manifest identifies the
portable model, its labels and its SHA-256 checksum. On first use the API downloads
the model from the free GitHub release, verifies the checksum and caches it locally.
`VISION_MODEL_URL`, `VISION_MODEL_SHA256`, `VISION_MODEL_PATH`,
`VISION_MODEL_MANIFEST`, and `VISION_MODEL_CACHE_DIRECTORY` can override this.
Only HTTPS downloads are accepted and an explicit local model must pass the same
checksum. Run `npm run model:setup-inference` on the production host.

Local development defaults to the existing PyTorch checkpoint so training remains
convenient. Set `VISION_RUNTIME=onnx` to test the production path. To rebuild the
portable artifact after training, run `npm run model:setup` and then
`npm run model:export`. The exporter writes the ignored `.onnx` file and a tracked
manifest, and refuses success unless ONNX Runtime agrees with PyTorch within the
declared numerical tolerance.

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
`npm run model:test-inference` from the repository root.
It uses port 18081, a temporary database/upload directory, and a held-out cotton
photo to test upload, prediction and retrieval. It does not modify user scans.
