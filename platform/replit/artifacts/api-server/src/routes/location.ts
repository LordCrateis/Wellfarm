import { Router, type IRouter } from "express";
import {
  getApproximateLocation,
  LocationUnavailableError,
} from "../services/location";

const router: IRouter = Router();

router.get("/location", async (req, res, next) => {
  const latitude = Number(req.query["latitude"]);
  const longitude = Number(req.query["longitude"]);

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_COORDINATES",
        message: "Provide valid latitude and longitude coordinates.",
      },
    });
    return;
  }

  try {
    res.json(await getApproximateLocation(latitude, longitude));
  } catch (error) {
    if (error instanceof LocationUnavailableError) {
      res.status(502).json({
        error: {
          code: "LOCATION_UNAVAILABLE",
          message: error.message,
        },
      });
      return;
    }

    next(error);
  }
});

export default router;
