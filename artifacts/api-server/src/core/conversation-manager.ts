import type { Thread } from "../types/thread.types.js";
import { getThread, upsertThread, incrementMessageCount } from "../repositories/thread.repository.js";
import {
  recordUserMessage,
  recordAssistantMessage,
  extractAndStoreFacts,
  retrieveRelevantMemory,
  compressIfNeeded,
  getConversationContext,
} from "./memory-engine.js";
import { retrieveKnowledge } from "./knowledge-engine.js";
import { buildPrompt } from "./prompt-engine.js";
import { createAdapterWithFallback } from "./inference/adapter-factory.js";
import type { ChatRequest, ChatResponse } from "../schemas/chat.schema.js";
import type { ModelConfig } from "../types/ai.types.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger.js";
import * as analyticsRepo from "../repositories/analytics.repository.js";

export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const { message, threadId, userId, personalityId } = req;

  const thread = upsertThread({
    id: threadId,
    personalityId: personalityId ?? "catbot-default",
    userId,
  });

  compressIfNeeded(thread);
  recordUserMessage(threadId, message, userId);

  if (thread.settings.learningEnabled) {
    extractAndStoreFacts(threadId, message, userId);
  }

  const history = getConversationContext(threadId, thread.settings.contextWindowSize);

  const relevantMemory = thread.settings.longTermMemoryEnabled
    ? retrieveRelevantMemory(threadId, message, 5)
    : [];

  const relevantKnowledge = await retrieveKnowledge(message, { limit: 3, threshold: 0.12 });

  const { systemPrompt, messages, personality } = buildPrompt({
    personalityId: personalityId ?? thread.personalityId,
    userMessage: message,
    history: history.slice(0, -1),
    memory: relevantMemory,
    knowledge: relevantKnowledge.map((r) => r.entry),
    threadContext: {},
    userId,
    maxContextMessages: thread.settings.contextWindowSize,
  });

  const resolvedMode = (req.modelOverride?.mode ?? thread.modelConfig?.mode ?? "native") as ModelConfig["mode"];
  const modelCfg: ModelConfig | undefined = req.modelOverride
    ? {
        mode: resolvedMode,
        modelName: req.modelOverride.modelName ?? thread.modelConfig?.modelName,
        endpoint: req.modelOverride.endpoint ?? thread.modelConfig?.endpoint,
        temperature: req.modelOverride.temperature ?? thread.modelConfig?.temperature,
        maxTokens: req.modelOverride.maxTokens ?? thread.modelConfig?.maxTokens,
      }
    : thread.modelConfig
    ? {
        mode: (thread.modelConfig.mode ?? "native") as ModelConfig["mode"],
        modelName: thread.modelConfig.modelName,
        temperature: thread.modelConfig.temperature,
        maxTokens: thread.modelConfig.maxTokens,
        endpoint: thread.modelConfig.endpoint,
      }
    : undefined;

  const adapter = await createAdapterWithFallback(modelCfg as ModelConfig | undefined);

  const inferenceResponse = await adapter.infer({
    prompt: message,
    systemPrompt: req.contextOverride?.systemPrompt ?? systemPrompt,
    history: messages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    temperature: modelCfg?.temperature,
    maxTokens: modelCfg?.maxTokens,
    threadId,
    userId,
  });

  recordAssistantMessage(threadId, inferenceResponse.text);
  incrementMessageCount(threadId);

  analyticsRepo.recordInteraction({
    threadId,
    userId,
    mode: inferenceResponse.mode,
    latencyMs: inferenceResponse.latencyMs,
    tokensUsed: inferenceResponse.tokensUsed ?? 0,
    intent: inferenceResponse.intentLabel,
  });

  logger.info({ threadId, mode: inferenceResponse.mode, latencyMs: inferenceResponse.latencyMs }, "Chat processed");

  return {
    id: uuidv4(),
    threadId,
    message,
    response: inferenceResponse.text,
    model: inferenceResponse.model,
    mode: inferenceResponse.mode,
    latencyMs: inferenceResponse.latencyMs,
    tokensUsed: inferenceResponse.tokensUsed,
    intent: inferenceResponse.intentLabel,
    keywords: inferenceResponse.keywords,
    confidence: inferenceResponse.confidence,
    timestamp: Date.now(),
  };
}
