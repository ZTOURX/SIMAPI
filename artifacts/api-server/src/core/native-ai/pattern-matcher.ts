import type { Pattern, RankedResponse } from "../../types/ai.types.js";
import { readJson, writeJson, getDataPath } from "../../storage/json-store.js";
import { generateEmbedding, cosineSimilarity } from "./embeddings.js";

const patternsPath = () => getDataPath("models", "patterns.json");

const BUILT_IN_PATTERNS: Pattern[] = [
  {
    id: "p-greeting",
    triggers: ["hello", "hi", "hey", "greetings", "howdy", "sup"],
    response: ["Hello! How can I help you today?", "Hi there! What can I do for you?", "Hey! I'm here to help."],
    intent: "greeting",
    priority: 10,
  },
  {
    id: "p-farewell",
    triggers: ["bye", "goodbye", "see you", "cya", "farewell"],
    response: ["Goodbye! Feel free to chat anytime.", "See you later!", "Farewell! Come back whenever you need help."],
    intent: "farewell",
    priority: 10,
  },
  {
    id: "p-thanks",
    triggers: ["thank you", "thanks", "ty", "thx", "appreciate"],
    response: ["You're welcome!", "Happy to help!", "Anytime! Let me know if you need anything else.", "Glad I could help!"],
    intent: "thanks",
    priority: 8,
  },
  {
    id: "p-status",
    triggers: ["ping", "status", "are you there", "alive", "test", "working"],
    response: ["I'm online and operational!", "All systems running smoothly.", "Yes, I'm here and ready!", "Pong! I'm up and running."],
    intent: "status",
    priority: 9,
  },
  {
    id: "p-identity",
    triggers: ["who are you", "what are you", "your name", "introduce yourself", "tell me about yourself"],
    response: [
      "I'm Cat-Bot, a multi-platform AI assistant built for Discord, Telegram, Facebook Page, and Facebook Messenger. I can help with information, conversation, and much more!",
      "I'm Cat-Bot SIM — your intelligent conversational assistant. I run entirely locally without any external AI services.",
    ],
    intent: "personality",
    priority: 9,
  },
  {
    id: "p-capabilities",
    triggers: ["what can you do", "help", "commands", "features", "abilities"],
    response: [
      "I can help with: answering questions, remembering context, searching my knowledge base, managing conversations, and much more. I operate across Discord, Telegram, and Facebook platforms.",
      "My capabilities include: conversational AI, memory management, knowledge retrieval, personality adaptation, and multi-platform support.",
    ],
    intent: "help",
    priority: 8,
  },
  {
    id: "p-howru",
    triggers: ["how are you", "how's it going", "how do you do", "you ok", "feeling"],
    response: [
      "I'm doing great, thanks for asking! How can I assist you?",
      "All systems nominal — ready to help! What's on your mind?",
      "Running perfectly! What can I do for you today?",
    ],
    intent: "chitchat",
    priority: 7,
  },
];

function loadPatterns(): Pattern[] {
  const saved = readJson<Pattern[]>(patternsPath(), []);
  const builtInIds = new Set(BUILT_IN_PATTERNS.map((p) => p.id));
  const custom = saved.filter((p) => !builtInIds.has(p.id));
  return [...BUILT_IN_PATTERNS, ...custom];
}

export function savePattern(pattern: Pattern): void {
  const saved = readJson<Pattern[]>(patternsPath(), []);
  const idx = saved.findIndex((p) => p.id === pattern.id);
  if (idx >= 0) {
    saved[idx] = pattern;
  } else {
    saved.push(pattern);
  }
  writeJson(patternsPath(), saved);
}

export function matchPatterns(input: string, context?: Record<string, unknown>): RankedResponse[] {
  const patterns = loadPatterns();
  const lower = input.toLowerCase().trim();
  const results: RankedResponse[] = [];
  const inputEmb = generateEmbedding(input);

  for (const pattern of patterns) {
    let score = 0;

    if (pattern.contextRequired && context) {
      const hasContext = pattern.contextRequired.every((k) => k in context);
      if (!hasContext) continue;
    }

    for (const trigger of pattern.triggers) {
      const tLower = trigger.toLowerCase();
      if (lower === tLower) {
        score = Math.max(score, 1.0);
      } else if (lower.startsWith(tLower) || lower.endsWith(tLower)) {
        score = Math.max(score, 0.85);
      } else if (lower.includes(tLower)) {
        score = Math.max(score, 0.65);
      } else {
        const trigEmb = generateEmbedding(trigger);
        const sim = cosineSimilarity(inputEmb, trigEmb);
        if (sim > 0.4) score = Math.max(score, sim * 0.6);
      }
    }

    if (score > 0) {
      const priorityBoost = ((pattern.priority ?? 5) / 10) * 0.2;
      const finalScore = Math.min(1, score + priorityBoost);
      const responses = Array.isArray(pattern.response) ? pattern.response : [pattern.response];
      const chosen = responses[Math.floor(Math.random() * responses.length)] ?? "";
      results.push({ text: chosen, score: finalScore, source: "pattern" });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getBestPattern(input: string, context?: Record<string, unknown>): RankedResponse | null {
  const matches = matchPatterns(input, context);
  return matches.length > 0 ? (matches[0] ?? null) : null;
}
