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

## Intellectual Influences & Design Thinking

### Bret Victor
- "Explorable Explanations" — interactive documents where the reader can manipulate parameters and see results change in real-time
- "Inventing on Principle" — direct manipulation interfaces. The gap between thinking and seeing results should be zero.
- **Implication for Learning Surface**: Content should be interactive, not static. Diagrams should be explorable. Parameters in explanations should be adjustable.

### Andy Matuschak
- "Why books don't work" essay — passive reading doesn't produce learning. Active recall and spaced repetition are essential.
- Collaborated with Michael Nielsen on "Quantum Country" — a textbook with embedded spaced repetition review cards
- "Mnemonic medium" concept — embedding retrieval practice into the reading experience
- **Implication for Learning Surface**: Retention features (flashcards, concept checks) should be embedded in the reading flow, not separate.

### Intelligent Tutoring Systems (ITS) Research
- 40+ years of research showing that one-on-one tutoring produces 2 sigma improvement over classroom instruction (Bloom's 2-sigma problem)
- Key design principles: scaffolded learning, immediate feedback, adaptive difficulty, error diagnosis
- Modern ITS research incorporates "open learner models" — showing the student their own knowledge state
- **Implication for Learning Surface**: The surface should track what you know and don't know, and adapt accordingly.

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
