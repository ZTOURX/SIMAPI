import { v4 as uuidv4 } from "uuid";
import type { KnowledgeEntry } from "../types/knowledge.types.js";
import { readJson, writeJson, getDataPath } from "../storage/json-store.js";
import { logger } from "../lib/logger.js";

const knowledgePath = () => getDataPath("knowledge", "base.json");

function load(): KnowledgeEntry[] {
  return readJson<KnowledgeEntry[]>(knowledgePath(), []);
}

function save(entries: KnowledgeEntry[]): void {
  writeJson(knowledgePath(), entries);
}

export function addEntry(data: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt" | "accessCount">): KnowledgeEntry {
  const entries = load();
  const now = Date.now();
  const entry: KnowledgeEntry = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    accessCount: 0,
    ...data,
  };
  entries.push(entry);
  save(entries);
  logger.info({ entryId: entry.id, title: entry.title }, "Knowledge entry added");
  return entry;
}

export function getEntry(id: string): KnowledgeEntry | null {
  const entries = load();
  return entries.find((e) => e.id === id) ?? null;
}

export function updateEntry(id: string, updates: Partial<KnowledgeEntry>): KnowledgeEntry | null {
  const entries = load();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  entries[idx] = { ...entries[idx]!, ...updates, id, updatedAt: Date.now() };
  save(entries);
  return entries[idx]!;
}

export function deleteEntry(id: string): boolean {
  const entries = load();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  save(filtered);
  return true;
}

export function searchEntries(query: string, options: { limit?: number; category?: string; threshold?: number } = {}): { entry: KnowledgeEntry; score: number }[] {
  const { limit = 10, category, threshold = 0.1 } = options;
  const entries = load();
  const lower = query.toLowerCase();
  const queryTerms = lower.split(/\s+/).filter(Boolean);

  return entries
    .filter((e) => !category || e.category === category)
    .map((e) => {
      const text = `${e.title} ${e.content} ${e.tags.join(" ")} ${e.keywords.join(" ")}`.toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        const count = (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? []).length;
        score += count * (e.title.toLowerCase().includes(term) ? 2 : 1);
      }
      const maxPossible = queryTerms.length * 3;
      const normalized = maxPossible > 0 ? score / maxPossible : 0;
      return { entry: e, score: normalized };
    })
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function listEntries(category?: string): KnowledgeEntry[] {
  const entries = load();
  return category ? entries.filter((e) => e.category === category) : entries;
}

export function getStats() {
  const entries = load();
  const byCategory: Record<string, number> = {};
  let totalSize = 0;
  let lastIngested = 0;
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    totalSize += e.content.length;
    if (e.createdAt > lastIngested) lastIngested = e.createdAt;
  }
  return { total: entries.length, byCategory, totalSize, lastIngested };
}

export function incrementAccessCount(id: string): void {
  const entries = load();
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    entry.accessCount++;
    save(entries);
  }
}

export function getAllEntries(): KnowledgeEntry[] {
  return load();
}
