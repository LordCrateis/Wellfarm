import { extname } from "node:path";
import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import { analyzeScan, isVisionBusy } from "../services/vision";
import {
  CreateScanBody,
  CreateScanResponse,
  GetScanParams,
  GetScanResponse,
} from "@workspace/api-zod";
import { sqlite } from "@workspace/db";
import {
  downloadStoredImage,
  imageUpload,
  isSupportedImage,
  isSupportedImageBuffer,
  openStoredImage,
  removeRemoteImages,
  removeStoredImage,
  uploadStoredImage,
} from "../lib/uploads";
import { getApproximateLocation } from "../services/location";
import {
  createStoredScan,
  findStoredScan,
  hideStoredScan,
  listRegionalScans,
  listStoredScans,
  persistentOwnerId,
  type StoredScan,
  updateStoredScan,
  usesSupabaseScanStore,
} from "../services/scan-store";
import type { Account } from "./account";

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

function toResponse(scan: StoredScan) {
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

const requireExistingScan: RequestHandler = async (req, res, next) => {
  const parsed = GetScanParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const scan = await findStoredScan(parsed.data.scanId, res.locals.account as Account);
    if (!scan) {
      res.status(404).json({ error: { code: "SCAN_NOT_FOUND", message: "No scan exists with that identifier." } });
      return;
    }
    res.locals.scan = scan;
    next();
  } catch (error) { next(error); }
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

router.post("/scans", async (req, res, next) => {
  const parsed = CreateScanBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const input = parsed.data;
    const accountLocation = sqlite
      .prepare("SELECT state, district FROM accounts WHERE id = ?")
      .get(res.locals.account.id) as { state: string; district: string } | undefined;
    let locationState = accountLocation?.state ?? "";
    let locationDistrict = accountLocation?.district ?? "";
    try {
      const detected = await getApproximateLocation(input.latitude, input.longitude);
      locationState = detected.state ?? locationState;
      locationDistrict = detected.district ?? locationDistrict;
    } catch {
      // A temporary place-name failure must not prevent the farmer saving a scan.
    }
    const scan = await createStoredScan(res.locals.account as Account, { ...input, locationState, locationDistrict });
    res.status(201).json(CreateScanResponse.parse(toResponse(scan)));
  } catch (error) {
    next(error);
  }
});

router.get("/scans", async (_req, res, next) => {
  try {
    const storedScans = await listStoredScans(res.locals.account as Account);

    res.json(
      storedScans.map((scan) => CreateScanResponse.parse(toResponse(scan))),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/scans/regional", async (_req, res, next) => {
  try {
    const allScans = await listRegionalScans();
    const legacyScans = allScans.filter((scan) => !scan.locationState || !scan.locationDistrict).slice(0, 5);
    for (const scan of legacyScans) {
      try {
        const location = await getApproximateLocation(scan.latitude, scan.longitude);
        await updateStoredScan(scan.id, { locationState: location.state ?? "", locationDistrict: location.district ?? "" });
        scan.locationState = location.state ?? "";
        scan.locationDistrict = location.district ?? "";
      } catch {
        // Leave unresolved legacy scans available under the fallback location labels.
      }
    }

    const summaries = await Promise.all(allScans.map(async (scan) => {
      let report: { candidates?: Array<{ condition?: string }>; severity?: string } | null = null;
      if (scan.status === "completed") {
        try {
          report = await analyzeScan(scan, true);
        } catch {
          report = null;
        }
      }
      const severity = report?.severity;
      return {
        crop: scan.crop,
        state: scan.locationState || "Location unavailable",
        district: scan.locationDistrict || "District unavailable",
        latitude: Math.round(scan.latitude * 10) / 10,
        longitude: Math.round(scan.longitude * 10) / 10,
        indication: report?.candidates?.[0]?.condition ?? null,
        severity: severity === "low" || severity === "moderate" || severity === "high" ? severity : null,
        status: report ? "analyzed" : "awaiting-analysis",
        createdAt: scan.createdAt,
      };
    }));

    res.setHeader("Cache-Control", "private, no-store");
    res.json(summaries);
  } catch (error) {
    next(error);
  }
});

router.get("/scans/:scanId", async (req, res, next) => {
  const parsed = GetScanParams.safeParse(req.params);

  if (!parsed.success) {
    res.status(400).json(validationError(parsed.error.issues));
    return;
  }

  try {
    const scan = await findStoredScan(parsed.data.scanId, res.locals.account as Account);

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
  async (req, res, next) => {
    const file = req.file;
    const existingScan = res.locals.scan as StoredScan;

    if (!file) {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_IMAGE",
          message: "Attach one genuine JPG or PNG file in the image field.",
        },
      });
      return;
    }

    let nextImagePath: string | undefined;
    try {
      const supported = usesSupabaseScanStore()
        ? isSupportedImageBuffer(file.buffer, file.mimetype)
        : isSupportedImage(file.path, file.mimetype);
      if (!supported) {
        if (!usesSupabaseScanStore()) removeStoredImage(file.filename);
        res.status(415).json({
          error: {
            code: "UNSUPPORTED_IMAGE",
            message: "Attach one genuine JPG or PNG file in the image field.",
          },
        });
        return;
      }

      nextImagePath = await uploadStoredImage(persistentOwnerId(res.locals.account as Account), existingScan.id, file);
      const scan = await updateStoredScan(existingScan.id, {
        imagePath: nextImagePath,
        imageContentType: file.mimetype,
        analysis: null,
        status: "pending",
      });

      if (existingScan.imagePath && existingScan.imagePath !== nextImagePath) {
        if (usesSupabaseScanStore()) await removeRemoteImages([existingScan.imagePath]).catch(() => undefined);
        else removeStoredImage(existingScan.imagePath);
      }

      res.json(CreateScanResponse.parse(toResponse(scan)));
    } catch (error) {
      if (nextImagePath && usesSupabaseScanStore()) await removeRemoteImages([nextImagePath]).catch(() => undefined);
      else if (!usesSupabaseScanStore()) removeStoredImage(file.filename);
      next(error);
    }
  },
);

router.get("/scans/:scanId/image", requireExistingScan, async (_req, res, next) => {
  const scan = res.locals.scan as StoredScan;

  if (!scan.imagePath) {
    res.status(404).json({
      error: {
        code: "IMAGE_NOT_FOUND",
        message: "This scan does not have an uploaded image.",
      },
    });
    return;
  }

  try {
    res.setHeader("Cache-Control", "private, max-age=3600");
    if (usesSupabaseScanStore()) {
      const image = await downloadStoredImage(scan.imagePath);
      if (!image) { res.status(404).json({ error: { code: "IMAGE_NOT_FOUND", message: "The stored scan image could not be found." } }); return; }
      res.type(scan.imageContentType ?? extname(scan.imagePath));
      res.send(image);
      return;
    }
    const stream = openStoredImage(scan.imagePath);
    if (!stream) { res.status(404).json({ error: { code: "IMAGE_NOT_FOUND", message: "The stored scan image could not be found." } }); return; }
    res.type(extname(scan.imagePath));
    stream.on("error", next);
    stream.pipe(res);
  } catch (error) { next(error); }
});

router.post("/scans/:scanId/analysis", requireExistingScan, async (_req, res) => {
  try {
    const scan = res.locals.scan as StoredScan;
    const result = await analyzeScan(scan);
    // Do not mark a replacement photo complete while an older photo is running.
    const current = await findStoredScan(scan.id, res.locals.account as Account);
    if (current?.imagePath === scan.imagePath) {
      await updateStoredScan(scan.id, { status: "completed" });
    }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error && (error.message.startsWith("Upload") || error.message.startsWith("Another"))
      ? error.message : "Image analysis is unavailable. Check the model files and Python environment, then retry.";
    res.status(503).json({ error: { code: "ANALYSIS_UNAVAILABLE", message } });
  }
});

router.get("/scans/:scanId/analysis", requireExistingScan, async (_req, res, next) => {
  try {
    const result = await analyzeScan(res.locals.scan as StoredScan, true);
    if (!result) { res.status(404).json({ error: { code: "NO_ANALYSIS", message: "This photo has not been analyzed yet." } }); return; }
    res.json(result);
  } catch (error) { next(error); }
});

router.delete("/scans/:scanId", requireExistingScan, async (_req, res, next) => {
  if (isVisionBusy()) {
    res.status(409).json({ error: { message: "Wait for the current analysis to finish before deleting scans." } });
    return;
  }
  try {
    const scan = res.locals.scan as StoredScan;
    await hideStoredScan(scan.id, res.locals.account as Account);
    res.sendStatus(204);
  } catch (error) { next(error); }
});

export default router;
