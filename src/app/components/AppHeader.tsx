import React from 'react';
import { IconButton } from './IconButton.js';
import { ThemeSelector } from './ThemeSelector.js';
import { Icon } from './Icon.js';
import type { ThemeId } from '../utils/themes.js';

interface AppHeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  currentTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  connected: boolean;
}

export function AppHeader({
  sidebarCollapsed,
  onSidebarToggle,
  currentTheme,
  onThemeChange,
  connected,
}: AppHeaderProps): React.ReactElement {
  return (
    <header className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-surface-800/90 border-b border-surface-700/60 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <IconButton
          icon={sidebarCollapsed ? 'panelLeft' : 'panelLeftClose'}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onClick={onSidebarToggle}
        />
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-sm shadow-accent-500/20">
          <Icon name="book" size={15} strokeWidth={2.5} className="text-inverse-text" />
        </div>
        <h1 className="text-sm font-semibold text-surface-50 tracking-tight">Learning Surface</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-amber-500 animate-pulse'}`} />
        <span className="text-[11px] text-surface-500">{connected ? 'Connected' : 'Reconnecting...'}</span>
      </div>
    </header>
  );
}
