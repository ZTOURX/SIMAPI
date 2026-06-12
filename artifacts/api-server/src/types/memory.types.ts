export interface MemoryEntry {
  id: string;
  threadId: string;
  userId?: string;
  content: string;
  type: MemoryType;
  importance: number;
  tags: string[];
  embedding?: number[];
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  expiresAt?: number;
}

export type MemoryType = "fact" | "preference" | "context" | "conversation" | "instruction" | "emotion";

export interface ShortTermMemory {
  threadId: string;
  messages: MemoryMessage[];
  context: Record<string, unknown>;
  lastActivity: number;
  turnCount: number;
  summaryCheckpoint?: number;
}

export interface LongTermMemory {
  threadId: string;
  userId?: string;
  entries: MemoryEntry[];
  personality: PersonalitySnapshot;
  totalInteractions: number;
  firstSeen: number;
  lastSeen: number;
}

export interface MemoryMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokens?: number;
  intent?: string;
  keywords?: string[];
}

export interface PersonalitySnapshot {
  name: string;
  traits: string[];
  adaptations: Record<string, number>;
  knownFacts: string[];
  preferredTopics: string[];
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
}

export interface MemoryStats {
  threadId: string;
  shortTermCount: number;
  longTermCount: number;
  totalTokensEstimate: number;
  oldestMemory: number;
  newestMemory: number;
}
