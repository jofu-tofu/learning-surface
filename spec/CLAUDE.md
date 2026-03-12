# Spec Context — Learning Surface

Quick-reference for agents working in the `spec/` directory.

## Key Decisions

- **Multi-pane tutoring surface**, not a single scrollable document or chat UI
- **Semantic MCP tools** (show_visual, explain, challenge, etc.) — AI controls panes via teaching-oriented vocabulary, not document-editing primitives
- **Filesystem as source of truth** — structured markdown files, diffs as patches, file watcher pushes changes to frontend
- **Stateless AI agent** — no conversation history carried between interactions; app compiles structured JSON context from current surface state
- **Multi-chat architecture** — each chat is an independent exploration tree with its own directory, version history, and document. Chat list in sidebar, persisted to disk via `chats.json` index
- **Summary field** — AI generates a short label (`summary` in frontmatter) with each response. First version's summary becomes chat title; all summaries used as breadcrumb labels

## MVP Scope

12 must-haves (see DESIGN_BRIEF.md §10): multi-pane layout, semantic MCP tools, creation+edit tools, real-time streaming, rich rendering, version timeline, diff tracking, chat list + section TOC, structured JSON context, reading-optimized layout, multi-chat persistence, summary field.

## Architecture Summary

```
Sidebar (ChatList + Sections) | Canvas | Explanation+Interaction
                              └── Breadcrumb (version path) ──┘
                              └── ChatBar (prompt input) ──────┘
```

- **ChatStore** (`chat-store.ts`) — CRUD for chats, `chats.json` index, per-chat directories
- **VersionStore** (`versions.ts`) — v1.md + patches + meta.json per chat
- **FileWatcher** (`watcher.ts`) — chokidar watches active chat's directory
- **MCP Server** (`mcp-server.ts`) — semantic tool calls → structured markdown edits
- **Server** (`index.ts`) — WebSocket hub, manages active chat, switches watcher/store on chat change

## Open Questions

- How should the MCP server discover which chat is active when invoked by the REPL? Currently the server manages this internally, but the MCP server gets a fixed `sessionDir` at startup.
- Should chat titles be editable by the user (rename)?
- Cross-session concept linking (v2 feature) — how does the concept graph span multiple chats?

---

## Context Maintenance

Same rules as root `CLAUDE.md` — update when spec files change, remove entries that don't change agent behavior.
