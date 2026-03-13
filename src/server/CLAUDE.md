# Server

Node.js server — WebSocket hub, document I/O, version storage, chat persistence, AI prompt orchestration. No browser dependencies; independently testable via vitest in node environment.

## Architecture

**Functional core / imperative shell.** Pure logic (context compilation, system prompt building, version decisions, tool mutations) is separated from I/O. Every I/O boundary has an injectable interface:
- `FileIO` (document-service.ts) — ports & adapters for filesystem
- `HandlerDeps` (ws-handlers.ts) — all collaborators overridable for testing
- `PromptDeps` (prompt-handler.ts) — docService, contextCompiler, getProvider with production defaults

**Composition root:** `index.ts` wires WebSocket server, chat store, version store, file watcher, and document service. Creates mutable `SessionState`, delegates message routing to `routeMessage()`.

## MCP Tool Philosophy

Tools map to **teaching actions**, not document-editing primitives. Three criteria for every tool:

1. **Semantic clarity** — maps to a teaching verb (`show_visual`, `explain`, `challenge`), not a text mechanic
2. **Token efficiency** — creation tools for new content, append tools for elaboration (AI outputs only the delta)
3. **Natural legibility** — the AI understands what a tool does from its name alone

No find/replace tools — they're fragile (silent no-op on mismatch). When the AI needs to correct content, it uses creation tools to rewrite.

**11 tools:** `new_section`, `show_diagram`, `show_visual`, `build_visual`, `explain`, `extend`, `challenge`, `reveal`, `suggest_followups`, `set_active`, `clear`.

## Key Files

| File | Role |
|------|------|
| `index.ts` | Server factory — wires WebSocket, watcher, chat store |
| `ws-handlers.ts` | Message routing with `HandlerDeps` DI |
| `prompt-handler.ts` | AI orchestration — pure functions + `handlePrompt` imperative shell |
| `system-prompt.ts` | Single source of truth for all AI system prompts and teaching principles |
| `document-service.ts` | Document I/O with injectable `FileIO` |
| `markdown.ts` | `parse`/`serialize`/`applyToolCall` — delegates block logic to `blocks/` registry |
| `blocks/` | Block definition registry — each block type (canvas, explanation, check, followups) is a self-contained `BlockDefinition` with its own `match`/`parse`/`serialize`/`describe` |
| `tool-handlers.ts` | Pure tool mutations — `applyTool(doc, tool, params)` mutates in-place |
| `versions.ts` | Version store — v1.md + patches via `diff` library |
| `chat-store.ts` | Multi-chat CRUD, `chats.json` index, per-chat directories |
| `context.ts` | Pure `compileContext()` + imperative `createContextCompiler()` shell |
| `mcp-server.ts` | MCP server over stdio — batch versioning with 2s debounce |
| `watcher.ts` | chokidar watches `current.md`, notifies via callbacks |

## Conventions

- `tool-handlers.ts` mutates documents **in-place** — callers must `structuredClone` first (done in `markdown.ts` `applyToolCall`).
- `mcp-server.ts` batches rapid tool calls into a single version snapshot (2s debounce). Call `flushVersionBatch()` in tests to force flush.
- Context compilation sends only the **active section's state** + section list + recent prompt history to the AI — not the full document.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope.

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts here, remove it.

**Staleness anchor:** This file assumes `index.ts` exists. If it doesn't, this file is stale.
