import type React from 'react';
import type { Block, BlockType } from '../../../shared/document.js';

export interface BlockRendererProps {
  block: Block;
  onResponseChange?: (blockId: string, value: string) => void;
  onSuggestionClick?: (text: string) => void;
}

type BlockRendererComponent = React.ComponentType<BlockRendererProps>;

const registry = new Map<string, BlockRendererComponent>();

export function registerBlockRenderer(type: BlockType, component: BlockRendererComponent): void {
  registry.set(type, component);
}

export function getBlockRenderer(type: string): BlockRendererComponent | undefined {
  return registry.get(type);
}
