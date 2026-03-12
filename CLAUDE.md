# Learning Surface

A comprehension engine that transforms AI output into a multi-pane learning surface. Not a chat UI, not a note-taking app — a pedagogy layer between AI and the learner, controlled via semantic MCP tools.

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (vitest) |
| `npx tsc --noEmit` | Type check |
| `npm run dev` | Start Vite dev server (frontend) |

Server tests run in node environment; component tests run in jsdom.

## Testing Philosophy

**Boundary tests only.** Tests cover edge cases, error conditions, empty/null/missing inputs, invalid data, fallback behavior, and guard clauses. No happy-path "it works" tests — those add noise without catching regressions at the boundaries where bugs live. When adding tests, ask: "does this test a boundary condition?" If not, don't write it.

## Architecture

```
src/
  shared/              # Data contracts, Zod schemas, shared types and utilities
  server/              # Node.js server — WebSocket hub, document I/O, versioning, AI orchestration
    providers/         # AI provider abstraction (CLI via codex exec, API via OpenAI SDK)
    utils/             # WebSocket helpers, version meta reader
  app/                 # React frontend — multi-pane tutoring surface
    components/        # Canvas, Explanation, Sidebar, ChatList, Breadcrumb, ChatBar, ProviderSelector
    hooks/             # useSurface (central state), useWebSocket, useMarkdown, useAsyncRender
    utils/             # versionLabel, styles, formatTime
  test/                # Test data builders, mock factories, markdown fixtures
```

**Content pipeline:** User prompt -> AI provider -> semantic MCP tools -> structured markdown file -> file watcher -> WebSocket -> rendered surface

**Data model:** `chats.json` index -> per-chat directories -> `v1.md` + patches + `meta.json` -> version reconstruction

## Constraints

- Single window — no tab-switching, no separate apps
- Must work with existing REPL subscriptions — CLI provider uses codex CLI auth (default, no API key); API provider uses `OPENAI_API_KEY` env var
- Use existing libraries (markdown-it, Mermaid, KaTeX, chokidar) — do not build custom parsers or renderers
- Desktop-first (VS Code / browser)

## Design Principles

These shape every implementation decision — violating them means the code is wrong:

- **Semantic tools, not document-editing primitives.** The AI calls teaching verbs (`show_visual`, `explain`, `challenge`), not text-manipulation mechanics. Tool definitions ARE the prompt engineering.
- **Stateless AI agent.** No conversation history carried between interactions. The app compiles a structured JSON context from the current surface state.
- **Filesystem as source of truth.** Structured markdown files on disk, diffs as patches, file watcher pushes changes to frontend.
- **Multi-pane, not single-document.** Diagram stays visible during explanation. Spatial contiguity (Mayer) enforced by layout, not scroll proximity.
- **Create vs. append.** New topics use creation tools (full write). Follow-ups use append tools (incremental, token-efficient). No find/replace tools — too fragile.

## Roadmap (not yet built)

Cross-session concept linking, PDF side-by-side viewer, spaced repetition scheduling, flashcard generation, concept graph, progressive disclosure within panes, user-editable explanations, timeline branching UX.

## Context Tree

Read the relevant CLAUDE.md before working in that directory:
- `src/shared/CLAUDE.md` — data contracts, structured markdown format, Zod conventions
- `src/server/CLAUDE.md` — server architecture, MCP tool philosophy, DI patterns
- `src/server/providers/CLAUDE.md` — provider abstraction, CLI vs API mode
- `src/app/CLAUDE.md` — frontend architecture, multi-pane layout, component roles

---
## Context Maintenance

**After modifying files in this project:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope (project-wide rule -> root CLAUDE.md; WHY decision
-> inline comment or ADR; inferable from code -> nowhere).

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts, remove it. If a convention here conflicts with the codebase,
the codebase wins — update this file, do not work around it. Prune aggressively.

**Staleness anchor:** This file assumes `src/server/index.ts` exists. If it doesn't, this file is stale.
