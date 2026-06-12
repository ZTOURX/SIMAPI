import { Router, type IRouter } from "express";
import * as memRepo from "../repositories/memory.repository.js";
import { MemoryEntryCreateSchema, MemorySearchSchema, MemoryCompressSchema } from "../schemas/memory.schema.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router: IRouter = Router();

router.get("/memory/:threadId", cacheMiddleware(30), async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const limit = parseInt((req.query["limit"] as string) ?? "20", 10);
  const messages = memRepo.getMessages(threadId, limit);
  const context = memRepo.getContext(threadId);
  const stats = memRepo.getMemoryStats(threadId);
  res.json({ threadId, messages, context, stats });
});

router.get("/memory/:threadId/long-term", cacheMiddleware(30), async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const lt = memRepo.getLongTerm(threadId);
  res.json(lt);
});

router.get("/memory/:threadId/stats", cacheMiddleware(15), async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const stats = memRepo.getMemoryStats(threadId);
  res.json(stats);
});

router.post("/memory/search", async (req, res): Promise<void> => {
  const parsed = MemorySearchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const { threadId, query, limit, type, minImportance } = parsed.data;
  let results = memRepo.searchLongTerm(threadId, query, limit);
  if (type) results = results.filter((e) => e.type === type);
  if (minImportance !== undefined) results = results.filter((e) => e.importance >= minImportance);
  res.json({ results, count: results.length });
});

router.post("/memory/entry", async (req, res): Promise<void> => {
  const parsed = MemoryEntryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const entry = memRepo.addLongTermEntry(parsed.data.threadId, parsed.data);
  res.status(201).json(entry);
});

router.post("/memory/compress", async (req, res): Promise<void> => {
  const parsed = MemoryCompressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const archived = memRepo.compressShortTerm(parsed.data.threadId, parsed.data.keepLast);
  res.json({ archived: archived.length, message: "Memory compressed successfully" });
});

router.delete("/memory/:threadId/short-term", async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  memRepo.clearShortTerm(threadId);
  res.json({ message: "Short-term memory cleared" });
});

router.delete("/memory/:threadId/long-term", async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  memRepo.deleteLongTerm(threadId);
  res.json({ message: "Long-term memory deleted" });
});

router.post("/memory/:threadId/context", async (req, res): Promise<void> => {
  const threadId = Array.isArray(req.params.threadId) ? req.params.threadId[0]! : req.params.threadId;
  const { key, value } = req.body as { key?: string; value?: unknown };
  if (!key) {
    res.status(400).json({ error: "key is required" });
    return;
  }
  memRepo.setContext(threadId, key, value);
  res.json({ message: "Context updated", key, value });
});

export default router;
