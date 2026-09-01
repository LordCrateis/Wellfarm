import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router, type IRouter, type RequestHandler } from "express";
import { desc, eq } from "drizzle-orm";
import multer from "multer";
import {
  CreateScanBody,
  CreateScanResponse,
  GetScanParams,
  GetScanResponse,
} from "@workspace/api-zod";
import { db, scans, type Scan } from "@workspace/db";
import {
  imageUpload,
  isSupportedImage,
  openStoredImage,
  removeStoredImage,
} from "../lib/uploads";

const router: IRouter = Router();

function decodeSymptoms(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

function toResponse(scan: Scan) {
  return {
    id: scan.id,
    crop: scan.crop,
    symptoms: decodeSymptoms(scan.symptoms),
    affectedPart: scan.affectedPart ?? undefined,
    growthStage: scan.growthStage ?? undefined,
    affectedAreaPercentage: scan.affectedAreaPercentage ?? undefined,
    nearbyPlantsAffected: scan.nearbyPlantsAffected ?? undefined,
    notes: scan.notes ?? undefined,
    latitude: scan.latitude,
    longitude: scan.longitude,
    imagePath: scan.imagePath ? `/api/scans/${scan.id}/image` : null,
    status: scan.status,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
  };
}

function validationError(
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  return {
    error: {
      code: "INVALID_SCAN_DATA",
      message: "The scan data is invalid.",
      details: issues.map((issue) => ({
        field: issue.path.map(String).join("."),
        message: issue.message,
      })),
    },
  };
}

function findScan(scanId: string): Scan | undefined {
  return db.select().from(scans).where(eq(scans.id, scanId)).get();
}

const requireExistingScan: RequestHandler = (req, res, next) => {
  const parsed = GetScanParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  const scan = findScan(parsed.data.scanId);
  if (!scan) {
    res.status(404).json({
      error: {
        code: "SCAN_NOT_FOUND",
        message: "No scan exists with that identifier.",
      },
    });
    return;
  }

  res.locals.scan = scan;
  next();
};

const uploadOneImage: RequestHandler = (req, res, next) => {
  imageUpload.single("image")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? "IMAGE_TOO_LARGE" : "INVALID_IMAGE_UPLOAD",
          message: tooLarge
            ? "The crop image must be 10 MB or smaller."
            : "The crop image upload is invalid.",
        },
      });
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};

router.post("/scans", (req, res, next) => {
  const parsed = CreateScanBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const now = new Date();
    const input = parsed.data;
    const scan = db
      .insert(scans)
      .values({
        id: randomUUID(),
        crop: input.crop,
        symptoms: input.symptoms ? JSON.stringify(input.symptoms) : null,
        affectedPart: input.affectedPart ?? null,
        growthStage: input.growthStage ?? null,
        affectedAreaPercentage: input.affectedAreaPercentage ?? null,
        nearbyPlantsAffected: input.nearbyPlantsAffected ?? null,
        notes: input.notes ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        imagePath: null,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    res.status(201).json(CreateScanResponse.parse(toResponse(scan)));
  } catch (error) {
    next(error);
  }
});

router.get("/scans", (_req, res, next) => {
  try {
    const storedScans = db
      .select()
      .from(scans)
      .orderBy(desc(scans.createdAt))
      .limit(100)
      .all();

    res.json(
      storedScans.map((scan) => CreateScanResponse.parse(toResponse(scan))),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/scans/:scanId", (req, res, next) => {
  const parsed = GetScanParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const scan = findScan(parsed.data.scanId);

    if (!scan) {
      res.status(404).json({
        error: {
          code: "SCAN_NOT_FOUND",
          message: "No scan exists with that identifier.",
        },
      });
      return;
    }

    res.json(GetScanResponse.parse(toResponse(scan)));
  } catch (error) {
    next(error);
  }
});

router.post(
  "/scans/:scanId/image",
  requireExistingScan,
  uploadOneImage,
  (req, res, next) => {
    const file = req.file;
    const existingScan = res.locals.scan as Scan;

    if (!file) {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_IMAGE",
          message: "Attach one genuine JPG or PNG file in the image field.",
        },
      });
      return;
    }

    try {
      if (!isSupportedImage(file.path, file.mimetype)) {
        removeStoredImage(file.filename);
        res.status(415).json({
          error: {
            code: "UNSUPPORTED_IMAGE",
            message: "Attach one genuine JPG or PNG file in the image field.",
          },
        });
        return;
      }

      const scan = db
        .update(scans)
        .set({ imagePath: file.filename, updatedAt: new Date() })
        .where(eq(scans.id, existingScan.id))
        .returning()
        .get();

      if (existingScan.imagePath && existingScan.imagePath !== file.filename) {
        removeStoredImage(existingScan.imagePath);
      }

      res.json(CreateScanResponse.parse(toResponse(scan)));
    } catch (error) {
      removeStoredImage(file.filename);
      next(error);
    }
  },
);

router.get("/scans/:scanId/image", requireExistingScan, (_req, res, next) => {
  const scan = res.locals.scan as Scan;

  if (!scan.imagePath) {
    res.status(404).json({
      error: {
        code: "IMAGE_NOT_FOUND",
        message: "This scan does not have an uploaded image.",
      },
    });
    return;
  }

  const stream = openStoredImage(scan.imagePath);
  if (!stream) {
    res.status(404).json({
      error: {
        code: "IMAGE_NOT_FOUND",
        message: "The stored scan image could not be found.",
      },
    });
    return;
  }

  res.type(extname(scan.imagePath));
  res.setHeader("Cache-Control", "private, max-age=3600");
  stream.on("error", next);
  stream.pipe(res);
});

export default router;
