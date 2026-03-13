import { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

const markdownParser = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function useMarkdown(source: string | null): string {
  return useMemo(() => {
    if (!source) return '';
    return markdownParser.render(source);
  }, [source]);
}
