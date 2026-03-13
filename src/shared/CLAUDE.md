# Shared

Data contracts and shared abstractions consumed by both server and app.

## Conventions

- **Zod is the single source of truth** for all data shapes. Types in `types.ts` are re-exported `z.infer<>` results from `schemas.ts` — never define data types manually.
- `types.ts` also defines **behavioral interfaces** (`VersionStore`, `ContextCompiler`, `FileWatcherService`) — these are the DI seams used throughout the server.
- `schemas.ts` contains `TOOL_DEFS` (all 11 MCP tool definitions with name/description/Zod schema) and `zodToJsonSchema()` for MCP SDK integration. `zodToJsonSchema()` handles nested `ZodObject` within properties (used by `ShowDiagramSchema`).
- `providers.ts` defines the `ReplProvider` interface (strategy pattern) — `complete()` accepts an `onToolCall` callback for API-mode tool execution loops.

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
| `schemas.ts` | Zod schemas, tool definitions, JSON schema conversion |
| `types.ts` | Re-exports data types + behavioral interface contracts |
| `providers.ts` | `ReplProvider` interface, `ProviderConfig`, `ToolCallResult` |
| `version-tree.ts` | Pure tree traversal for version history (parent chain, children, forward path) |
| `slugify.ts` | Title -> URL-safe slug |

## Gotchas

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
