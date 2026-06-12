# Cat-Bot AI Platform

> **Fully self-hosted AI backend for Cat-Bot SIM** — memory, knowledge, inference, and conversation management with zero external AI dependencies.

## Overview

The Cat-Bot AI Platform is a production-ready, self-hosted REST API that serves as the complete intelligence layer for Cat-Bot SIM. It operates entirely without OpenAI, DeepSeek, Gemini, Claude, or any external AI service.

### Key Features

- **Native AI Core** — intelligent response generation using pattern matching, intent classification, contextual memory, and RAG-style knowledge retrieval — no external model required
- **Pluggable Inference** — drop-in support for Ollama, llama.cpp, vLLM, and LM Studio when you want a real LLM
- **Two-Tier Memory** — per-thread short-term conversation history + long-term fact/preference extraction
- **Knowledge Base** — ingest domain knowledge; retrieved automatically via semantic + keyword search
- **Adaptive Personality** — configurable personalities that adapt over time to each thread
- **Learning System** — analyzes conversations to improve patterns, embeddings, and responses
- **Swagger UI** — full interactive API docs at `/api/docs`

---

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start the API server
pnpm --filter @workspace/api-server run dev
# Server: http://localhost:5000
# Docs:   http://localhost:5000/api/docs
```

### Docker

```bash
# Native mode only (no external model)
docker-compose up catbot-ai

# With Ollama for local LLM
docker-compose --profile ollama up
```

---

## Architecture

```
Cat-Bot SIM (sim.ts)
        │ HTTP
        ▼
Cat-Bot AI Platform (Express API)
        │
        ├── Conversation Manager ── orchestrates each chat turn
        │        │
        │        ├── Memory Engine ──── short-term (messages) + long-term (facts)
        │        ├── Knowledge Engine ─ semantic + keyword retrieval (RAG)
        │        └── Prompt Engine ──── system prompt assembly with context
        │
        ├── Inference Layer (pluggable)
        │        ├── Native Adapter ──── built-in (no external model)
        │        ├── Ollama Adapter ──── local Ollama server
        │        ├── llama.cpp Adapter ─ llama.cpp OpenAI-compat server
        │        ├── vLLM Adapter ────── vLLM serving engine
        │        └── LM Studio Adapter ─ LM Studio local server
        │
        └── Storage Layer (JSON → SQLite → PostgreSQL path)
                 ├── data/memory/     ─ short-term & long-term per thread
                 ├── data/threads/    ─ thread configurations
                 ├── data/knowledge/  ─ knowledge base
                 ├── data/personality/─ personality profiles
                 ├── data/analytics/  ─ interaction logs
                 └── data/models/     ─ model config & learned patterns
```

---

## API Endpoints

All endpoints are prefixed with `/api`. Interactive docs at `/api/docs`.

### Chat
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Send a message, get an AI response |

### Memory
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/memory/:threadId` | Get thread memory (short-term + context) |
| `GET` | `/api/memory/:threadId/long-term` | Get long-term memory entries |
| `GET` | `/api/memory/:threadId/stats` | Memory statistics |
| `POST` | `/api/memory/search` | Semantic search through long-term memory |
| `POST` | `/api/memory/entry` | Manually add a memory entry |
| `POST` | `/api/memory/compress` | Compress short-term memory |
| `DELETE` | `/api/memory/:threadId/short-term` | Clear short-term memory |
| `DELETE` | `/api/memory/:threadId/long-term` | Delete long-term memory |

### Threads
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/threads` | List all threads |
| `POST` | `/api/threads` | Create a thread |
| `GET` | `/api/threads/:id` | Get thread details |
| `PATCH` | `/api/threads/:id` | Update thread settings |
| `DELETE` | `/api/threads/:id` | Delete a thread |

### Knowledge
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/knowledge` | List all knowledge entries |
| `POST` | `/api/knowledge/ingest` | Ingest a knowledge entry |
| `POST` | `/api/knowledge/ingest/bulk` | Bulk ingest |
| `POST` | `/api/knowledge/search` | Search the knowledge base |
| `PATCH` | `/api/knowledge/:id` | Update a knowledge entry |
| `DELETE` | `/api/knowledge/:id` | Delete a knowledge entry |
| `POST` | `/api/knowledge/maintenance/reindex` | Rebuild embeddings |

### Personality
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/personality` | List personalities |
| `GET` | `/api/personality/default` | Get the default personality |
| `POST` | `/api/personality` | Create a personality |
| `PATCH` | `/api/personality/:id` | Update a personality |
| `DELETE` | `/api/personality/:id` | Delete a personality |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/summary` | Usage summary (with date range filter) |
| `GET` | `/api/analytics/recent` | Recent interactions |
| `GET` | `/api/analytics/thread/:threadId` | Per-thread analytics |

### Models
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/models/config` | Current model configuration |
| `PUT` | `/api/models/config` | Update model configuration |
| `GET` | `/api/models/available` | Check available adapters |
| `POST` | `/api/models/test` | Test current inference |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/overview` | System overview dashboard |
| `POST` | `/api/admin/learn` | Trigger learning cycle |
| `GET` | `/api/admin/insights/:threadId` | Personality insights for thread |
| `POST` | `/api/admin/cache/clear` | Clear response cache |
| `GET` | `/api/admin/data/size` | Storage usage breakdown |

### Diagnostics
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/diagnostics` | Full system diagnostics |
| `GET` | `/api/diagnostics/memory-test` | Test embedding & intent system |
| `GET` | `/api/diagnostics/inference-test` | Test native inference |
| `GET` | `/api/healthz` | Health check |

---

## Cat-Bot SIM Integration

In Cat-Bot's `sim.ts`, replace direct AI provider calls with HTTP requests to this platform:

```typescript
const AI_BASE = process.env.CATBOT_AI_URL ?? "http://localhost:5000";

async function getAIResponse(message: string, threadId: string, userId?: string) {
  const res = await fetch(`${AI_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId, userId }),
  });
  const data = await res.json();
  return data.response as string;
}
```

---

## Inference Modes

Switch modes via `PUT /api/models/config`:

### Native (default — no external model)
```json
{ "mode": "native" }
```

### Ollama
```json
{ "mode": "ollama", "endpoint": "http://localhost:11434", "modelName": "llama3" }
```

### llama.cpp
```json
{ "mode": "llama_cpp", "endpoint": "http://localhost:8080/v1", "modelName": "local" }
```

### vLLM
```json
{ "mode": "vllm", "endpoint": "http://localhost:8000/v1", "modelName": "mistral-7b" }
```

### LM Studio
```json
{ "mode": "lm_studio", "endpoint": "http://localhost:1234/v1", "modelName": "local" }
```

If the configured adapter is unavailable, the platform automatically falls back to native mode.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | Environment |
| `LOG_LEVEL` | `info` | Pino log level |

---

## Data Storage

All data is stored in `artifacts/api-server/data/`:

```
data/
├── memory/      st_<threadId>.json  ← short-term
│                lt_<threadId>.json  ← long-term
├── threads/     <threadId>.json
├── knowledge/   base.json
├── personality/ personalities.json
├── analytics/   interactions.json
└── models/      config.json, patterns.json
```

The JSON storage layer is designed for easy migration to SQLite or PostgreSQL by swapping the repository implementations.

---

## Learning System

Trigger a learning cycle with `POST /api/admin/learn`:

- Analyzes recent conversations for patterns
- Extracts and reinforces high-importance facts
- Updates knowledge embeddings
- Adapts personality topics based on conversation history
- Saves learned response patterns for future use

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Chat | 60 req/min per thread |
| Knowledge ingestion | 30 req/min |
| Global | 300 req/min |
