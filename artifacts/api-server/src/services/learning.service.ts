import { getLongTerm, saveLongTerm } from "../repositories/memory.repository.js";
import { getAllEntries, updateEntry } from "../repositories/knowledge.repository.js";
import { getRecentInteractions } from "../repositories/analytics.repository.js";
import { extractKeywords } from "../core/native-ai/keyword-extractor.js";
import { generateEmbedding } from "../core/native-ai/embeddings.js";
import { savePattern } from "../core/native-ai/pattern-matcher.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger.js";

export interface LearningResult {
  patternsLearned: number;
  embeddingsUpdated: number;
  personalityAdaptations: number;
  knowledgeReinforced: number;
}

export async function runLearningCycle(threadId?: string): Promise<LearningResult> {
  let patternsLearned = 0;
  let embeddingsUpdated = 0;
  let personalityAdaptations = 0;
  let knowledgeReinforced = 0;

  const interactions = getRecentInteractions(200);
  const relevantInteractions = threadId
    ? interactions.filter((i) => i.threadId === threadId)
    : interactions;

  const intentFreq: Record<string, number> = {};
  for (const interaction of relevantInteractions) {
    if (interaction.intent) {
      intentFreq[interaction.intent] = (intentFreq[interaction.intent] ?? 0) + 1;
    }
  }

  const avgLatency = relevantInteractions.length > 0
    ? relevantInteractions.reduce((s, i) => s + i.latencyMs, 0) / relevantInteractions.length
    : 0;
  logger.debug({ avgLatency, intentDistribution: intentFreq }, "Learning cycle: interaction analysis");

  const knowledgeEntries = getAllEntries();
  for (const entry of knowledgeEntries) {
    if (!entry.embedding || entry.embedding.length === 0) {
      const newEmbedding = generateEmbedding(`${entry.title} ${entry.content}`);
      updateEntry(entry.id, { embedding: newEmbedding });
      embeddingsUpdated++;
    }
  }

  if (threadId) {
    const lt = getLongTerm(threadId);
    const topics: Record<string, number> = {};

    for (const entry of lt.entries) {
      const kws = extractKeywords(entry.content, 3);
      for (const kw of kws) {
        topics[kw] = (topics[kw] ?? 0) + entry.importance;
      }
    }

    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    if (topTopics.length > 0) {
      lt.personality.preferredTopics = topTopics;
      personalityAdaptations++;
    }

    const domainFacts = lt.entries.filter((e) => e.type === "fact" && e.importance > 0.7);
    for (const fact of domainFacts.slice(0, 3)) {
      const kws = extractKeywords(fact.content, 3);
      if (kws.length >= 2) {
        savePattern({
          id: `learned-${uuidv4().slice(0, 8)}`,
          triggers: kws,
          response: `Based on what I know: ${fact.content}`,
          intent: "knowledge",
          priority: 3,
        });
        patternsLearned++;
      }
    }

    for (const entry of lt.entries) {
      if (!entry.embedding) {
        const emb = generateEmbedding(entry.content);
        const idx = lt.entries.findIndex((e) => e.id === entry.id);
        if (idx >= 0) {
          lt.entries[idx]!.embedding = emb;
          embeddingsUpdated++;
        }
      }
    }

    saveLongTerm(lt);
  }

  const highAccessKnowledge = knowledgeEntries.filter((e) => e.accessCount > 5);
  knowledgeReinforced = highAccessKnowledge.length;

  logger.info(
    { threadId, patternsLearned, embeddingsUpdated, personalityAdaptations, knowledgeReinforced },
    "Learning cycle complete"
  );

  return { patternsLearned, embeddingsUpdated, personalityAdaptations, knowledgeReinforced };
}

export function getPersonalityInsights(threadId: string) {
  const lt = getLongTerm(threadId);
  const facts = lt.entries.filter((e) => e.type === "fact");
  const preferences = lt.entries.filter((e) => e.type === "preference");
  const instructions = lt.entries.filter((e) => e.type === "instruction");

  return {
    threadId,
    totalMemories: lt.entries.length,
    facts: facts.length,
    preferences: preferences.length,
    instructions: instructions.length,
    topTopics: lt.personality.preferredTopics,
    adaptations: lt.personality.adaptations,
    firstSeen: lt.firstSeen,
    lastSeen: lt.lastSeen,
    totalInteractions: lt.totalInteractions,
  };
}
