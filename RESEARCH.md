# Competitive Landscape Research

Exhaustive research across 4 parallel research tracks covering 40+ tools, academic literature, and open source projects. Conducted March 2026.

---

## Executive Summary

**No existing tool occupies the "comprehension engine" position** described in Learning Surface's philosophy. The market has ~40+ tools across 8 categories, but they all fall into existing paradigms (chat-next-to-PDF, study material generators, note-taking with AI sprinkled in, etc.). None restructures AI output into a reading-optimized document with rich rendering, in-context interaction, and retention features — all within a single window alongside terminal AI tools.

The closest tools are:
- **Claude Artifacts** — best rich rendering (Mermaid, LaTeX, React), but locked inside Claude's chat UI
- **Fabric** (Daniel Miessler) — best at restructuring LLM output via prompt patterns, but CLI-only with no rendering
- **NotebookLM** — best learning output formats (study guides, audio overviews), but source-grounded and Google-locked
- **SciSpace** — best academic PDF+AI with LaTeX/figure support, but still chat-panel-based

The white space is: **Fabric's transformation power + Claude Artifacts' rendering + NotebookLM's learning features + filesystem-as-interface for tool-agnosticism.**

---

## Category 1: PDF + AI Chat Tools

These tools put a chat panel next to a PDF viewer. All suffer from the same fundamental problem: the AI output is in a chat panel at the bottom.

| Tool | Side-by-Side | Rich AI Output | Figure Extraction | Study Materials | Price |
|------|-------------|---------------|-------------------|-----------------|-------|
| **ChatPDF** | Yes | No | No | No | Free-$5/mo |
| **PDF.ai** | Yes + highlights | Partial | No | No | Free-$15/mo |
| **Humata** | Partial | No | No | No | Free-$10/mo |
| **AskYourPDF** | Yes | No | No | No | Free-$12/mo |
| **Adobe Acrobat AI** | Yes | No | No | No | $13-$23/mo |

**Gap**: Every tool uses chat paradigm. None restructures AI output into a readable document. None renders Mermaid/LaTeX in AI responses.

---

## Category 2: Academic Research AI

More sophisticated than chat-next-to-PDF, but still fundamentally chat or search interfaces.

### Unriddle
- Cross-document **knowledge graph** (unique in the space)
- Citation-linked AI responses that scroll to relevant passages
- Writing integration — not just reading but drafting with citations
- $16-$26/mo
- **Gap**: No flashcards, no figure gallery, no retention system. Still chat-panel AI.

### SciSpace (formerly Typeset)
- **Best-in-class for academic papers** — select any text, equation, or figure and ask AI to explain
- LaTeX rendering in AI explanations
- "Explain Like I'm 5" complexity toggle
- Cross-paper comparison tables
- 270M+ paper index
- ~$10/mo
- **Gap**: Still chat-panel output. No study materials. No spaced repetition.

### Explainpaper
- Purest "highlight text -> get explanation" interaction
- Complexity level selector
- May have been acquired/sunsetted
- **Gap**: Very minimal feature set. No knowledge graph, no figures.

### Scholarcy
- Unique approach: generates structured **summary cards** (not chat), extracts tables/figures
- Browser extension for publisher sites
- ~$10/mo
- **Gap**: No interactive learning session. No real-time Q&A. Extraction, not interaction.

### Elicit
- Systematic literature review automation
- Structured data extraction across hundreds of papers
- YC S21 batch
- ~$10/mo
- **Gap**: Not a reading tool. No PDF reader UI. Extraction/synthesis focused.

### Consensus
- "Consensus Meter" showing what scientific literature says (e.g., "85% of studies agree...")
- Evidence-based search, not chat
- ~$9/mo
- **Gap**: Not a reader at all. Search/discovery only.

---

## Category 3: AI Canvas/Artifact Tools

These are the closest to "rich rendering of AI output."

### Claude Artifacts (Anthropic)
- Side-panel rendering in Claude's web app
- Renders: Mermaid diagrams, LaTeX math, live React components, SVG, syntax-highlighted code, Markdown documents
- **Best rich rendering of any current AI chat tool**
- $20/mo for Pro
- **Gap**: Embedded in Claude's chat UI, not a standalone learning surface. No filesystem interface. No retention features. Can't work with other AI tools.

### ChatGPT Canvas (OpenAI)
- Side-panel collaborative document editing
- Code syntax highlighting, markdown rendering
- No Mermaid or LaTeX rendering in canvas
- $20/mo
- **Gap**: Less rich than Artifacts. Writing-focused, not learning-focused.

### Gamma
- AI-powered document/presentation/webpage generator
- Rich visual layouts, images, charts, nested cards
- $8-$15/mo
- **Gap**: Presentation-focused, not learning-focused. No retention features.

### Napkin AI
- Converts text into visual diagrams, infographics, flowcharts automatically
- **Gap**: Narrow — only visual output, not a learning environment.

### Perplexity Pages
- Transforms research conversations into Wikipedia-style articles
- Formatted articles with headers, citations, embedded media
- **Gap**: One-shot article generation, not an interactive learning session.

---

## Category 4: AI Study & Retention Tools

These have the pedagogical features (flashcards, quizzes, spaced repetition) but lack rich rendering and AI depth.

### Mindgrasp AI
- Upload lectures, videos, PDFs -> auto-generates notes, flashcards, quizzes, study guides
- ~$10/mo
- **Gap**: No rich rendering. No Mermaid/LaTeX. No interactive learning sessions.

### RemNote
- **Closest to "PDF reader + AI + spaced repetition" in one tool**
- PDF annotation -> flashcard pipeline
- Notes become flashcards automatically
- ~$8/mo
- **Gap**: AI is supplementary, not central. PDF reader is basic. No rich AI explanations.

### Quizlet + Q-Chat
- AI tutor using Socratic questioning
- Auto-generates flashcards from uploaded content
- Largest user base for flashcards
- ~$8/mo
- **Gap**: Not a PDF reader. Upload -> extract -> study separately. No side-by-side.

### Knowt
- Flashcards + practice tests from PDFs
- Generous free tier, popular with students
- ~$5/mo
- **Gap**: Not a reader — extraction tool only.

### Anki + AI plugins
- Gold standard spaced repetition (SM-2/FSRS algorithm)
- Community has built GPT->Anki workflows
- Free (desktop)
- **Gap**: No PDF reading. No built-in AI. Requires manual setup.

---

## Category 5: AI Tutoring Platforms

### Google NotebookLM
- Upload PDFs, websites, YouTube -> AI creates study guides, FAQs, timelines, briefing documents
- **Audio Overview**: generates podcast-style discussion of your material (unique)
- Free, powered by Gemini
- **Gap**: Not a PDF reader (you don't see pages rendered). No side-by-side reading. No flashcards/quizzes. No retention. Google lock-in.

### Khanmigo (Khan Academy)
- Socratic method — guides students to answers, never gives them directly
- Integrated with Khan Academy's exercise/video system
- GPT-4 based (OpenAI partnership)
- ~$4/mo
- **Gap**: Locked to Khan Academy content. Can't upload your own material. Chat-based.

### Brilliant.org
- Interactive, visual, problem-based learning
- **Closest existing product to a Learning Surface concept in spirit** — demonstrates that interactive visual interfaces create dramatically better learning outcomes than text
- **Gap**: Pre-authored content only. No AI conversation. No custom material.

### Synthesis
- AI tutoring for kids. Problem-first, not explanation-first. Collaborative.
- ~$42/mo
- **Gap**: K-14 only. Game format, not applicable to general learning.

---

## Category 6: Knowledge Management with AI

### Obsidian + AI Plugins
- Local-first markdown. Mermaid, LaTeX, Canvas (infinite whiteboard), Dataview.
- AI plugins: Smart Connections, Copilot, Text Generator
- Free personal, BYO API key
- **Gap**: You organize manually. No AI-to-document transformation. Not a learning tool.

### Notion AI
- AI within Notion's document/wiki platform. Can generate structured pages, databases, tables.
- KaTeX equations, toggles, callouts, embeds
- $10/user/mo add-on
- **Gap**: General-purpose workspace, not learning-optimized.

### Heptabase
- Visual knowledge management — cards on infinite canvas
- Spatial arrangement for learning
- ~$12/mo
- **Gap**: AI is supplementary. No terminal integration.

### Logseq
- Open-source outliner with graph views
- LaTeX, code blocks, Mermaid via plugins
- Free
- **Gap**: Manual organization. AI plugins limited.

### Reflect Notes
- Networked note-taking with built-in GPT-4
- Voice transcription, auto-connections
- ~$10/mo
- **Gap**: Note-taking focused, not learning-optimized.

---

## Category 7: Open Source Tools

### Fabric (Daniel Miessler)
- **30K+ GitHub stars**. CLI framework with 200+ prompt "patterns" that restructure AI output.
- Patterns like: `extract_wisdom`, `create_summary`, `analyze_claims`, `create_study_guide`
- Pipe any text through patterns -> get structured markdown output
- BYO API key (OpenAI, Anthropic, Ollama)
- **Most directly addresses "take AI output and restructure it for learning"**
- **Gap**: CLI-only. No rendering UI. No rich media. You get markdown text out.

### Khoj
- Self-hostable AI assistant with web, Obsidian, Emacs integrations
- YC W24 batch
- **Gap**: Still fundamentally chat-based UI.

### Quivr
- Open-source "second brain" — document upload -> RAG-based Q&A
- Self-hostable alternative to NotebookLM
- **Gap**: Minimal UI. Chat-based.

### Markmap
- Converts Markdown -> interactive mind maps
- Can visualize AI-generated outlines as expandable mind maps
- LaTeX, code blocks within nodes
- **Gap**: Narrow (only mind maps). Not a full learning surface.

### PrivateGPT / LocalGPT
- Self-hosted document Q&A with local LLMs
- **Gap**: Minimal UI. CLI or basic web. No rich rendering.

### AFFiNE + AI
- Open source document + canvas workspace with AI
- Notion/Miro alternative
- **Gap**: Not terminal-integrated. General workspace, not learning-specific.

### Stanford STORM
- Generates full Wikipedia-style research articles from a topic
- Open source
- **Gap**: Article generation only. No interactive features. Minimal rendering.

---

## Category 8: Reading & Annotation Tools

### Readwise Reader
- Best actual reading app. Supports PDFs, EPUBs, web articles, RSS, YouTube transcripts.
- "Ghostreader" AI: summarize, define, simplify, Q&A, custom prompts on highlights
- TL;DR at top of every document (solves the scroll problem!)
- Exports to Obsidian/Anki/Notion
- $8.99/mo
- **Gap**: AI is a feature, not the core. No rich rendering of AI output. No Mermaid/LaTeX. No interactive learning sessions.

### Hypothes.is
- Open source social annotation layer (W3C standard)
- Overlays on any web page or PDF
- Open API, educational institution adoption
- Free
- **Gap**: No native AI features. Annotation tool, not learning tool.

### Perusall
- Social/collaborative PDF reading for classrooms
- AI-powered "confusion detection" — identifies parts students find difficult
- **Gap**: Instructor-facing AI analytics, not student-facing AI explanations.

---

## Community Critiques: Why Chat Fails for Learning

### The "Answer Machine" Problem (recurring HN theme)
- Chat gives answers immediately, bypassing productive struggle. The effort of searching/reading/filtering IS the learning, not a barrier to it.
- Fluent AI explanations *feel* like understanding, but readers can't reproduce or apply knowledge afterward ("illusion of understanding").
- Robert Bjork's research on "desirable difficulty": making learning slightly harder (generation effects, interleaving, testing) produces dramatically better retention. Chat removes all desirable difficulty.
- No verification mechanism — no testing, no spaced repetition, no comprehension checks.

### "Chat is the CLI of AI" (emerging consensus)
- Widely-cited analogy: chat is like command lines — powerful but not the final form factor. AI needs its "GUI moment."
- **Linus Lee**: AI should generate UI components (tables, diagrams, widgets), not just text bubbles ("generative interfaces").
- **Geoffrey Litt / Ink & Switch**: AI output should be manipulable objects, not inert text ("malleable software").
- Chat conflates input and output — the way you ask shouldn't constrain how the answer is displayed.
- "Blank page problem": chat starts with an empty text box, giving no scaffolding. Learners don't know what they don't know.

### Chat UX Anti-Patterns
- No "state" visualization — chat doesn't show where you are in a learning journey
- Output length mismatch — either too terse or wall-of-text, no way to control granularity dynamically
- The "regenerate" anti-pattern — only recourse for bad answers is regenerating from scratch
- Context window as short-term memory — chat forgets, no persistent knowledge structure being built

---

## Intellectual Influences & Design Thinking

### Bret Victor
- **"Explorable Explanations" (2011)** — explanations should contain interactive elements readers can manipulate. "Active reading."
- **"Learnable Programming" (2012)** — environments should make the invisible visible through immediate feedback and direct manipulation
- **"Ladder of Abstraction" (2011)** — understanding requires moving between concrete examples and abstract principles. Interfaces should allow zooming in/out. Chat is stuck at one level.
- **"Media for Thinking the Unthinkable" (2013)** — new representations enable new thoughts. Text is impoverished for many domains.
- **Implication for Learning Surface**: Content should be interactive, not static. Diagrams should be explorable. Parameters in explanations should be adjustable. Support zooming between abstraction levels.

### Andy Matuschak
- **"Why books don't work" (2019)** — transmissionism (exposing someone to information ≠ learning). Real learning requires effortful retrieval, spacing, interleaving, elaboration.
- **"Mnemonic medium"** (with Michael Nielsen) — embedding spaced repetition directly into reading (Quantum.country). Unifies explanation and practice.
- **Orbit** (withorbit.com) — embeds SR prompts inline in web essays. Eliminates the "separate app" problem. Closest existing implementation to a Learning Surface.
- On AI: cautious about AI that becomes "answer dispenser." Challenge is making AI-assisted learning feel like *doing*, not watching.
- **Implication for Learning Surface**: Retention features (flashcards, concept checks) should be embedded in the reading flow, not separate. Authoring prompts IS the learning.

### Michael Nielsen
- Co-created Quantum.country. "Memory is a form of understanding" — can't separate knowing from understanding.
- Insight that authoring prompts IS the learning — AI should scaffold prompt creation, not replace it.

### Nicky Case
- **"How to Remember Anything Forever-ish"**: the canonical explorable explanation of spaced repetition. You learn SR by DOING SR within the article.
- **"Parable of the Polygons," "Evolution of Trust"**: proves complex concepts become intuitive when presented as interactive simulations.
- Gamification isn't about points/badges — it's about giving the learner agency in a system.

### Seymour Papert (historical foundation)
- **Constructionism**: learning happens best when learners actively construct something
- Computer should be an "object to think with," not an information delivery system

### Maggie Appleton & Amelia Wattenberger
- **Appleton** ("Language Model Sketchbook"): catalogued emerging patterns beyond chat — command palettes, inline completions, structured forms, canvas interfaces. "Bicycles for the mind, not chauffeurs."
- **Wattenberger** ("Why Chatbots Are Not the Future"): AI should generate interfaces, not just text. Output format should match content type — spatial for geography, temporal for history, interactive for processes.

---

## Academic Research on Learning Interfaces

### Intelligent Tutoring Systems — 40 Years of Findings

| Paper | Key Finding | Learning Surface Implication |
|-------|-------------|------------------------------|
| VanLehn (2011) | ITS nearly as effective as human tutors (d=0.76 vs d=0.79). Effectiveness depends on interface design, not just content. | Interface design IS the intervention |
| Anderson et al. (1995) — Cognitive Tutors | Step-by-step problem solving with immediate feedback is the key mechanism. | Must track learning process, not just Q&A |
| Graesser et al. (2004) — AutoTutor | Conversational format effective ONLY when it forces students to generate explanations | Chat works only with Socratic constraints |
| Chi & Wylie (2014) — ICAP Framework | Interactive > Constructive > Active > Passive. Chat is typically Passive or Active. | Must push users to Constructive/Interactive |
| Kirschner, Sweller & Clark (2006) | Pure discovery doesn't work; guided exploration is optimal. | Need structured exploration with scaffolding |

### Cognitive Load Theory Applied to AI
- **Sweller (1988, 2011)**: Chat imposes extraneous load through scrolling, context management, parsing unstructured text
- **Mayer (2009) Multimedia Learning Principles**:
  - *Spatial contiguity*: related info should be near each other (violated by linear scroll)
  - *Signaling*: learners need cues highlighting organization (chat lacks visual hierarchy)
  - *Segmenting*: complex material should be broken into learner-paced segments (chat dumps everything)
  - *Interactivity*: learners should control pace and order (chat is strictly sequential)

### Recent LLM-Specific Research (2023-2024)
- **Kazemitabaar et al. (2023, CHI)**: Students using ChatGPT for coding learned significantly less than those who struggled first. "Generation shortcut" effect.
- **Prather et al. (2023)**: Students using AI without constraints showed reduced self-efficacy over time. Recommended guardrails: force attempt before seeing AI solutions.
- **NNGroup finding**: Users retain ~40% less information from chat-format AI vs. same content in structured documents.

### Progressive Disclosure Patterns from Research
- **Shneiderman's mantra**: "Overview first, zoom and filter, then details on demand" — the design pattern Learning Surfaces should follow
- Accordion/expandable sections for hierarchical explanations
- Difficulty layers: same content at beginner/intermediate/advanced, switchable without re-prompting
- Prerequisite mapping: AI identifies dependencies, presents in order
- "Fog of war" pattern: content initially hidden, exploration reveals adjacent areas

---

## Five Themes Across All Research

### 1. The Passivity Problem
The #1 critique across ALL sources. Chat makes learners passive. ITS research: active generation >> passive reception. HN: "illusion of understanding." Matuschak: "transmissionism" doesn't work. **Learning Surface must require active engagement** — exercises, predictions, explanations, manipulations.

### 2. The Format Problem
Chat's linear, text-heavy format is wrong for learning. Cognitive load theory: split attention, extraneous load. Bret Victor: interactive representations enable understanding text cannot. Wattenberger: generate interfaces, not text. **Support multiple output formats chosen by content type.**

### 3. The Persistence Problem
Chat is ephemeral; learning requires revisitation. No bookmarking, navigation, or TOC in chat. SR requires revisitable, testable content. Matuschak's mnemonic medium: embed review in reading. **Must be persistent, navigable, bookmarkable, integrated with review.**

### 4. The Scaffolding Problem
Chat is either too open (blank page) or too closed (answer machine). Kirschner et al.: guided exploration is optimal. Khanmigo: suggested interactions, not blank text box. **Provide scaffolding — suggested paths, guided progression — while preserving agency.**

### 5. The Verification Problem
Chat has no mechanism to verify understanding. No quizzes, no self-tests unless manually requested. SR research: testing IS learning, not just assessment. ITS research: step-by-step verification with feedback is critical. **Embed comprehension checks as core, not afterthought.**

---

## Gap Analysis: What No Existing Tool Does

| Capability | Best Existing Tool | What's Missing |
|-----------|-------------------|---------------|
| Restructure AI output into documents | Fabric (CLI) | No rendering UI |
| Rich rendering (Mermaid, LaTeX, React) | Claude Artifacts | Locked in Claude chat UI |
| Source material + AI side-by-side | SciSpace | Still chat-panel output |
| Flashcards/quizzes from AI content | Mindgrasp, Quizlet | No rich rendering, no PDF integration |
| Spaced repetition | Anki, RemNote | No AI integration, manual setup |
| Knowledge graph across sessions | Unriddle, Obsidian | Manual linking, no AI-generated graph |
| Works with terminal AI tools | Nothing | No tool bridges rich UI + terminal AI |
| Single window with terminal | Nothing | Every tool is a separate app/tab |
| In-context interaction (click to explain) | Nothing | Every tool appends at chat bottom |
| Progressive disclosure of AI content | Nothing | Every tool dumps full text |

---

## The Actual White Space

Learning Surface would be the **first tool that combines**:

1. **Transformation** (Fabric) — restructure AI output into learning-optimized format
2. **Rich rendering** (Claude Artifacts) — Mermaid, LaTeX, interactive code, visualizations
3. **Pedagogy** (Khanmigo/NotebookLM) — study guides, flashcards, concept checks, progressive disclosure
4. **Retention** (Anki/RemNote) — spaced repetition embedded in the reading experience
5. **Source integration** (SciSpace) — PDF/source material alongside AI commentary
6. **Tool agnosticism** (filesystem) — works with any terminal AI tool via file watching
7. **Single window** — everything in one place, no context switching

No existing tool does more than 2 of these 7 things simultaneously.

---

## Tools to Watch / Borrow From

| Tool | What to Learn From It |
|------|----------------------|
| **Claude Artifacts** | How to render Mermaid, LaTeX, live React in a side panel |
| **Fabric** | The "pattern" concept for transforming AI output |
| **Readwise Reader** | "TL;DR at top" solves scroll-bottom problem; highlight->export pipeline |
| **Markmap** | Markdown-to-mind-map visualization |
| **Brilliant.org** | Interactive visual learning beats text explanations |
| **Quantum Country** (Matuschak/Nielsen) | Embedded spaced repetition in reading flow |
| **NotebookLM Audio Overview** | Multi-modal output beyond text |
| **SciSpace "Explain Like I'm 5"** | Complexity toggle for explanations |
| **MkDocs Material** | Gold standard for rendered markdown with Mermaid/KaTeX + file watching |
| **Docsify** | Zero-build SPA that renders .md files directly — simplest possible setup |
| **Markdown Preview Enhanced** | Richest single-file rendering engine; has programmatic API (`mume`) |
| **Quarto** | Purpose-built for computational/learning documents with executable code |
| **AFFiNE** | Document + Canvas + AI — same content viewable as doc OR spatial canvas |
| **marimo** | Reactive Python notebook; AI generates into cells, not chat |
| **Stanford STORM** | Generates full Wikipedia-style articles from AI (not chat) |

---

## Rendering Tools: What Would Power the Surface

The rendering layer is a solved problem. These tools watch markdown files and render them with full rich content support:

| Tool | File Watch | Mermaid | KaTeX | Zero Build | Best For |
|------|-----------|---------|-------|------------|---------|
| **MkDocs Material** | `mkdocs serve` | Native | Native | No | Best rendering quality |
| **Docsify** | Any HTTP server | Plugin | Plugin | Yes | Simplest setup |
| **Quarto** | `quarto preview` | Native | Native | No | Scientific/computational |
| **mdBook** | `mdbook serve` | Plugin | Plugin | No | Book-structured content |
| **Slidev** | Vite HMR | Native | Native | No | Presentations from markdown |
| **VitePress** | Vite HMR | Plugin | Plugin | No | Modern Vue docs |
| **Markdeep** | Browser only | ASCII->SVG | Yes | Yes, zero deps | Ultra-minimal |

**Top pick for MVP**: Docsify (zero build, instant setup) or MkDocs Material (best rendering). Both watch a directory and render markdown with Mermaid/LaTeX on file change.

**VS Code rendering**: Markdown Preview Enhanced (4M+ installs) renders Mermaid, KaTeX, PlantUML, GraphViz, and more. Has a programmatic library (`@shd101wyy/mume`) usable outside VS Code. If the surface lives in VS Code, this is the rendering engine.

---

## The Terminal-to-Knowledge Gap

This is the core unsolved problem. People use terminal AI tools and the output goes to:
1. **stdout** — ephemeral, gone when terminal closes
2. **Files** — unrendered plain markdown sitting on disk
3. **SQLite logs** (Simon Willison's `llm`) — invisible, requires explicit querying
4. **Git diffs** — code changes, not learning artifacts

**Nothing currently takes terminal AI output and renders it as a rich, navigable, learning-optimized document.** The pieces exist but aren't connected.

### Closest Possible Combinations Today

| Combo | How It Would Work | What's Missing |
|-------|-------------------|----------------|
| **Fabric -> MkDocs Material** | `fabric --pattern extract_wisdom > docs/topic.md && mkdocs serve` | Automation, organization, no spatial layout |
| **Fabric -> Obsidian vault** | `fabric --pattern create_study_notes > ~/vault/topic.md` | Automation, multi-format, no pipeline |
| **Fabric -> Docsify** | Zero-build: Fabric writes .md files, Docsify serves them | Same as MkDocs combo |
| **Terminal AI -> AFFiNE** | AI output -> AFFiNE API -> doc + canvas | AFFiNE API maturity unclear |

---

## MVP Path Options

### Quickest (hours)
Fabric patterns -> write to directory -> Docsify or MkDocs Material serves with Mermaid/KaTeX rendering. A ~100-line shell script could bridge this. Proves the concept immediately.

### Medium (days)
Custom Vite app with markdown-it (Mermaid + KaTeX plugins), chokidar file watching, WebSocket push, sidebar outline, reading-optimized layout. Purpose-built for the use case.

### Ambitious (weeks)
Custom tool combining Fabric-style processing -> AFFiNE/canvas-style spatial arrangement -> MkDocs-quality rendering -> Obsidian-style knowledge graph -> embedded spaced repetition.
