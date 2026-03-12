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
| Scroll-bottom anchored | Spatial contiguity violated | Multi-pane layout — canvas stays visible, navigation sidebar for orientation |
| Full text dump | Segmenting violated | Progressive disclosure, expandable sections |
| No verification | Testing-is-learning missed | Embedded concept checks in interaction pane, flashcard generation |
| Linear stream | No overview-first | Navigation sidebar with TOC and section progress |
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
| **Multi-pane tutoring layout** (canvas, explanation, interaction, navigation) | Brilliant.org, IDE panels | Spatial contiguity — diagram stays visible during explanation |
| **Real-time streaming edits** | Cursor, Claude Artifacts | Watch panes update live as AI streams tool calls |
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
+-------------------------------------------------------+
|                   Learning Surface App                  |
|                                                         |
|  +----------+ +--------+ +-------------+ +---------+   |
|  |  Chat    | | Canvas | | Explanation | | Version |   |
|  |  Bar     | | Pane   | | + Interact  | | Timeline|   |
|  |          | |        | | Pane        | |         |   |
|  | prompt   | | mermaid| | text        | | v1 v2   |   |
|  | input    | | code   | | checks      | | diffs   |   |
|  | send     | | tables | | followups   | | scrub   |   |
|  +----+-----+ +---+----+ +------+------+ +----+----+   |
|       |            |             |              |       |
|  +----------+  +---+-------------+--------------+---+   |
|  | Nav      |  |          Version Store             |   |
|  | Sidebar  |  |  v1.md / v2.patch / meta.json      |   |
|  | TOC      |  +----+------+------------------------+   |
|  | progress |       |      |                            |
|  +----------+       |  +---+----------------------------+  |
|                     |  | File Watcher (chokidar)        |  |
|                     |  | watches session dir for changes|  |
|                     |  +-----+--------------------------+  |
|                     |        |                             |
|                +----+--------+-----+                       |
|                |  MCP Server        |                      |
|                |  semantic tools -> |                      |
|                |  filesystem writes |                      |
|                |  + context compiler|                      |
|                +--------------------+                      |
+---------------------------------------------------------+
         ^
         | semantic MCP tool calls
  +------+----------+
  | REPL (Claude    |
  | Code / Devin)   |
  +-----------------+
```

Each layer is independently testable:
- **Chat Bar**: does it send prompts to the REPL via the MCP server?
- **MCP Server**: does it translate semantic tool calls into correct structured markdown edits? Does it compile surface state into structured JSON context?
- **File Watcher**: does it detect changes and notify the correct pane?
- **Version Store**: does it apply diffs, reconstruct any version, persist to disk?
- **Canvas Pane**: does it render Mermaid/KaTeX/code and apply streaming visual updates?
- **Explanation + Interaction Pane**: does it render text, concept checks, and follow-up questions?
- **Navigation Sidebar**: does it show TOC, section progress, and active section?
- **Version Timeline**: does it scrub between versions correctly?

### Scalability Axes

| Axis | How It Scales |
|------|--------------|
| **More content types** | Add new renderers to the canvas pane (PDF viewer, code playground, audio player) |
| **More AI tools** | Any MCP-compatible REPL works; filesystem fallback for others |
| **More learning modalities** | Add generators (flashcard, quiz, mind map) on top of version store |
| **Cross-session features** | Build on version store — link concepts across sessions |
| **Collaboration** | Content is files with diffs. Git-native. |

---

## 7. What NOT to Build (Scope Traps)

| Temptation | Why to Avoid |
|-----------|-------------|
| Full pane regeneration per prompt | Too slow, too expensive. Use edit tools (`edit_visual`, `extend`) for follow-ups, not creation tools. |
| Separate API key / AI subscription | Use the REPL subscription the user already has. |
| Custom markdown parser | Use markdown-it or remark. Solved problem. |
| Custom diagram renderer | Use Mermaid. Solved problem. |
| Mobile app | Desktop-first. VS Code / browser. Mobile can come later. |
| Real-time collaboration | Solo learning first. Collaboration is a v2 feature. |
| Custom spaced repetition algorithm | Use FSRS (open source, state of the art). Don't reinvent. |

---

## 8. The Tutoring Surface: What Goes on Screen

The hardest design question isn't technical — it's pedagogical. What should the user actually see when they're learning? Research across Brilliant.org, Quantum Country, Khan Academy, ITS literature, and whiteboard tutoring pedagogy points to clear answers.

### What Research Says Works

**Visual-primary, text-secondary.** Brilliant.org's lesson screens have exactly three elements: (1) a visual/interactive widget taking ~60% of the screen, (2) 2-3 sentences of text, (3) a prompt or question to advance. The visual is primary. This is the inverse of chat (text-primary, no visual). Brilliant demonstrates dramatically better learning outcomes than text-heavy platforms.

**Build up, don't dump.** Tutors on whiteboards draw one thing at a time. They don't reveal the complete diagram first — they draw the first arrow, explain it, add the next. The whiteboard is built incrementally, exactly like our streaming MCP tool calls.

**Point and reference.** Tutors point at something already on the board while explaining the next thing. The whiteboard is persistent context. This maps directly to the multi-pane model — the canvas stays visible with the diagram while the explanation pane references specific elements via `annotate`.

**Erase and redraw.** When the student doesn't get it, the tutor doesn't add more text — they erase and try a different representation. This is the `edit_visual` / `show_visual` tool pattern — replace the canvas with a different approach.

**Test before reveal.** Quantum Country embeds spaced repetition cards directly inline — you read a few paragraphs, then a card asks you to recall what you just read. Bjork's "desirable difficulty" research: making the learner predict before revealing produces dramatically better retention.

### Screen Layout: The Multi-Pane Tutoring Surface

The rendering approach is a **multi-pane tutoring surface** — the frontend distributes content across functionally distinct panes based on semantic type. The AI writes content via semantic MCP tools; each tool targets a specific pane. The renderer handles Mermaid, KaTeX, and syntax highlighting within each pane.

**The three surface areas:**

1. **Navigation sidebar** (~20% width) — TOC, section progress, concept map. Always visible. Gives the learner structural orientation ("where am I, what have I covered, what's next").

2. **Canvas** (upper main area) — The current visual: Mermaid diagram, comparison table, mind map, code playground. This is the "whiteboard." It stays visible while the explanation references it, and gets built up incrementally — not replaced wholesale.

3. **Explanation + Interaction** (lower main area) — Contextual text referencing the visual, concept checks, follow-up questions. This is the "tutor's voice" — it explains what's on the canvas and challenges the learner.

**Why multi-pane, not single-document:**

A single scrollable document serializes things that should be simultaneous. In tutoring, the diagram stays visible while the tutor explains. The question references something you can see. The diagram doesn't scroll away during explanation. Multi-pane preserves spatial contiguity (Mayer) and matches the actual tutoring model the research supports.

A single document is better than chat — but it's still a *reading* surface (a better-formatted textbook). Multi-pane is a *learning* surface (a tutoring session). The difference: in a textbook, the diagram and explanation are near each other. In a tutoring session, the diagram is *persistent* — it stays visible, gets pointed to, gets built up, while the explanation and questions happen alongside it.

**The layout principle:** Content renders across functionally distinct panes — visuals in the canvas, explanations and interactions below it, navigation in the sidebar. The AI targets panes via semantic MCP tools (`show_visual`, `explain`, `challenge`). The panes collectively form the tutoring surface; the underlying structured markdown file accumulates all content for versioning.

### Follow-Up Questions as Branches

This is where the tutoring model and the version control model connect. The AI generates follow-up questions after a section. These aren't decoration — they're the branching mechanism.

**How it works:**
1. AI paints a section explaining TCP, then calls `suggest_followups(["What is a SYN packet?", "How does this compare to UDP?", "Show me the actual bytes"])`
2. These render as clickable prompts below the section
3. User clicks one → that becomes their next prompt, creating a new version
4. If the user is on v3 and clicks a follow-up, it branches from v3

**Self-testing mode:** If the user tries to *answer* a follow-up question (types in the chat bar instead of clicking), the AI can verify their understanding before revealing content. This turns follow-up questions from UI convenience into a **learning mechanism** — predict, then reveal (Bjork's desirable difficulty).

**Suggested questions are scaffolding.** The design brief already identifies the "blank page problem" — learners don't know what they don't know. Follow-up questions solve this by showing the learner what to explore next, while preserving agency (they can always type their own question instead).

### What This Looks Like (Concrete Example)

```
+---------------------------------------------------+
|  +----------+----------------------------------+  |
|  |           |                                  |  |
|  | # TCP     |   Canvas                         |  |
|  |           |                                  |  |
|  | ✓ Intro   |   ┌──────┐  SYN    ┌──────┐     |  |
|  | → Handshk |   │Client│ ──────> │Server│     |  |
|  |   Packets |   │      │ <────── │      │     |  |
|  |   Errors  |   │      │ SYN-ACK │      │     |  |
|  |           |   │      │ ──────> │      │     |  |
|  |           |   └──────┘  ACK    └──────┘     |  |
|  |           |                                  |  |
|  |           +----------------------------------+  |
|  |           |                                  |  |
|  |           |   The three-way handshake        |  |
|  |           |   establishes a connection by    |  |
|  |           |   exchanging SYN and ACK...      |  |
|  |           |                                  |  |
|  |           |   ┌─ Concept Check ────────────┐ |  |
|  |           |   │ Why does TCP need three     │ |  |
|  |           |   │ steps, not one? [Think ▸]   │ |  |
|  |           |   └────────────────────────────┘ |  |
|  |           |                                  |  |
|  |           |   [SYN packet?] [TCP vs UDP]     |  |
|  |           |                                  |  |
|  +----------+----------------------------------+  |
|                                                   |
|  <── v1 ── v2 ── v3* ──>      (version timeline)  |
|  [ "Add handshake diagram" ]  (prompt indicator)   |
|                                                   |
|  +-----------------------------------------------+|
|  |  >                                  (chat bar) ||
|  +-----------------------------------------------+|
+---------------------------------------------------+
```

Key elements visible: navigation sidebar with section progress (✓ completed, → active), canvas with the current diagram (persistent — not scrolled away), explanation with concept check and follow-up questions below the visual, version timeline, prompt indicator, and chat bar. The diagram stays visible while the user reads the explanation and interacts with the concept check — spatial contiguity enforced by layout, not just proximity in a scroll.

### Prior Art: What We Learned From Existing Tools

| Tool | What They Got Right | What They Got Wrong |
|------|--------------------|--------------------|
| **Brilliant.org** | Visual-first, interactive, problem-based | Pre-authored only, no AI, no custom content |
| **Quantum Country** | Inline spaced repetition in reading flow | No AI, no diagrams, static web essays |
| **Khanmigo** | Socratic method, never gives answer directly | Locked to Khan Academy content, chat-based |
| **Pencil MCP** | AI draws via tool calls, progressive rendering | Low-level primitives, no persistence, no document structure |
| **OpenPencil** (592 stars) | AI-native design tool via MCP, concurrent agents | Design-focused, not learning-focused |
| **Claude Artifacts** | Best rich rendering (Mermaid, KaTeX, React) | Ephemeral, can't compose into larger document |
| **Fabric** | Transform AI output via patterns (extract_wisdom, create_study_guide) | CLI-only, no rendering UI |
| **marimo** | AI generates INTO cells, not sidebar. Reactive. | Programming-focused, not general learning |
| **Observable** | Reactive visual documents, D3 explorable explanations | No AI integration, human-authored only |

**Nobody has built a learning MCP.** The MCP ecosystem has ~100+ servers for data access and a few for rendering (Pencil MCP), but zero for structured educational content. Learning Surface would be the first MCP server designed for pedagogical rendering — where the AI controls a multi-pane tutoring surface via semantic teaching tools (`show_visual`, `explain`, `challenge`, `build_visual`), with concept checks, follow-up questions, and version control built into the protocol. The tool definitions themselves do the prompt engineering — the AI naturally produces well-structured learning content because the tools constrain it to think in terms of visuals, explanations, and challenges.

---

## 9. Interaction Model: The Living Surface

The surface is a **multi-pane tutoring environment that the AI controls via semantic MCP tools.** The chat bar is the control plane; the panes are the artifact. The AI never regenerates full pane contents for incremental changes — it applies targeted edits that stream in and re-render in real-time.

### The Core Loop

```
+---------------------------------------------------+
|  +----------+----------------------------------+  |
|  |           |                                  |  |
|  | Navigation|   Canvas (v3)                    |  |
|  |           |                                  |  |
|  | # TCP     |   [mermaid: handshake diagram]   |  |
|  | ✓ Intro   |                                  |  |
|  | → Handshk |   ====........  (building up)    |  |
|  |           |                                  |  |
|  |           +----------------------------------+  |
|  |           |                                  |  |
|  |           |   Explanation                    |  |
|  |           |   The SYN packet contains the    |  |
|  |           |   initial sequence====........   |  |
|  |           |   (streaming in)                 |  |
|  |           |                                  |  |
|  +----------+----------------------------------+  |
|                                                   |
|  <── v1 ── v2 ── v3* ──>      (version timeline)  |
|  [ "Go deeper on the SYN packet" ]                 |
|                                                   |
|  +-----------------------------------------------+|
|  |  >                                  (chat bar) ||
|  +-----------------------------------------------+|
+---------------------------------------------------+
```

1. User types in the chat bar: "Explain TCP"
2. AI calls `new_section("What is TCP?")` + `show_visual(mermaid, layers_diagram)` + `explain(overview_text)` + `suggest_followups(...)` — panes populate, user watches them fill. → **version 1**
3. User types: "Add a diagram of the handshake"
4. AI calls `new_section("Handshake")` + `show_visual(mermaid, handshake_diagram)` + `explain(handshake_text)` — new section, canvas updates, explanation updates. → **version 2** (diff tracked)
5. User types: "Go deeper on the SYN packet"
6. AI calls `build_visual(syn_detail_additions)` + `extend(syn_explanation)` — incremental additions to existing canvas and explanation, not replacements. → **version 3** (diff tracked, small output)
7. User scrubs the timeline back to v1 to see where they started
8. User directly edits the explanation text → **version 4** (manual edit, also diffed)

### Key Properties

**Edits, not rewrites.** The AI has both creation tools (`show_visual`, `explain`) and edit tools (`edit_visual`, `edit_explanation`, `build_visual`, `extend`). For new topics, it creates. For follow-ups and refinements, it edits. The edit tools take `find`/`replace` or `additions` parameters — the AI outputs only the delta, not the full content. This is fast and token-efficient.

**Real-time streaming.** As the AI streams its tool calls, each pane re-renders live. You watch the canvas diagram get built up. The explanation text appears alongside it. The concept check materializes in the interaction area. The surface is alive.

**Pane-aware highlighting.** The pane the AI is currently updating gets a subtle visual indicator (border, glow, or highlight) so the user can see where changes are happening. When the AI calls `build_visual`, the canvas highlights. When it calls `extend`, the explanation highlights.

**The conversation IS the version history.** Each prompt maps to a surface state version. You don't read a chat transcript — you scrub through how the surface evolved. The learning journey is visible as a series of diffs.

**The file is always the source of truth.** The MCP server translates tool calls into edits on a structured markdown file. The file watcher detects changes. The renderer updates the panes. Previous states are preserved as diffs, not as message history.

**User edits are first-class.** You can edit the explanation text directly (fix a typo, add your own note, restructure). That's just another version in the timeline. The AI's next response builds on YOUR edits.

**Prompt indicator.** A small, persistent label sits between the timeline and the chat bar, showing the prompt that produced the current version. When the user scrubs the timeline, it shows that version's prompt. Read-only, unobtrusive.

**Branching is possible.** Go back to v2, ask a different question → you branch the timeline. Like git branches for learning paths.

### Data Model

```
sessions/
  tcp-explained/
    v1.md              # initial structured markdown (from first prompt)
    v1.meta.json       # { prompt: "Explain TCP", timestamp, source: "ai" }
    v2.patch           # diff: new section added, canvas + explanation populated
    v2.meta.json       # { prompt: "Add a diagram of the handshake", source: "ai" }
    v3.patch           # diff: canvas additions, explanation extended
    v3.meta.json       # { prompt: "Go deeper on SYN", source: "ai" }
    v4.patch           # diff: user's manual edit to explanation
    v4.meta.json       # { prompt: null, source: "user-edit" }
```

Diffs keep storage efficient. Any version is reconstructable by applying patches forward from v1. The meta.json ties each version to its prompt (or marks it as a user edit).

**Structured markdown file format:**

The v1.md file uses conventional markdown with semantic section markers that the renderer and MCP server understand:

```markdown
---
version: 3
active_section: the-three-way-handshake
---

## What is TCP?
<!-- status: completed -->

### canvas: mermaid
graph LR
  A[Application] --> B[TCP] --> C[IP] --> D[Network]

### explanation
TCP is a connection-oriented protocol that ensures reliable data delivery...

## The Three-Way Handshake
<!-- status: active -->

### canvas: mermaid
sequenceDiagram
  Client->>Server: SYN
  Server->>Client: SYN-ACK
  Client->>Server: ACK

### explanation
The three-way handshake establishes a reliable connection...

### check: c1
Why three steps instead of one?
<!-- status: unanswered -->

### followups
- What is a SYN packet?
- TCP vs UDP
```

This is still human-readable markdown. Each learning section has a consistent structure: a visual (`### canvas`), an explanation (`### explanation`), and optionally checks and follow-ups. The MCP server reads and writes these sections; the renderer distributes them to panes. Diffs work on the file as standard text diffs.

### AI Edit Protocol: Semantic MCP Tools

The AI calls **semantic MCP tools** that map to teaching actions, not document editing primitives. Each tool targets a specific pane. The MCP server translates tool calls into edits on the structured markdown file.

**Canvas tools** (visual pane):

```
show_visual(type, content, title)         # New visual for a new section (full write)
edit_visual(find, replace)                # Surgical change to existing visual (incremental)
build_visual(additions)                   # Add elements to existing visual (incremental)
annotate(element, label)                  # Label/highlight element in visual (tiny edit)
```

**Explanation tools** (explanation pane):

```
explain(content)                          # New explanation for a new section (full write)
edit_explanation(find, replace)           # Surgical change to existing explanation (incremental)
extend(content, position?)                # Append or prepend detail (incremental)
```

**Interaction tools** (interaction area):

```
challenge(question, hints?)               # Pose a concept check
reveal(check_id, answer, explanation)     # Reveal answer after user attempts
suggest_followups(questions[])            # Update suggested next questions
```

**Structure tools** (navigation + session):

```
new_section(title)                        # Start a new learning section (creates section scaffold)
complete_section(section)                 # Mark section done in navigation
set_active(section)                       # Switch focus to a different section
```

**Why semantic tools over document-editing tools:**
- **The tool definitions ARE the prompt engineering.** The AI sees `edit_visual(find, replace)` and naturally produces minimal output. It sees `show_visual(content)` and knows to produce full content. The tool interface constrains the output format without needing elaborate instructions.
- **Each tool targets a pane.** The AI doesn't need to know about layout — `show_visual` goes to the canvas, `explain` goes to the explanation pane, `challenge` goes to the interaction area. The MCP server handles the mapping.
- **Creation and edit variants preserve performance.** New topics use creation tools (full write, unavoidable). Follow-ups use edit tools (incremental, fast). The AI naturally picks the right one based on context.
- **Teaching-oriented vocabulary.** The AI thinks in terms of "show a visual, explain it, challenge the learner" rather than "insert text at line 47." This produces better pedagogical output because the tools frame the task as teaching, not editing.

**Performance profile:**

| Interaction | Tool calls | AI output | File diff |
|---|---|---|---|
| "Explain TCP" (new topic) | `new_section` + `show_visual` + `explain` + `suggest_followups` | ~500 tokens (full write, expected) | New section added |
| "Go deeper on the handshake" | `build_visual` + `extend` | ~100 tokens (incremental) | Few lines changed/added |
| "Annotate the SYN arrow" | `annotate` | ~15 tokens | One line added |
| "Why three steps?" | `challenge` | ~30 tokens | Check block added |
| "Now explain UDP" (new topic) | `complete_section` + `new_section` + `show_visual` + `explain` | ~400 tokens (full write, new topic) | Old section marked complete, new section added |

The only full writes are for genuinely new content. Everything else is incremental — exactly what "edits, not rewrites" was designed to achieve, but enforced by tool design rather than prompt instructions.

### Two-Pass Rendering: Paint, Then Verify

Learning content is mostly things the AI already knows well — it can generate Mermaid diagrams, LaTeX, explanations, and cross-references quickly. The rendering model takes advantage of this with a two-pass approach that prioritizes perceived speed.

**Pass 1 — Paint.** The AI calls creation and edit tools fast. Visuals, explanations, concept checks — stream them all in and render across panes immediately. The user sees the surface populate within seconds.

**Pass 2 — Verify.** The AI reviews what it just painted. It checks factual accuracy, validates diagram correctness, ensures the explanation matches the visual. If something is wrong, it calls the edit tools to fix it — `edit_visual`, `edit_explanation`. The user sees the correction applied smoothly with the pane highlight indicating where the fix is happening.

**The same edit tools handle both passes.** There's no special "correction" path. A verification fix uses the same `edit_visual` or `edit_explanation` tools as a user-prompted refinement. The abstraction is unified.

### Context Management: Stateless Agent + Compiled Context

The REPL agent starts fresh on every prompt. No conversation history is carried between interactions. Instead, the app **compiles a structured JSON context** from the current surface state and recent history, giving the AI everything it needs without accumulating context window debt.

**Why stateless:**
- **Branching is trivial.** Switch branches and compile that branch's surface state. No conversation replay.
- **No context window pressure.** The structured state is compact — far smaller than the full conversation that produced it.
- **Predictable behavior.** Same surface state + same prompt = same AI behavior. No drift from accumulated context.
- **The surface IS the memory.** The AI doesn't need to remember the discussion — it reads the current state.

**What goes into the compiled prompt — structured JSON:**

```json
{
  "session": {
    "topic": "How TCP Works",
    "version": 3,
    "active_section": "The Three-Way Handshake"
  },
  "surface": {
    "canvas": {
      "type": "mermaid",
      "content": "sequenceDiagram\n  Client->>Server: SYN\n  Server->>Client: SYN-ACK\n  Client->>Server: ACK"
    },
    "explanation": "The three-way handshake establishes a reliable connection between client and server...",
    "checks": [
      { "id": "c1", "question": "Why three steps instead of one?", "status": "unanswered" }
    ],
    "followups": ["What is a SYN packet?", "TCP vs UDP"]
  },
  "sections": [
    { "title": "What is TCP?", "status": "completed" },
    { "title": "The Three-Way Handshake", "status": "active" }
  ],
  "prompt_history": [
    "Explain TCP",
    "Add a diagram of the handshake"
  ]
}
```

**Why structured JSON instead of raw markdown:**
- **The AI sees exactly what's on screen.** `canvas.content` is what's in the canvas pane. `explanation` is what's in the explanation pane. No parsing ambiguity.
- **Compact.** The JSON state for a learning session is typically a few hundred tokens — far smaller than the full markdown file with all accumulated sections.
- **Edit tools make sense.** When the AI sees `canvas.content` and the user asks to "annotate the SYN arrow," it knows exactly what to reference in `annotate(element, label)`.
- **Sections give navigation context.** The AI sees what's been covered (`completed`) and what's active. It can make informed decisions about whether to extend the current section or start a new one.

**How it handles the conversational feel:**

The recent prompt history (pulled from `meta.json` files) gives the AI a sense of trajectory. When the user asks "Go deeper on SYN," the AI sees:
- The canvas currently has the handshake diagram (from `surface.canvas`)
- The explanation currently covers the handshake overview (from `surface.explanation`)
- The prior prompts were "Explain TCP" then "Add a diagram of the handshake" (from `prompt_history`)
- The user is drilling down along a clear path

**Context compilation is a tunable knob:**
- Active section only: include just the current section's state (most compact)
- Full surface: include all sections' state (more context, still structured)
- Recent history depth: start with 2-3 prompts, adjust based on what works
- Session metadata: could include total version count, branch info, time elapsed

**How it interacts with branching:**

```
v1 ("Explain TCP")
├── v2 ("Add handshake diagram")
│   └── v3 ("Go deeper on SYN")      <- user is here
└── v2b ("Compare TCP vs UDP")
    └── v3b ("Which is better for gaming?")
```

If the user is on v3, the compiled context includes the v3 surface state and the prompt chain [v1, v2, v3]. If they switch to v3b, the compiled context includes the v3b surface state and the prompt chain [v1, v2b, v3b]. The agent doesn't know or care about the other branch. The context is always clean and relevant to where the user is standing.

---

## 10. MVP Definition

The smallest thing that tests the core hypothesis: **"A multi-pane tutoring surface — where the AI controls a canvas, explanation, and interaction area via semantic tools, with version history you can scrub through — is meaningfully better for learning than a chat transcript or a single scrollable document."**

### MVP Must Have
1. Web app with **multi-pane layout**: navigation sidebar, canvas pane, explanation + interaction pane, chat bar, version timeline
2. User types a prompt → AI calls **semantic MCP tools** to populate/edit panes (not full rewrites)
3. **Both creation and edit tools**: `show_visual` / `edit_visual`, `explain` / `edit_explanation` / `extend`, etc. — new topics get creation tools, follow-ups get incremental edit tools
4. **Real-time streaming**: panes re-render live as AI streams tool calls
5. Rich rendering: Mermaid diagrams, KaTeX math, syntax-highlighted code (within panes)
6. **Version timeline**: scrub back and forth through surface states
7. **Diff tracking**: each prompt creates a new version, diffs are stored on the structured markdown file
8. Navigation sidebar with auto-generated TOC and section progress
9. **Structured JSON context**: each prompt sends the AI a compact JSON snapshot of the current surface state, not the raw markdown file
10. Reading-optimized layout (typography, whitespace) within each pane

### MVP Nice to Have
11. Direct editing of the explanation pane (saved as a user-edit diff)
12. Branching (go back to v2, ask something different)
13. Progressive disclosure (expandable sections within panes)

### MVP Explicitly Not
- No cross-session linking (v2)
- No PDF viewer (v2)
- No spaced repetition scheduling (v2)
- No flashcard generation (v2)
- No concept graph (v2)

### AI Integration: MCP Server + REPL Subscription

The MVP uses the user's existing REPL subscription (Claude Code, Devin, Codex) as the AI backend. No separate API key needed. The REPL communicates with Learning Surface via MCP — calling semantic teaching tools like `show_visual`, `explain`, and `challenge` instead of outputting structured JSON or raw markdown.

**How it works:**

The Learning Surface app runs an MCP server. The user configures their REPL to connect to it (standard MCP server config). When the user submits a prompt via the chat bar, the app compiles the current surface state into structured JSON and invokes the REPL with the prompt + context. The REPL calls semantic MCP tools to update the panes. The MCP server translates tool calls into edits on the structured markdown file. The file watcher detects changes and the frontend re-renders the affected panes.

```
Chat bar → compiles structured JSON context → invokes REPL with prompt + context
                |
REPL calls semantic MCP tools (show_visual, explain, build_visual, challenge, ...)
                |
MCP Server → translates tool calls into edits on structured markdown file
                |
File watcher (chokidar) → detects changes → frontend re-renders affected panes
```

This keeps the AI cost on the existing REPL subscription, avoids any separate API key requirement, and eliminates prompt engineering for output format — the semantic tool definitions constrain the AI's output structure naturally.

---

## 11. Technology Stack

Stack chosen to maximize testability, agent-friendliness (CLI-driven verification), and reliable rendering of the multi-pane architecture. Every dependency is mature, past 1.0 (or effectively stable despite version number), and has a minimal API surface.

### Core Stack

| Layer | Choice | Version (at decision time) | Why |
|-------|--------|---------------------------|-----|
| **Build tool** | Vite | 7.x | HMR for instant re-renders during development; built-in chokidar for dev file watching; native TypeScript/ESM support |
| **Frontend framework** | React + TypeScript | React 19.x | Best component testing story (React Testing Library + jsdom = full component tests without a browser). Component model maps 1:1 to pane architecture. |
| **Styling** | Tailwind CSS + `@tailwindcss/typography` | 4.x | Co-located styles (structure + styling in one file, no `.css` file jumping). `prose` class handles reading-optimized typography out of the box. |
| **Markdown rendering** | markdown-it | 14.x | Plugin-based, simple API. Custom plugins parse the structured markdown format (`### canvas:`, `### check:`, `### followups`). Not remark — remark's AST power isn't needed and its ecosystem version matrix adds complexity. |
| **Diagrams** | Mermaid | 11.x | No alternative for breadth of diagram types. Pin version carefully — API churn across majors. Lazy-load via dynamic `import()` (bundle is ~2-3MB). |
| **Math** | KaTeX | 0.16.x | Stable despite pre-1.0 version. `katex.renderToString()` hasn't changed in years. Faster and lighter than MathJax. |
| **Code highlighting** | Shiki or highlight.js | — | Syntax highlighting within canvas and explanation panes. |
| **File watching** | chokidar | 5.x | Production file watcher for MCP server → frontend pipeline. Vite handles dev-mode watching separately. |
| **MCP server** | `@modelcontextprotocol/sdk` | 1.x (currently 1.27) | High-level `McpServer` class with `.tool()` API + Zod parameter schemas. stdio transport for REPL integration. Tool definition API has been stable across all 4 protocol spec revisions. |
| **Schema validation** | Zod | 3.x | Required by MCP SDK for tool parameter definitions. Also useful for validating structured markdown frontmatter and context JSON. |
| **WebSocket** | `ws` | 8.x | Push file changes from server to browser. Standard, minimal API. |

### Testing Stack

| Tool | Purpose | Why This One |
|------|---------|-------------|
| **Vitest** | Unit + component tests | Same config as Vite, near-zero setup, native TypeScript/ESM. `vitest run` in terminal = primary feedback loop. |
| **React Testing Library** | Component tests | Render components in jsdom, query by role/text, assert output — no browser needed. Each pane testable in isolation. |
| **Playwright** | E2E visual verification | Launch dev server, call MCP tools, screenshot result. Last verification step, not primary. |

### Testing Architecture

The 8 components split cleanly into two testing tiers:

**Tier 1 — No browser needed (vitest only):**
- MCP Server (call tool handlers directly, assert structured markdown output)
- Structured markdown parser/writer (parse → JSON → write round-trip)
- Version Store (apply patches, reconstruct versions, verify diffs)
- Context Compiler (surface state → JSON snapshot)
- File Watcher (mock filesystem events, verify notification routing)

**Tier 2 — jsdom or browser (vitest + RTL, then Playwright):**
- Canvas Pane (render with mock markdown, assert Mermaid/KaTeX output in DOM)
- Explanation + Interaction Pane (render, assert text/checks/followups)
- Navigation Sidebar (render with section data, assert TOC structure)
- Version Timeline (render with version list, assert scrub behavior)
- Chat Bar (render, simulate input, assert prompt dispatch)
- Full integration loop (Playwright: submit prompt → MCP tools fire → panes update)

Half the codebase is testable via `vitest run` in under a second with zero browser dependencies.

### Project Structure

```
src/
  server/                  # Pure Node.js — no browser deps, independently testable
    mcp-server.ts          # McpServer + tool definitions (show_visual, explain, etc.)
    markdown.ts            # Structured markdown read/write/parse
    versions.ts            # Patch/diff logic, version reconstruction
    watcher.ts             # chokidar file watcher + WebSocket push
    context.ts             # Surface state → structured JSON compiler
  app/                     # React frontend (Vite)
    components/
      Canvas.tsx           # Mermaid/KaTeX/code rendering pane
      Explanation.tsx      # Explanation text + concept checks + follow-ups
      Sidebar.tsx          # Navigation TOC + section progress
      Timeline.tsx         # Version timeline scrubber
      ChatBar.tsx          # Prompt input + send
    App.tsx                # Multi-pane layout shell
    main.tsx               # Vite entry point
  test/
    server/                # vitest — no browser
    components/            # vitest + React Testing Library + jsdom
    e2e/                   # Playwright
sessions/                  # Data directory (git-ignored)
  {topic}/
    v1.md
    v1.meta.json
    v2.patch
    v2.meta.json
```

### Why Not the Alternatives

| Rejected | Reason |
|----------|--------|
| **Svelte** | Testing story less mature (`@testing-library/svelte` exists but fewer patterns, worse docs). React Testing Library + jsdom is the most reliable path for agent-driven component verification. |
| **Vanilla JS / Web Components** | No component model means building custom test harnesses. Adds surface area without adding testability. |
| **remark (unified ecosystem)** | AST manipulation power not needed for MVP. The MCP server does string-level section edits; the frontend renders markdown to HTML. remark's multi-package version matrix (unified/rehype/remark-parse/remark-stringify) adds ecosystem complexity for no MVP benefit. |
| **CSS Modules** | Requires jumping between `.tsx` and `.module.css` files. Harder for agents to verify layout by reading code. Tailwind co-locates everything. |
| **Docsify** | Single-document renderer — architecture mismatch with multi-pane layout. Design explicitly argues against serializing simultaneous content into a scroll. |
| **MkDocs Material** | Python-based, best for static documentation sites. Doesn't support the dynamic multi-pane WebSocket-driven architecture. |
| **Jest** | Requires separate config from Vite, ESM support is fragile, slower than Vitest. |
