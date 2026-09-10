// Runs the existing end-to-end scan test through the deployable ONNX runtime.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const manifestPath = resolve("models/releases/wellfarm-vision-v1.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
process.env.VISION_RUNTIME = "onnx";
process.env.VISION_MODEL_PATH = resolve("models/releases", manifest.file);
process.env.VISION_MODEL_MANIFEST = manifestPath;
process.env.VISION_MODEL_SHA256 = manifest.sha256;
await import("./test_scan_integration.mjs");
