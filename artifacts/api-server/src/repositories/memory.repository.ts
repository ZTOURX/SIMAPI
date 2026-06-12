import { v4 as uuidv4 } from "uuid";
import type { MemoryEntry, ShortTermMemory, LongTermMemory, MemoryMessage } from "../types/memory.types.js";
import { readJson, writeJson, deleteJson, getDataPath } from "../storage/json-store.js";
import { logger } from "../lib/logger.js";

const shortTermPath = (threadId: string) => getDataPath("memory", `st_${threadId}.json`);
const longTermPath = (threadId: string) => getDataPath("memory", `lt_${threadId}.json`);

export function getShortTerm(threadId: string): ShortTermMemory {
  return readJson<ShortTermMemory>(shortTermPath(threadId), {
    threadId,
    messages: [],
    context: {},
    lastActivity: Date.now(),
    turnCount: 0,
  });
}

export function saveShortTerm(memory: ShortTermMemory): void {
  writeJson(shortTermPath(memory.threadId), memory);
}

export function addMessage(threadId: string, msg: Omit<MemoryMessage, "id">): MemoryMessage {
  const mem = getShortTerm(threadId);
  const message: MemoryMessage = { id: uuidv4(), ...msg };
  mem.messages.push(message);
  mem.turnCount++;
  mem.lastActivity = Date.now();
  saveShortTerm(mem);
  return message;
}

export function getMessages(threadId: string, limit = 20): MemoryMessage[] {
  const mem = getShortTerm(threadId);
  return mem.messages.slice(-limit);
}

export function setContext(threadId: string, key: string, value: unknown): void {
  const mem = getShortTerm(threadId);
  mem.context[key] = value;
  saveShortTerm(mem);
}

export function getContext(threadId: string): Record<string, unknown> {
  return getShortTerm(threadId).context;
}

export function getLongTerm(threadId: string): LongTermMemory {
  return readJson<LongTermMemory>(longTermPath(threadId), {
    threadId,
    entries: [],
    personality: {
      name: "Cat-Bot",
      traits: [],
      adaptations: {},
      knownFacts: [],
      preferredTopics: [],
    },
    totalInteractions: 0,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
  });
}

export function saveLongTerm(memory: LongTermMemory): void {
  writeJson(longTermPath(memory.threadId), memory);
}

export function addLongTermEntry(threadId: string, entry: Omit<MemoryEntry, "id" | "createdAt" | "accessedAt" | "accessCount">): MemoryEntry {
  const lt = getLongTerm(threadId);
  const now = Date.now();
  const full: MemoryEntry = {
    id: uuidv4(),
    createdAt: now,
    accessedAt: now,
    accessCount: 0,
    ...entry,
  };
  lt.entries.push(full);
  lt.lastSeen = now;
  lt.totalInteractions++;
  saveLongTerm(lt);
  logger.debug({ threadId, entryId: full.id }, "Long-term memory entry added");
  return full;
}

export function searchLongTerm(threadId: string, query: string, limit = 10): MemoryEntry[] {
  const lt = getLongTerm(threadId);
  const lower = query.toLowerCase();
  const keywords = lower.split(/\s+/).filter(Boolean);
  return lt.entries
    .map((e) => {
      const text = e.content.toLowerCase();
      const score = keywords.reduce((s, kw) => (text.includes(kw) ? s + 1 : s), 0);
      return { entry: e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.importance - a.entry.importance)
    .slice(0, limit)
    .map((r) => r.entry);
}

export function compressShortTerm(threadId: string, keepLast = 20): MemoryMessage[] {
  const mem = getShortTerm(threadId);
  const archived = mem.messages.slice(0, Math.max(0, mem.messages.length - keepLast));
  mem.messages = mem.messages.slice(-keepLast);
  mem.summaryCheckpoint = Date.now();
  saveShortTerm(mem);
  return archived;
}

export function clearShortTerm(threadId: string): void {
  writeJson(shortTermPath(threadId), {
    threadId,
    messages: [],
    context: {},
    lastActivity: Date.now(),
    turnCount: 0,
  });
}

export function deleteLongTerm(threadId: string): boolean {
  return deleteJson(longTermPath(threadId));
}

export function getMemoryStats(threadId: string) {
  const st = getShortTerm(threadId);
  const lt = getLongTerm(threadId);
  const oldest = lt.entries.length > 0 ? Math.min(...lt.entries.map((e) => e.createdAt)) : 0;
  const newest = lt.entries.length > 0 ? Math.max(...lt.entries.map((e) => e.createdAt)) : 0;
  return {
    threadId,
    shortTermCount: st.messages.length,
    longTermCount: lt.entries.length,
    totalTokensEstimate: st.messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0),
    oldestMemory: oldest,
    newestMemory: newest,
  };
}
