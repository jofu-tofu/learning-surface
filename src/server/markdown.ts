import matter from 'gray-matter';
import type {
  LearningDocument,
  Section,
  CanvasContent,
  Check,
} from '../shared/types.js';
import { slugify } from '../shared/slugify.js';

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

  // Extract status comment from the body (before any ### blocks)
  let status: 'active' | 'completed' = 'active';
  const statusMatch = body.match(/<!--\s*status:\s*(active|completed)\s*-->/);
  if (statusMatch) {
    status = statusMatch[1] as 'active' | 'completed';
  }

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
      // First non-empty line is the question
      let question = '';
      let checkStatus: Check['status'] = 'unanswered';
      const nonEmpty = checkLines.filter(l => l.trim() !== '');
      if (nonEmpty.length > 0) {
        question = nonEmpty[0].trim();
      }
      const checkStatusMatch = block.content.match(/<!--\s*status:\s*(unanswered|attempted|revealed)\s*-->/);
      if (checkStatusMatch) {
        checkStatus = checkStatusMatch[1] as Check['status'];
      }
      checks.push({ id: checkId, question, status: checkStatus });
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
    status,
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
    sections,
  };
}

export function serialize(doc: LearningDocument): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`version: ${doc.version}`);
  lines.push(`active_section: ${doc.activeSection}`);
  lines.push('---');
  lines.push('');

  for (const section of doc.sections) {
    lines.push(`## ${section.title}`);
    lines.push(`<!-- status: ${section.status} -->`);
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

  const findActive = (): Section | undefined =>
    result.sections.find(s => s.id === result.activeSection);

  switch (tool) {
    case 'new_section': {
      const title = params.title as string;
      const newSection: Section = {
        id: slugify(title),
        title,
        status: 'active',
      };
      result.sections.push(newSection);
      break;
    }

    case 'show_visual': {
      const active = findActive();
      if (active) {
        active.canvas = {
          type: params.type as CanvasContent['type'],
          content: params.content as string,
        };
      }
      break;
    }

    case 'explain': {
      const active = findActive();
      if (active) {
        active.explanation = params.content as string;
      }
      break;
    }

    case 'edit_visual': {
      const active = findActive();
      if (active?.canvas) {
        const find = params.find as string;
        const replace = params.replace as string;
        active.canvas.content = active.canvas.content.replace(find, replace);
      }
      break;
    }

    case 'extend': {
      const active = findActive();
      if (active) {
        active.explanation = (active.explanation ?? '') + (params.content as string);
      }
      break;
    }

    case 'challenge': {
      const active = findActive();
      if (active) {
        if (!active.checks) active.checks = [];
        const check: Check = {
          id: `c${active.checks.length + 1}`,
          question: params.question as string,
          status: 'unanswered',
        };
        if (params.hints) {
          check.hints = params.hints as string[];
        }
        active.checks.push(check);
      }
      break;
    }

    case 'suggest_followups': {
      const active = findActive();
      if (active) {
        active.followups = params.questions as string[];
      }
      break;
    }

    case 'complete_section': {
      const sectionId = params.section as string;
      const section = result.sections.find(s => s.id === sectionId);
      if (section) {
        section.status = 'completed';
      }
      break;
    }

    case 'set_active': {
      result.activeSection = params.section as string;
      break;
    }

    case 'build_visual': {
      const active = findActive();
      if (active?.canvas) {
        active.canvas.content = active.canvas.content + '\n' + (params.additions as string);
      }
      break;
    }

    case 'annotate': {
      const active = findActive();
      if (active?.canvas) {
        active.canvas.content = active.canvas.content + '\n' + `%% ${params.label}: ${params.element}`;
      }
      break;
    }

    case 'edit_explanation': {
      const active = findActive();
      if (active?.explanation !== undefined) {
        const find = params.find as string;
        const replace = params.replace as string;
        active.explanation = active.explanation.replace(find, replace);
      }
      break;
    }

    case 'reveal': {
      const active = findActive();
      if (active?.checks) {
        const check = active.checks.find(c => c.id === params.checkId);
        if (check) {
          check.status = 'revealed';
          check.answer = params.answer as string;
          check.answerExplanation = params.explanation as string;
        }
      }
      break;
    }

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }

  return result;
}
