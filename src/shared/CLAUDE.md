# Shared

Data contracts and shared abstractions consumed by both server and app.

## Conventions

- `schemas.ts` defines the Zod schema for the `design_surface` tool parameters. `types.ts` defines data model interfaces (`LearningDocument`, `Section`, `CanvasContent`, `Check`, `DeeperPattern`, etc.) and behavioral interfaces (`VersionStore`, `ContextCompiler`, `FileWatcherService`) independently — they are not derived from Zod via `z.infer<>`.
- `schemas.ts` contains the `design_surface` tool definition with Zod schema and `zodToJsonSchema()` for MCP SDK integration.
- `providers.ts` defines Zod schemas for provider data contracts (`ProviderConfigSchema`, `ModelConfigSchema`, `PreflightResultSchema`, `ProviderToolCallSchema`, `ToolCallResultSchema`, `ToolDefinitionSchema`, `ProviderInfoSchema`) with types derived via `z.infer<>`. The `Agent` interface (strategy pattern, has methods) stays as a plain TypeScript interface.
- `detectChangedPanes.ts` uses `CONTENT_KEY_TO_PANE` map to group Section keys into pane IDs. Unmapped keys default to their own name — this is intentional so new content types are automatically detected without editing the map. Only add explicit mappings when multiple keys should trigger the same pane flash.
- `SurfaceContext.surface` is `Record<string, unknown>` (not typed) because the only consumer is the AI via JSON serialization — TypeScript narrowing adds no value.

## `.surface` JSON Format

The data contract between all modules. Documents are stored as `.surface` JSON files.

**Top-level fields:** `version` (integer), `active_section` (slug), `summary` (optional string), `sections` (array).

**Sections:** Each has `id`, `title`, `canvases` (`CanvasContent[]` with IDs), `explanation`, `deeperPatterns` (required), `checks`, `followups`.

**Multi-canvas:** Each section supports multiple canvases via `canvases: CanvasContent[]`. Each canvas has a unique `id` and a `type` (diagram/katex/code/timeline/proof/sequence).

## Key Files

| File | Role |
|------|------|
| `schemas.ts` | Zod schema for `design_surface` tool, JSON schema conversion |
| `types.ts` | Data model interfaces (`LearningDocument`, `Section`, `CanvasContent`), behavioral interface contracts, utility functions (`sortChatsByRecent`, `getActiveSection`) |
| `providers.ts` | Zod schemas + `z.infer<>` types for provider data contracts; `Agent` interface |
| `version-tree.ts` | Pure tree traversal for version history (parent chain, children, forward path) |
| `slugify.ts` | Title -> URL-safe slug |
| `themes.ts` | Theme definitions (`THEMES`, `ThemeId`), OKLCH surface scale generator, `applyTheme()`/`getStoredTheme()` runtime helpers |

## Gotchas

- **Schema changes require integration test verification.** When adding or modifying Zod schemas in `providers.ts` or `schemas.ts`, run `INTEGRATION_TEST=1 npm test` (add `OPENAI_API_KEY` for API round-trip) to validate schemas against real provider responses. The integration tests in `server/__tests__/provider-integration.test.ts` catch schema drift — fields that don't match what the actual APIs return, hallucinated enum values, or missing required properties.
- `CANVAS_TYPES` in `types.ts` is the canonical source for canvas type values.
- `SurfaceContext.surface` sections are enriched with `{ id, title, canvasIds }` for AI context.

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope.

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts here, remove it.

**Staleness anchor:** This file assumes `schemas.ts` exists. If it doesn't, this file is stale.
