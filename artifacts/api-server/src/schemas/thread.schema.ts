import { z } from "zod";

export const ThreadCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  userId: z.string().optional(),
  platform: z.string().optional(),
  personalityId: z.string().default("catbot-default"),
  settings: z
    .object({
      maxMemoryEntries: z.number().int().positive().default(100),
      compressionThreshold: z.number().int().positive().default(50),
      longTermMemoryEnabled: z.boolean().default(true),
      learningEnabled: z.boolean().default(true),
      contextWindowSize: z.number().int().positive().default(20),
      responseStyle: z.enum(["concise", "detailed", "conversational"]).default("conversational"),
    })
    .default({}),
  modelConfig: z
    .object({
      mode: z.string().optional(),
      modelName: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      endpoint: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const ThreadUpdateSchema = ThreadCreateSchema.partial().omit({ id: true });

export type ThreadCreate = z.infer<typeof ThreadCreateSchema>;
export type ThreadUpdate = z.infer<typeof ThreadUpdateSchema>;
