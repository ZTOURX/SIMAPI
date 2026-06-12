import type { RankedResponse } from "../../types/ai.types.js";
import type { Personality } from "../../types/personality.types.js";
import type { KnowledgeEntry } from "../../types/knowledge.types.js";
import type { MemoryEntry } from "../../types/memory.types.js";
import { classifyIntent, extractEntities } from "./intent-classifier.js";
import { getBestPattern } from "./pattern-matcher.js";
import { generateEmbedding } from "./embeddings.js";
import { extractKeywords } from "./keyword-extractor.js";

export interface GenerationContext {
  input: string;
  personality: Personality;
  history: Array<{ role: string; content: string }>;
  memory: MemoryEntry[];
  knowledge: KnowledgeEntry[];
  threadContext: Record<string, unknown>;
}

function pickRandom<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

function applyPersonalityStyle(text: string, personality: Personality): string {
  const { style } = personality;
  let result = text;

  if (style.emojiUsage === "none") {
    result = result.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
  }

  if (!style.useMarkdown) {
    result = result
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/_{1,2}(.*?)_{1,2}/g, "$1");
  }

  if (style.verbosity === "minimal" && result.length > 200) {
    const sentences = result.match(/[^.!?]+[.!?]+/g) ?? [result];
    result = sentences.slice(0, 2).join(" ").trim();
  }

  return result;
}

function buildContextualResponse(input: string, ctx: GenerationContext): string {
  const { personality, history, memory, knowledge } = ctx;
  const intent = classifyIntent(input);
  const keywords = extractKeywords(input, 5);

  if (intent.label === "greeting") {
    return pickRandom(personality.greetings) ?? "Hello!";
  }

  if (intent.label === "farewell") {
    return pickRandom(personality.farewells) ?? "Goodbye!";
  }

  if (intent.label === "thanks") {
    return "You're welcome! Let me know if there's anything else I can help with.";
  }

  if (intent.label === "status") {
    return "I'm fully operational and running on local inference. All systems nominal.";
  }

  if (intent.label === "memory" && memory.length > 0) {
    const relevant = memory.slice(0, 3).map((m) => m.content).join(", ");
    return `Based on our conversation history, I recall: ${relevant}. Is there something specific you'd like to know about what we've discussed?`;
  }

  if (knowledge.length > 0) {
    const topK = knowledge[0]!;
    return `Based on my knowledge about "${topK.title}": ${topK.content.substring(0, 400)}${topK.content.length > 400 ? "..." : ""}`;
  }

  if (memory.length > 0 && keywords.length > 0) {
    const memMatch = memory.find((m) =>
      keywords.some((kw) => m.content.toLowerCase().includes(kw))
    );
    if (memMatch) {
      return `Connecting to something from our earlier conversation — ${memMatch.content}. ${generateTemplateResponse(input, ctx)}`;
    }
  }

  if (history.length > 1) {
    return generateContextualFollowUp(input, history, personality);
  }

  return generateTemplateResponse(input, ctx);
}

function generateContextualFollowUp(
  input: string,
  history: Array<{ role: string; content: string }>,
  personality: Personality
): string {
  const lastUserMsg = history.filter((h) => h.role === "user").slice(-2, -1)[0]?.content ?? "";
  const intent = classifyIntent(input);

  if (intent.label === "question" || intent.label === "question_yesno") {
    const templates = [
      `That's a good question. Based on our conversation, I'd say it depends on the specific context you're asking about.`,
      `Thinking about what you've shared, the answer relates to how ${extractKeywords(input, 2).join(" and ")} interact in your use case.`,
      `From what we've discussed, I believe the key here is understanding the relationship between ${extractKeywords(input, 2).join(" and ")}.`,
    ];
    return pickRandom(templates) ?? templates[0]!;
  }

  if (intent.label === "sentiment_positive") {
    const responses = ["Glad to hear that!", "That's great!", "Wonderful!", "That makes me happy to hear!"];
    return pickRandom(responses) ?? "Great!";
  }

  if (intent.label === "sentiment_negative") {
    const responses = [
      "I'm sorry to hear that. How can I help resolve this?",
      "Let's work through this together. What specifically isn't working?",
      "I understand your frustration. Let me help you find a solution.",
    ];
    return pickRandom(responses) ?? "I understand. Let me help.";
  }

  return generateTemplateResponse(input, { input, personality, history, memory: [], knowledge: [], threadContext: {} });
}

function generateTemplateResponse(input: string, ctx: GenerationContext): string {
  const { personality } = ctx;
  const keywords = extractKeywords(input, 3);
  const intent = classifyIntent(input);

  const templates: Record<string, string[]> = {
    question: [
      `Regarding ${keywords.slice(0, 2).join(" and ")}, I can provide some context based on my knowledge base. Could you be more specific about what aspect you'd like to explore?`,
      `That's an interesting question about ${keywords[0] ?? "this topic"}. I want to give you the most accurate response — can you elaborate a bit more?`,
      `When it comes to ${keywords.slice(0, 2).join(" and ")}, there are several considerations. What particular angle are you most interested in?`,
    ],
    command: [
      `I'll process that request. For ${keywords[0] ?? "this action"}, please use the appropriate API endpoint or confirm the operation.`,
      `Got it. To complete this action regarding ${keywords[0] ?? "your request"}, I may need some additional information.`,
    ],
    chitchat: [
      `That's interesting! I enjoy conversations like this. What else is on your mind?`,
      `Tell me more — I'm always learning from our conversations.`,
      `I find that topic fascinating. What are your thoughts on it?`,
    ],
    unknown: [
      `I want to make sure I understand you correctly. Could you rephrase or give me more details about ${keywords.slice(0, 2).join(" and ")}?`,
      `Interesting. I'm still learning — could you give me a bit more context so I can help better?`,
      pickRandom(personality.fallbacks) ?? "Could you clarify what you mean?",
    ],
  };

  const pool = templates[intent.label] ?? templates["unknown"]!;
  return pickRandom(pool) ?? pickRandom(personality.fallbacks) ?? "I'm here to help. Could you tell me more?";
}

export function generateNativeResponse(ctx: GenerationContext): RankedResponse {
  const { input, personality, threadContext } = ctx;

  const patternMatch = getBestPattern(input, threadContext);
  if (patternMatch && patternMatch.score >= 0.65) {
    return {
      text: applyPersonalityStyle(patternMatch.text, personality),
      score: patternMatch.score,
      source: "pattern",
    };
  }

  const candidates: RankedResponse[] = [];

  if (patternMatch && patternMatch.score >= 0.3) {
    candidates.push({ ...patternMatch, text: applyPersonalityStyle(patternMatch.text, personality) });
  }

  const contextualResponse = buildContextualResponse(input, ctx);
  candidates.push({
    text: applyPersonalityStyle(contextualResponse, personality),
    score: 0.5,
    source: "generated",
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? { text: pickRandom(personality.fallbacks) ?? "I'm not sure how to respond to that.", score: 0.1, source: "generated" };
}
