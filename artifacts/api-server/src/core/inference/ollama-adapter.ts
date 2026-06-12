import type { InferenceRequest, InferenceResponse, ModelConfig } from "../../types/ai.types.js";
import { BaseInferenceAdapter } from "./base-adapter.js";
import { logger } from "../../lib/logger.js";

export class OllamaAdapter extends BaseInferenceAdapter {
  readonly name = "Ollama";
  readonly mode = "ollama";
  private endpoint: string;
  private modelName: string;

  constructor(config: ModelConfig) {
    super();
    this.endpoint = config.endpoint ?? "http://localhost:11434";
    this.modelName = config.modelName ?? "llama3";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const messages = [
      ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
      ...(request.history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: request.prompt },
    ];

    try {
      const res = await fetch(`${this.endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 512,
          },
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as { message?: { content?: string }; eval_count?: number };
      const text = data.message?.content ?? "";

      return {
        text,
        model: this.modelName,
        mode: "ollama",
        latencyMs: Date.now() - start,
        tokensUsed: data.eval_count,
      };
    } catch (err) {
      logger.error({ err }, "Ollama inference failed");
      throw err;
    }
  }
}
