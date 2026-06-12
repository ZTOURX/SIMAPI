import type { MemoryEntry } from "../types/memory.types.js";
import type { Thread } from "../types/thread.types.js";
import * as memRepo from "../repositories/memory.repository.js";
import { extractKeywords } from "./native-ai/keyword-extractor.js";
import { generateEmbedding, findMostSimilar } from "./native-ai/embeddings.js";
import { classifyIntent } from "./native-ai/intent-classifier.js";
import { logger } from "../lib/logger.js";

export function recordUserMessage(threadId: string, content: string, userId?: string): void {
  const intent = classifyIntent(content);
  const keywords = extractKeywords(content, 5);
  memRepo.addMessage(threadId, {
    role: "user",
    content,
    timestamp: Date.now(),
    intent: intent.label,
    keywords,
  });
}

export function recordAssistantMessage(threadId: string, content: string): void {
  memRepo.addMessage(threadId, {
    role: "assistant",
    content,
    timestamp: Date.now(),
  });
}

export function extractAndStoreFacts(threadId: string, userMessage: string, userId?: string): void {
  const lower = userMessage.toLowerCase();

  const factPatterns = [
    { pattern: /my name is ([a-z\s]+)/i, type: "fact" as const, prefix: "User's name is" },
    { pattern: /i am ([a-z\s]+) years? old/i, type: "fact" as const, prefix: "User's age is" },
    { pattern: /i like ([a-z\s,]+)/i, type: "preference" as const, prefix: "User likes" },
    { pattern: /i prefer ([a-z\s,]+)/i, type: "preference" as const, prefix: "User prefers" },
    { pattern: /i hate ([a-z\s,]+)/i, type: "preference" as const, prefix: "User dislikes" },
    { pattern: /i work (?:at|for) ([a-z\s]+)/i, type: "fact" as const, prefix: "User works at" },
    { pattern: /i(?:'m| am) (?:a |an )?([a-z\s]+)/i, type: "fact" as const, prefix: "User is" },
    { pattern: /remember that ([^.!?]+)/i, type: "instruction" as const, prefix: "Remember" },
    { pattern: /don'?t forget ([^.!?]+)/i, type: "instruction" as const, prefix: "Remember" },
  ];

  for (const { pattern, type, prefix } of factPatterns) {
    const match = userMessage.match(pattern);
    if (match) {
      const value = match[1]?.trim();
      if (value && value.length > 1) {
        const content = `${prefix}: ${value}`;
        const lt = memRepo.getLongTerm(threadId);
        const isDuplicate = lt.entries.some((e) => e.content === content);
        if (!isDuplicate) {
          memRepo.addLongTermEntry(threadId, {
            threadId,
            userId,
            content,
            type,
            importance: type === "instruction" ? 0.9 : type === "preference" ? 0.7 : 0.6,
            tags: extractKeywords(content, 3),
            embedding: generateEmbedding(content),
          });
          logger.debug({ threadId, fact: content }, "Fact extracted and stored");
        }
      }
    }
  }
}

export function retrieveRelevantMemory(threadId: string, query: string, limit = 5): MemoryEntry[] {
  const lt = memRepo.getLongTerm(threadId);
  if (lt.entries.length === 0) return [];

  const results = findMostSimilar(
    query,
    lt.entries,
    (e) => e.content,
    limit,
    0.1
  );

  return results.map((r) => r.item);
}

export function compressIfNeeded(thread: Thread): void {
  const st = memRepo.getShortTerm(thread.id);
  const threshold = thread.settings.compressionThreshold;

  if (st.messages.length >= threshold) {
    const archived = memRepo.compressShortTerm(thread.id, thread.settings.contextWindowSize);
    if (archived.length > 0 && thread.settings.longTermMemoryEnabled) {
      const summary = archived
        .map((m) => `${m.role}: ${m.content}`)
        .join(" | ")
        .substring(0, 1000);

      memRepo.addLongTermEntry(thread.id, {
        threadId: thread.id,
        content: `Conversation summary: ${summary}`,
        type: "conversation",
        importance: 0.4,
        tags: ["summary", "compressed"],
        embedding: generateEmbedding(summary),
      });
    }
    logger.info({ threadId: thread.id, archived: archived.length }, "Memory compressed");
  }
}

export function getConversationContext(threadId: string, windowSize = 20): Array<{ role: string; content: string }> {
  const messages = memRepo.getMessages(threadId, windowSize);
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export { memRepo };
