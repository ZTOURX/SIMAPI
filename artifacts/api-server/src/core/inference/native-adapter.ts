import type { InferenceRequest, InferenceResponse } from "../../types/ai.types.js";
import { BaseInferenceAdapter } from "./base-adapter.js";
import { generateNativeResponse } from "../native-ai/response-generator.js";
import { classifyIntent } from "../native-ai/intent-classifier.js";
import { extractKeywords } from "../native-ai/keyword-extractor.js";
import { getDefault } from "../../repositories/personality.repository.js";
import { getLongTerm } from "../../repositories/memory.repository.js";
import { searchEntries } from "../../repositories/knowledge.repository.js";

export class NativeAdapter extends BaseInferenceAdapter {
  readonly name = "Cat-Bot Native";
  readonly mode = "native";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    const start = Date.now();
    const personality = getDefault();

    const lt = getLongTerm(request.threadId);
    const memory = lt.entries.slice(-20);

    const knowledgeResults = await searchEntries(request.prompt, { limit: 3, threshold: 0.15 });
    const knowledge = knowledgeResults.map((r) => r.entry);

    const history = (request.history ?? []).map((h) => ({
      role: h.role,
      content: h.content,
    }));

    const response = generateNativeResponse({
      input: request.prompt,
      personality,
      history,
      memory,
      knowledge,
      threadContext: {},
    });

    const intent = classifyIntent(request.prompt);
    const keywords = extractKeywords(request.prompt, 5);

    return {
      text: response.text,
      model: this.name,
      mode: "native",
      latencyMs: Date.now() - start,
      confidence: response.score,
      intentLabel: intent.label,
      keywords,
    };
  }
}
