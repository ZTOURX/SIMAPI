# Cat-Bot AI Platform — Integration Documentation

> Generated from live source inspection of routes, Zod schemas, middleware, and response objects.
> Base URL (production): `https://<your-replit-domain>`
> Base URL (development): `http://localhost:3001` (api-server workflow)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Content-Type Requirements](#content-type-requirements)
5. [Error Response Format](#error-response-format)
6. [Endpoints](#endpoints)
   - [Health](#health)
   - [POST /api/chat ← Start here](#post-apichat)
   - [Threads](#threads)
   - [Memory](#memory)
   - [Knowledge](#knowledge)
   - [Personality](#personality)
   - [Analytics](#analytics)
   - [Models](#models)
   - [Admin](#admin)
   - [Diagnostics](#diagnostics)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [External Bot Integration](#external-bot-integration)

---

## Overview

The Cat-Bot AI Platform is a fully self-hosted REST API that provides:

- **AI Chat** with memory, context, and knowledge retrieval
- **Thread management** — isolated conversation sessions
- **Two-tier memory** — short-term (per message) + long-term (extracted facts)
- **Knowledge base** — ingest and semantic search over domain documents
- **Pluggable inference** — native (no dependencies), Ollama, llama.cpp, vLLM, LM Studio
- **Personality system** — configurable AI tone, traits, and style
- **Analytics + Diagnostics** — usage metrics and system health

All API routes are prefixed with `/api`. All request and response bodies are JSON.

---

## Authentication

**There is no authentication enforced by default.** The API is open — no JWT, session, or API key middleware is applied to any route.

The CORS configuration allows `Authorization` and `X-API-Key` headers to pass through. These are reserved for future use or custom middleware you add in front of the service (e.g., an nginx auth proxy, an API gateway, or a custom Express middleware).

> **Bot integrators:** You can call the API directly without any token. If you need to restrict access, deploy behind a reverse proxy that validates a shared secret.

---

## Rate Limiting

Three independent limiters stack on every request. All return **HTTP 429** when exceeded.

| Limiter | Scope | Window | Limit | Applies To |
|---|---|---|---|---|
| **Global** | Per IP address | 60 s | 300 req | Every request |
| **Chat** | Per `threadId` (falls back to IP) | 60 s | 60 req | `POST /api/chat` |
| **Knowledge** | Per IP | 60 s | 30 req | `POST /api/knowledge/ingest`, `POST /api/knowledge/ingest/bulk` |

### Rate-limit response headers (all limiters)

```
RateLimit-Limit: 60
RateLimit-Remaining: 42
RateLimit-Reset: 1749000060
```

(`X-RateLimit-*` legacy headers are disabled.)

### 429 Response body

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests for this thread. Please wait before sending again.",
  "retryAfter": 60
}
```

> **Tip for bots:** The Chat limiter is keyed on `threadId`, not IP, so a single server sending messages for thousands of different threads will not be rate-limited as if it were one user. Use a distinct `threadId` per conversation.

---

## Content-Type Requirements

- All request bodies must be sent with `Content-Type: application/json`.
- Maximum body size: **10 MB**.
- URL-encoded form bodies are also parsed, but all documented endpoints expect JSON.
- Malformed JSON or a missing `Content-Type` header on POST/PUT/PATCH endpoints will result in a `400` validation error.

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error title",
  "code": "MACHINE_READABLE_CODE",
  "message": "Detailed description of what went wrong",
  "details": [ ]
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Validation error — check `details[]` for per-field Zod errors |
| `404` | Resource not found |
| `429` | Rate limit exceeded — see `retryAfter` |
| `500` | Internal server error |

---

## Endpoints

### Health

#### `GET /api/healthz`

Liveness probe. Returns immediately with no side-effects.

**Response `200`**
```json
{ "status": "ok" }
```

---

### POST /api/chat

The primary endpoint. Send a message and receive an AI response. Memory, context window, and knowledge retrieval happen automatically.

#### Request

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `message` | `string` | ✅ Yes | 1–32 000 chars | The user's message text |
| `threadId` | `string` | ✅ Yes | min 1 char | Conversation identifier. Use a stable ID per conversation (user ID, channel ID, etc.) |
| `userId` | `string` | No | — | Optional user identifier stored in thread metadata |
| `personalityId` | `string` | No | — | Override the personality for this request only |
| `modelOverride` | `object` | No | — | Per-request inference settings (see below) |
| `contextOverride` | `object` | No | — | Per-request context flags (see below) |

**`modelOverride` fields (all optional)**

| Field | Type | Constraints |
|---|---|---|
| `mode` | `"native" \| "ollama" \| "llama_cpp" \| "vllm" \| "lm_studio" \| "custom"` | — |
| `modelName` | `string` | — |
| `endpoint` | `string` | — |
| `temperature` | `number` | 0–2 |
| `maxTokens` | `number` | positive integer |

**`contextOverride` fields (all optional)**

| Field | Type | Description |
|---|---|---|
| `systemPrompt` | `string` | Override the system prompt for this turn only |
| `includeMemory` | `boolean` | Whether to inject long-term memory (default: true) |
| `includeKnowledge` | `boolean` | Whether to inject knowledge base results (default: true) |

#### Example request body

```json
{
  "message": "What can you help me with?",
  "threadId": "discord-guild-123-channel-456-user-789",
  "userId": "discord-user-789",
  "personalityId": "catbot-default"
}
```

#### Example successful response `200`

```json
{
  "id": "ceb99c2b-4d0f-4b47-b0ba-686db72368bc",
  "threadId": "discord-guild-123-channel-456-user-789",
  "message": "What can you help me with?",
  "response": "Hi there! I can help you with a wide range of topics. What's on your mind?",
  "model": "catbot-native-v1",
  "mode": "native",
  "latencyMs": 12,
  "tokensUsed": 38,
  "intent": "general_inquiry",
  "keywords": ["help", "topics"],
  "confidence": 0.87,
  "timestamp": 1749000000000
}
```

#### Example error response `400` (validation failure)

```json
{
  "error": "Validation error",
  "code": "VALIDATION_ERROR",
  "message": "Request body failed validation",
  "details": [
    {
      "field": "message",
      "message": "String must contain at least 1 character(s)"
    },
    {
      "field": "threadId",
      "message": "Required"
    }
  ]
}
```

#### Example error response `429` (rate limit)

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests for this thread. Please wait before sending again.",
  "retryAfter": 60
}
```

#### cURL example

```bash
curl -X POST https://<your-domain>/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! What can you tell me about Cat-Bot?",
    "threadId": "test-thread-001",
    "userId": "user-abc"
  }'
```

#### JavaScript fetch example

```javascript
const response = await fetch("https://<your-domain>/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Hello! What can you tell me about Cat-Bot?",
    threadId: "test-thread-001",
    userId: "user-abc",
  }),
});

if (!response.ok) {
  const error = await response.json();
  console.error("Chat error:", error);
  return;
}

const data = await response.json();
console.log("AI response:", data.response);
console.log("Latency:", data.latencyMs, "ms");
```

---

### Threads

Thread = an isolated conversation session. A thread holds its own message history, settings, and memory.

#### `GET /api/threads`

List all threads, optionally filtered by user.

**Query params:** `userId` (optional string)

**Response `200`**
```json
{
  "threads": [
    {
      "id": "discord-guild-123-channel-456-user-789",
      "name": "Support chat",
      "userId": "user-789",
      "platform": "discord",
      "personalityId": "catbot-default",
      "settings": {
        "maxMemoryEntries": 100,
        "compressionThreshold": 50,
        "longTermMemoryEnabled": true,
        "learningEnabled": true,
        "contextWindowSize": 20,
        "responseStyle": "conversational"
      },
      "modelConfig": null,
      "metadata": {},
      "createdAt": 1749000000000,
      "updatedAt": 1749000001000,
      "messageCount": 14
    }
  ],
  "count": 1
}
```

#### `POST /api/threads`

Create a thread explicitly. You can also skip this — sending `POST /api/chat` with a new `threadId` auto-creates the thread.

**Request body (all optional)**

```json
{
  "id": "discord-guild-123-channel-456-user-789",
  "name": "Support chat",
  "userId": "user-789",
  "platform": "discord",
  "personalityId": "catbot-default",
  "settings": {
    "maxMemoryEntries": 100,
    "compressionThreshold": 50,
    "longTermMemoryEnabled": true,
    "learningEnabled": true,
    "contextWindowSize": 20,
    "responseStyle": "conversational"
  },
  "metadata": {}
}
```

**Response `201`** — the created thread object (same shape as above).

#### `GET /api/threads/:id`

Get a single thread by ID.

**Response `200`** — thread object, or `404` if not found.

#### `PATCH /api/threads/:id`

Update thread settings or metadata. All fields are optional (partial update).

**Response `200`** — updated thread object.

#### `DELETE /api/threads/:id`

Delete a thread and all its memory.

**Response `200`**
```json
{ "message": "Thread deleted" }
```

---

### Memory

Memory is managed per-thread. Short-term = the message log. Long-term = extracted facts and preferences.

#### `GET /api/memory/:threadId`

Get full memory state for a thread.

**Response `200`**
```json
{
  "threadId": "discord-guild-123-channel-456-user-789",
  "messages": [
    { "role": "user", "content": "Hello", "timestamp": 1749000000000 },
    { "role": "assistant", "content": "Hi there!", "timestamp": 1749000000012 }
  ],
  "context": { "customKey": "customValue" },
  "stats": {
    "messageCount": 2,
    "longTermEntries": 0,
    "contextKeys": 1
  }
}
```

#### `GET /api/memory/:threadId/long-term`

Get all long-term memory entries for a thread.

#### `GET /api/memory/:threadId/stats`

Get memory statistics (counts, sizes).

#### `POST /api/memory/search`

Semantic search across long-term memory.

**Request body**

```json
{
  "threadId": "discord-guild-123-channel-456-user-789",
  "query": "user's preferred language",
  "limit": 10,
  "type": "preference",
  "minImportance": 0.5
}
```

`type` is one of: `"fact"`, `"preference"`, `"context"`, `"conversation"`, `"instruction"`, `"emotion"`

**Response `200`**
```json
{ "results": [ /* memory entry objects */ ], "count": 3 }
```

#### `POST /api/memory/entry`

Manually insert a long-term memory entry.

**Request body**

```json
{
  "threadId": "discord-guild-123-channel-456-user-789",
  "content": "User prefers responses in Spanish",
  "type": "preference",
  "importance": 0.8,
  "tags": ["language", "spanish"],
  "userId": "user-789"
}
```

**Response `201`** — the created memory entry.

#### `POST /api/memory/compress`

Archive old short-term messages, keeping only the most recent N.

**Request body**
```json
{ "threadId": "discord-guild-123-channel-456-user-789", "keepLast": 20 }
```

**Response `200`**
```json
{ "archived": 45, "message": "Memory compressed successfully" }
```

#### `DELETE /api/memory/:threadId/short-term`

Clear message history for a thread (long-term memory is preserved).

**Response `200`**
```json
{ "message": "Short-term memory cleared" }
```

#### `DELETE /api/memory/:threadId/long-term`

Delete all long-term memory entries for a thread.

**Response `200`**
```json
{ "message": "Long-term memory deleted" }
```

#### `POST /api/memory/:threadId/context`

Set an arbitrary key-value in the thread's context object.

**Request body**
```json
{ "key": "userTimezone", "value": "America/New_York" }
```

**Response `200`**
```json
{ "message": "Context updated", "key": "userTimezone", "value": "America/New_York" }
```

---

### Knowledge

The knowledge base stores documents that are retrieved and injected into AI context during chat (RAG). Uses keyword + TF-IDF semantic search.

#### `GET /api/knowledge`

List all knowledge entries.

**Query params:** `category` (optional string filter)

**Response `200`**
```json
{
  "entries": [
    {
      "id": "kb-001",
      "title": "Cat-Bot Overview",
      "content": "Cat-Bot is a self-hosted AI assistant...",
      "category": "catbot",
      "tags": ["overview", "features"],
      "source": "docs/overview.md",
      "createdAt": 1749000000000
    }
  ],
  "stats": { "total": 6, "categories": { "catbot": 3, "ai-platform": 3 } }
}
```

#### `POST /api/knowledge/ingest`

Add a knowledge entry. Rate limited: **30 req/min per IP**.

**Request body**

```json
{
  "title": "Refund Policy",
  "content": "Refunds are available within 30 days of purchase...",
  "category": "support",
  "tags": ["refunds", "policy"],
  "source": "https://example.com/refund-policy"
}
```

**Response `201`** — the created knowledge entry.

#### `POST /api/knowledge/ingest/bulk`

Ingest an array of knowledge entries in one request. Same rate limit as `/ingest`.

**Request body** — array of `KnowledgeIngestSchema` objects (same fields as above).

**Response `201`** — array of created entries.

#### `POST /api/knowledge/search`

Search the knowledge base. Results are scored by relevance.

**Request body**

```json
{
  "query": "how do I get a refund",
  "limit": 5,
  "category": "support",
  "threshold": 0.1
}
```

`threshold` (0–1): minimum relevance score to include in results. Default: `0.1`.

**Response `200`**
```json
{ "results": [ /* scored knowledge entries */ ], "count": 2 }
```

#### `GET /api/knowledge/:id`

Get a single knowledge entry by ID.

#### `PATCH /api/knowledge/:id`

Update a knowledge entry (partial update, all fields optional).

#### `DELETE /api/knowledge/:id`

Delete a knowledge entry.

#### `GET /api/knowledge/stats/summary`

High-level stats: total entries, category distribution, total size.

#### `POST /api/knowledge/maintenance/reindex`

Rebuild the search index. Call after bulk imports.

**Response `200`**
```json
{ "message": "Reindexing complete", "updated": 6 }
```

---

### Personality

Personalities control how the AI responds — tone, verbosity, emoji usage, greetings, fallbacks.

#### `GET /api/personality`

List all personalities.

**Response `200`**
```json
{
  "personalities": [
    {
      "id": "catbot-default",
      "name": "Cat-Bot",
      "description": "Friendly and helpful AI assistant",
      "style": {
        "tone": "friendly",
        "verbosity": "moderate",
        "emojiUsage": "minimal",
        "useMarkdown": false,
        "language": "en"
      },
      "isDefault": true
    }
  ],
  "count": 1
}
```

#### `GET /api/personality/default`

Get the active default personality.

#### `POST /api/personality`

Create a personality.

**Request body**

```json
{
  "name": "Support Bot",
  "description": "Formal support assistant",
  "systemPrompt": "You are a helpful support agent. Always be professional and concise.",
  "traits": [
    { "name": "empathy", "value": 0.9, "description": "Level of empathetic responses" },
    { "name": "formality", "value": 0.8, "description": "Formal language register" }
  ],
  "greetings": ["Hello! How can I assist you today?", "Hi there, what do you need help with?"],
  "farewells": ["Thank you for contacting support. Goodbye!", "Have a great day!"],
  "fallbacks": ["I'm not sure about that. Let me check and get back to you."],
  "style": {
    "tone": "professional",
    "verbosity": "moderate",
    "emojiUsage": "none",
    "useMarkdown": false,
    "language": "en"
  }
}
```

`tone`: `"formal"` | `"casual"` | `"friendly"` | `"professional"` | `"playful"`  
`verbosity`: `"minimal"` | `"moderate"` | `"verbose"`  
`emojiUsage`: `"none"` | `"minimal"` | `"moderate"` | `"heavy"`

**Response `201`** — the created personality.

#### `GET /api/personality/:id`

Get a personality by ID.

#### `PATCH /api/personality/:id`

Update a personality (partial update). The `catbot-default` personality can be updated but **not deleted**.

#### `DELETE /api/personality/:id`

Delete a personality. Returns `403` if `id === "catbot-default"`.

---

### Analytics

#### `GET /api/analytics/summary`

Aggregate usage statistics.

**Query params:** `from` (unix ms), `to` (unix ms), `threadId` (optional filter)

**Response `200`**
```json
{
  "totalInteractions": 42,
  "avgLatencyMs": 14,
  "intentDistribution": {
    "general_inquiry": 18,
    "greeting": 12,
    "knowledge_request": 8,
    "other": 4
  },
  "threadCount": 6,
  "topThreads": [ { "threadId": "...", "count": 12 } ]
}
```

#### `GET /api/analytics/recent`

Most recent interactions.

**Query params:** `limit` (default `50`)

**Response `200`**
```json
{ "interactions": [ /* interaction records */ ], "count": 50 }
```

#### `GET /api/analytics/thread/:threadId`

Analytics summary scoped to a single thread.

---

### Models

Switch inference mode at runtime without restarting the server.

#### `GET /api/models/config`

Get the current inference configuration. API keys are masked as `"***"`.

**Response `200`**
```json
{
  "mode": "native",
  "modelName": "catbot-native-v1",
  "endpoint": null,
  "apiKey": "***",
  "temperature": 0.7,
  "maxTokens": 1024
}
```

#### `PUT /api/models/config`

Switch to a different inference adapter.

**Request body (example — switch to Ollama)**

```json
{
  "mode": "ollama",
  "endpoint": "http://localhost:11434",
  "modelName": "llama3",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

`mode` options: `"native"` | `"ollama"` | `"llama_cpp"` | `"vllm"` | `"lm_studio"` | `"custom"`

If the configured adapter is unreachable, the platform automatically falls back to `"native"`.

#### `GET /api/models/available`

List all registered inference adapters and their availability status.

**Response `200`**
```json
{ "adapters": [ { "mode": "native", "available": true }, { "mode": "ollama", "available": false } ] }
```

#### `POST /api/models/test`

Run a test inference with the current adapter.

**Request body**
```json
{ "prompt": "Say hello in one sentence." }
```

**Response `200`**
```json
{
  "success": true,
  "response": "Hello! How can I help you today?",
  "model": "catbot-native-v1",
  "mode": "native",
  "latencyMs": 8
}
```

---

### Admin

#### `GET /api/admin/overview`

System-wide summary: threads, knowledge, analytics, model config.

**Response `200`**
```json
{
  "threads": { "total": 6, "active": 6 },
  "knowledge": { "total": 6, "byCategory": { "catbot": 3, "ai-platform": 3 }, "totalSize": 1004 },
  "analytics": { "totalInteractions": 42, "avgLatencyMs": 14 },
  "personalities": { "total": 1 },
  "model": { "mode": "native", "name": "catbot-native-v1" },
  "adapters": [],
  "timestamp": 1749000000000
}
```

#### `POST /api/admin/learn`

Trigger a learning cycle to extract long-term memory from recent conversations.

**Request body** (optional)
```json
{ "threadId": "discord-guild-123-channel-456-user-789" }
```

Omit `threadId` to run learning across all threads.

#### `GET /api/admin/insights/:threadId`

Personality and behavior insights derived from a thread's conversation history.

#### `POST /api/admin/cache/clear`

Clear the in-memory response cache.

**Request body** (optional pattern)
```json
{ "pattern": "/api/chat" }
```

#### `GET /api/admin/data/size`

Disk usage breakdown for JSON data files.

**Response `200`**
```json
{
  "totalBytes": 48293,
  "totalKB": 47.2,
  "breakdown": {
    "memory": 18000,
    "threads": 8000,
    "knowledge": 12000,
    "personality": 2000,
    "analytics": 6000,
    "models": 2293
  }
}
```

#### `POST /api/admin/threads/cleanup`

Find (and optionally delete) threads older than N days.

**Request body**
```json
{ "olderThanDays": 30 }
```

---

### Diagnostics

#### `GET /api/diagnostics`

Full system health: CPU, memory, uptime, inference status, knowledge stats.

**Response `200`**
```json
{
  "system": {
    "uptime": 3600,
    "nodeVersion": "v24.0.0",
    "memory": {
      "rss": 52428800,
      "heapUsed": 28000000,
      "heapTotal": 40000000,
      "external": 1000000
    },
    "cpuUser": 120000,
    "cpuSystem": 30000
  },
  "inference": {
    "currentMode": "native",
    "configuredModel": "catbot-native-v1",
    "adapters": []
  },
  "knowledge": { "totalEntries": 6, "categories": { "catbot": 3, "ai-platform": 3 } },
  "analytics": { "interactionsLastHour": 5, "avgLatencyMs": 14 },
  "timestamp": 1749000000000
}
```

#### `GET /api/diagnostics/memory-test`

Test the embedding and NLP pipeline on a custom text.

**Query params:** `testText` (string)

**Response `200`**
```json
{
  "testText": "how does memory work",
  "embeddingDimensions": 512,
  "embeddingNorm": 1.0,
  "keywords": ["memory", "work"],
  "intent": "knowledge_request",
  "processingMs": 2
}
```

#### `GET /api/diagnostics/inference-test`

Run a live inference test with the currently configured adapter.

---

## TypeScript Interfaces

```typescript
// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ModelOverride {
  mode?: "native" | "ollama" | "llama_cpp" | "vllm" | "lm_studio" | "custom";
  modelName?: string;
  endpoint?: string;
  temperature?: number; // 0–2
  maxTokens?: number;   // positive integer
}

export interface ContextOverride {
  systemPrompt?: string;
  includeMemory?: boolean;
  includeKnowledge?: boolean;
}

export interface ChatRequest {
  message: string;       // required, 1–32 000 chars
  threadId: string;      // required, min 1 char
  userId?: string;
  personalityId?: string;
  modelOverride?: ModelOverride;
  contextOverride?: ContextOverride;
}

export interface ChatResponse {
  id: string;
  threadId: string;
  message: string;
  response: string;
  model: string;
  mode: string;
  latencyMs: number;
  tokensUsed?: number;
  intent?: string;
  keywords?: string[];
  confidence?: number;
  timestamp: number;
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export interface ThreadSettings {
  maxMemoryEntries?: number;         // default 100
  compressionThreshold?: number;     // default 50
  longTermMemoryEnabled?: boolean;   // default true
  learningEnabled?: boolean;         // default true
  contextWindowSize?: number;        // default 20
  responseStyle?: "concise" | "detailed" | "conversational"; // default "conversational"
}

export interface ThreadCreateRequest {
  id?: string;
  name?: string;
  userId?: string;
  platform?: string;
  personalityId?: string;  // default "catbot-default"
  settings?: ThreadSettings;
  modelConfig?: ModelOverride;
  metadata?: Record<string, unknown>;
}

export interface Thread extends Required<ThreadCreateRequest> {
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export type MemoryEntryType = "fact" | "preference" | "context" | "conversation" | "instruction" | "emotion";

export interface MemoryEntryCreateRequest {
  threadId: string;         // required
  content: string;          // required
  userId?: string;
  type?: MemoryEntryType;   // default "fact"
  importance?: number;      // 0–1, default 0.5
  tags?: string[];
  expiresAt?: number;       // unix ms
}

export interface MemorySearchRequest {
  threadId: string;         // required
  query: string;            // required
  limit?: number;           // 1–50, default 10
  type?: MemoryEntryType;
  minImportance?: number;   // 0–1
}

// ─── Knowledge ────────────────────────────────────────────────────────────────

export interface KnowledgeIngestRequest {
  title: string;            // required
  content: string;          // required
  category?: string;        // default "general"
  tags?: string[];
  source?: string;
}

export interface KnowledgeSearchRequest {
  query: string;            // required
  limit?: number;           // 1–50, default 10
  category?: string;
  tags?: string[];
  threshold?: number;       // 0–1, default 0.1
}

// ─── Personality ──────────────────────────────────────────────────────────────

export type PersonalityTone = "formal" | "casual" | "friendly" | "professional" | "playful";
export type PersonalityVerbosity = "minimal" | "moderate" | "verbose";
export type PersonalityEmojiUsage = "none" | "minimal" | "moderate" | "heavy";

export interface PersonalityStyle {
  tone?: PersonalityTone;
  verbosity?: PersonalityVerbosity;
  emojiUsage?: PersonalityEmojiUsage;
  useMarkdown?: boolean;
  language?: string;
}

export interface PersonalityTrait {
  name: string;
  value: number;        // 0–1
  description: string;
}

export interface PersonalityCreateRequest {
  name: string;          // required
  description?: string;
  systemPrompt?: string;
  traits?: PersonalityTrait[];
  greetings?: string[];
  farewells?: string[];
  fallbacks?: string[];
  style?: PersonalityStyle;
  metadata?: Record<string, unknown>;
  isDefault?: boolean;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}
```

---

## External Bot Integration

This section explains exactly how a Discord bot, Facebook Messenger bot, or any chat application can integrate with the Cat-Bot AI Platform.

### Core pattern

Every incoming message from a user is converted to a `POST /api/chat` request. The `threadId` should be a stable identifier scoped to a specific conversation so the AI maintains context and memory across turns.

### Thread ID strategy

| Platform | Recommended `threadId` |
|---|---|
| Discord | `discord-${guildId}-${channelId}-${userId}` |
| Facebook Messenger | `messenger-${pageId}-${senderId}` |
| Telegram | `telegram-${chatId}` |
| WhatsApp | `whatsapp-${phoneNumberId}-${from}` |
| Slack | `slack-${teamId}-${channelId}-${userId}` |
| Generic web chat | `web-${sessionId}` or `web-${userId}` |

A new `threadId` means a fresh conversation with no memory. Reusing the same `threadId` gives the user a continuous conversation with full context.

---

### Discord Bot (discord.js)

```typescript
import { Client, GatewayIntentBits, Events, Message } from "discord.js";

const AI_BASE_URL = process.env.CATBOT_AI_URL ?? "https://<your-domain>";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user!)) return;

  const userMessage = message.content
    .replace(`<@${client.user!.id}>`, "")
    .trim();

  if (!userMessage) return;

  // One thread per user per channel — maintains per-user memory
  const threadId = `discord-${message.guildId}-${message.channelId}-${message.author.id}`;

  try {
    await message.channel.sendTyping();

    const res = await fetch(`${AI_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        threadId,
        userId: message.author.id,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.retryAfter) {
        await message.reply(`I'm getting too many messages right now. Try again in ${err.retryAfter} seconds.`);
      } else {
        await message.reply("Something went wrong. Please try again.");
      }
      return;
    }

    const data = await res.json();
    await message.reply(data.response);
  } catch (err) {
    console.error("Cat-Bot API unreachable:", err);
    await message.reply("I'm offline right now. Please try again later.");
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

### Facebook Messenger (webhook handler)

```typescript
import express from "express";

const app = express();
app.use(express.json());

const AI_BASE_URL = process.env.CATBOT_AI_URL ?? "https://<your-domain>";
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN!;

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);

  for (const entry of body.entry) {
    for (const event of entry.messaging) {
      if (!event.message?.text) continue;

      const senderId = event.sender.id;
      const pageId = entry.id;
      const threadId = `messenger-${pageId}-${senderId}`;
      const userMessage = event.message.text;

      const aiRes = await fetch(`${AI_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, threadId, userId: senderId }),
      });

      const { response } = await aiRes.json();

      // Send reply back to Messenger
      await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: response },
        }),
      });
    }
  }

  res.sendStatus(200);
});

app.listen(3000);
```

---

### Telegram Bot

```typescript
import TelegramBot from "node-telegram-bot-api";

const AI_BASE_URL = process.env.CATBOT_AI_URL ?? "https://<your-domain>";
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });

bot.on("message", async (msg) => {
  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = String(msg.from?.id ?? chatId);
  const threadId = `telegram-${chatId}`;

  const res = await fetch(`${AI_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, threadId, userId }),
  });

  const { response } = await res.json();
  await bot.sendMessage(chatId, response);
});
```

---

### Generic HTTP client (any platform)

```typescript
interface CatBotClient {
  baseUrl: string;
  platform: string;
}

async function sendMessage(
  client: CatBotClient,
  conversationId: string,
  userId: string,
  message: string
): Promise<string> {
  const threadId = `${client.platform}-${conversationId}-${userId}`;

  const res = await fetch(`${client.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId, userId }),
  });

  if (res.status === 429) {
    const err = await res.json();
    throw new Error(`Rate limited. Retry after ${err.retryAfter}s`);
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Chat error: ${err.message}`);
  }

  const data = await res.json();
  return data.response;
}

// Usage
const bot: CatBotClient = {
  baseUrl: "https://<your-domain>",
  platform: "myapp",
};

const reply = await sendMessage(bot, "channel-42", "user-99", "Hello!");
console.log(reply);
```

---

### Recommended integration checklist

- [ ] Set `CATBOT_AI_URL` in your bot's environment variables to the deployed API base URL.
- [ ] Design your `threadId` so it is stable per user/conversation and globally unique.
- [ ] Handle `429` responses — read `retryAfter` and delay before retrying.
- [ ] Optionally call `POST /api/threads` on first message to set a `platform` tag and custom `settings`.
- [ ] Use `POST /api/memory/entry` to pre-seed facts about a user (e.g. name, preferences) before their first message.
- [ ] Use `DELETE /api/memory/:threadId/short-term` to clear chat history when a user asks to "start over".
- [ ] For high-throughput bots, monitor `/api/analytics/summary` and `/api/diagnostics` to watch latency and usage.
- [ ] To switch from native AI to a real LLM (Ollama, etc.), call `PUT /api/models/config` without restarting the server.

---

*For full Swagger UI (interactive): `https://<your-domain>/api/docs`*
