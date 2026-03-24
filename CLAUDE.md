# Learning Surface

A comprehension engine that transforms AI output into a multi-pane learning surface. Not a chat UI, not a note-taking app — a pedagogy layer between AI and the learner, controlled via semantic MCP tools.

## Learning Philosophy

Learning is not the accumulation of information but the continuous revision of internal models. The mind generates predictions, encounters mismatches, and updates its structure accordingly. Progress depends less on exposure and more on the quality and frequency of these **prediction–error–revision** cycles.

Techniques like summarizing or practicing are only useful insofar as they force **active generation**, reveal **errors**, and require **explicit model revision**. Without revision, errors are inert; without errors, models do not change.

Effective learning is the deliberate acceleration of this loop:

1. **Commit** to a belief
2. **Confront** its failure
3. **Refine** the underlying model
4. **Test** across variation

True understanding emerges when knowledge becomes structured, transferable, and compressible — when it no longer depends on specific examples but captures the deeper invariants of a domain.

**The role of this app is not to provide answers, but to surface the learner's current model, introduce precise friction, and guide iterative restructuring over time.**

### Current state vs. target

The current implementation — structured explanations, canvases, comprehension checks, deeper patterns — is a **first step**. It delivers well-organized answers that the learner must actively interpret. This is necessary groundwork: the multi-pane surface, the canvas types, the section model all exist to support richer interactions.

But delivering answers still places the revision burden entirely on the learner. The target is an app that **actively invokes the feedback loop** rather than waiting for the learner to self-test:

- **Surface the learner's model.** Before explaining, elicit what the learner currently believes. Make their mental model visible and committal so errors become detectable.
- **Introduce precise friction.** Present targeted challenges, counterexamples, and edge cases that expose specific gaps — not generic quiz questions, but friction calibrated to the learner's current understanding.
- **Guide revision, not just correction.** When errors surface, don't just provide the right answer. Show *why* the old model failed and *what structural change* makes the new model better.
- **Test across variation.** After revision, present the concept in new contexts to confirm the updated model transfers. Understanding that only works on the original example isn't understanding.
- **Track model evolution.** Maintain a representation of what the learner has committed to, where they've been wrong, and how their model has changed — making the learning process itself visible.

Every feature decision should be evaluated against: **does this accelerate the prediction–error–revision loop, or does it just deliver more information?**

## Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (vitest) |
| `npx tsc --noEmit` | Type check |
| `npm run dev` | Start server + Vite dev UI (concurrently) |
| `npm run build` | Production build (server → `dist/server/`, client → `dist/client/`) |
| `npm start` | Run production server (`NODE_ENV=production`) |
| `npm run typecheck` | Type check (alias for `tsc --noEmit`) |

Server tests run in node environment; component tests run in jsdom.

## Testing Philosophy

Three rules govern all tests in this project:

1. **Boundary tests only.** Tests cover edge cases, error conditions, empty/null/missing inputs, invalid data, fallback behavior, and guard clauses. No happy-path "it works" tests. When adding a test, ask: "does this test a boundary condition?" If not, don't write it.

2. **Test behavior, not implementation.** Tests assert on observable outputs (return values, state changes through public interfaces, thrown errors), never on internal method calls, execution order, or data structures. The refactoring test: if you rewrote the internals with a different algorithm, would the test still pass? If not, the test is wrong.

3. **Isolate side effects for testability.** Separate pure decision logic from I/O (functional core, imperative shell). Pure functions are trivially testable — data in, data out, no mocks needed. If testing a function requires 3+ mocks, the function is doing too much; extract the decision as a pure function and push side effects to a thin shell. Mock only at system boundaries (external APIs, filesystem, network), never internal collaborators.

## Architecture

```
src/
  shared/              # Data contracts, Zod schemas, shared types and utilities
  server/              # Node.js server — WebSocket hub, document I/O, versioning, AI orchestration
    providers/         # AI provider abstraction (CLI via codex exec, API via OpenAI SDK)
    utils/             # WebSocket helpers, version meta reader
  app/                 # React frontend — multi-pane tutoring surface
    components/        # AppHeader, ContentArea, PaneLayout, FullscreenOverlay, VersionTimeline, CanvasGrid, Canvas, Explanation, Prediction, Sidebar, SidebarPanel, ChatList, Breadcrumb, ChatBar, ProviderSelector, PromptPreview, ActivityStatus, BranchPopover, PaneHeader, ErrorBanner, EmptyState, Icon, VersionDot, ThemeSelector
      renderers/       # Registry-based visual renderers (KaTeX, Code, Diagram, Timeline, Proof, Sequence) + pure layout modules (diagram-layout, timeline-layout, proof-layout, sequence-layout)
      content-slots/   # Registry-based content slots for Explanation pane (ExplanationSlot, DeeperPatternsSlot, ChecksSlot, FollowupsSlot)
      panes/           # Registry-based second-pane mapping (phase → component). SurfaceActionsContext for pane action injection
    hooks/             # useSurface (composition root), surfaceReducer (pure state machine), domain hooks (useDocumentActions, useChatActions, useProcessingState, useChangeDetection, useStudyMode, usePromptSubmission), ProcessingContext, ChangeDetectionContext, useWebSocket, useMarkdown, useAsyncRender, useProviderSelection, useClickOutside, useContainerSize
    utils/             # versionLabel, styles, formatTime, detectChangedPanes, themes
  test/                # Test data builders, mock factories, test fixtures
```

**Content pipeline:** User prompt -> AI provider -> `design_surface` tool -> `.surface` JSON file -> file watcher -> WebSocket -> rendered surface. All providers (API and CLI) interact through `design_surface` — CLI providers connect via MCP (`--mcp-config` pointing to `mcp-entry.ts`).

**Data model:** `chats.json` index -> per-chat directories -> `v1.surface` + patches + `meta.json` -> version reconstruction

## Constraints

- Single window — no tab-switching, no separate apps
- Must work with existing REPL subscriptions — CLI provider uses codex CLI auth (default, no API key); API provider uses `OPENAI_API_KEY` env var
- Use existing libraries (KaTeX, chokidar) where they fit — custom renderers (e.g., DiagramRenderer, SequenceRenderer) are appropriate when structured data needs bespoke SVG layout
- Desktop-first (VS Code / browser)

## Design Principles

These shape every implementation decision — violating them means the code is wrong:

- **Single tool, declarative intent.** The AI calls one `design_surface` tool with a declarative description of what the surface should become. The tool definition IS the prompt engineering.
- **Stateless AI agent.** No conversation history carried between interactions. The app compiles a structured JSON context from the current surface state.
- **Filesystem as source of truth.** `.surface` JSON files on disk, diffs as patches, file watcher pushes changes to frontend.
- **Multi-pane, not single-document.** Canvases stay visible during explanation. Spatial contiguity (Mayer) enforced by layout, not scroll proximity. Sections support multiple canvases via `canvases: CanvasContent[]`.

## Roadmap (not yet built)

**Feedback loop activation** (partially implemented): Prediction elicitation before explanation (bounded two-phase loop), interactive prediction scaffold with multi-claim submission UX, study/answer mode toggle. Remaining: learner model tracking across sessions, variation testing after revision.

**Existing backlog:** Cross-session concept linking, PDF side-by-side viewer, spaced repetition scheduling, concept graph, progressive disclosure within panes, user-editable explanations, timeline branching UX.

## Context Tree

Read the relevant CLAUDE.md before working in that directory:
- `src/shared/CLAUDE.md` — data contracts, `.surface` JSON format, Zod conventions
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
