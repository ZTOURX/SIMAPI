export interface Thread {
  id: string;
  name?: string;
  userId?: string;
  platform?: string;
  personalityId: string;
  modelConfig?: ThreadModelConfig;
  settings: ThreadSettings;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  lastActivity: number;
  messageCount: number;
  isActive: boolean;
}

export interface ThreadModelConfig {
  mode?: string;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  endpoint?: string;
}

export interface ThreadSettings {
  maxMemoryEntries: number;
  compressionThreshold: number;
  longTermMemoryEnabled: boolean;
  learningEnabled: boolean;
  contextWindowSize: number;
  responseStyle: "concise" | "detailed" | "conversational";
}

export interface ThreadStats {
  threadId: string;
  messageCount: number;
  memoryEntries: number;
  avgResponseLatency: number;
  topIntents: string[];
  createdAt: number;
  lastActivity: number;
}
