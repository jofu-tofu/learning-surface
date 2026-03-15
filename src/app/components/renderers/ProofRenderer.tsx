import React from 'react';
import type { RendererProps } from './registry.js';
import { ErrorBanner } from '../ErrorBanner.js';
import { useAsyncRender } from '../../hooks/useAsyncRender.js';
import { parseProofData, renderKatex } from './proof-layout.js';
import { LoadingSpinner } from '../LoadingSpinner.js';
import { useMountAnimation } from '../../hooks/useMountAnimation.js';

export function ProofRenderer({ content }: RendererProps): React.ReactElement {
  const mounted = useMountAnimation(content);

  const { html, error, loading } = useAsyncRender(
    async () => {
      const data = parseProofData(content);
      if (!data) throw new Error('Invalid proof data');

      const parts: string[] = [];

      // Title
      if (data.title) {
        parts.push(`<div class="proof-title" style="font-size:16px;font-weight:600;color:var(--color-surface-100);margin-bottom:12px;">${escapeHtml(data.title)}</div>`);
      }

      // Premises
      if (data.premises && data.premises.length > 0) {
        parts.push('<div class="proof-premises" style="margin-bottom:8px;">');
        for (const premise of data.premises) {
          const rendered = await renderKatex(premise);
          parts.push(`<div class="proof-premise" style="display:flex;align-items:baseline;gap:8px;padding:4px 0;"><span style="color:var(--color-surface-400);font-size:12px;flex-shrink:0;">premise</span><span>${rendered}</span></div>`);
        }
        parts.push('</div>');
        parts.push('<hr style="border:none;border-top:1px solid var(--color-surface-600);margin:8px 0 12px;" />');
      }

      // Steps
      parts.push('<div class="proof-steps">');
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        const rendered = await renderKatex(step.expression);
        const isGoal = step.isGoal ?? false;
        const goalStyle = isGoal
          ? 'background:var(--color-accent-400);background:color-mix(in oklch, var(--color-accent-400) 10%, transparent);border:1px solid color-mix(in oklch, var(--color-accent-400) 30%, transparent);border-radius:6px;padding:6px 10px;'
          : 'padding:4px 0;';

        parts.push(`<div class="proof-step" style="display:flex;align-items:baseline;gap:12px;${goalStyle}margin-bottom:4px;">`);
        parts.push(`<span style="color:var(--color-surface-500);font-size:11px;font-family:var(--font-sans);flex-shrink:0;min-width:20px;text-align:right;">(${i + 1})</span>`);
        parts.push(`<span style="flex:1;">${rendered}</span>`);
        parts.push(`<span style="color:var(--color-surface-400);font-size:12px;font-style:italic;font-family:var(--font-sans);flex-shrink:0;white-space:nowrap;">${escapeHtml(step.justification)}</span>`);
        parts.push('</div>');
      }
      parts.push('</div>');

      return parts.join('');
    },
    [content],
  );

  return (
    <div
      data-testid="canvas-proof"
      className="canvas-container overflow-y-auto"
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {loading && <LoadingSpinner label="Rendering proof..." />}
      {error && <ErrorBanner message={error} />}
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
