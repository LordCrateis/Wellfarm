import { Router, type IRouter } from "express";
import {
  GetWeatherQueryParams,
  GetWeatherResponse,
} from "@workspace/api-zod";
import {
  getCurrentWeather,
  WeatherUnavailableError,
} from "../services/weather";

const router: IRouter = Router();

router.get("/weather", async (req, res, next) => {
  const parsed = GetWeatherQueryParams.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: "INVALID_COORDINATES",
        message: "Provide valid latitude and longitude coordinates.",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.map(String).join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  try {
    const weather = await getCurrentWeather(
      parsed.data.latitude,
      parsed.data.longitude,
    );
    res.json(GetWeatherResponse.parse(weather));
  } catch (error) {
    if (error instanceof WeatherUnavailableError) {
      res.status(502).json({
        error: {
          code: "WEATHER_UNAVAILABLE",
          message: "Live weather is temporarily unavailable.",
        },
      });
      return;
    }

    next(error);
  }
});

export default router;
