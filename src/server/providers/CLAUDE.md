# Providers

AI provider abstraction — strategy pattern for REPL integration.

## Architecture

- **`ReplProvider` interface** (defined in `shared/providers.ts`): `config` property + `complete()` method
- **Registry** (`registry.ts`): Module-level singleton `Map`. Registers CLI provider eagerly, API provider via dynamic `import()` with try/catch. Exports `getProvider()`, `listProviders()`, `getDefaultProvider()`.

## Two Provider Modes

| Provider | File | Auth | How it works |
|----------|------|------|-------------|
| CLI (default) | `cli.ts` | codex CLI auth (no API key) | Spawns `codex exec --full-auto`, AI edits `current.md` directly |
| API | `codex.ts` | `OPENAI_API_KEY` env var | OpenAI SDK chat completions with multi-round tool-use loop (max 20 rounds) |

**CLI mode:** The AI gets the structured markdown format spec as part of its system prompt and edits files directly. No tool callback loop.

**API mode:** Uses `onToolCall` callback — each tool invocation is fed back to the model for the next round. The server applies tool calls via `document-service.ts`.

## Gotchas

- `cli.ts` has the structured markdown format spec inlined as a constant in `CLI_SYSTEM_PROMPT`. If the format changes, update it here.
- The CLI provider's model list is hardcoded. Update `config.models` when new models become available.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `registry.ts` exists. If it doesn't, this file is stale.
