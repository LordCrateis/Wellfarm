import { Router, type IRouter } from "express";
import advisoryRouter from "./advisory";
import healthRouter from "./health";
import locationRouter from "./location";
import scansRouter from "./scans";
import weatherRouter from "./weather";
import accountRouter, { requireAccount } from "./account";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountRouter);
router.use(adminRouter);
router.use("/advisory", requireAccount);
router.use(advisoryRouter);
router.use(locationRouter);
router.use("/scans", requireAccount);
router.use(scansRouter);
router.use(weatherRouter);

export default router;
