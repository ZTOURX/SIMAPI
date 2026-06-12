import type { InferenceRequest, InferenceResponse } from "../../types/ai.types.js";

export abstract class BaseInferenceAdapter {
  abstract readonly name: string;
  abstract readonly mode: string;

  abstract isAvailable(): Promise<boolean>;
  abstract infer(request: InferenceRequest): Promise<InferenceResponse>;

  protected formatHistory(history: InferenceRequest["history"]): string {
    if (!history || history.length === 0) return "";
    return history
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n");
  }
}
