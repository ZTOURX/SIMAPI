# Cat-Bot AI Platform

A fully self-hosted AI backend for Cat-Bot SIM — memory, knowledge, inference, and conversation management with zero external AI provider dependencies.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the AI platform API server (port auto-assigned, dev: 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- API docs (Swagger UI): `http://localhost:PORT/api/docs`
- Health check: `GET /api/healthz`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9 (strict)
- API: Express 5 + Zod validation + swagger-ui-express + swagger-jsdoc
- Inference: Pluggable adapter system (native/Ollama/llama.cpp/vLLM/LM Studio)
- Memory: JSON-based two-tier (short-term per-thread + long-term persistent)
- Knowledge: Keyword + semantic TF-IDF search with local embeddings
- Rate limiting: express-rate-limit (per-thread for chat, global)
- Caching: node-cache (in-memory response cache)
- Logging: pino + pino-http (structured JSON)
- Build: esbuild (CJS bundle)
- Docker: Dockerfile + docker-compose.yml

## Where things live

- `artifacts/api-server/src/core/` — AI engines (memory, knowledge, prompt, conversation manager)
- `artifacts/api-server/src/core/native-ai/` — Native AI (pattern matching, intent, embeddings, response gen)
- `artifacts/api-server/src/core/inference/` — Inference adapters (native, Ollama, OpenAI-compat, factory)
- `artifacts/api-server/src/repositories/` — Data access (thread, memory, knowledge, personality, analytics)
- `artifacts/api-server/src/storage/json-store.ts` — JSON persistence layer
- `artifacts/api-server/src/routes/` — Express route handlers (chat, memory, threads, knowledge, personality, analytics, models, admin, diagnostics)
- `artifacts/api-server/src/middleware/` — Rate limiter, error handler, response cache
- `artifacts/api-server/src/prompts/` — System prompt builder + default Cat-Bot personality
- `artifacts/api-server/src/schemas/` — Zod validation schemas
- `artifacts/api-server/src/services/` — Learning service (adaptive improvement)
- `artifacts/api-server/data/` — Local JSON storage (memory, threads, knowledge, personality, analytics, models)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `docker-compose.yml` — Compose file (catbot-ai + optional Ollama profile)
- `artifacts/api-server/README.md` — Full API reference

## Architecture decisions

- **Native inference first** — The platform ships with a built-in AI that requires zero external dependencies. Pattern matching + intent classification + RAG-style knowledge retrieval + contextual response generation compose a working AI system in "native" mode.
- **Pluggable inference via adapters** — A BaseInferenceAdapter contract allows swapping to Ollama, llama.cpp, vLLM, or LM Studio at runtime via `PUT /api/models/config`. Falls back to native if the configured adapter is unreachable.
- **Two-tier memory** — Short-term (conversation messages, in JSON per thread) and long-term (extracted facts/preferences, persisted) are separate concerns managed by the memory engine. Compression auto-triggers on configurable thresholds.
- **JSON storage, migration-ready** — All repositories use a thin JSON abstraction layer (`storage/json-store.ts`). Swapping to SQLite or PostgreSQL means replacing only the repository implementations.
- **Local embeddings** — Hash-based vector generation (512 dimensions) enables semantic search without any ML model dependency. Not as accurate as neural embeddings, but entirely self-contained and sufficient for knowledge retrieval.

## Product

Cat-Bot AI Platform provides Cat-Bot SIM's complete intelligence layer:
- **Chat** (`POST /api/chat`) — Send messages, get AI responses. Memory, context, and knowledge retrieved automatically.
- **Memory** (`/api/memory/:threadId`) — Per-thread short-term history and long-term fact storage with search.
- **Threads** (`/api/threads`) — Isolated conversation sessions with configurable settings.
- **Knowledge** (`/api/knowledge`) — Domain knowledge base with bulk ingestion and semantic search.
- **Personality** (`/api/personality`) — Configurable AI personalities with style and trait settings.
- **Analytics** (`/api/analytics/summary`) — Usage metrics, latency, intent distribution.
- **Models** (`/api/models/config`) — Switch inference mode (native/Ollama/llama.cpp/vLLM/LM Studio) at runtime.
- **Admin** (`/api/admin/overview`) — System overview, learning cycles, cache management.
- **Diagnostics** (`/api/diagnostics`) — Full system health with memory/CPU/inference status.

## Cat-Bot SIM Integration

In `sim.ts`, replace direct AI provider calls with:
```typescript
const res = await fetch(`${process.env.CATBOT_AI_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, threadId, userId }),
});
const { response } = await res.json();
```

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always restart the workflow after code changes — `pnpm run dev` rebuilds with esbuild before starting
- Data is stored in `artifacts/api-server/data/` — this directory persists across restarts
- The default personality (`catbot-default`) cannot be deleted via the API
- When switching inference modes via `PUT /api/models/config`, the platform tests adapter availability and falls back to native if unavailable
- Rate limiter uses thread-scoped keys for chat (not IP-based) to allow high-volume bot traffic from one origin

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Full API reference: `artifacts/api-server/README.md`
- Swagger UI (running): `http://localhost:PORT/api/docs`
