import type { ModelConfig, InferenceMode } from "../../types/ai.types.js";
import { BaseInferenceAdapter } from "./base-adapter.js";
import { NativeAdapter } from "./native-adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import { OpenAICompatAdapter } from "./openai-compat-adapter.js";
import { readJson, writeJson, getDataPath } from "../../storage/json-store.js";
import { logger } from "../../lib/logger.js";

const modelConfigPath = () => getDataPath("models", "config.json");

const DEFAULT_CONFIG: ModelConfig = {
  mode: "native",
  temperature: 0.7,
  maxTokens: 512,
  timeout: 30000,
};

export function getModelConfig(): ModelConfig {
  return readJson<ModelConfig>(modelConfigPath(), DEFAULT_CONFIG);
}

export function saveModelConfig(config: ModelConfig): void {
  writeJson(modelConfigPath(), config);
}

export function createAdapter(config?: ModelConfig): BaseInferenceAdapter {
  const cfg = config ?? getModelConfig();
  const mode = cfg.mode ?? "native";

  switch (mode as InferenceMode) {
    case "ollama":
      return new OllamaAdapter(cfg);
    case "llama_cpp":
      cfg.endpoint = cfg.endpoint ?? "http://localhost:8080/v1";
      return new OpenAICompatAdapter({ ...cfg, mode: "llama_cpp" });
    case "vllm":
      cfg.endpoint = cfg.endpoint ?? "http://localhost:8000/v1";
      return new OpenAICompatAdapter({ ...cfg, mode: "vllm" });
    case "lm_studio":
      cfg.endpoint = cfg.endpoint ?? "http://localhost:1234/v1";
      return new OpenAICompatAdapter({ ...cfg, mode: "lm_studio" });
    case "custom":
      return new OpenAICompatAdapter({ ...cfg, mode: "custom" });
    case "native":
    default:
      return new NativeAdapter();
  }
}

export async function createAdapterWithFallback(config?: ModelConfig): Promise<BaseInferenceAdapter> {
  const adapter = createAdapter(config);
  if (adapter.mode === "native") return adapter;

  const available = await adapter.isAvailable().catch(() => false);
  if (!available) {
    logger.warn({ mode: adapter.mode }, "Configured adapter unavailable, falling back to native");
    return new NativeAdapter();
  }
  return adapter;
}

export async function listAvailableAdapters(): Promise<Array<{ mode: string; name: string; available: boolean }>> {
  const adapters = [
    new NativeAdapter(),
    new OllamaAdapter(DEFAULT_CONFIG),
    new OpenAICompatAdapter({ ...DEFAULT_CONFIG, mode: "lm_studio", endpoint: "http://localhost:1234/v1" }),
    new OpenAICompatAdapter({ ...DEFAULT_CONFIG, mode: "llama_cpp", endpoint: "http://localhost:8080/v1" }),
    new OpenAICompatAdapter({ ...DEFAULT_CONFIG, mode: "vllm", endpoint: "http://localhost:8000/v1" }),
  ];

  return Promise.all(
    adapters.map(async (a) => ({
      mode: a.mode,
      name: a.name,
      available: await a.isAvailable().catch(() => false),
    }))
  );
}
