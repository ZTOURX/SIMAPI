import { Router, type IRouter } from "express";
import { getModelConfig, listAvailableAdapters } from "../core/inference/adapter-factory.js";
import { getStats as getKnowledgeStats } from "../repositories/knowledge.repository.js";
import { getSummary as getAnalyticsSummary } from "../repositories/analytics.repository.js";
import { cacheMiddleware } from "../middleware/cache.js";
import os from "os";
import process from "process";

const router: IRouter = Router();

const startTime = Date.now();

router.get("/diagnostics", cacheMiddleware(10), async (req, res): Promise<void> => {
  const modelConfig = getModelConfig();
  const adapters = await listAvailableAdapters();
  const knowledgeStats = getKnowledgeStats();
  const analyticsStats = getAnalyticsSummary({ from: Date.now() - 3600000 });

  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    system: {
      uptime: Math.round((Date.now() - startTime) / 1000),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      },
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
      osFreeMem: Math.round(os.freemem() / 1024 / 1024),
      osTotalMem: Math.round(os.totalmem() / 1024 / 1024),
    },
    inference: {
      currentMode: modelConfig.mode ?? "native",
      configuredModel: modelConfig.modelName,
      adapters: adapters.map((a) => ({ mode: a.mode, name: a.name, available: a.available })),
    },
    knowledge: {
      totalEntries: knowledgeStats.total,
      categories: Object.keys(knowledgeStats.byCategory).length,
    },
    analytics: {
      interactionsLastHour: analyticsStats.totalInteractions,
      avgLatencyMs: analyticsStats.avgLatencyMs,
    },
    timestamp: Date.now(),
  });
});

router.get("/diagnostics/memory-test", async (req, res): Promise<void> => {
  const { testText = "This is a test of the memory and embedding system" } = req.query as { testText?: string };
  const { generateEmbedding } = await import("../core/native-ai/embeddings.js");
  const { extractKeywords } = await import("../core/native-ai/keyword-extractor.js");
  const { classifyIntent } = await import("../core/native-ai/intent-classifier.js");

  const start = Date.now();
  const embedding = generateEmbedding(testText);
  const keywords = extractKeywords(testText, 5);
  const intent = classifyIntent(testText);

  res.json({
    testText,
    embeddingDimensions: embedding.length,
    embeddingNorm: Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)),
    keywords,
    intent,
    processingMs: Date.now() - start,
  });
});

router.get("/diagnostics/inference-test", async (req, res): Promise<void> => {
  const { NativeAdapter } = await import("../core/inference/native-adapter.js");
  const adapter = new NativeAdapter();
  const start = Date.now();
  try {
    const result = await adapter.infer({
      prompt: "Hello, are you operational?",
      threadId: "diag-test",
    });
    res.json({
      success: true,
      response: result.text,
      mode: result.mode,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err), latencyMs: Date.now() - start });
  }
});

export default router;
