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

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export const uploadDirectory = resolveEnvironmentPath(
  process.env.UPLOAD_DIRECTORY ?? "./data/uploads",
);

mkdirSync(uploadDirectory, { recursive: true });

export const imageUpload = multer({
  storage: multer.diskStorage({
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

export function storedImagePath(filename: string): string | undefined {
  if (filename !== basename(filename)) {
    return undefined;
  }

  const fullPath = resolve(uploadDirectory, filename);
  return dirname(fullPath) === uploadDirectory ? fullPath : undefined;
}

export function removeStoredImage(filename: string): void {
  const fullPath = storedImagePath(filename);
  if (fullPath && existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

export function openStoredImage(filename: string) {
  const fullPath = storedImagePath(filename);
  return fullPath && existsSync(fullPath) ? createReadStream(fullPath) : undefined;
}
