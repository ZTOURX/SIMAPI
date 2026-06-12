import { ingestKnowledge } from "../core/knowledge-engine.js";
import { logger } from "../lib/logger.js";

const CAT_BOT_KNOWLEDGE = [
  {
    title: "Cat-Bot Overview",
    content: "Cat-Bot is a multi-platform chatbot framework that supports Discord, Telegram, Facebook Page, and Facebook Messenger. It provides a unified API for all platforms so commands work everywhere without platform-specific code.",
    category: "catbot",
    tags: ["catbot", "overview", "platforms"],
  },
  {
    title: "Cat-Bot Platforms",
    content: "Cat-Bot supports four platforms: Discord (using discord.js), Telegram (using Telegraf), Facebook Page (using Graph API webhooks), and Facebook Messenger (using fca-unofficial MQTT). All use the same unified command API.",
    category: "catbot",
    tags: ["discord", "telegram", "facebook", "messenger"],
  },
  {
    title: "Cat-Bot Commands",
    content: "Commands in Cat-Bot are TypeScript modules in src/app/commands/. Each command exports a config object and an onCommand handler. The config includes: name, version, role, author, description, usage, cooldown, and hasPrefix. Commands have access to AppCtx with chat, state, button, db, event, args, and native APIs.",
    category: "catbot",
    tags: ["commands", "typescript", "modules"],
  },
  {
    title: "Cat-Bot Multi-Instance Safety",
    content: "Cat-Bot supports multiple concurrent bot sessions. All persistent state must use ctx.db collections scoped to (userId, platform, sessionId). Never use flat files for mutable state. In-memory state keys must be prefixed with `userId:sessionId:threadID` to prevent cross-instance data corruption.",
    category: "catbot",
    tags: ["multi-instance", "safety", "data"],
  },
  {
    title: "Cat-Bot Event Pipeline",
    content: "Events flow through: Platform Transport (normalizes SDK events) → Middleware Chain (auth, rate limits, cooldowns) → Controller Dispatch (routes to onCommand, onEvent, onReact handlers). onReply and onReact take precedence over new command dispatch.",
    category: "catbot",
    tags: ["events", "pipeline", "middleware"],
  },
  {
    title: "AI Platform Architecture",
    content: "The Cat-Bot AI Platform is a self-hosted REST API providing memory, knowledge, and inference capabilities. It operates in native mode (built-in AI) or can connect to Ollama, llama.cpp, vLLM, or LM Studio for local model inference. All data is stored locally in JSON format.",
    category: "ai-platform",
    tags: ["architecture", "self-hosted", "inference"],
  },
  {
    title: "Inference Modes",
    content: "The AI platform supports multiple inference modes: native (built-in pattern matching and response generation, no external dependencies), ollama (connects to local Ollama instance), llama_cpp (OpenAI-compatible llama.cpp server), vllm (vLLM serving engine), lm_studio (LM Studio local server), and custom (any OpenAI-compatible endpoint).",
    category: "ai-platform",
    tags: ["inference", "ollama", "llama", "vllm"],
  },
  {
    title: "Memory System",
    content: "The AI platform has two-tier memory: short-term (per-thread conversation history, stored in JSON) and long-term (persistent facts, preferences, and context extracted from conversations). Memory is isolated per thread. Automatic compression triggers when message count exceeds the configured threshold.",
    category: "ai-platform",
    tags: ["memory", "short-term", "long-term", "compression"],
  },
  {
    title: "Knowledge Base",
    content: "The knowledge base stores domain-specific information used for RAG (Retrieval Augmented Generation). Knowledge is searchable by keyword and semantic similarity using local TF-IDF embeddings. Use POST /api/knowledge/ingest to add entries. The system automatically extracts keywords and generates embeddings.",
    category: "ai-platform",
    tags: ["knowledge", "rag", "search", "embeddings"],
  },
  {
    title: "API Endpoints Overview",
    content: "Main endpoints: POST /api/chat (send message), GET /api/memory/:threadId (get memory), GET /api/threads (list threads), POST /api/knowledge/ingest (add knowledge), GET /api/personality (list personalities), GET /api/analytics/summary (stats), GET /api/models/config (model settings), GET /api/admin/overview (system overview), GET /api/diagnostics (health info).",
    category: "ai-platform",
    tags: ["api", "endpoints", "reference"],
  },
];

async function seed() {
  logger.info("Seeding default knowledge base...");
  let count = 0;
  for (const item of CAT_BOT_KNOWLEDGE) {
    ingestKnowledge(item);
    count++;
  }
  logger.info({ count }, "Knowledge base seeded successfully");
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
