export type InferenceMode = "native" | "ollama" | "llama_cpp" | "vllm" | "lm_studio" | "custom";

export interface ModelConfig {
  mode: InferenceMode;
  endpoint?: string;
  modelName?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  timeout?: number;
}

export interface InferenceRequest {
  prompt: string;
  systemPrompt?: string;
  history?: MessageTurn[];
  temperature?: number;
  maxTokens?: number;
  threadId: string;
  userId?: string;
}

export interface InferenceResponse {
  text: string;
  tokensUsed?: number;
  model: string;
  mode: InferenceMode;
  latencyMs: number;
  confidence?: number;
  intentLabel?: string;
  keywords?: string[];
}

export interface MessageTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface Intent {
  label: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface Pattern {
  id: string;
  triggers: string[];
  response: string | string[];
  intent?: string;
  priority?: number;
  contextRequired?: string[];
}

export interface Embedding {
  vector: number[];
  text: string;
  id: string;
  createdAt: number;
}

export interface RankedResponse {
  text: string;
  score: number;
  source: "pattern" | "knowledge" | "generated" | "memory";
}
