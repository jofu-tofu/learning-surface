# App

React frontend — multi-pane tutoring surface. Vite build, Tailwind CSS v4, jsdom test environment.

## Layout

```
Sidebar (ChatList) | CanvasGrid    | (stacked vertically)
                   | BlockStream   |
                   | PromptPreview |
                   | Breadcrumb    |
                   | ChatBar       |
```

**Why multi-pane, not single-document:** A single scrollable document serializes things that should be simultaneous. The canvas must stay visible during block interaction — spatial contiguity (Mayer) enforced by layout, not scroll proximity. The canvas is the persistent "whiteboard"; blocks (text, interactive, feedback) render alongside it.

## State Management

All application state flows through `useSurface()` hook — document, versions, chats, provider selection, WebSocket communication. State is consolidated into a single `SurfaceState` object managed via `surfaceReducer`, updated with `setState(prev => ...)` functional updates.

- `useSurface` is the composition root — owns `SurfaceState` via `useState`, the `onMessage` callback, effect execution (timers, pending prompt), and `useWebSocket`. It delegates to five domain hooks that are facades over shared state:
  - `useDocumentActions` — document, versions, path, selectVersion
  - `useChatActions` — chats, activeChatId, isDraftChat, newChat, switchChat, deleteChat, renameChat
  - `useProcessingState` — isProcessing, activity (read-only selector)
  - `useChangeDetection` — changedPanes, versionChangedPanes (read-only selector)
  - `usePromptSubmission` — submitPrompt, submitResponses, pendingPromptRef (owns preflight flow)
- **Convention: domain hooks MUST use functional setState updaters** — `setState(prev => ({ ...prev, field: newValue }))` — never full state replacement. This prevents one hook's update from stomping another's concurrent update.
- **Convention: single reducer for atomic cross-cutting updates** — `session-init` updates document, chats, and change detection atomically. Splitting into per-domain reducers was rejected because it would require coordination or duplicate destructuring.
- `ProcessingContext` provides processing status (`isProcessing`, `activity`) — components consume via `useIsProcessing()`, `useActivity()`
- `ChangeDetectionContext` provides pane change detection (`flashPanes`, `versionChangedPanes`) — components consume via `usePaneFlash()`, `usePaneChanged()`
- Pane change detection in `shared/detectChangedPanes.ts`, 1.2s flash timeout (`changedPanes`)
- Version-level diff state (`versionChangedPanes`) computed once on version transitions, exposed via `ChangeDetectionContext`
- Processing state with 2.5s settle timeout
- Version path/forward-path computed from `shared/version-tree.ts`

## Key Components

| Component | Pane | Role |
|-----------|------|------|
| `AppHeader` | Top bar | Header with sidebar toggle, theme selector, connection status |
| `ContentArea` | Center | Container for panes, timeline, error banner, activity status, chat bar. Owns `paneScrollRefs`, `SurfaceActionsProvider`, scroll-reset on submit |
| `PaneLayout` | Center | Resizable split panes (canvas + blocks). Owns `useResizablePane`, fullscreen state, Escape handler |
| `BlockStream` | Right pane | Orchestrator — renders blocks via `blocks/registry.tsx`, manages local response state, shows submit button for interactive blocks |
| `FullscreenOverlay` | Overlay | Shared presentational wrapper for fullscreen canvas/blocks overlays |
| `VersionTimeline` | Below panes | Breadcrumb + BranchPopover. Owns `branchPopoverParentVersion` state |
| `CanvasGrid` | Left pane | Renders canvases from `doc.canvases` |
| `Canvas` | Within CanvasGrid | Dispatches to type-specific renderer via registry |
| `PromptPreview` | Below panes | Shows compiled prompt preview |
| `ChatList` | Sidebar | Chat list with create/switch/delete |
| `Breadcrumb` | Below main | Version timeline with dot navigation |
| `BranchPopover` | Over breadcrumb | Popover for exploring version branches |
| `ChatBar` | Bottom | Prompt input with provider/model selector |
| `ProviderSelector` | In ChatBar | Provider and model dropdown |
| `PaneHeader` | Above each pane | Pane label with processing shimmer (via `ProcessingContext`) and version-change "Updated" badge (via `ChangeDetectionContext`) |
| `ActivityStatus` | Top bar | Live tool-call activity during processing |
| `ErrorBanner` | Inline | Error display with icon |
| `EmptyState` | Inline | Reusable empty-state placeholder |
| `Icon` | Inline | SVG icon system with named icons |
| `VersionDot` | In Breadcrumb | Colored dot indicating version source (AI vs user) |

Renderers (`components/renderers/`): `SequenceRenderer`, `KatexRenderer`, `CodeRenderer`, `DiagramRenderer`, `TimelineRenderer`, `ProofRenderer` — each handles async or synchronous rendering with loading/error states. All implement the `RendererProps` interface from `registry.ts`. Canvas type -> renderer mapping is managed by a registry, not a switch statement.

Block renderers (`components/blocks/`): `TextBlockRenderer`, `InteractiveBlockRenderer`, `FeedbackBlockRenderer`, `DeeperPatternsBlockRenderer`, `SuggestionsBlockRenderer` — each self-registers via `registerBlockRenderer()`. `BlockStream.tsx` is the orchestrator that renders blocks in order via the registry. Adding a new block type requires only a new renderer file that self-registers.

`SurfaceActionsContext` (`components/panes/SurfaceActionsContext.tsx`) provides `submitPrompt` and `submitResponses` to components — pane components never depend on `useSurface()` directly.

## Conventions

- Tailwind classes co-located in components — no separate CSS files
- `@tailwindcss/typography` `prose` class for reading-optimized text in text/feedback block renderers
- Shared Tailwind constants in `utils/styles.ts`
- Component tests use React Testing Library + jsdom (no browser needed)

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `App.tsx` exists. If it doesn't, this file is stale.
