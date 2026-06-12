import type { InferenceRequest, InferenceResponse, ModelConfig, InferenceMode } from "../../types/ai.types.js";
import { BaseInferenceAdapter } from "./base-adapter.js";
import { logger } from "../../lib/logger.js";

export class OpenAICompatAdapter extends BaseInferenceAdapter {
  readonly mode: InferenceMode;
  readonly name: string;
  private endpoint: string;
  private modelName: string;
  private apiKey: string;

  constructor(config: ModelConfig) {
    super();
    this.mode = config.mode ?? "lm_studio";
    this.endpoint = config.endpoint ?? "http://localhost:1234/v1";
    this.modelName = config.modelName ?? "local-model";
    this.apiKey = config.apiKey ?? "not-needed";
    this.name = `Local (${this.mode})`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
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
      const res = await fetch(`${this.endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 512,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        throw new Error(`${this.name} returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      return {
        text,
        model: this.modelName,
        mode: this.mode,
        latencyMs: Date.now() - start,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (err) {
      logger.error({ err, mode: this.mode }, "OpenAI-compat inference failed");
      throw err;
    }
  }
}
