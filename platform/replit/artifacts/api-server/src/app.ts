import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [process.env.APP_ORIGIN ?? "http://localhost:5173", `http://${req.get("host")}`, `https://${req.get("host")}`];
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && (req.headers["sec-fetch-site"] === "cross-site" || (origin && !allowed.includes(origin)))) {
    res.status(403).json({error: {message: "Request origin is not allowed."}}); return;
  }
  next();
});
app.use(express.json({limit: "512kb"}));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested API route does not exist.",
    },
  });
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  logger.error({ err: error }, "Unhandled API error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "The server could not complete the request.",
    },
  });
};

app.use("/api", notFoundHandler);
app.use(errorHandler);

export default app;
