# Providers

AI provider abstraction — unified Agent interface.

## Architecture

- **`Agent` interface** (defined in `shared/providers.ts`): `config` property + `ask()` (single-shot structured output) + `run()` (multi-round tool chain) methods
- **Registry** (`registry.ts`): Module-level singleton `Map`. Registers both CLI providers eagerly, API provider via dynamic `import()` with try/catch. Exports `getProvider()`, `listProviders()`.

## Provider Modes

| Provider | File | Auth | How it works |
|----------|------|------|-------------|
| Codex CLI (default) | `cli.ts` | codex CLI auth (no API key) | Spawns `codex exec --full-auto --mcp-config`, AI uses MCP tools to modify the surface |
| Claude Code | `claude-code.ts` | claude CLI auth (no API key) | Spawns `claude --print --dangerously-skip-permissions --mcp-config`, AI uses MCP tools to modify the surface |
| Codex API | `codex.ts` | `OPENAI_API_KEY` env var | OpenAI SDK chat completions with multi-round tool-use loop (max 20 rounds) |

**`ask()` implementation per provider:**
- Codex API: `response_format: { type: 'json_schema' }` via OpenAI SDK — guaranteed schema compliance
- Codex CLI: `codex exec --output-schema <tmpfile>`, capture stdout via `spawnCliCapture()`
- Claude Code: `claude --print --json-schema '<schema>'`, capture stdout via `spawnCliCapture()`

**`run()` implementation:**
- CLI mode (Codex CLI, Claude Code): AI interacts through MCP (`--mcp-config`). `writeMcpConfig()` creates a temp config pointing to `mcp-entry.ts`, which exposes `design_surface` via the MCP protocol. Both use `buildCliPrompt()` and `spawnCli()` from `spawn-cli.ts`. Config is cleaned up in a `finally` block via `cleanupMcpConfig()`.
- API mode (Codex API): Uses `onToolCall` callback — each tool invocation is fed back to the model for the next round. The server applies tool calls via `document-service.ts`.

## Gotchas

- All system prompts are defined in `server/system-prompt.ts` — private `TEACHING_SYSTEM_PROMPT` (shared persona + pedagogy) composed into `SYSTEM_PROMPT` used by all providers. CLI providers interact through MCP (via `--mcp-config`) instead of editing files directly.
- Each provider's model list is hardcoded in `config.models`. Update when new models become available.
- Each model declares `reasoningEfforts` (available levels) and `defaultEffort`. Codex CLI passes `-c model_reasoning_effort=<level>`; Claude Code passes `--effort <level>`; Codex API passes `reasoning_effort` to the OpenAI SDK.
- `ReasoningEffort` is a union type in `shared/providers.ts`: `'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'`. Not all values are valid for all models — the per-model `reasoningEfforts` array controls what the UI shows.
- `spawnCli()` accumulates stderr and includes it in the rejection error message, so CLI failures surface actionable diagnostics to the frontend. `spawnCliCapture()` captures stdout instead of logging it — used by `ask()`.

## Security: CLI Tool Restrictions

CLI providers are sandboxed so the AI can ONLY interact through the MCP `design_surface` tool:

- **Codex CLI**: `--sandbox read-only` — filesystem is read-only, no shell writes. Only MCP tools are available.
- **Claude Code**: `--tools '' --strict-mcp-config` — all built-in tools (Read, Edit, Write, Bash) disabled. Only MCP tools from `--mcp-config` are available.

**If adding or changing CLI flags:** manually verify the sandbox still holds by running the provider with a prompt that attempts file writes. Document the verification in the PR. These flags are the security boundary — they cannot be weakened without explicit review.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `registry.ts` exists. If it doesn't, this file is stale.
