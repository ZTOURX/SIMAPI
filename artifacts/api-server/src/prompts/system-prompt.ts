import type { Personality } from "../types/personality.types.js";
import type { MemoryEntry } from "../types/memory.types.js";
import type { KnowledgeEntry } from "../types/knowledge.types.js";

export interface PromptContext {
  personality: Personality;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  relevantMemory?: MemoryEntry[];
  relevantKnowledge?: KnowledgeEntry[];
  threadContext?: Record<string, unknown>;
  userId?: string;
  platform?: string;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const { personality, relevantMemory, relevantKnowledge, threadContext, platform } = ctx;
  const parts: string[] = [personality.systemPrompt || "You are Cat-Bot, a helpful AI assistant."];

  if (platform) {
    parts.push(`\nCurrent platform: ${platform}`);
  }

  if (relevantMemory && relevantMemory.length > 0) {
    parts.push("\n--- Relevant Memory ---");
    for (const mem of relevantMemory.slice(0, 5)) {
      parts.push(`[${mem.type.toUpperCase()}] ${mem.content}`);
    }
    parts.push("--- End Memory ---");
  }

  if (relevantKnowledge && relevantKnowledge.length > 0) {
    parts.push("\n--- Relevant Knowledge ---");
    for (const k of relevantKnowledge.slice(0, 3)) {
      parts.push(`[${k.category}] ${k.title}: ${k.content.substring(0, 500)}`);
    }
    parts.push("--- End Knowledge ---");
  }

  if (threadContext && Object.keys(threadContext).length > 0) {
    const ctxStr = Object.entries(threadContext)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
    parts.push(`\nThread context: ${ctxStr}`);
  }

  if (personality.traits.length > 0) {
    const dominantTraits = personality.traits
      .filter((t) => t.value > 0.6)
      .map((t) => t.name)
      .join(", ");
    if (dominantTraits) {
      parts.push(`\nYour dominant traits: ${dominantTraits}`);
    }
  }

  const style = personality.style;
  if (style) {
    const styleNotes: string[] = [];
    if (style.tone) styleNotes.push(`Tone: ${style.tone}`);
    if (style.verbosity === "minimal") styleNotes.push("Keep responses brief");
    if (style.verbosity === "verbose") styleNotes.push("Provide detailed, comprehensive responses");
    if (style.emojiUsage === "none") styleNotes.push("Do not use emojis");
    if (style.emojiUsage === "heavy") styleNotes.push("Use emojis liberally");
    if (!style.useMarkdown) styleNotes.push("Use plain text, not markdown");
    if (styleNotes.length > 0) {
      parts.push(`\nStyle guidelines: ${styleNotes.join("; ")}`);
    }
  }

  return parts.join("\n");
}

export function buildConversationContext(
  messages: Array<{ role: string; content: string }>,
  maxMessages = 20
): Array<{ role: string; content: string }> {
  return messages.slice(-maxMessages);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
