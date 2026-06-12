import { Router, type IRouter } from "express";
import { ingestKnowledge, retrieveKnowledge, updateKnowledgeEmbeddings } from "../core/knowledge-engine.js";
import * as knRepo from "../repositories/knowledge.repository.js";
import { KnowledgeIngestSchema, KnowledgeSearchSchema, KnowledgeUpdateSchema } from "../schemas/knowledge.schema.js";
import { knowledgeRateLimiter } from "../middleware/rate-limiter.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router: IRouter = Router();

router.get("/knowledge", cacheMiddleware(30), async (req, res): Promise<void> => {
  const category = req.query["category"] as string | undefined;
  const entries = knRepo.listEntries(category);
  const stats = knRepo.getStats();
  res.json({ entries, stats });
});

router.post("/knowledge/ingest", knowledgeRateLimiter, async (req, res): Promise<void> => {
  const parsed = KnowledgeIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const entry = ingestKnowledge(parsed.data);
  res.status(201).json(entry);
});

router.post("/knowledge/ingest/bulk", knowledgeRateLimiter, async (req, res): Promise<void> => {
  const items = req.body as unknown[];
  if (!Array.isArray(items)) {
    res.status(400).json({ error: "Body must be an array of knowledge items" });
    return;
  }
  const results: unknown[] = [];
  const errors: unknown[] = [];
  for (const item of items) {
    const parsed = KnowledgeIngestSchema.safeParse(item);
    if (parsed.success) {
      results.push(ingestKnowledge(parsed.data));
    } else {
      errors.push({ item, error: parsed.error.issues });
    }
  }
  res.status(201).json({ ingested: results.length, errors: errors.length, results, errorDetails: errors });
});

router.post("/knowledge/search", async (req, res): Promise<void> => {
  const parsed = KnowledgeSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const results = await retrieveKnowledge(parsed.data.query, {
    limit: parsed.data.limit,
    category: parsed.data.category,
    threshold: parsed.data.threshold,
  });
  res.json({ results, count: results.length });
});

router.get("/knowledge/:id", cacheMiddleware(60), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const entry = knRepo.getEntry(id);
  if (!entry) {
    res.status(404).json({ error: "Knowledge entry not found" });
    return;
  }
  res.json(entry);
});

router.patch("/knowledge/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const parsed = KnowledgeUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const entry = knRepo.updateEntry(id, parsed.data);
  if (!entry) {
    res.status(404).json({ error: "Knowledge entry not found" });
    return;
  }
  res.json(entry);
});

router.delete("/knowledge/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const deleted = knRepo.deleteEntry(id);
  if (!deleted) {
    res.status(404).json({ error: "Knowledge entry not found" });
    return;
  }
  res.json({ message: "Knowledge entry deleted" });
});

router.get("/knowledge/stats/summary", cacheMiddleware(60), async (req, res): Promise<void> => {
  const stats = knRepo.getStats();
  res.json(stats);
});

router.post("/knowledge/maintenance/reindex", async (req, res): Promise<void> => {
  const updated = updateKnowledgeEmbeddings();
  res.json({ message: "Reindexing complete", updated });
});

export default router;
