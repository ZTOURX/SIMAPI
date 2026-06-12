import { Router, type IRouter } from "express";
import {
  getModelConfig,
  saveModelConfig,
  listAvailableAdapters,
  createAdapterWithFallback,
} from "../core/inference/adapter-factory.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { z } from "zod";

const router: IRouter = Router();

const ModelConfigSchema = z.object({
  mode: z.enum(["native", "ollama", "llama_cpp", "vllm", "lm_studio", "custom"]).optional(),
  endpoint: z.string().optional(),
  modelName: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

router.get("/models/config", cacheMiddleware(30), async (req, res): Promise<void> => {
  const config = getModelConfig();
  const sanitized = { ...config, apiKey: config.apiKey ? "***" : undefined };
  res.json(sanitized);
});

router.put("/models/config", async (req, res): Promise<void> => {
  const parsed = ModelConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.issues });
    return;
  }
  const current = getModelConfig();
  const updated = { ...current, ...parsed.data };
  saveModelConfig(updated);
  res.json({ message: "Model configuration updated", config: { ...updated, apiKey: updated.apiKey ? "***" : undefined } });
});

router.get("/models/available", cacheMiddleware(15), async (req, res): Promise<void> => {
  const adapters = await listAvailableAdapters();
  res.json({ adapters });
});

router.post("/models/test", async (req, res): Promise<void> => {
  const { prompt = "Hello, are you working?" } = req.body as { prompt?: string };
  const config = getModelConfig();
  const start = Date.now();
  try {
    const adapter = await createAdapterWithFallback(config);
    const response = await adapter.infer({
      prompt,
      threadId: "test",
    });
    res.json({
      success: true,
      response: response.text,
      model: response.model,
      mode: response.mode,
      latencyMs: Date.now() - start,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: String(err),
      latencyMs: Date.now() - start,
    });
  }
});

export default router;
