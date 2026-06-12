import { z } from "zod";

export const PersonalityTraitSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(1),
  description: z.string(),
});

export const PersonalityStyleSchema = z.object({
  tone: z.enum(["formal", "casual", "friendly", "professional", "playful"]).default("friendly"),
  verbosity: z.enum(["minimal", "moderate", "verbose"]).default("moderate"),
  emojiUsage: z.enum(["none", "minimal", "moderate", "heavy"]).default("minimal"),
  useMarkdown: z.boolean().default(false),
  language: z.string().default("en"),
});

export const PersonalityCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  systemPrompt: z.string().default(""),
  traits: z.array(PersonalityTraitSchema).default([]),
  greetings: z.array(z.string()).default([]),
  farewells: z.array(z.string()).default([]),
  fallbacks: z.array(z.string()).default([]),
  style: PersonalityStyleSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
  isDefault: z.boolean().default(false),
});

export const PersonalityUpdateSchema = PersonalityCreateSchema.partial();

export type PersonalityCreate = z.infer<typeof PersonalityCreateSchema>;
export type PersonalityUpdate = z.infer<typeof PersonalityUpdateSchema>;
