# Learning Surface

A comprehension engine that transforms AI output into a multi-pane learning surface. Not a chat UI, not a note-taking app — a pedagogy layer between AI and the learner, controlled via semantic MCP tools.

**Status:** Phase 1 — scaffold and test stubs. `src/server/markdown.ts` is implemented (all tests pass). Other module stubs throw "Not implemented".

## Project Structure

```
spec/                  # Product specification (read spec/CLAUDE.md first)
  PHILOSOPHY.md        # Why this exists, core principles, constraints
  RESEARCH.md          # Competitive landscape, academic foundations, gap analysis
  DESIGN_BRIEF.md      # What to build — architecture, interaction model, MVP definition
src/
  shared/
    types.ts           # All shared TypeScript types and interface contracts
    FORMAT.md          # Structured markdown format specification (data contract)
  server/
    markdown.ts        # parse/serialize/applyToolCall for structured markdown
    versions.ts        # Version store (v1.md + patches + meta.json)
    chat-store.ts      # Chat persistence (multi-chat CRUD, chats.json index)
    context.ts         # Context compiler (surface state → JSON for AI)
    mcp-server.ts      # MCP server exposing semantic teaching tools
    watcher.ts         # File watcher (chokidar → WebSocket)
    index.ts           # Server entry point (multi-chat aware)
  app/
    components/        # React components: Canvas, Explanation, Sidebar, ChatList, Timeline, ChatBar
    hooks/             # useWebSocket, useSurface
    App.tsx            # Root component with multi-pane grid layout
    main.tsx           # Vite entry point
  test/
    helpers.ts         # Test data builders and markdown fixtures
```

## Constraints

- Single window — no tab-switching, no separate apps
- Must work with existing REPL subscriptions — no separate API keys
- Use existing libraries (markdown-it, Mermaid, KaTeX, chokidar) — do not build custom parsers or renderers
- Desktop-first (VS Code / browser)

## Development

- `npm test` — run all tests (vitest)
- `npx tsc --noEmit` — type check
- Server tests run in node environment; component tests run in jsdom
- Module stubs (except `markdown.ts`) throw "Not implemented" — implement one module at a time, making its tests pass

## Context Tree

Read the relevant CLAUDE.md before working in that directory:
- `spec/CLAUDE.md` — key decisions, MVP scope, architecture summary, open questions

---
## Context Maintenance

**After modifying files in this project:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope (project-wide → here; spec-specific → `spec/CLAUDE.md`).

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts, remove it.

**Staleness anchor:** This file assumes `spec/DESIGN_BRIEF.md` exists. If it doesn't, this file is stale.
