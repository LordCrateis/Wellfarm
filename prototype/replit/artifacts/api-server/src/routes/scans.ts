import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  CreateScanBody,
  CreateScanResponse,
  GetScanParams,
  GetScanResponse,
} from "@workspace/api-zod";
import { db, scans, type Scan } from "@workspace/db";

const router: IRouter = Router();

function decodeSymptoms(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
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
    imagePath: scan.imagePath,
    status: scan.status,
    createdAt: scan.createdAt,
    updatedAt: scan.updatedAt,
  };
}

function validationError(issues: Array<{ path: PropertyKey[]; message: string }>) {
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

router.get("/scans/:scanId", (req, res, next) => {
  const parsed = GetScanParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const scan = db
      .select()
      .from(scans)
      .where(eq(scans.id, parsed.data.scanId))
      .get();

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

export default router;
