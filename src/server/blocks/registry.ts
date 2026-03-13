import type { BlockDefinition, RawBlock } from './types.js';
import { canvasBlock } from './canvas.js';
import { explanationBlock } from './explanation.js';
import { checkBlock } from './check.js';
import { followupsBlock } from './followups.js';

export type { BlockDefinition, RawBlock } from './types.js';

// Ordered list — serialization follows this order.
const blocks: BlockDefinition[] = [
  canvasBlock,
  explanationBlock,
  checkBlock,
  followupsBlock,
];

/** Find the block definition that matches a ### header line. */
export function findBlock(header: string): BlockDefinition | undefined {
  return blocks.find(b => b.match(header));
}

/** All registered block definitions, in serialization order. */
export function allBlocks(): readonly BlockDefinition[] {
  return blocks;
}

/**
 * Generate the block rules table for the CLI system prompt.
 * Auto-derived from registered block definitions — stays in sync automatically.
 */
export function generateBlockRulesTable(): string {
  const rows = blocks.map(b => {
    const desc = b.describe();
    return `| ${desc.header} | ${desc.maxPerSection} | ${desc.contentFormat} |`;
  });
  return [
    '| Block | Max per section | Content format |',
    '|-------|-----------------|----------------|',
    ...rows,
  ].join('\n');
}

/**
 * Generate the panes summary for the CLI system prompt.
 * Auto-derived from registered block definitions.
 */
export function generatePanesSummary(): string {
  const descriptions: Record<string, string> = {
    canvas: 'Visuals — diagrams (`diagram`), Mermaid (`mermaid`), KaTeX math (`katex`), or code blocks (`code`). For diagram, content is JSON (see format below).',
    explanation: 'Text explanations in markdown',
    checks: 'Comprehension check questions',
    followups: 'Suggested follow-up questions as a bullet list',
  };

  return blocks.map(b => {
    const desc = b.describe();
    const paneDesc = descriptions[b.type] ?? desc.contentFormat;
    return `- **${b.type.charAt(0).toUpperCase() + b.type.slice(1)}** (${desc.header}): ${paneDesc}`;
  }).join('\n');
}

/**
 * Generate the BNF grammar BLOCK line from registered block definitions.
 */
export function generateBlockGrammar(): string {
  const names = blocks.map(b => `${b.type.toUpperCase()}_BLOCK`);
  return `BLOCK := ${names.join(' | ')}`;
}

/**
 * Split a section body into raw blocks by ### headers.
 * Content before the first ### header is ignored (consistent with existing behavior).
 */
export function splitBlocks(body: string): RawBlock[] {
  const lines = body.split('\n');
  const result: RawBlock[] = [];
  let currentHeader: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentHeader !== null) {
        result.push({ header: currentHeader, content: currentLines.join('\n').trim() });
      }
      currentHeader = line;
      currentLines = [];
    } else if (currentHeader !== null) {
      currentLines.push(line);
    }
  }
  if (currentHeader !== null) {
    result.push({ header: currentHeader, content: currentLines.join('\n').trim() });
  }
  return result;
}
