import { Router, type IRouter } from "express";
import { runLearningCycle, getPersonalityInsights } from "../services/learning.service.js";
import { invalidateCache } from "../middleware/cache.js";
import { listThreads } from "../repositories/thread.repository.js";
import { getStats as getKnowledgeStats } from "../repositories/knowledge.repository.js";
import { getSummary as getAnalyticsSummary } from "../repositories/analytics.repository.js";
import { listPersonalities } from "../repositories/personality.repository.js";
import { getModelConfig, listAvailableAdapters } from "../core/inference/adapter-factory.js";
import { getDataPath } from "../storage/json-store.js";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

router.get("/admin/overview", async (req, res): Promise<void> => {
  const threads = listThreads();
  const knowledgeStats = getKnowledgeStats();
  const analyticsStats = getAnalyticsSummary();
  const personalities = listPersonalities();
  const modelConfig = getModelConfig();
  const availableAdapters = await listAvailableAdapters();

  res.json({
    threads: { total: threads.length, active: threads.filter((t) => t.isActive).length },
    knowledge: knowledgeStats,
    analytics: {
      totalInteractions: analyticsStats.totalInteractions,
      avgLatencyMs: analyticsStats.avgLatencyMs,
    },
    personalities: { total: personalities.length },
    model: { mode: modelConfig.mode, name: modelConfig.modelName },
    adapters: availableAdapters,
    timestamp: Date.now(),
  });
});

router.post("/admin/learn", async (req, res): Promise<void> => {
  const { threadId } = req.body as { threadId?: string };
  const result = await runLearningCycle(threadId);
  res.json({ message: "Learning cycle complete", result });
});

router.get("/admin/insights/:threadId", async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const insights = getPersonalityInsights(threadId);
  res.json(insights);
});

router.post("/admin/cache/clear", async (req, res): Promise<void> => {
  const { pattern } = req.body as { pattern?: string };
  const cleared = invalidateCache(pattern);
  res.json({ message: "Cache cleared", cleared });
});

router.get("/admin/data/size", async (req, res): Promise<void> => {
  const dataDir = getDataPath();
  let totalSize = 0;
  const breakdown: Record<string, number> = {};

  function calcSize(dir: string, key: string): void {
    try {
      const files = fs.readdirSync(dir);
      let size = 0;
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) size += stat.size;
      }
      breakdown[key] = size;
      totalSize += size;
    } catch {
      breakdown[key] = 0;
    }
  }

  calcSize(getDataPath("memory"), "memory");
  calcSize(getDataPath("threads"), "threads");
  calcSize(getDataPath("knowledge"), "knowledge");
  calcSize(getDataPath("personality"), "personality");
  calcSize(getDataPath("analytics"), "analytics");
  calcSize(getDataPath("models"), "models");

  res.json({ totalBytes: totalSize, totalKB: Math.round(totalSize / 1024), breakdown });
});

router.post("/admin/threads/cleanup", async (req, res): Promise<void> => {
  const { olderThanDays = 30 } = req.body as { olderThanDays?: number };
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const threads = listThreads();
  const toClean = threads.filter((t) => t.lastActivity < cutoff && !t.isActive);
  res.json({
    message: "Cleanup analysis complete",
    eligible: toClean.length,
    threads: toClean.map((t) => ({ id: t.id, lastActivity: t.lastActivity })),
  });
});

export default router;
