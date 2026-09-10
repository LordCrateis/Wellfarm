import { randomUUID } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  readSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import multer from "multer";
import { resolveEnvironmentPath } from "@workspace/db";
import { supabaseAdmin } from "../services/supabase-auth";
import { scanImageBucket, usesSupabaseScanStore } from "../services/scan-store";

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export const uploadDirectory = resolveEnvironmentPath(
  process.env.UPLOAD_DIRECTORY ?? "./data/uploads",
);

mkdirSync(uploadDirectory, { recursive: true });

export const imageUpload = multer({
  storage: usesSupabaseScanStore()
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: uploadDirectory,
        filename(_req, file, callback) {
          callback(null, `${randomUUID()}${mimeExtensions[file.mimetype] ?? ""}`);
        },
      }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 0,
  },
  fileFilter(_req, file, callback) {
    callback(null, Object.hasOwn(mimeExtensions, file.mimetype));
  },
});

export function isSupportedImage(filePath: string, mimeType: string): boolean {
  const descriptor = openSync(filePath, "r");
  const header = Buffer.alloc(8);

  try {
    readSync(descriptor, header, 0, header.length, 0);
  } finally {
    closeSync(descriptor);
  }

  if (mimeType === "image/jpeg") {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }

  return (
    mimeType === "image/png" &&
    header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  );
}

export function isSupportedImageBuffer(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

let bucketReady: Promise<void> | undefined;
async function ensureScanImageBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const client = supabaseAdmin();
      const existing = await client.storage.getBucket(scanImageBucket);
      if (!existing.error) return;
      const created = await client.storage.createBucket(scanImageBucket, {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: Object.keys(mimeExtensions),
      });
      if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
    })().catch((error) => { bucketReady = undefined; throw error; });
  }
  return bucketReady;
}

export async function uploadStoredImage(ownerId: string, scanId: string, file: Express.Multer.File): Promise<string> {
  if (!usesSupabaseScanStore()) return file.filename;
  await ensureScanImageBucket();
  const objectPath = `${ownerId}/${scanId}/${randomUUID()}${mimeExtensions[file.mimetype]}`;
  const { error } = await supabaseAdmin().storage.from(scanImageBucket).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Could not store the crop image: ${error.message}`);
  return objectPath;
}

export async function downloadStoredImage(objectPath: string): Promise<Buffer | undefined> {
  if (!usesSupabaseScanStore()) return undefined;
  const { data, error } = await supabaseAdmin().storage.from(scanImageBucket).download(objectPath);
  if (error || !data) return undefined;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeRemoteImages(objectPaths: string[]): Promise<void> {
  if (!usesSupabaseScanStore() || objectPaths.length === 0) return;
  const { error } = await supabaseAdmin().storage.from(scanImageBucket).remove(objectPaths);
  if (error) throw new Error(`Could not delete stored crop images: ${error.message}`);
}

export function storedImagePath(filename: string): string | undefined {
  if (filename !== basename(filename)) {
    return undefined;
  }

  const fullPath = resolve(uploadDirectory, filename);
  return dirname(fullPath) === uploadDirectory ? fullPath : undefined;
}

export function removeStoredImage(filename: string): void {
  const fullPath = storedImagePath(filename);
  if (fullPath) {
    for (const target of [fullPath, `${fullPath}.analysis.json`, `${fullPath}.analysis.json.tmp`]) {
      if (existsSync(target)) unlinkSync(target);
    }
  }
}

export function openStoredImage(filename: string) {
  const fullPath = storedImagePath(filename);
  return fullPath && existsSync(fullPath) ? createReadStream(fullPath) : undefined;
}
