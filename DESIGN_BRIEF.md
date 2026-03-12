# Learning Surface — Design Brief

Distilled from competitive research across 40+ tools and academic literature. This is the actionable reference for building the product.

---

## 1. What Actually Works for Learning (Evidence-Based)

These aren't opinions — they're findings from decades of research (ITS, cognitive load theory, spaced repetition) confirmed by recent LLM-specific studies.

### The Hierarchy of Engagement
From Chi & Wylie's ICAP framework, learning effectiveness scales as:

**Interactive > Constructive > Active > Passive**

- **Passive**: reading AI output (what chat gives you)
- **Active**: highlighting, re-reading, taking notes
- **Constructive**: explaining in your own words, generating examples
- **Interactive**: debating, teaching back, building on ideas

Chat interfaces keep users at the Passive level. The surface must push toward Constructive and Interactive.

### The Six Evidence-Backed Principles

| Principle | Source | What It Means in Practice |
|-----------|--------|--------------------------|
| **Testing IS learning** | Bjork, Roediger & Karpicke | Embed concept checks in the reading flow. Retrieving information strengthens memory more than re-reading it. |
| **Desirable difficulty** | Bjork (1994) | Don't just give the answer. Make the learner predict, then reveal. Some friction is pedagogically valuable. |
| **Spatial contiguity** | Mayer (2009) | Related information must be visually near each other. A diagram and its explanation should be side-by-side, not scroll-separated. |
| **Segmenting** | Mayer (2009) | Break complex material into learner-paced chunks. Don't dump everything at once. |
| **Overview first, then details** | Shneiderman | Show the map before the territory. Outline -> expand -> detail on demand. |
| **Spaced retrieval** | Ebbinghaus, Matuschak | Revisiting material at increasing intervals produces durable memory. Must be built into the surface, not a separate app. |

### What Chat Gets Wrong (Specifically)

| Chat Problem | Learning Science Violation | Surface Solution |
|-------------|--------------------------|-----------------|
| Scroll-bottom anchored | Spatial contiguity violated | Document with outline, key concepts at top |
| Full text dump | Segmenting violated | Progressive disclosure, expandable sections |
| No verification | Testing-is-learning missed | Embedded concept checks, flashcard generation |
| Linear stream | No overview-first | Auto-generated table of contents, mind map view |
| Ephemeral | No spaced retrieval possible | Persistent, revisitable, with review scheduling |
| Blank text box | No scaffolding | Suggested follow-ups, guided exploration paths |

---

## 2. How This Differs from "Markdown Renderer + Prompt Engineering"

This is the key question. Prompt engineering improves the AI's *output*. A markdown renderer improves the *display*. Learning Surface adds a **transformation and pedagogy layer** between them.

```
Prompt engineering:  User -> [better prompt] -> AI -> raw output
Markdown renderer:   AI output -> [prettier display] -> User reads
Learning Surface:    AI output -> [restructure + enrich + interact] -> User learns
```

The differences:

| Capability | Markdown Renderer | Learning Surface |
|-----------|-------------------|-----------------|
| Renders Mermaid/LaTeX | Yes | Yes |
| Generates table of contents | From headings | From *concepts* (AI-extracted) |
| Progressive disclosure | No (shows everything) | Yes (overview -> detail on demand) |
| Concept checks | No | Embedded in reading flow |
| Click-to-explain | No | Yes (sends follow-up to AI, renders in-place) |
| Cross-session linking | No | Auto-links related concepts across sessions |
| Source material integration | No | PDF side-by-side with AI commentary |
| Adapts to learner | No | Tracks what you've covered, surfaces gaps |
| Multiple views of same content | No | Document, mind map, flashcards, quiz |

A markdown renderer is a *display technology*. Learning Surface is an *application* that uses display technology in service of comprehension.

---

## 3. Learning Mediums: What Forms Can Content Take?

Different content benefits from different representations. The surface should support multiple views of the same material.

| Medium | Best For | Example |
|--------|---------|---------|
| **Structured document** | Deep explanations, sequential learning | Textbook chapter on TCP/IP |
| **Mermaid diagrams** | Processes, architectures, relationships | TCP handshake sequence diagram |
| **Mind map** | Overview, concept relationships, big picture | How networking protocols relate |
| **Flashcards** | Retention, key facts, definitions | "What is a SYN packet?" |
| **Quiz / concept check** | Verification, active recall | "Which layer handles routing?" |
| **Code playground** | Programming concepts, executable examples | Live code showing a TCP socket |
| **Timeline** | Historical, sequential events | Evolution of internet protocols |
| **Comparison table** | Contrasting concepts | TCP vs UDP side-by-side |
| **Annotated PDF** | Book-based learning, source material | Textbook page with AI highlights |
| **Audio summary** | Review, passive reinforcement | NotebookLM-style podcast of your notes |

### The Multi-View Principle

The same learning session about "How TCP Works" could generate:
1. A **document** with diagrams explaining the handshake
2. A **mind map** showing how TCP relates to IP, UDP, HTTP
3. **Flashcards** for the key concepts
4. A **quiz** to test understanding
5. A **code playground** with a working TCP socket example

The content model must support generating all of these from the same underlying material.

---

## 4. What Do Users Want to Learn? (Use Cases)

### Primary Use Cases (most common, design for these first)

| Use Case | Input | Expected Output |
|----------|-------|----------------|
| **Explore a topic** | "Explain how TCP works" | Structured document with diagrams, progressive detail |
| **Study a book** | Upload PDF + "Explain Chapter 3" | PDF side-by-side with AI commentary, concept extraction |
| **Learn a skill** | "Teach me React hooks" | Guided progression with code examples, exercises |
| **Understand code** | Paste code + "Explain this" | Annotated walkthrough with diagrams |
| **Review and retain** | (revisit previous sessions) | Flashcards, spaced repetition, concept checks |

### Secondary Use Cases (design to not break these)

| Use Case | Input | Expected Output |
|----------|-------|----------------|
| Random curiosity | "How do black holes work?" | Rich document, appropriate depth |
| Compare concepts | "TCP vs UDP" | Comparison table, trade-off analysis |
| Prepare for interview | "Quiz me on system design" | Interactive quiz mode |
| Research a field | "Map the landscape of AI agents" | Mind map + document + sources |

### Generalization Across Domains

The content varies, but the *learning patterns* are universal:

1. **Explain** — "What is X?" -> structured document with diagrams
2. **Compare** — "X vs Y" -> comparison table + trade-offs
3. **Explore** — "How does X work?" -> progressive disclosure, process diagrams
4. **Practice** — "Test me on X" -> quiz, flashcards, exercises
5. **Connect** — "How does X relate to Y?" -> concept graph, cross-linking
6. **Deep-dive** — "Tell me more about [specific part]" -> in-context expansion

The surface should handle all six patterns regardless of domain. A session about TCP and a session about Renaissance art should both benefit from the same structural features.

---

## 5. Best Features to Steal

These are the highest-value features from existing tools, ranked by impact on learning and feasibility.

### Tier 1: MVP Features (build these first)

| Feature | Stolen From | Why It Matters |
|---------|------------|---------------|
| **Rich markdown rendering** (Mermaid, KaTeX, syntax highlighting) | Claude Artifacts, MkDocs Material | Table stakes — the whole point is rendering what chat can't |
| **Auto-generated outline / TOC** | Readwise Reader, any docs tool | Solves scroll-bottom problem immediately |
| **Real-time streaming edits** | Cursor, Claude Artifacts | Watch the document update live as AI streams changes |
| **Version timeline with diffs** | Git, Google Docs version history | Scrub through how the document evolved with each prompt |
| **Reading-optimized layout** | Readwise Reader, Medium | Typography, whitespace, max-width, reading-mode design |

### Tier 2: Core Differentiators (build these next)

| Feature | Stolen From | Why It Matters |
|---------|------------|---------------|
| **Concept checks embedded in content** | Quantum Country (Matuschak) | Testing IS learning. Embed retrieval practice in reading flow. |
| **Mind map view** | Markmap | Same content, different representation. Great for overview. |
| **Click-to-explain** (in-context follow-up) | Novel (nobody does this well) | The bi-directional AI loop. Biggest differentiator. |
| **Multi-format output** (doc + flashcards + quiz) | NotebookLM | Same material, multiple learning modalities |
| **Session persistence** | Obsidian, any note tool | Content persists across sessions, is revisitable |

### Tier 3: Advanced (build when validated)

| Feature | Stolen From | Why It Matters |
|---------|------------|---------------|
| **Cross-session concept graph** | Unriddle, Obsidian graph view | Auto-links related concepts across learning sessions |
| **Spaced repetition scheduling** | Anki (FSRS algorithm) | Optimizes *when* to review for maximum retention |
| **PDF side-by-side** | SciSpace, PDF.ai | Source material + AI commentary as first-class relationship |
| **Spatial canvas** | AFFiNE, Obsidian Canvas | Arrange content spatially, not just linearly |
| **Audio summary** | NotebookLM Audio Overview | Passive review modality |

---

## 6. Architecture for Testability and Scalability

### Component Architecture

```
+-----------------------------------------------+
|              Learning Surface App              |
|                                                |
|  +----------+  +----------+  +-----------+     |
|  |  Chat    |  | Document |  | Version   |     |
|  |  Bar     |  | Surface  |  | Timeline  |     |
|  |          |  |          |  |           |     |
|  | prompt   |  | markdown |  | v1 v2 v3  |     |
|  | input    |  | mermaid  |  | diffs     |     |
|  | send     |  | katex    |  | scrubber  |     |
|  |          |  | code     |  |           |     |
|  +----+-----+  +----+-----+  +-----+-----+     |
|       |              |              |           |
|  +----+--------------+--------------+-----+     |
|  |           Version Store                |     |
|  |  v1.md / v2.patch / v3.patch / meta    |     |
|  +----+--------------+--------------+-----+     |
|       |              |                          |
|  +----+--------------+-----+                    |
|  |     AI Bridge           |                    |
|  |  REPL subprocess/CLI    |                    |
|  |  streams edit ops back  |                    |
|  +--------------------------+                    |
+-----------------------------------------------+
```

Each layer is independently testable:
- **Chat Bar**: does it send prompts to the AI bridge?
- **AI Bridge**: does it invoke the REPL and stream edit operations?
- **Version Store**: does it apply diffs, reconstruct any version, persist to disk?
- **Document Surface**: does it render Mermaid/KaTeX/code and apply streaming edits?
- **Version Timeline**: does it scrub between versions correctly?

### Scalability Axes

| Axis | How It Scales |
|------|--------------|
| **More content types** | Add new renderers (PDF viewer, code playground, audio player) |
| **More AI tools** | Any REPL tool that can receive prompts and stream edits works |
| **More learning modalities** | Add generators (flashcard, quiz, mind map) on top of version store |
| **Cross-session features** | Build on version store — link concepts across sessions |
| **Collaboration** | Content is files with diffs. Git-native. |

---

## 7. What NOT to Build (Scope Traps)

| Temptation | Why to Avoid |
|-----------|-------------|
| Full document regeneration per prompt | Too slow, too expensive. Edit the document, don't rewrite it. |
| Separate API key / AI subscription | Use the REPL subscription the user already has. |
| Custom markdown parser | Use markdown-it or remark. Solved problem. |
| Custom diagram renderer | Use Mermaid. Solved problem. |
| Mobile app | Desktop-first. VS Code / browser. Mobile can come later. |
| Real-time collaboration | Solo learning first. Collaboration is a v2 feature. |
| Custom spaced repetition algorithm | Use FSRS (open source, state of the art). Don't reinvent. |

---

## 8. Interaction Model: The Living Document

The surface is a **living document that the AI edits with each user prompt.** The chat bar is the control plane; the document is the artifact. The AI never regenerates the full document — it applies targeted edits that stream in and re-render in real-time.

### The Core Loop

```
+-------------------------------------------------------+
|                   Learning Surface                     |
|                                                        |
|  +---------------------------------------------------+ |
|  |              Document (v3)                         | |
|  |                                                    | |
|  |  # How TCP Works                                  | |
|  |                                                    | |
|  |  TCP is a connection-oriented protocol...          | |
|  |                                                    | |
|  |  ## The Three-Way Handshake                        | |
|  |  [mermaid: sequenceDiagram SYN/SYN-ACK/ACK]        | |
|  |                                                    | |
|  |  ### SYN Packet ====........  (streaming in)       | |
|  |  The SYN packet contains the initial seq...        | |
|  |                                                    | |
|  +---------------------------------------------------+ |
|                                                        |
|  <---- v1 ------ v2 ------ v3* ------>  (timeline)     |
|                                                        |
|  +---------------------------------------------------+ |
|  |  > "Go deeper on the SYN packet"                  | |
|  +---------------------------------------------------+ |
+-------------------------------------------------------+
```

1. User types in the chat bar: "Explain TCP"
2. AI generates the initial document, **streaming in real-time** — user watches it appear -> **version 1**
3. User types: "Add a diagram of the handshake"
4. AI **edits** the document — inserts a Mermaid diagram into the right section. User sees the diagram materialize in-place as it streams. -> **version 2** (diff tracked)
5. User types: "Go deeper on the SYN packet"
6. AI **edits** again — expands that section with new content, streaming in. -> **version 3** (diff tracked)
7. User scrubs the timeline back to v1 to see where they started
8. User directly edits a paragraph on the surface -> **version 4** (manual edit, also diffed)

### Key Properties

**Edits, not rewrites.** The AI applies targeted changes to the existing document — inserting sections, expanding paragraphs, adding diagrams, rewording explanations. It never regenerates the whole thing. This is fast and token-efficient.

**Real-time streaming.** As the AI streams its edits, the document re-renders live. You watch the new content appear in-place within the document, not in a chat bubble. Diagrams render as they complete. Math typesets as it arrives. The surface is alive.

**The conversation IS the version history.** Each prompt maps to a document version. You don't read a chat transcript — you scrub through how the document evolved. The learning journey is visible as a series of diffs.

**The document is always the source of truth.** The AI doesn't append to a chat log. It edits the document. Previous states are preserved as diffs, not as message history.

**User edits are first-class.** You can edit the document directly (fix a typo, add your own note, restructure a section). That's just another version in the timeline. The AI's next response builds on YOUR edits.

**Branching is possible.** Go back to v2, ask a different question -> you branch the timeline. Like git branches for learning paths.

### Data Model

```
sessions/
  tcp-explained/
    v1.md              # initial document (from first prompt)
    v1.meta.json       # { prompt: "Explain TCP", timestamp, source: "ai" }
    v2.patch           # diff: diagram inserted into handshake section
    v2.meta.json       # { prompt: "Add a diagram of the handshake", source: "ai" }
    v3.patch           # diff: SYN section expanded
    v3.meta.json       # { prompt: "Go deeper on SYN", source: "ai" }
    v4.patch           # diff: user's manual edit
    v4.meta.json       # { prompt: null, source: "user-edit" }
```

Diffs keep storage efficient. Any version is reconstructable by applying patches forward from v1. The meta.json ties each version to its prompt (or marks it as a user edit).

### AI Edit Protocol

The AI doesn't return a full document. It returns **edit operations** that the surface applies:

```json
{
  "operations": [
    { "type": "insert_after", "anchor": "## The Three-Way Handshake", "content": "```mermaid\nsequenceDiagram..." },
    { "type": "replace", "anchor": "TCP uses a simple...", "content": "TCP uses a three-step..." },
    { "type": "append_section", "heading": "### SYN Packet Details", "content": "The SYN packet..." }
  ]
}
```

Each operation streams in. As an operation completes, the surface applies it and re-renders that region of the document. The user sees the document update piece by piece in real-time.

---

## 9. MVP Definition

The smallest thing that tests the core hypothesis: **"A living document that evolves through conversation — with edits streaming in real-time and version history you can scrub through — is meaningfully better for learning than a chat transcript."**

### MVP Must Have
1. Web app with a chat bar at the bottom and a document surface above
2. User types a prompt -> AI **edits** the document (not full rewrite)
3. **Real-time streaming**: document re-renders live as AI streams edits in
4. Rich rendering: Mermaid diagrams, KaTeX math, syntax-highlighted code
5. **Version timeline**: scrub back and forth through document states
6. **Diff tracking**: each prompt creates a new version, diffs are stored
7. Auto-generated outline/TOC sidebar
8. Reading-optimized layout (typography, whitespace, max-width)

### MVP Nice to Have
9. Direct editing of the document surface (saved as a user-edit diff)
10. Branching (go back to v2, ask something different)
11. Progressive disclosure (expandable sections)

### MVP Explicitly Not
- No cross-session linking (v2)
- No PDF viewer (v2)
- No spaced repetition scheduling (v2)
- No flashcard generation (v2)
- No concept graph (v2)

### AI Integration: REPL Subscription

The MVP uses the user's existing REPL subscription (Claude Code, Devin, Codex) as the AI backend. No separate API key needed.

**How the chat bar connects to the REPL:**

The web app runs a local server. The chat bar sends prompts to the server. The server communicates with the REPL tool (likely via subprocess or CLI invocation), passing:
- The current document state
- The user's prompt
- Instructions to return edit operations (not a full document)

The REPL tool streams back edit operations. The server relays them to the frontend via WebSocket. The frontend applies each operation and re-renders in real-time.

```
Chat bar -> Local server -> REPL CLI (subprocess) -> streams edits back
                                                         |
                              WebSocket <- server <- edit operations
                                  |
                        Frontend applies edits, re-renders live
```

This keeps the AI cost on the existing REPL subscription and avoids any separate API key requirement.
