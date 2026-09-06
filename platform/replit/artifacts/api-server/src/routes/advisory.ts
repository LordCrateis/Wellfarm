import { Router, type IRouter } from "express";
import {
  AdvisoryRequestSchema,
  AdvisoryResponseSchema,
} from "@workspace/api-zod";
import { explainAnalysis } from "../services/advisory";

const router: IRouter = Router();

router.post("/advisory/explain", async (req, res, next) => {
  const parsed = AdvisoryRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "INVALID_ADVISORY_EVIDENCE",
        message: "The crop-analysis evidence is incomplete or invalid.",
        details: parsed.error.issues,
      },
    });
    return;
  }

  try {
    const explanation = await explainAnalysis(parsed.data);
    res.json(AdvisoryResponseSchema.parse(explanation));
  } catch (error) {
    next(error);
  }
});

export default router;
