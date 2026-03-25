# Shared

Data contracts and shared abstractions consumed by both server and app.

## Module Boundaries

Types are split into three focused modules. **Do not merge them back or add types to the wrong module.**

| Module | Owns | Rule |
|--------|------|------|
| `document.ts` | `.surface` file data model (`LearningDocument`, `CanvasContent`, `Block`, `TextBlock`, `InteractiveBlock`, `FeedbackBlock`, `DeeperPatternsBlock`, `SuggestionsBlock`, `DeeperPattern`, `CANVAS_TYPES`) | Only add types here if they describe the *content* of a `.surface` file. |
| `session.ts` | Server-owned session state (`SurfaceSession`, `VersionMeta`, `Chat`, `DRAFT_CHAT_ID`, `sortChatsByRecent`) | Only add types here if the server persists or manages them. UI-only transient state belongs in `app/hooks/surfaceReducer.ts`. |
| `messages.ts` | WebSocket protocol (`ClientMessage`, `WsMessage`, `WsSessionInit`, `WsChatList`, `WsProviderError`) | Only add types here if they travel over the wire between client and server. |

`SurfaceState` (in `app/hooks/surfaceReducer.ts`) extends `SurfaceSession` with UI-only fields. If a field needs to be sent by the server, add it to `SurfaceSession` in `session.ts` — not to `SurfaceState`.

## Conventions

- `schemas.ts` defines the Zod schema for the `design_surface` tool parameters. `document.ts` defines data model interfaces independently — they are not derived from Zod via `z.infer<>`. Behavioral interfaces (`VersionStore`, `ContextCompiler`, `FileWatcherService`, `SurfaceContext`) live in `src/server/types.ts`.
- `schemas.ts` contains the `design_surface` tool definition with Zod schema and `zodToJsonSchema()` for MCP SDK integration. `BlockInputSchema` is a `ZodDiscriminatedUnion` on `type`.
- `providers.ts` defines Zod schemas for provider data contracts (`ProviderConfigSchema`, `ModelConfigSchema`, `PreflightResultSchema`, `ProviderToolCallSchema`, `ToolCallResultSchema`, `ToolDefinitionSchema`, `ProviderInfoSchema`) with types derived via `z.infer<>`. The `Agent` interface (strategy pattern, has methods) stays as a plain TypeScript interface.
- `detectChangedPanes.ts` compares `canvases` and `blocks` directly between two documents to determine which panes changed.
- `SurfaceContext` (defined in `src/server/types.ts`) has `surface` as `Record<string, unknown>` because the only consumer is the AI via JSON serialization.

## `.surface` JSON Format

The data contract between all modules. Documents are stored as `.surface` JSON files.

**Top-level fields:** `version` (integer), `summary` (optional string), `canvases` (`CanvasContent[]`), `blocks` (`Block[]`).

**Canvases:** Each has a unique `id` and a `type` (diagram/katex/code/timeline/proof/sequence). Max 4.

**Block types:** `text` (markdown content), `interactive` (question + learner response), `feedback` (evaluation of learner answer), `deeper-patterns` (cross-domain connections), `suggestions` (next-action prompts).

## Key Files

| File | Role |
|------|------|
| `document.ts` | Data model interfaces (`LearningDocument`, `CanvasContent`, `Block` union type) |
| `session.ts` | Server-owned session state (`SurfaceSession`, `VersionMeta`, `Chat`), `sortChatsByRecent()` |
| `messages.ts` | WebSocket protocol types (`ClientMessage`, `WsMessage`, `WsSessionInit`) |
| `schemas.ts` | Zod schema for `design_surface` tool, `BlockInputSchema`, JSON schema conversion |
| `providers.ts` | Zod schemas + `z.infer<>` types for provider data contracts; `Agent` interface |
| `version-tree.ts` | Pure tree traversal for version history (parent chain, children, forward path) |
| `slugify.ts` | Title -> URL-safe slug |
| `detectChangedPanes.ts` | Compares two documents to find changed panes (`canvas`, `blocks`) |

## Gotchas

- **Schema changes require integration test verification.** When adding or modifying Zod schemas in `providers.ts` or `schemas.ts`, run `INTEGRATION_TEST=1 npm test` (add `OPENAI_API_KEY` for API round-trip) to validate schemas against real provider responses.
- `CANVAS_TYPES` in `document.ts` is the canonical source for canvas type values.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope.

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts here, remove it.

**Staleness anchor:** This file assumes `schemas.ts` exists. If it doesn't, this file is stale.
