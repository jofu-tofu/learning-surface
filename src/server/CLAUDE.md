# Server

Node.js server — WebSocket hub, document I/O, version storage, chat persistence, AI prompt orchestration. No browser dependencies; independently testable via vitest in node environment.

## Architecture

**Functional core / imperative shell.** Pure logic (context compilation, system prompt building, version decisions, surface transforms) is separated from I/O. Every I/O boundary has an injectable interface:
- `FileIO` (document-service.ts) — ports & adapters for filesystem
- `HandlerDeps` (ws-handlers.ts) — all collaborators overridable for testing
- `PromptDeps` (prompt-handler.ts) — documentService, contextCompiler, getProvider with production defaults

**Composition root:** `index.ts` wires HTTP server, WebSocket server (attached to the HTTP server), chat store, version store, file watcher, and document service. Creates mutable `SessionState`, delegates message routing to `routeMessage()`. In production, serves static frontend files from `clientDir`; in dev, returns a placeholder (Vite serves the frontend separately).

## Tool Philosophy

**Single tool: `design_surface`.** The AI calls one declarative tool that describes the desired surface state. The tool handler (`applyDesignSurface`) is a pure function returning `{ doc, results }` — no in-place mutation.

This replaces the previous 12-tool approach. The single tool definition IS the prompt engineering — its schema and description teach the AI what a learning surface can contain.

## Key Files

| File | Role |
|------|------|
| `index.ts` | Server factory — wires HTTP + WebSocket, watcher, chat store; serves static files in production |
| `cli.ts` | CLI entry point — resolves session dir, port, and clientDir; calls `startServer()` |
| `ws-handlers.ts` | Message routing with `HandlerDeps` DI |
| `prompt-handler.ts` | AI orchestration — pure functions + `handlePrompt` imperative shell |
| `system-prompt.ts` | Single source of truth for all AI system prompts and teaching principles |
| `document-service.ts` | Document I/O with injectable `FileIO`; uses `CURRENT_SURFACE` constant |
| `surface-file.ts` | `.surface` JSON parse/serialize — replaces markdown.ts and blocks/ |
| `tool-handlers.ts` | Pure surface transform — `applyDesignSurface(doc, params)` returns `{ doc, results }` |
| `legacy-migrate.ts` | Migrates old `.md` structured markdown files to `.surface` JSON format |
| `versions.ts` | Version store — v1.surface + patches via `diff` library |
| `chat-store.ts` | Multi-chat CRUD, `chats.json` index, per-chat directories |
| `context.ts` | `createContextCompiler()` factory — returns a `ContextCompiler` with `.compile()` method |
| `mcp-server.ts` | MCP server over stdio — batch versioning with 2s debounce |
| `watcher.ts` | chokidar watches `current.surface`, notifies via callbacks |

## Conventions

- `tool-handlers.ts` `applyDesignSurface` is a pure function — returns a new `{ doc, results }`, no in-place mutation.
- `mcp-server.ts` batches rapid tool calls into a single version snapshot (2s debounce). Call `flushVersionBatch()` in tests to force flush.
- Context compilation sends the **active section's state** + section list (enriched with `{ id, title, canvasIds }`) + recent prompt history to the AI — not the full document.
- System prompt uses a single `design_surface` tool description — no auto-generated block format spec.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope.

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts here, remove it.

**Staleness anchor:** This file assumes `index.ts` exists. If it doesn't, this file is stale.
