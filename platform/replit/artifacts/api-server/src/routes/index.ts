import { Router, type IRouter } from "express";
import healthRouter from "./health";
import locationRouter from "./location";
import scansRouter from "./scans";
import weatherRouter from "./weather";

const router: IRouter = Router();

router.use(healthRouter);
router.use(locationRouter);
router.use(scansRouter);
router.use(weatherRouter);

export default router;
