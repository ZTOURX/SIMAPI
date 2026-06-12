import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { globalRateLimiter } from "./middleware/rate-limiter.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { swaggerSpec } from "./swagger.js";

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

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(globalRateLimiter);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Cat-Bot AI Platform API",
}));

app.get("/api/openapi.json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({
    name: "Cat-Bot AI Platform",
    version: "1.0.0",
    description: "Self-hosted AI backend for Cat-Bot SIM",
    status: "operational",
    docs: "/api/docs",
    health: "/api/healthz",
    endpoints: {
      chat: "POST /api/chat",
      memory: "/api/memory/:threadId",
      threads: "/api/threads",
      knowledge: "/api/knowledge",
      personality: "/api/personality",
      analytics: "/api/analytics/summary",
      models: "/api/models/config",
      admin: "/api/admin/overview",
      diagnostics: "/api/diagnostics",
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
