import { Router, type IRouter } from "express";
import * as analyticsRepo from "../repositories/analytics.repository.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router: IRouter = Router();

router.get("/analytics/summary", cacheMiddleware(60), async (req, res): Promise<void> => {
  const from = req.query["from"] ? parseInt(req.query["from"] as string, 10) : undefined;
  const to = req.query["to"] ? parseInt(req.query["to"] as string, 10) : undefined;
  const threadId = req.query["threadId"] as string | undefined;
  const summary = analyticsRepo.getSummary({ from, to, threadId });
  res.json(summary);
});

router.get("/analytics/recent", cacheMiddleware(10), async (req, res): Promise<void> => {
  const limit = parseInt((req.query["limit"] as string) ?? "50", 10);
  const interactions = analyticsRepo.getRecentInteractions(limit);
  res.json({ interactions, count: interactions.length });
});

router.get("/analytics/thread/:threadId", cacheMiddleware(30), async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const summary = analyticsRepo.getSummary({ threadId });
  res.json(summary);
});

export default router;
