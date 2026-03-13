import type React from 'react';
import { MermaidRenderer } from './MermaidRenderer.js';
import { KatexRenderer } from './KatexRenderer.js';
import { CodeRenderer } from './CodeRenderer.js';
import { FlowchartRenderer } from './FlowchartRenderer.js';
import { SequenceRenderer } from './SequenceRenderer.js';

/** Common props accepted by all canvas renderers. */
export interface RendererProps {
  content: string;
  language?: string;
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
registerRenderer('flowchart', FlowchartRenderer);
registerRenderer('sequence', SequenceRenderer);
