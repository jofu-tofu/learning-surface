# Providers

AI provider abstraction — unified Agent interface.

## Architecture

- **`Agent` interface** (defined in `shared/providers.ts`): `config` property + `ask()` (single-shot structured output) + `run()` (multi-round tool chain) methods
- **Registry** (`registry.ts`): Module-level singleton `Map`. Registers both CLI providers eagerly, API provider via dynamic `import()` with try/catch. Exports `getProvider()`, `listProviders()`.

## Provider Modes

| Provider | File | Auth | How it works |
|----------|------|------|-------------|
| Codex CLI (default) | `cli.ts` | codex CLI auth (no API key) | Spawns `codex exec --full-auto`, AI edits `current.md` directly |
| Claude Code | `claude-code.ts` | claude CLI auth (no API key) | Spawns `claude --print --dangerously-skip-permissions`, AI edits `current.md` directly |
| Codex API | `codex.ts` | `OPENAI_API_KEY` env var | OpenAI SDK chat completions with multi-round tool-use loop (max 20 rounds) |

**`ask()` implementation per provider:**
- Codex API: `response_format: { type: 'json_schema' }` via OpenAI SDK — guaranteed schema compliance
- Codex CLI: `codex exec --output-schema <tmpfile>`, capture stdout via `spawnCliCapture()`
- Claude Code: `claude --print --json-schema '<schema>'`, capture stdout via `spawnCliCapture()`

**`run()` implementation:**
- CLI mode (Codex CLI, Claude Code): AI edits files directly. No tool callback loop. Both use `buildCliPrompt()` and `spawnCli()` from `spawn-cli.ts`.
- API mode (Codex API): Uses `onToolCall` callback — each tool invocation is fed back to the model for the next round. The server applies tool calls via `document-service.ts`.

## Gotchas

- All system prompts are defined in `server/system-prompt.ts` — private `TEACHING_SYSTEM_PROMPT` (shared persona + pedagogy) composed into two exports: `SYSTEM_PROMPT` (API mode) and `CLI_SYSTEM_PROMPT` (CLI mode). If prompt content changes, update that one file.
- Each provider's model list is hardcoded in `config.models`. Update when new models become available.
- Each model declares `reasoningEfforts` (available levels) and `defaultEffort`. Codex CLI passes `-c model_reasoning_effort=<level>`; Claude Code passes `--effort <level>`; Codex API passes `reasoning_effort` to the OpenAI SDK.
- `ReasoningEffort` is a union type in `shared/providers.ts`: `'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`. Not all values are valid for all models — the per-model `reasoningEfforts` array controls what the UI shows.
- `spawnCli()` accumulates stderr and includes it in the rejection error message, so CLI failures surface actionable diagnostics to the frontend. `spawnCliCapture()` captures stdout instead of logging it — used by `ask()`.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `registry.ts` exists. If it doesn't, this file is stale.
