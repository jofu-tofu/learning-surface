import React from 'react';
import { PaneHeader } from './PaneHeader.js';
import { usePaneFlash } from '../hooks/SurfaceStatusContext.js';

interface PaneProps {
  id: string;
  title: string;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}

export function Pane({ id, title, className, scrollRef, children, style, actions }: PaneProps): React.ReactElement {
  const flash = usePaneFlash(id);
  return (
    <div data-testid={`pane-${id}`} style={style} className={`flex flex-col min-w-0 ${flash ? 'pane-updated' : ''} ${className ?? ''}`}>
      <PaneHeader paneId={id} title={title} actions={actions} />
      <div ref={scrollRef} className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
