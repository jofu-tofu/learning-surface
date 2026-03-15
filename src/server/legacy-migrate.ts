import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CURRENT_SURFACE } from './document-service.js';
import { CURRENT_MD } from './utils/ws-helpers.js';
import { serializeSurface } from './surface-file.js';
import type { LearningDocument, Section, CanvasContent } from '../shared/types.js';
import { slugify } from '../shared/slugify.js';
import matter from 'gray-matter';

/**
 * One-time migration: parse old .md document and write .surface JSON.
 * Called on chat open if current.surface doesn't exist but current.md does.
 *
 * Uses a simplified inline parser (no dependency on deleted blocks/).
 */
export function migrateMdToSurface(chatDir: string): boolean {
  const surfacePath = join(chatDir, CURRENT_SURFACE);
  const mdPath = join(chatDir, CURRENT_MD);

  if (existsSync(surfacePath)) return false; // already migrated
  if (!existsSync(mdPath)) return false; // nothing to migrate

  try {
    const raw = readFileSync(mdPath, 'utf-8');
    const doc = parseLegacyMarkdown(raw);
    writeFileSync(surfacePath, serializeSurface(doc), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/** Minimal legacy markdown parser — just enough to extract the data model. */
function parseLegacyMarkdown(raw: string): LearningDocument {
  const { data: frontmatter, content } = matter(raw);

  // Split into sections by ## headings
  const sectionRegex = /^## (.+)$/gm;
  const headingMatches: { title: string; start: number }[] = [];
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = sectionRegex.exec(content)) !== null) {
    headingMatches.push({ title: headingMatch[1].trim(), start: headingMatch.index + headingMatch[0].length });
  }

  const sections: Section[] = [];
  for (let i = 0; i < headingMatches.length; i++) {
    const start = headingMatches[i].start;
    const end = i + 1 < headingMatches.length
      ? content.lastIndexOf('## ', headingMatches[i + 1].start)
      : content.length;
    const body = content.slice(start, end);
    sections.push(parseLegacySection(headingMatches[i].title, body));
  }

  return {
    version: frontmatter.version ?? 1,
    activeSection: frontmatter.active_section ?? (sections[0]?.id ?? 'untitled'),
    ...(frontmatter.summary ? { summary: frontmatter.summary } : {}),
    sections,
  };
}

function parseLegacySection(title: string, body: string): Section {
  const id = slugify(title);
  const section: Section = { id, title, canvases: [], deeperPatterns: [] };

  // Split by ### headings
  const blockRegex = /^### (.+)$/gm;
  const blockMatches: { header: string; start: number }[] = [];
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(body)) !== null) {
    blockMatches.push({ header: blockMatch[1].trim(), start: blockMatch.index + blockMatch[0].length });
  }

  for (let i = 0; i < blockMatches.length; i++) {
    const start = blockMatches[i].start;
    const end = i + 1 < blockMatches.length
      ? body.lastIndexOf('### ', blockMatches[i + 1].start)
      : body.length;
    const blockContent = body.slice(start, end).trim();
    const header = blockMatches[i].header;

    if (header.startsWith('canvas:')) {
      const typePart = header.slice('canvas:'.length).trim();
      const [canvasType, language] = typePart.split(/\s+/);
      const canvas: CanvasContent = {
        id: 'canvas-1',
        type: canvasType as CanvasContent['type'],
        content: blockContent,
        ...(language ? { language } : {}),
      };
      section.canvases.push(canvas);
    } else if (header === 'explanation') {
      section.explanation = blockContent;
    } else if (header.startsWith('check:')) {
      if (!section.checks) section.checks = [];
      const checkId = header.slice('check:'.length).trim();
      const question = blockContent.split('\n')[0].trim();
      section.checks.push({
        id: checkId,
        question,
        status: 'unanswered',
        answer: '',
      });
    } else if (header === 'followups') {
      section.followups = blockContent
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.slice(2).trim());
    }
  }

  return section;
}
