import app from "./app.js";
import { logger } from "./lib/logger.js";
import { updateKnowledgeEmbeddings } from "./core/knowledge-engine.js";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 5000;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, env: process.env["NODE_ENV"] ?? "development" }, "Cat-Bot AI Platform started");
  logger.info({ url: `http://localhost:${port}/api/docs` }, "Swagger docs");
  logger.info({ url: `http://localhost:${port}/api/healthz` }, "Health check");

  updateKnowledgeEmbeddings();
});

const shutdown = (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

export default server;
