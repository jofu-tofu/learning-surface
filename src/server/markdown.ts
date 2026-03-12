import matter from 'gray-matter';
import type {
  LearningDocument,
  Section,
  CanvasContent,
  Check,
} from '../shared/types.js';
import { slugify } from '../shared/slugify.js';
import { applyTool } from './tool-handlers.js';

// === Helpers ===

interface RawBlock {
  header: string; // the full ### line, e.g. "### canvas: mermaid"
  content: string; // trimmed content between this header and the next
}

function parseBlocks(body: string): RawBlock[] {
  const lines = body.split('\n');
  const blocks: RawBlock[] = [];
  let currentHeader: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (currentHeader !== null) {
        blocks.push({ header: currentHeader, content: currentLines.join('\n').trim() });
      }
      currentHeader = line;
      currentLines = [];
    } else if (currentHeader !== null) {
      currentLines.push(line);
    }
  }
  if (currentHeader !== null) {
    blocks.push({ header: currentHeader, content: currentLines.join('\n').trim() });
  }
  return blocks;
}

function parseSection(title: string, body: string): Section & { _unknownBlocks?: RawBlock[] } {
  const id = slugify(title);

  const blocks = parseBlocks(body);

  let canvas: CanvasContent | undefined;
  let explanation: string | undefined;
  const checks: Check[] = [];
  let followups: string[] | undefined;
  const unknownBlocks: RawBlock[] = [];

  for (const block of blocks) {
    const canvasMatch = block.header.match(/^###\s+canvas:\s*(\S+)/);
    if (canvasMatch) {
      canvas = { type: canvasMatch[1] as CanvasContent['type'], content: block.content };
      continue;
    }

    if (block.header.match(/^###\s+explanation\s*$/)) {
      explanation = block.content;
      continue;
    }

    const checkMatch = block.header.match(/^###\s+check:\s*(\S+)/);
    if (checkMatch) {
      const checkId = checkMatch[1];
      const checkLines = block.content.split('\n');
      // First non-empty, non-comment line is the question
      let question = '';
      let checkStatus: Check['status'] = 'unanswered';
      let hints: string[] | undefined;
      let answer: string | undefined;
      let answerExplanation: string | undefined;

      const nonEmpty = checkLines.filter(l => l.trim() !== '');
      for (const line of nonEmpty) {
        const trimmed = line.trim();
        if (trimmed.startsWith('<!--')) {
          const statusM = trimmed.match(/<!--\s*status:\s*(unanswered|attempted|revealed)\s*-->/);
          if (statusM) { checkStatus = statusM[1] as Check['status']; continue; }
          const hintsM = trimmed.match(/<!--\s*hints:\s*(.*?)\s*-->/);
          if (hintsM) { try { hints = JSON.parse(hintsM[1]); } catch { /* ignore malformed */ } continue; }
          const answerM = trimmed.match(/<!--\s*answer:\s*(.*?)\s*-->/);
          if (answerM) { answer = answerM[1]; continue; }
          const explM = trimmed.match(/<!--\s*explanation:\s*(.*?)\s*-->/);
          if (explM) { answerExplanation = explM[1]; continue; }
        }
        if (!question) { question = trimmed; }
      }

      const check: Check = { id: checkId, question, status: checkStatus };
      if (hints) check.hints = hints;
      if (answer !== undefined) check.answer = answer;
      if (answerExplanation !== undefined) check.answerExplanation = answerExplanation;
      checks.push(check);
      continue;
    }

    if (block.header.match(/^###\s+followups\s*$/)) {
      followups = block.content
        .split('\n')
        .filter(l => l.match(/^\s*-\s+/))
        .map(l => l.replace(/^\s*-\s+/, '').trim());
      continue;
    }

    // Unknown block — preserve for round-trip
    unknownBlocks.push(block);
  }

  const section: Section & { _unknownBlocks?: RawBlock[] } = {
    id,
    title,
    ...(canvas ? { canvas } : {}),
    ...(explanation !== undefined ? { explanation } : {}),
    ...(checks.length > 0 ? { checks } : {}),
    ...(followups ? { followups } : {}),
  };

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

  const { data, content } = matter(raw);

  if (data.version === undefined || data.active_section === undefined) {
    throw new Error('Missing frontmatter: version and active_section are required');
  }

  // Split content into sections by ## headings
  const sectionRegex = /^## (.+)$/gm;
  const matches: { title: string; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(content)) !== null) {
    matches.push({ title: match[1].trim(), start: match.index + match[0].length });
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
    version: data.version,
    activeSection: data.active_section,
    ...(data.summary ? { summary: data.summary } : {}),
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
    lines.push(`summary: ${doc.summary}`);
  }
  lines.push('---');
  lines.push('');

  for (const section of doc.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');

    // Unknown blocks first (they were before known blocks typically, but order doesn't matter for tests)
    const s = section as Section & { _unknownBlocks?: RawBlock[] };
    if (s._unknownBlocks) {
      for (const block of s._unknownBlocks) {
        lines.push(block.header);
        lines.push(block.content);
        lines.push('');
      }
    }

    if (section.canvas) {
      lines.push(`### canvas: ${section.canvas.type}`);
      lines.push(section.canvas.content);
      lines.push('');
    }

    if (section.explanation !== undefined) {
      lines.push('### explanation');
      lines.push(section.explanation);
      lines.push('');
    }

    if (section.checks) {
      for (const check of section.checks) {
        lines.push(`### check: ${check.id}`);
        lines.push(check.question);
        lines.push(`<!-- status: ${check.status} -->`);
        if (check.hints && check.hints.length > 0) {
          lines.push(`<!-- hints: ${JSON.stringify(check.hints)} -->`);
        }
        if (check.answer !== undefined) {
          lines.push(`<!-- answer: ${check.answer} -->`);
        }
        if (check.answerExplanation !== undefined) {
          lines.push(`<!-- explanation: ${check.answerExplanation} -->`);
        }
        lines.push('');
      }
    }

    if (section.followups) {
      lines.push('### followups');
      for (const followup of section.followups) {
        lines.push(`- ${followup}`);
      }
      lines.push('');
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
  const result: LearningDocument = structuredClone(doc);
  applyTool(result, tool, params);
  return result;
}
