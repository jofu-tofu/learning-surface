# Providers

AI provider abstraction — strategy pattern for REPL integration.

## Architecture

- **`ReplProvider` interface** (defined in `shared/providers.ts`): `config` property + `complete()` method
- **Registry** (`registry.ts`): Module-level singleton `Map`. Registers CLI provider eagerly, API provider via dynamic `import()` with try/catch. Exports `getProvider()`, `listProviders()`, `getDefaultProvider()`.

## Provider Modes

| Provider | File | Auth | How it works |
|----------|------|------|-------------|
| Codex CLI (default) | `cli.ts` | codex CLI auth (no API key) | Spawns `codex exec --full-auto`, AI edits `current.md` directly |
| Claude Code | `claude-code.ts` | claude CLI auth (no API key) | Spawns `claude --print --dangerously-skip-permissions`, AI edits `current.md` directly |
| Codex API | `codex.ts` | `OPENAI_API_KEY` env var | OpenAI SDK chat completions with multi-round tool-use loop (max 20 rounds) |

**CLI mode** (Codex CLI, Claude Code): The AI gets the structured markdown format spec as part of its system prompt and edits files directly. No tool callback loop. Claude Code restricts built-in tools to `Read,Edit,Write` and uses `--no-session-persistence`.

**API mode** (Codex API): Uses `onToolCall` callback — each tool invocation is fed back to the model for the next round. The server applies tool calls via `document-service.ts`.

## Gotchas

- `cli.ts` and `claude-code.ts` both have the structured markdown format spec inlined as `CLI_SYSTEM_PROMPT`. If the format changes, update both.
- Each provider's model list is hardcoded in `config.models`. Update when new models become available.
- Each model declares `reasoningEfforts` (available levels) and `defaultEffort`. Codex CLI passes `--reasoning-effort` flag; Claude Code CLI has no effort flag (ignored); Codex API passes `reasoning_effort` to the OpenAI SDK.
- `ReasoningEffort` is a union type in `shared/providers.ts`: `'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`. Not all values are valid for all models — the per-model `reasoningEfforts` array controls what the UI shows.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `registry.ts` exists. If it doesn't, this file is stale.
