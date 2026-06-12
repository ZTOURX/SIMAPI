import type { KnowledgeEntry } from "../types/knowledge.types.js";
import * as knRepo from "../repositories/knowledge.repository.js";
import { extractKeywords } from "./native-ai/keyword-extractor.js";
import { generateEmbedding, findMostSimilar } from "./native-ai/embeddings.js";
import { logger } from "../lib/logger.js";

export function ingestKnowledge(data: {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  source?: string;
}): KnowledgeEntry {
  const keywords = extractKeywords(`${data.title} ${data.content}`, 15);
  const embedding = generateEmbedding(`${data.title} ${data.content}`);

  const entry = knRepo.addEntry({
    title: data.title,
    content: data.content,
    category: data.category ?? "general",
    tags: data.tags ?? [],
    source: data.source,
    keywords,
    embedding,
  });

  logger.info({ entryId: entry.id, category: entry.category }, "Knowledge ingested");
  return entry;
}

export function retrieveKnowledge(query: string, options: {
  limit?: number;
  category?: string;
  threshold?: number;
} = {}): Array<{ entry: KnowledgeEntry; score: number }> {
  const { limit = 5, category, threshold = 0.1 } = options;

  const keywordResults = knRepo.searchEntries(query, { limit: limit * 2, category, threshold });

  const allEntries = knRepo.getAllEntries().filter((e) => !category || e.category === category);
  const semanticResults = findMostSimilar(
    query,
    allEntries,
    (e) => `${e.title} ${e.content}`,
    limit,
    threshold
  ).map((r) => ({ entry: r.item, score: r.score * 0.8 }));

  const combined = new Map<string, { entry: KnowledgeEntry; score: number }>();
  for (const r of keywordResults) {
    combined.set(r.entry.id, r);
  }
  for (const r of semanticResults) {
    const existing = combined.get(r.entry.id);
    if (!existing || r.score > existing.score) {
      combined.set(r.entry.id, { entry: r.entry, score: Math.max(r.score, existing?.score ?? 0) });
    }
  }

  const results = Array.from(combined.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const r of results) {
    knRepo.incrementAccessCount(r.entry.id);
  }

  return results;
}

export function updateKnowledgeEmbeddings(): number {
  const entries = knRepo.getAllEntries();
  let updated = 0;
  for (const entry of entries) {
    if (!entry.embedding || entry.embedding.length === 0) {
      const embedding = generateEmbedding(`${entry.title} ${entry.content}`);
      const keywords = extractKeywords(`${entry.title} ${entry.content}`, 15);
      knRepo.updateEntry(entry.id, { embedding, keywords });
      updated++;
    }
  }
  return updated;
}
