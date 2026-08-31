import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkDatabase } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  try {
    checkDatabase();
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    res.status(503).json({ status: "error" });
  }
});

export default router;
