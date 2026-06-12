---
name: CatBot AI Platform Architecture
description: Key decisions for the self-hosted Cat-Bot AI backend built in artifacts/api-server
---

## Core Architecture Decisions

**Zod version:** Workspace uses Zod v3 (`^3.25.76` in catalog). Import from `"zod"`, NOT `"zod/v4"`. Error issues are on `.errors` not `.issues` in v3. Must add `zod` as explicit dependency in api-server package.json (not inherited from workspace).

**Inference adapter pattern:** `BaseInferenceAdapter` abstract class → `NativeAdapter` (always available), `OllamaAdapter`, `OpenAICompatAdapter` (handles llama_cpp/vllm/lm_studio/custom). Factory `createAdapterWithFallback()` auto-falls back to native if configured adapter unreachable.

**Local embeddings:** Hash-based (hashString % 512 dimensions) in `core/native-ai/embeddings.ts`. `cosineSimilarity` must be explicitly re-exported from `embeddings.ts` (it's imported from `keyword-extractor.ts` but external callers import from `embeddings.ts`).

**Rate limiter:** Uses `ipKeyGenerator` from express-rate-limit for IP fallback in chat limiter. Custom `keyGenerator` that falls back to `req.ip` directly causes `ERR_ERL_KEY_GEN_IPV6` validation error — must use the `ipKeyGenerator` helper.

**Storage paths:** `getDataPath()` from `storage/json-store.ts` resolves correctly in both dev (CWD = artifacts/api-server) and prod (CWD = workspace root) via `workspaceRoot` detection.

**Memory extraction:** Regex patterns in `core/memory-engine.ts` auto-extract facts/preferences from user messages (e.g. "my name is X", "I prefer Y") and store in long-term memory per thread.

**Why:**
- No external dependencies = zero runtime cost, works offline, no API keys
- JSON storage designed for easy SQLite/PostgreSQL migration by swapping repositories only
- Thread-scoped memory matches Cat-Bot's multi-instance isolation requirements
