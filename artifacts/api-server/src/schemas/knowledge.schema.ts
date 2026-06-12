import { z } from "zod";

export const KnowledgeIngestSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().default("general"),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
});

export const KnowledgeSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  threshold: z.coerce.number().min(0).max(1).default(0.1),
});

export const KnowledgeUpdateSchema = KnowledgeIngestSchema.partial();

export type KnowledgeIngest = z.infer<typeof KnowledgeIngestSchema>;
export type KnowledgeSearch = z.infer<typeof KnowledgeSearchSchema>;
