import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import type { Scan } from "@workspace/db";
import { storedImagePath } from "../lib/uploads";

const execute = promisify(execFile);
function projectRoot() {
  let directory = process.cwd();
  while (!existsSync(join(directory, "services/vision/scripts/predict.py"))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error("Vision scripts missing");
    directory = parent;
  }
  return directory;
}
let busy = false;
export const isVisionBusy = () => busy;

export async function analyzeScan(scan: Scan, savedOnly = false) {
  const image = scan.imagePath && storedImagePath(scan.imagePath);
  if (!image || !existsSync(image)) throw new Error("Upload a crop photo first.");
  const cache = `${image}.analysis.json`;
  try { return JSON.parse(await readFile(cache, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  if (savedOnly) return null;
  if (busy) throw new Error("Another photo is being analyzed. Please retry shortly.");
  busy = true;
  try {
    const root = projectRoot();
    const python = process.env.PYTHON ?? join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const run = process.env.VISION_RUN_DIRECTORY ?? join(root, "models/artifacts/wellfarm-v1/efficientnetv2-s-crop-heads-field-aug-v1");
    const { stdout } = await execute(python, [join(root, "services/vision/scripts/predict.py"), "--run-dir", run, "--image", image, "--crop", scan.crop], { timeout: 120000, windowsHide: true, maxBuffer: 1024 * 1024 });
    const prediction = JSON.parse(stdout);
    const result = {
      mode: "model", crop: scan.crop, supported: true,
      candidates: prediction.candidates, lowConfidence: prediction.lowConfidence,
      severity: (scan.affectedAreaPercentage ?? 0) >= 50 ? "high" : (scan.affectedAreaPercentage ?? 0) >= 20 ? "moderate" : "low",
      severityBasis: "Based on your reported affected area; disease severity is not measured by this classifier.",
      imageQuality: { status: prediction.smallImage ? "poor" : "fair", label: prediction.smallImage ? "Small image" : "Image decoded", guidance: "Resolution and image decoding checked. Sharpness and plant presence have not been verified." },
      model: { name: "Wellfarm Vision", version: prediction.version, connected: true },
      summary: prediction.lowConfidence ? "The model is uncertain. Compare the alternatives and try a clearer photograph." : "The ranking shows visual similarities to conditions learned for your selected crop.",
      safeActions: ["Compare nearby plants for similar symptoms.", "Keep a clear close-up and whole-plant photo for comparison."],
      limitations: ["Model scores are not calibrated probabilities of a correct diagnosis.", "The selected crop must be correct. Unrelated images can still produce high scores.", "Do not choose chemical treatments from this result alone."],
    };
    await writeFile(`${cache}.tmp`, JSON.stringify(result), "utf8");
    await rename(`${cache}.tmp`, cache);
    return result;
  } finally { busy = false; }
}
