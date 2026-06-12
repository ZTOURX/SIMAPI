import { z } from "zod";

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(32000),
  threadId: z.string().min(1),
  userId: z.string().optional(),
  personalityId: z.string().optional(),
  modelOverride: z
    .object({
      mode: z.enum(["native", "ollama", "llama_cpp", "vllm", "lm_studio", "custom"]).optional(),
      modelName: z.string().optional(),
      endpoint: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional(),
    })
    .optional(),
  contextOverride: z
    .object({
      systemPrompt: z.string().optional(),
      includeMemory: z.boolean().optional(),
      includeKnowledge: z.boolean().optional(),
    })
    .optional(),
});

export const ChatResponseSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  message: z.string(),
  response: z.string(),
  model: z.string(),
  mode: z.string(),
  latencyMs: z.number(),
  tokensUsed: z.number().optional(),
  intent: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  timestamp: z.number(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
