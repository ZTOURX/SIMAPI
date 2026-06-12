import { Router, type IRouter } from "express";
import * as threadRepo from "../repositories/thread.repository.js";
import { ThreadCreateSchema, ThreadUpdateSchema } from "../schemas/thread.schema.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router: IRouter = Router();

router.get("/threads", cacheMiddleware(10), async (req, res): Promise<void> => {
  const userId = req.query["userId"] as string | undefined;
  const threads = threadRepo.listThreads(userId);
  res.json({ threads, count: threads.length });
});

router.post("/threads", async (req, res): Promise<void> => {
  const parsed = ThreadCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const thread = threadRepo.createThread(parsed.data as Parameters<typeof threadRepo.createThread>[0]);
  res.status(201).json(thread);
});

router.get("/threads/:id", cacheMiddleware(15), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const thread = threadRepo.getThread(id);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  res.json(thread);
});

router.patch("/threads/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const parsed = ThreadUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const thread = threadRepo.updateThread(id, parsed.data);
  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  res.json(thread);
});

router.delete("/threads/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const deleted = threadRepo.deleteThread(id);
  if (!deleted) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }
  res.json({ message: "Thread deleted" });
});

export default router;
