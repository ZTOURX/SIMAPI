import type { Intent } from "../../types/ai.types.js";

interface IntentPattern {
  label: string;
  patterns: string[];
  entities?: Record<string, string[]>;
  priority?: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    label: "greeting",
    priority: 10,
    patterns: ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "sup", "what's up", "whats up"],
  },
  {
    label: "farewell",
    priority: 10,
    patterns: ["bye", "goodbye", "see you", "later", "farewell", "take care", "good night", "cya", "ttyl", "gotta go"],
  },
  {
    label: "thanks",
    priority: 8,
    patterns: ["thank you", "thanks", "thx", "appreciate it", "ty", "much appreciated", "grateful"],
  },
  {
    label: "help",
    priority: 9,
    patterns: ["help", "assist", "support", "how do i", "how to", "can you help", "need help", "what can you do", "commands", "features"],
  },
  {
    label: "question",
    priority: 5,
    patterns: ["what is", "what are", "who is", "where is", "when is", "why is", "how is", "which", "explain", "tell me about", "define"],
  },
  {
    label: "question_yesno",
    priority: 6,
    patterns: ["is it", "are you", "can you", "do you", "will you", "would you", "should i", "is there"],
  },
  {
    label: "command",
    priority: 9,
    patterns: ["set", "change", "update", "delete", "remove", "add", "create", "configure", "enable", "disable", "start", "stop", "reset"],
  },
  {
    label: "status",
    priority: 7,
    patterns: ["status", "health", "alive", "running", "working", "online", "ping", "are you there", "test"],
  },
  {
    label: "personality",
    priority: 6,
    patterns: ["personality", "who are you", "what are you", "your name", "introduce", "about you", "tell me about yourself"],
  },
  {
    label: "memory",
    priority: 7,
    patterns: ["remember", "recall", "forget", "do you remember", "what did i say", "previous", "earlier", "before", "history"],
  },
  {
    label: "knowledge",
    priority: 6,
    patterns: ["learn", "know about", "information", "facts about", "teach", "inform me", "what do you know"],
  },
  {
    label: "sentiment_positive",
    priority: 3,
    patterns: ["great", "awesome", "amazing", "excellent", "fantastic", "wonderful", "love it", "perfect", "brilliant"],
  },
  {
    label: "sentiment_negative",
    priority: 3,
    patterns: ["bad", "terrible", "awful", "hate", "wrong", "broken", "error", "problem", "issue", "fail", "doesn't work"],
  },
  {
    label: "chitchat",
    priority: 2,
    patterns: ["how are you", "how's it going", "what's new", "bored", "fun", "joke", "story", "chat", "talk"],
  },
];

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase().trim();
  let best: { label: string; score: number; priority: number } | null = null;
  const entities: Record<string, string> = {};

  for (const intentDef of INTENT_PATTERNS) {
    let score = 0;
    for (const pattern of intentDef.patterns) {
      if (lower === pattern) {
        score += 1.0;
      } else if (lower.startsWith(pattern + " ") || lower.endsWith(" " + pattern)) {
        score += 0.8;
      } else if (lower.includes(pattern)) {
        score += 0.5;
      }
    }

    if (score > 0) {
      const normalized = Math.min(1, score);
      const priority = intentDef.priority ?? 5;
      if (!best || normalized > best.score || (normalized === best.score && priority > best.priority)) {
        best = { label: intentDef.label, score: normalized, priority };
      }
    }
  }

  if (!best) {
    if (lower.endsWith("?") || lower.startsWith("what") || lower.startsWith("how") || lower.startsWith("why")) {
      return { label: "question", confidence: 0.4, entities };
    }
    return { label: "unknown", confidence: 0.1, entities };
  }

  return { label: best.label, confidence: best.score, entities };
}

export function extractEntities(text: string): Record<string, string> {
  const entities: Record<string, string> = {};
  const lower = text.toLowerCase();

  const numberMatch = lower.match(/\b(\d+)\b/);
  if (numberMatch) entities["number"] = numberMatch[1]!;

  const urlMatch = lower.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) entities["url"] = urlMatch[1]!;

  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch) entities["quoted"] = quotedMatch[1]!;

  const platformMatch = lower.match(/\b(discord|telegram|facebook|messenger|slack|whatsapp)\b/);
  if (platformMatch) entities["platform"] = platformMatch[1]!;

  return entities;
}
