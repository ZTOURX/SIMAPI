import { Router, type IRouter } from "express";
import * as personalityRepo from "../repositories/personality.repository.js";
import { PersonalityCreateSchema, PersonalityUpdateSchema } from "../schemas/personality.schema.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router: IRouter = Router();

router.get("/personality", cacheMiddleware(60), async (req, res): Promise<void> => {
  const personalities = personalityRepo.listPersonalities();
  res.json({ personalities, count: personalities.length });
});

router.get("/personality/default", cacheMiddleware(30), async (req, res): Promise<void> => {
  const def = personalityRepo.getDefault();
  res.json(def);
});

router.post("/personality", async (req, res): Promise<void> => {
  const parsed = PersonalityCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const personality = personalityRepo.createPersonality(parsed.data);
  res.status(201).json(personality);
});

router.get("/personality/:id", cacheMiddleware(60), async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const personality = personalityRepo.getPersonality(id);
  if (!personality) {
    res.status(404).json({ error: "Personality not found" });
    return;
  }
  res.json(personality);
});

router.patch("/personality/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  const parsed = PersonalityUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const personality = personalityRepo.updatePersonality(id, parsed.data);
  if (!personality) {
    res.status(404).json({ error: "Personality not found" });
    return;
  }
  res.json(personality);
});

router.delete("/personality/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
  if (id === "catbot-default") {
    res.status(400).json({ error: "Cannot delete the default personality" });
    return;
  }
  const deleted = personalityRepo.deletePersonality(id);
  if (!deleted) {
    res.status(404).json({ error: "Personality not found" });
    return;
  }
  res.json({ message: "Personality deleted" });
});

export default router;
