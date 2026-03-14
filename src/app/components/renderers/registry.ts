import type React from 'react';
import { MermaidRenderer } from './MermaidRenderer.js';
import { KatexRenderer } from './KatexRenderer.js';
import { CodeRenderer } from './CodeRenderer.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { TimelineRenderer } from './TimelineRenderer.js';
import { ProofRenderer } from './ProofRenderer.js';

/** Common props accepted by all canvas renderers. */
export interface RendererProps {
  content: string;
  language?: string;
  /** Available container dimensions (CSS px) from ResizeObserver. */
  containerWidth?: number;
  containerHeight?: number;
}

type RendererComponent = React.ComponentType<RendererProps>;

const registry = new Map<string, RendererComponent>();

export function registerRenderer(type: string, component: RendererComponent): void {
  registry.set(type, component);
}

export function getRenderer(type: string): RendererComponent | undefined {
  return registry.get(type);
}

// Built-in renderers
registerRenderer('mermaid', MermaidRenderer);
registerRenderer('katex', KatexRenderer);
registerRenderer('code', CodeRenderer);
registerRenderer('diagram', DiagramRenderer);
registerRenderer('timeline', TimelineRenderer);
registerRenderer('proof', ProofRenderer);
