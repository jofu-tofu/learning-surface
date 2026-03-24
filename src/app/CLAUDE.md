# App

React frontend — multi-pane tutoring surface. Vite build, Tailwind CSS v4, jsdom test environment.

## Layout

```
Sidebar (ChatList + Sections) | CanvasGrid      | (stacked vertically)
                              | Explanation     |
                              | PromptPreview   |
                              | Breadcrumb      |
                              | ChatBar         |
```

**Why multi-pane, not single-document:** A single scrollable document serializes things that should be simultaneous. The diagram must stay visible during explanation — spatial contiguity (Mayer) enforced by layout, not scroll proximity. The canvas is the persistent "whiteboard"; explanation and interaction happen alongside it.

## State Management

All application state flows through `useSurface()` hook — document, versions, chats, provider selection, WebSocket communication. State is consolidated into a single `SurfaceState` object managed via `surfaceReducer`, updated with `setState(prev => ...)` functional updates.

- `useSurface` is the composition root — owns `SurfaceState` via `useState`, the `onMessage` callback, effect execution (timers, pending prompt), and `useWebSocket`. It delegates to six domain hooks that are facades over shared state:
  - `useDocumentActions` — document, versions, path, selectVersion, selectSection
  - `useChatActions` — chats, activeChatId, isDraftChat, newChat, switchChat, deleteChat, renameChat
  - `useProcessingState` — isProcessing, activity (read-only selector)
  - `useChangeDetection` — changedPanes, versionChangedPanes, changedSectionIds, flashSectionIds (read-only selector)
  - `useStudyMode` — studyMode, studyModeLocked, setStudyMode
  - `usePromptSubmission` — submitPrompt, submitPrediction, pendingPromptRef (owns preflight flow)
- **Convention: domain hooks MUST use functional setState updaters** — `setState(prev => ({ ...prev, field: newValue }))` — never full state replacement. This prevents one hook's update from stomping another's concurrent update.
- **Convention: single reducer for atomic cross-cutting updates** — `session-init` updates document, chats, and change detection atomically. Splitting into per-domain reducers was rejected because it would require coordination or duplicate destructuring.
- `ProcessingContext` provides processing status (`isProcessing`, `activity`) — components consume via `useIsProcessing()`, `useActivity()`
- `ChangeDetectionContext` provides pane/section change detection (`flashPanes`, `versionChangedPanes`, `changedSectionIds`, `flashSectionIds`) — components consume via `usePaneFlash()`, `usePaneChanged()`, `useChangedSectionIds()`, `useFlashSectionIds()`
- `surfaceReducer` manages study mode state (`studyMode`, `studyModeLocked`) for study/answer mode toggle
- Pane change detection extracted to `utils/detectChangedPanes.ts`, 1.2s flash timeout (`changedPanes`)
- Version-level diff state (`versionChangedPanes`, `changedSectionIds`) computed once on version transitions, exposed via `ChangeDetectionContext` — components consume with `usePaneChanged(id)` / `useChangedSectionIds()`
- Processing state with 2.5s settle timeout
- Version path/forward-path computed from `shared/version-tree.ts`

## Key Components

| Component | Pane | Role |
|-----------|------|------|
| `AppHeader` | Top bar | Header with sidebar toggle, study mode toggle, theme selector, connection status |
| `ContentArea` | Center | Container for panes, timeline, error banner, activity status, chat bar. Owns `paneScrollRefs`, `SurfaceActionsProvider`, scroll-reset on submit |
| `PaneLayout` | Center | Resizable split panes (canvas + second pane). Owns `useResizablePane`, fullscreen state, Escape handler |
| `FullscreenOverlay` | Overlay | Shared presentational wrapper for fullscreen canvas/explanation overlays |
| `VersionTimeline` | Below panes | Breadcrumb + BranchPopover. Owns `branchPopoverParentVersion` state |
| `CanvasGrid` | Upper main | Renders multiple canvases per section from `canvases: CanvasContent[]` |
| `Canvas` | Within CanvasGrid | Dispatches to type-specific renderer via registry |
| `Explanation` | Lower main | Orchestrator — renders registered content slots from `content-slots/registry.ts`. Takes `section: Section \| undefined` |
| `PromptPreview` | Below explanation | Shows compiled prompt preview |
| `Sidebar` | Left (bottom) | Section TOC with status indicators |
| `ChatList` | Left (top) | Chat list with create/switch/delete |
| `Breadcrumb` | Below main | Version timeline with dot navigation |
| `BranchPopover` | Over breadcrumb | Popover for exploring version branches |
| `Prediction` | Lower main | Interactive prediction scaffold — claim inputs (choice/fill-blank/free-text) + submit button. Renders in same position as Explanation during predict phase |
| `ChatBar` | Bottom | Prompt input with provider/model selector |
| `ProviderSelector` | In ChatBar | Provider and model dropdown |
| `PaneHeader` | Above each pane | Pane label with processing shimmer (via `ProcessingContext`) and version-change "Updated" badge (via `ChangeDetectionContext`) |
| `ActivityStatus` | Top bar | Live tool-call activity during processing |
| `ErrorBanner` | Inline | Error display with icon |
| `EmptyState` | Inline | Reusable empty-state placeholder |
| `Icon` | Inline | SVG icon system with named icons |
| `VersionDot` | In Breadcrumb | Colored dot indicating version source (AI vs user) |

Renderers (`components/renderers/`): `SequenceRenderer`, `KatexRenderer`, `CodeRenderer`, `DiagramRenderer`, `TimelineRenderer`, `ProofRenderer` — each handles async or synchronous rendering with loading/error states. All implement the `RendererProps` interface from `registry.ts`. Canvas type -> renderer mapping is managed by a registry (`registry.ts`), not a switch statement — adding a new visual type requires only a new renderer file and a `registerRenderer()` call. `DiagramRenderer` accepts JSON content (`{nodes, edges}`) and delegates layout computation (topological sort) to `diagram-layout.ts`. `TimelineRenderer` delegates to `timeline-layout.ts`. `ProofRenderer` delegates to `proof-layout.ts` and reuses KaTeX for math rendering.

Content slots (`components/content-slots/`): `ExplanationSlot`, `DeeperPatternsSlot`, `ChecksSlot`, `FollowupsSlot` — each self-registers via `registerContentSlot()` with an order and `hasContent` predicate. `Explanation.tsx` is an orchestrator that renders registered slots — adding a new content type requires only a new slot file that self-registers, no `Explanation.tsx` edits needed. Mirrors the Canvas renderer registry pattern.

Pane registry (`components/panes/registry.ts`): Maps section phase → second-pane component via `getSecondPane(phase)`. Mirrors the renderer registry pattern (explicit imports, `registerSecondPane()` calls). Adding a new pane type = add entry to registry + create component implementing `SecondPaneProps`. Canvas pane stays hardcoded in PaneLayout (always position 1). `SurfaceActionsContext` provides `submitPrompt` and `submitResponse` to pane components — panes never depend on `useSurface()` directly.

## Conventions

- Tailwind classes co-located in components — no separate CSS files
- `@tailwindcss/typography` `prose` class for reading-optimized text in Explanation pane
- Shared Tailwind constants in `utils/styles.ts`
- Component tests use React Testing Library + jsdom (no browser needed)

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Staleness anchor:** This file assumes `App.tsx` exists. If it doesn't, this file is stale.
