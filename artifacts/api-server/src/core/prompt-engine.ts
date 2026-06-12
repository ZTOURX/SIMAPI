import type { Personality } from "../types/personality.types.js";
import type { MemoryEntry } from "../types/memory.types.js";
import type { KnowledgeEntry } from "../types/knowledge.types.js";
import { buildSystemPrompt, buildConversationContext, estimateTokens } from "../prompts/system-prompt.js";
import { getDefault, getPersonality } from "../repositories/personality.repository.js";

export interface BuiltPrompt {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  estimatedTokens: number;
  personality: Personality;
}

export function buildPrompt(options: {
  personalityId?: string;
  userMessage: string;
  history: Array<{ role: string; content: string }>;
  memory?: MemoryEntry[];
  knowledge?: KnowledgeEntry[];
  threadContext?: Record<string, unknown>;
  userId?: string;
  platform?: string;
  maxContextMessages?: number;
}): BuiltPrompt {
  const personality = options.personalityId
    ? (getPersonality(options.personalityId) ?? getDefault())
    : getDefault();

  const systemPrompt = buildSystemPrompt({
    personality,
    userMessage: options.userMessage,
    conversationHistory: options.history,
    relevantMemory: options.memory ?? [],
    relevantKnowledge: options.knowledge ?? [],
    threadContext: options.threadContext ?? {},
    userId: options.userId,
    platform: options.platform,
  });

  const contextMessages = buildConversationContext(
    options.history,
    options.maxContextMessages ?? 20
  );

  const messages = [
    ...contextMessages,
    { role: "user", content: options.userMessage },
  ];

  const estimatedTokens = estimateTokens(systemPrompt) +
    messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  return { systemPrompt, messages, estimatedTokens, personality };
}
