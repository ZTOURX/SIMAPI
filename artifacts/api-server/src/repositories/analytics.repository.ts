import { readJson, writeJson, getDataPath } from "../storage/json-store.js";
import { v4 as uuidv4 } from "uuid";

export interface InteractionRecord {
  id: string;
  threadId: string;
  userId?: string;
  mode: string;
  latencyMs: number;
  tokensUsed: number;
  intent?: string;
  timestamp: number;
}

export interface AnalyticsSummary {
  totalInteractions: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
  modeBreakdown: Record<string, number>;
  intentBreakdown: Record<string, number>;
  topThreads: Array<{ threadId: string; count: number }>;
  period: { from: number; to: number };
}

const analyticsPath = () => getDataPath("analytics", "interactions.json");

function load(): InteractionRecord[] {
  return readJson<InteractionRecord[]>(analyticsPath(), []);
}

function save(records: InteractionRecord[]): void {
  writeJson(analyticsPath(), records.slice(-10000));
}

export function recordInteraction(data: Omit<InteractionRecord, "id" | "timestamp">): void {
  const records = load();
  records.push({ id: uuidv4(), timestamp: Date.now(), ...data });
  save(records);
}

export function getSummary(options: { from?: number; to?: number; threadId?: string } = {}): AnalyticsSummary {
  const now = Date.now();
  const { from = now - 7 * 24 * 60 * 60 * 1000, to = now, threadId } = options;

  let records = load().filter((r) => r.timestamp >= from && r.timestamp <= to);
  if (threadId) records = records.filter((r) => r.threadId === threadId);

  const modeBreakdown: Record<string, number> = {};
  const intentBreakdown: Record<string, number> = {};
  const threadCounts: Record<string, number> = {};

  let totalLatency = 0;
  let totalTokens = 0;

  for (const r of records) {
    modeBreakdown[r.mode] = (modeBreakdown[r.mode] ?? 0) + 1;
    if (r.intent) intentBreakdown[r.intent] = (intentBreakdown[r.intent] ?? 0) + 1;
    threadCounts[r.threadId] = (threadCounts[r.threadId] ?? 0) + 1;
    totalLatency += r.latencyMs;
    totalTokens += r.tokensUsed;
  }

  const topThreads = Object.entries(threadCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tid, count]) => ({ threadId: tid, count }));

  return {
    totalInteractions: records.length,
    avgLatencyMs: records.length > 0 ? Math.round(totalLatency / records.length) : 0,
    totalTokensUsed: totalTokens,
    modeBreakdown,
    intentBreakdown,
    topThreads,
    period: { from, to },
  };
}

export function getRecentInteractions(limit = 50): InteractionRecord[] {
  return load().slice(-limit).reverse();
}
