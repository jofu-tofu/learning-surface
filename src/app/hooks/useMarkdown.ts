import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export function useMarkdown(source: string | null): string {
  return useMemo(() => {
    if (!source) return '';
    return md.render(source);
  }, [source]);
}
