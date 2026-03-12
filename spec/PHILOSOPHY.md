# Learning Surface — Philosophy

## The Problem

Current LLM interfaces are optimized for **conversation**, not **comprehension**. When you use an AI to learn something, the experience breaks down:

1. **Scroll-bottom anchoring** — The conversation ends at the bottom, but learning starts at the top. You finish a rich exchange and have to scroll back up to actually read and absorb it.
2. **Text vomit** — AI output is linear and unstructured. Key concepts, supporting details, and diagrams are all flattened into a single stream.
3. **No rich media** — Mermaid diagrams, LaTeX math, interactive visuals — none of it renders in a chat interface. The AI *can* produce these, but the medium throws them away.
4. **No retention support** — You read it, you scroll past it, it's gone. There's no mechanism for review, self-testing, or connecting ideas across sessions.
5. **Dead-end output** — When you don't understand something in the response, you have to type a new message and wait for more text at the bottom. The learning surface should let you interact *in context*.

## The Distinction

**Obsidian** is a storage tool — you organize knowledge manually.
**ChatGPT / Claude / chat UIs** are conversation tools — optimized for back-and-forth, not comprehension.
**Learning Surface** is a comprehension tool — it takes raw AI output and optimizes it for your brain.

The AI is the content engine. Learning Surface is the **pedagogy engine**.

## Core Principles

### 1. Document, Not Chat
AI output should be restructured into a readable document: key concepts at the top, supporting details below, diagrams rendered inline, a generated outline for navigation. The user never sees chat bubbles. They see something that reads like a textbook chapter.

### 2. Bi-Directional AI Loop
The surface is not passive. Clicking a concept you don't understand sends a follow-up to the AI, and the explanation appears *in context* — not appended at the bottom of a scroll. The surface is connected to the conversation, not just displaying its artifacts.

### 3. Source Material Integration
Upload a textbook PDF. The AI discusses Chapter 3. The surface shows the relevant pages *next to* the AI's explanation, with highlights. The relationship between source material and AI commentary is first-class.

### 4. Active Learning
The surface generates flashcards, concept checks, and "test yourself" questions from the content. It's not a viewer — it actively helps you retain information. Spaced repetition is built in, not bolted on.

### 5. Concept Graph Across Sessions
Learn TCP on Monday, HTTP on Wednesday. The surface automatically links them: "HTTP builds on TCP (see your notes from Monday)." A knowledge graph grows over time without manual linking. Multi-chat architecture provides the foundation — each learning topic lives in its own chat with independent version history, making cross-session linking a matter of indexing across chat directories rather than parsing a monolithic conversation.

### 6. Progressive Disclosure
Instead of the full text dump, the surface shows the overview first. You expand into details. The AI generates the hierarchy; the surface enforces it. Information is revealed at the pace of understanding, not the pace of generation.

## Constraints

- **Must work with existing REPL subscriptions** — Claude Code, Devin, Codex, or any terminal AI tool. No separate API keys or paid services required.
- **Single window** — The learning surface, the AI interaction, and all content must coexist in one window. No tab-switching, no separate apps.
- **Filesystem as interface** — The AI writes structured files; the surface watches and renders them. This makes the system tool-agnostic. Any AI that can write files can drive the surface.

## Architecture (High Level)

```
┌──────────────────────────────────────────────┐
│  Single Window (VS Code / Browser)           │
│ ┌──────────────────────────────────────────┐ │
│ │  Learning Surface (local web app)        │ │
│ │  ┌──────────┐ ┌───────────────────────┐  │ │
│ │  │ Chats    │ │ Canvas                │  │ │
│ │  │ ● TCP    │ │ - Mermaid diagrams    │  │ │
│ │  │ ● React  │ │ - LaTeX math          │  │ │
│ │  │ [+ New]  │ │ - Interactive elements│  │ │
│ │  │──────────│ ├───────────────────────┤  │ │
│ │  │ Sections │ │ Explanation           │  │ │
│ │  │ ✓ Intro  │ │ - Rich markdown       │  │ │
│ │  │ → Detail │ │ - Concept checks      │  │ │
│ │  │          │ │ - Follow-up questions  │  │ │
│ │  └──────────┘ └───────────────────────┘  │ │
│ │  ← v1 ── v2 ── v3* →  (version timeline)│ │
│ │  [  prompt input  ]         (chat bar)   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Content pipeline:** AI → semantic MCP tools → structured markdown files → file watcher → WebSocket → rendered surface

**Data pipeline:** chats.json index → per-chat directories → v1.md + patches + meta.json → version reconstruction

## What This Is Not

- **Not a note-taking app.** You don't write notes here. The AI generates content; the surface transforms it.
- **Not a chat UI.** There are no chat bubbles, no message history. There is a living document that evolves.
- **Not a static viewer.** The surface is interactive. It talks back to the AI. It quizzes you. It connects ideas.
