import { v4 as uuidv4 } from "uuid";
import type { Thread } from "../types/thread.types.js";
import { readJson, writeJson, deleteJson, listFiles, getDataPath } from "../storage/json-store.js";
import { logger } from "../lib/logger.js";

const threadsDir = () => getDataPath("threads");
const threadPath = (id: string) => getDataPath("threads", `${id}.json`);

export function createThread(data: Partial<Thread> & { personalityId: string }): Thread {
  const id = data.id ?? uuidv4();
  const now = Date.now();
  const thread: Thread = {
    id,
    name: data.name ?? `Thread ${id.slice(0, 8)}`,
    userId: data.userId,
    platform: data.platform,
    personalityId: data.personalityId,
    modelConfig: data.modelConfig,
    settings: {
      maxMemoryEntries: 100,
      compressionThreshold: 50,
      longTermMemoryEnabled: true,
      learningEnabled: true,
      contextWindowSize: 20,
      responseStyle: "conversational",
      ...data.settings,
    },
    metadata: data.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    lastActivity: now,
    messageCount: 0,
    isActive: true,
  };
  writeJson(threadPath(id), thread);
  logger.info({ threadId: id }, "Thread created");
  return thread;
}

export function getThread(id: string): Thread | null {
  return readJson<Thread | null>(threadPath(id), null);
}

export function upsertThread(data: Partial<Thread> & { id: string; personalityId: string }): Thread {
  const existing = getThread(data.id);
  if (existing) return existing;
  return createThread(data);
}

export function updateThread(id: string, updates: Partial<Thread>): Thread | null {
  const thread = getThread(id);
  if (!thread) return null;
  const updated = { ...thread, ...updates, id, updatedAt: Date.now() };
  writeJson(threadPath(id), updated);
  return updated;
}

export function incrementMessageCount(id: string): void {
  const thread = getThread(id);
  if (!thread) return;
  updateThread(id, { messageCount: thread.messageCount + 1, lastActivity: Date.now() });
}

export function deleteThread(id: string): boolean {
  return deleteJson(threadPath(id));
}

export function listThreads(userId?: string): Thread[] {
  const files = listFiles(threadsDir());
  const threads: Thread[] = [];
  for (const file of files) {
    const t = readJson<Thread | null>(getDataPath("threads", file), null);
    if (t && (!userId || t.userId === userId)) threads.push(t);
  }
  return threads.sort((a, b) => b.lastActivity - a.lastActivity);
}
