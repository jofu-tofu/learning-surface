# Shared

Data contracts and shared abstractions consumed by both server and app.

## Conventions

- `schemas.ts` defines Zod schemas for MCP tool parameters. `types.ts` defines data model interfaces (`LearningDocument`, `Section`, `Check`, etc.) and behavioral interfaces (`VersionStore`, `ContextCompiler`, `FileWatcherService`) independently — they are not derived from Zod via `z.infer<>`.
- `schemas.ts` contains `TOOL_DEFS` (all 10 MCP tool definitions with name/label/description/Zod schema, typed `as const satisfies readonly ToolDefinitionEntry[]` so `ToolName` is a literal union), `toolSchemaMap` (lookup by tool name), and `zodToJsonSchema()` for MCP SDK integration.
- `providers.ts` defines Zod schemas for provider data contracts (`ProviderConfigSchema`, `ModelConfigSchema`, `PreflightResultSchema`, `ProviderToolCallSchema`, `ToolCallResultSchema`, `ToolDefinitionSchema`, `ProviderInfoSchema`) with types derived via `z.infer<>`. The `ReplProvider` interface (strategy pattern, has methods) stays as a plain TypeScript interface.
- `detectChangedPanes.ts` uses `CONTENT_KEY_TO_PANE` map to group Section keys into pane IDs. Unmapped keys default to their own name — this is intentional so new content types are automatically detected without editing the map. Only add explicit mappings when multiple keys should trigger the same pane flash.
- `SurfaceContext.surface` is `Record<string, unknown>` (not typed) because the only consumer is the AI via JSON serialization — TypeScript narrowing adds no value.

## Structured Markdown Format

The data contract between all modules. Documents use YAML frontmatter + `##` sections + `###` blocks.

**Frontmatter:** `version` (integer), `active_section` (slug), `summary` (optional string).

**Sections:** Start with `## Title`. ID = slugified title. No section-level status (sections are just containers).

**Blocks within a section:**

| Block | Header | Max | Notes |
|-------|--------|-----|-------|
| Canvas | `### canvas: TYPE` (diagram/mermaid/katex/code) | 1 | Raw content until next heading; diagram uses JSON |
| Explanation | `### explanation` | 1 | Markdown text |
| Check | `### check: ID` | unlimited | Question + `<!-- status: unanswered|attempted|revealed -->` |
| Followups | `### followups` | 1 | Unordered list |

**Round-trip invariant:** `serialize(parse(raw))` must produce semantically equivalent output. Unknown `###` blocks are preserved for extensibility.

## Key Files

| File | Role |
|------|------|
| `schemas.ts` | Zod schemas, tool definitions (`TOOL_DEFS`, `toolSchemaMap`), JSON schema conversion |
| `types.ts` | Data model interfaces, behavioral interface contracts, and utility functions (`sortChatsByRecent`, `getActiveSection`) |
| `providers.ts` | Zod schemas + `z.infer<>` types for provider data contracts; `ReplProvider` interface |
| `tool-labels.ts` | Derives tool labels from `TOOL_DEFS`; only phase labels are defined locally |
| `version-tree.ts` | Pure tree traversal for version history (parent chain, children, forward path) |
| `slugify.ts` | Title -> URL-safe slug |
| `themes.ts` | Theme definitions (`THEMES`, `ThemeId`), OKLCH surface scale generator, `applyTheme()`/`getStoredTheme()` runtime helpers |

## Gotchas

- **`_unknownBlocks` is a runtime-only property** added by the markdown parser (`server/markdown.ts`) via type intersection — it's not on the `Section` interface but appears in `Object.keys()`. Excluded from pane comparison and AI context via `META_KEYS` in both `detectChangedPanes.ts` and `server/context.ts`.
- **Schema changes require integration test verification.** When adding or modifying Zod schemas in `providers.ts` or `schemas.ts`, run `INTEGRATION_TEST=1 npm test` (add `OPENAI_API_KEY` for API round-trip) to validate schemas against real provider responses. The integration tests in `server/__tests__/provider-integration.test.ts` catch schema drift — fields that don't match what the actual APIs return, hallucinated enum values, or missing required properties.
- Changes to `schemas.ts` tool definitions must stay in sync with `server/tool-handlers.ts` (the handler registry) and `server/blocks/` (the block definitions).
- The CLI system prompt format section in `server/system-prompt.ts` is auto-generated from the block registry — adding a new block type in `server/blocks/` automatically updates the prompt.
- `CANVAS_TYPES` in `types.ts` is the canonical source for canvas type values. `schemas.ts` `ShowVisualSchema` uses a subset (excludes `diagram` which has its own `show_diagram` tool).

---
## Context Maintenance

**After modifying files in this directory:** scan the entries above — if any claim is now
false or incomplete, update this file before ending the task. Do not defer.

**Add** an entry only if an agent would fail without knowing it, it is not obvious from
the code, and it belongs at this scope.

**Remove** any entry that fails the falsifiability test: if removing it would not change
how an agent acts here, remove it.

**Staleness anchor:** This file assumes `schemas.ts` exists. If it doesn't, this file is stale.
