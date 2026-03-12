# Structured Markdown Format Specification

This format is the data contract between all modules.

## Document Structure

```
DOCUMENT := FRONTMATTER SECTION+
FRONTMATTER := "---\n" YAML_FIELDS "---\n"
SECTION := SECTION_HEADER STATUS_COMMENT? BLOCK*
SECTION_HEADER := "## " TITLE "\n"
STATUS_COMMENT := "<!-- status: " ("active" | "completed") " -->\n"
BLOCK := CANVAS_BLOCK | EXPLANATION_BLOCK | CHECK_BLOCK | FOLLOWUPS_BLOCK
```

## Frontmatter (required)

```yaml
---
version: <integer>           # current version number
active_section: <section-id> # slug of the currently active section
summary: <string>            # (optional) AI-generated short label for this version
---
```

## Section Rules

- Each section starts with `## Title` (h2 heading)
- Section ID = slugified title: lowercase, spaces to hyphens, strip non-alphanumeric. e.g., "The Three-Way Handshake" becomes `the-three-way-handshake`
- Status comment `<!-- status: active|completed -->` is **optional**; default is `active` if omitted
- A document must have at least one section
- Exactly one section should match `active_section` from frontmatter

## Block Rules (within a section)

| Block | Header | Required? | Max per section | Content format |
|-------|--------|-----------|-----------------|----------------|
| Canvas | `### canvas: TYPE` where TYPE is `mermaid`, `katex`, or `code` | No | 1 | Raw content until next `##` or `###` heading. For `code`, an optional ` ```language` fence may wrap the content. |
| Explanation | `### explanation` | No | 1 | Markdown text (may contain inline formatting, links, lists). Terminated by next `###` or `##` heading or EOF. |
| Check | `### check: ID` | No | Unlimited | First line after header = question text. Followed by `<!-- status: unanswered|attempted|revealed -->`. Optional `<!-- hints: ["h1","h2"] -->` (JSON array). If revealed, `<!-- answer: ... -->` and `<!-- explanation: ... -->` follow. |
| Followups | `### followups` | No | 1 | Markdown unordered list (`- item`). Each item is a follow-up question string. |

## Block ordering

Blocks within a section may appear in any order. Recommended order: canvas, explanation, check(s), followups.

## Delimiter semantics

- A block's content extends from the line after its `###` header to the line before the next `###` or `##` heading (or EOF).
- Blank lines within a block are preserved.
- Leading/trailing blank lines in block content are trimmed during parse and re-added (one blank line after header, one before next heading) during serialize.

## Round-trip invariant

`serialize(parse(raw))` must produce semantically equivalent output: same sections, same blocks, same content. Whitespace normalization (trimming, single blank line between blocks) is acceptable. Content within blocks must be preserved verbatim (no markdown transformation).

## Malformed input handling

- Missing frontmatter: error (document is invalid)
- Unknown `### foo` blocks: preserved as-is during round-trip (future extensibility), ignored by typed parsers
- Section with no blocks: valid (empty section scaffold)
- Duplicate block types in one section (e.g., two `### explanation`): use the last one, discard earlier

## Example

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
