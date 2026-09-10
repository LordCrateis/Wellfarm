import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const maximumModelBytes = 256 * 1024 * 1024;

export type VisionManifest = {
  file: string;
  sha256: string;
  download_url: string;
  version: string;
};

async function fileSha256(path: string) {
  const digest = createHash("sha256");
  await pipeline(createReadStream(path), digest);
  return digest.digest("hex");
}

function expectedChecksum(manifest: VisionManifest) {
  const checksum = (process.env.VISION_MODEL_SHA256 || manifest.sha256).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error("VISION_MODEL_SHA256 must be a SHA-256 hex digest.");
  return checksum;
}

let preparedModel: Promise<{ model: string; manifest: string }> | undefined;

export function prepareVisionModel(root: string) {
  if (preparedModel) return preparedModel;
  const preparation = (async () => {
    const manifestPath = resolve(
      process.env.VISION_MODEL_MANIFEST ?? join(root, "models/releases/wellfarm-vision-v1.json"),
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as VisionManifest;
    const checksum = expectedChecksum(manifest);
    const explicitModel = process.env.VISION_MODEL_PATH;
    const cacheDirectory = resolve(
      process.env.VISION_MODEL_CACHE_DIRECTORY ?? join(root, ".cache", "vision"),
    );
    const modelPath = resolve(explicitModel ?? join(cacheDirectory, basename(manifest.file)));

    if (existsSync(modelPath) && await fileSha256(modelPath) === checksum) {
      return { model: modelPath, manifest: manifestPath };
    }
    if (explicitModel) throw new Error("VISION_MODEL_PATH does not match the configured SHA-256 checksum.");

    const url = process.env.VISION_MODEL_URL || manifest.download_url;
    if (!url || new URL(url).protocol !== "https:") {
      throw new Error("A secure VISION_MODEL_URL is required to download the crop model.");
    }
    await mkdir(cacheDirectory, { recursive: true });
    const temporary = `${modelPath}.${process.pid}.tmp`;
    await rm(temporary, { force: true });
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok || !response.body) throw new Error(`Model download failed (${response.status}).`);
      const advertisedSize = Number(response.headers.get("content-length") || 0);
      if (advertisedSize > maximumModelBytes) throw new Error("Model download is unexpectedly large.");
      await pipeline(Readable.fromWeb(response.body as never), createWriteStream(temporary, { flags: "wx" }));
      if ((await stat(temporary)).size > maximumModelBytes) throw new Error("Model download is unexpectedly large.");
      if (await fileSha256(temporary) !== checksum) throw new Error("Downloaded crop model failed its SHA-256 check.");
      await rm(modelPath, { force: true });
      await rename(temporary, modelPath);
      return { model: modelPath, manifest: manifestPath };
    } finally {
      await rm(temporary, { force: true });
    }
  })();
  preparedModel = preparation.catch((error) => {
    preparedModel = undefined;
    throw error;
  });
  return preparedModel;
}
