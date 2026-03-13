# App

React frontend — multi-pane tutoring surface. Vite build, Tailwind CSS v4, jsdom test environment.

## Layout

```
Sidebar (ChatList + Sections) | Canvas          | (stacked vertically)
                              | Explanation     |
                              | PromptPreview   |
                              | Breadcrumb      |
                              | ChatBar         |
```

**Why multi-pane, not single-document:** A single scrollable document serializes things that should be simultaneous. The diagram must stay visible during explanation — spatial contiguity (Mayer) enforced by layout, not scroll proximity. The canvas is the persistent "whiteboard"; explanation and interaction happen alongside it.

## State Management

All application state flows through `useSurface()` hook — document, versions, chats, provider selection, WebSocket communication. State is consolidated into a single `SurfaceState` object managed via `surfaceReducer`, updated with `setState(prev => ...)` functional updates.

- `useSurface` composes `useWebSocket` and `useProviderSelection` internally
- `SurfaceStatusContext` provides shared status (`isProcessing`, `activity`, `flashPanes`, `versionChangedPanes`, `changedSectionIds`) — components consume via hooks (`useIsProcessing`, `usePaneChanged`, `useChangedSectionIds`, `useActivity`, `usePaneFlash`) instead of prop threading
- Pane change detection extracted to `utils/detectChangedPanes.ts`, 1.2s flash timeout (`changedPanes`)
- Version-level diff state (`versionChangedPanes`, `changedSectionIds`) computed once on version transitions, exposed via `SurfaceStatusContext` — components consume with `usePaneChanged(id)` / `useChangedSectionIds()`
- Processing state with 2.5s settle timeout
- Version path/forward-path computed from `shared/version-tree.ts`

## Key Components

| Component | Pane | Role |
|-----------|------|------|
| `Canvas` | Upper main | Dispatches to type-specific renderer via registry |
| `Explanation` | Lower main | Markdown text, concept checks, follow-up questions |
| `PromptPreview` | Below explanation | Shows compiled prompt preview |
| `Sidebar` | Left (bottom) | Section TOC with status indicators |
| `ChatList` | Left (top) | Chat list with create/switch/delete |
| `Breadcrumb` | Below main | Version timeline with dot navigation |
| `ChatBar` | Bottom | Prompt input with provider/model selector |
| `ProviderSelector` | In ChatBar | Provider and model dropdown |
| `PaneHeader` | Above each pane | Pane label with processing shimmer and version-change "Updated" badge (via `SurfaceStatusContext`) |
| `ActivityStatus` | Top bar | Live tool-call activity during processing |
| `BranchPopover` | Over breadcrumb | Popover for exploring version branches |
| `ErrorBanner` | Inline | Error display with icon |
| `EmptyState` | Inline | Reusable empty-state placeholder |
| `Icon` | Inline | SVG icon system with named icons |
| `VersionDot` | In Breadcrumb | Colored dot indicating version source (AI vs user) |

Renderers (`components/renderers/`): `MermaidRenderer`, `KatexRenderer`, `CodeRenderer`, `DiagramRenderer` — each handles async or synchronous rendering with loading/error states. All implement the `RendererProps` interface from `registry.ts`. Canvas type -> renderer mapping is managed by a registry (`registry.ts`), not a switch statement — adding a new visual type requires only a new renderer file and a `registerRenderer()` call. `DiagramRenderer` accepts JSON content (`{nodes, edges}`) and delegates layout computation (topological sort) to `diagram-layout.ts`.

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
