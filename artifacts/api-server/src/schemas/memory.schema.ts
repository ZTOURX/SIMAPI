import { z } from "zod";

export const MemoryEntryCreateSchema = z.object({
  threadId: z.string().min(1),
  userId: z.string().optional(),
  content: z.string().min(1),
  type: z.enum(["fact", "preference", "context", "conversation", "instruction", "emotion"]).default("fact"),
  importance: z.number().min(0).max(1).default(0.5),
  tags: z.array(z.string()).default([]),
  expiresAt: z.number().optional(),
});

export const MemorySearchSchema = z.object({
  threadId: z.string().min(1),
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: z.enum(["fact", "preference", "context", "conversation", "instruction", "emotion"]).optional(),
  minImportance: z.coerce.number().min(0).max(1).optional(),
});

export const MemoryCompressSchema = z.object({
  threadId: z.string().min(1),
  keepLast: z.number().int().min(0).default(20),
});

export type MemoryEntryCreate = z.infer<typeof MemoryEntryCreateSchema>;
export type MemorySearch = z.infer<typeof MemorySearchSchema>;
