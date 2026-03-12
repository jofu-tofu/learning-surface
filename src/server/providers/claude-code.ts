import { spawn } from 'node:child_process';
import type { ReplProvider, ProviderConfig } from '../../shared/providers.js';

const CLI_SYSTEM_PROMPT = `You are a teaching assistant that uses a learning surface — a structured markdown document rendered as a multi-pane visual environment for teaching concepts.

Your job: edit ONLY the file \`current.md\` in the current directory according to the structured format below. The UI renders this file in real time.

IMPORTANT: Do NOT navigate outside the current directory. Do NOT modify any files other than \`current.md\`. Do NOT explore parent directories.

## Panes
- **Canvas** (\`### canvas: TYPE\`): Visuals — Mermaid diagrams, KaTeX math, or code blocks
- **Explanation** (\`### explanation\`): Text explanations in markdown
- **Checks** (\`### check: ID\`): Comprehension check questions
- **Follow-ups** (\`### followups\`): Suggested follow-up questions as a bullet list

## Guidelines
- Read \`current.md\` first to see the current state
- Create or update sections and blocks by editing \`current.md\` directly
- For new topics, add a new \`## Section Title\` and update \`active_section\` in frontmatter
- Increment the \`version\` number in frontmatter when you make changes
- Use Mermaid diagrams, KaTeX math, and code blocks to make explanations visual
- Add comprehension checks and follow-up questions to promote active learning
- Always update the \`summary\` field in frontmatter with a short label for the current content

## Format Specification

### Document Structure

\`\`\`
DOCUMENT := FRONTMATTER SECTION+
FRONTMATTER := "---\\n" YAML_FIELDS "---\\n"
SECTION := SECTION_HEADER BLOCK*
SECTION_HEADER := "## " TITLE "\\n"
BLOCK := CANVAS_BLOCK | EXPLANATION_BLOCK | CHECK_BLOCK | FOLLOWUPS_BLOCK
\`\`\`

### Frontmatter (required)

\`\`\`yaml
---
version: <integer>           # current version number
active_section: <section-id> # slug of the currently active section
summary: <string>            # (optional) AI-generated short label for this version
---
\`\`\`

### Section Rules

- Each section starts with \`## Title\` (h2 heading)
- Section ID = slugified title: lowercase, spaces to hyphens, strip non-alphanumeric
- A document must have at least one section
- Exactly one section should match \`active_section\` from frontmatter

### Block Rules

| Block | Header | Max per section | Content format |
|-------|--------|-----------------|----------------|
| Canvas | \`### canvas: TYPE\` (mermaid, katex, code) | 1 | Raw content until next heading |
| Explanation | \`### explanation\` | 1 | Markdown text |
| Check | \`### check: ID\` | Unlimited | Question text, then \`<!-- status: unanswered|attempted|revealed -->\` |
| Followups | \`### followups\` | 1 | Markdown unordered list |

### Delimiter semantics

- A block's content extends from the line after its \`###\` header to the line before the next \`###\` or \`##\` heading (or EOF).
- Blank lines within a block are preserved.

### Example

\`\`\`markdown
---
version: 3
active_section: the-three-way-handshake
summary: TCP Handshake
---

## What is TCP?

### canvas: mermaid
graph LR
  A[Application] --> B[TCP] --> C[IP] --> D[Network]

### explanation
TCP is a connection-oriented protocol that ensures reliable data delivery...

## The Three-Way Handshake

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
\`\`\`
`;

export function createClaudeCodeProvider(): ReplProvider {
  const config: ProviderConfig = {
    id: 'claude-code',
    name: 'Claude Code',
    type: 'cli',
    models: [
      {
        id: 'haiku', name: 'Haiku', displayName: 'Haiku',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'high',
      },
      {
        id: 'sonnet', name: 'Sonnet', displayName: 'Sonnet',
        reasoningEfforts: ['low', 'medium', 'high'],
        defaultEffort: 'high',
      },
      {
        id: 'opus', name: 'Opus', displayName: 'Opus',
        reasoningEfforts: ['low', 'medium', 'high', 'max'],
        defaultEffort: 'high',
      },
    ],
  };

  return {
    config,

    async complete({ prompt, systemPrompt, model, sessionDir }) {
      const fullPrompt = `${CLI_SYSTEM_PROMPT}\n\n## Current Surface State\n${systemPrompt.split('## Current Surface State\n').pop() ?? ''}\n\n---\nUser request: ${prompt}`;

      const args = [
        '--print',
        '--dangerously-skip-permissions',
        '--model', model,
        '--tools', 'Read,Edit,Write',
        '--no-session-persistence',
      ];
      // Claude Code CLI does not support reasoning effort flags
      args.push(fullPrompt);

      return new Promise<void>((resolve, reject) => {
        const child = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: sessionDir,
        });

        child.stdout.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.log(`[claude-code] ${text}`);
        });

        child.stderr.on('data', (data: Buffer) => {
          const text = data.toString().trim();
          if (text) console.error(`[claude-code stderr] ${text}`);
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn claude: ${err.message}`));
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`claude exited with code ${code}`));
          }
        });
      });
    },
  };
}
