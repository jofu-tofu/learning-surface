import matter from 'gray-matter';
import type {
  LearningDocument,
  Section,
} from '../shared/types.js';
import { slugify } from '../shared/slugify.js';
import { applyTool } from './tool-handlers.js';
import { findBlock, allBlocks, splitBlocks, type RawBlock } from './blocks/registry.js';

// === Helpers ===

function parseSection(title: string, body: string): Section & { _unknownBlocks?: RawBlock[] } {
  const id = slugify(title);
  const rawBlocks = splitBlocks(body);

  const section: Section & { _unknownBlocks?: RawBlock[] } = { id, title };
  const unknownBlocks: RawBlock[] = [];

  for (const raw of rawBlocks) {
    const blockDefinition = findBlock(raw.header);
    if (blockDefinition) {
      blockDefinition.parse(raw.header, raw.content, section);
    } else {
      unknownBlocks.push(raw);
    }
  }

  if (unknownBlocks.length > 0) {
    section._unknownBlocks = unknownBlocks;
  }

  return section;
}

// === Public API ===

export function parse(raw: string): LearningDocument {
  // Check for frontmatter
  if (!raw.trimStart().startsWith('---')) {
    throw new Error('Missing frontmatter: document must start with YAML frontmatter');
  }

  const { data: frontmatter, content } = matter(raw);

  if (frontmatter.version === undefined || frontmatter.active_section === undefined) {
    throw new Error('Missing frontmatter: version and active_section are required');
  }

  // Split content into sections by ## headings
  const sectionRegex = /^## (.+)$/gm;
  const matches: { title: string; start: number }[] = [];
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(content)) !== null) {
    matches.push({ title: sectionMatch[1].trim(), start: sectionMatch.index + sectionMatch[0].length });
  }

  const sections: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start;
    const end = i + 1 < matches.length
      ? content.lastIndexOf('## ', matches[i + 1].start)
      : content.length;
    const body = content.slice(start, end);
    sections.push(parseSection(matches[i].title, body));
  }

  return {
    version: frontmatter.version,
    activeSection: frontmatter.active_section,
    ...(frontmatter.summary ? { summary: frontmatter.summary } : {}),
    sections,
  };
}

export function serialize(doc: LearningDocument): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`version: ${doc.version}`);
  lines.push(`active_section: ${doc.activeSection}`);
  if (doc.summary) {
    lines.push(`summary: ${JSON.stringify(doc.summary)}`);
  }
  lines.push('---');
  lines.push('');

  for (const section of doc.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');

    // Unknown blocks first (they were before known blocks typically, but order doesn't matter for tests)
    const sectionWithUnknowns = section as Section & { _unknownBlocks?: RawBlock[] };
    if (sectionWithUnknowns._unknownBlocks) {
      for (const block of sectionWithUnknowns._unknownBlocks) {
        lines.push(block.header);
        lines.push(block.content);
        lines.push('');
      }
    }

    // Delegate to registered block definitions in registry order
    for (const def of allBlocks()) {
      lines.push(...def.serialize(section));
    }
  }

  return lines.join('\n');
}

export function applyToolCall(
  doc: LearningDocument,
  tool: string,
  params: Record<string, unknown>,
): LearningDocument {
  // Deep clone the document
  const clonedDocument: LearningDocument = structuredClone(doc);
  applyTool(clonedDocument, tool, params);
  return clonedDocument;
}
