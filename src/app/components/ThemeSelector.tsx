import React, { useState, useRef, useCallback } from 'react';
import { THEMES, type ThemeId } from '../../shared/themes.js';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { focusRing, popoverPanel, menuItemActive, menuItemInactive } from '../utils/styles.js';
import { Icon } from './Icon.js';

interface ThemeSelectorProps {
  currentTheme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close);

  const activeLabel = THEMES.find(theme => theme.id === currentTheme)?.label ?? 'Theme';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Theme"
        aria-expanded={open}
        className={`flex items-center gap-1.5 text-xs h-8 px-2.5 rounded-full cursor-pointer transition-colors text-surface-400 hover:text-surface-200 hover:bg-surface-700/40 ${focusRing}`}
      >
        <Icon name="grid" size={12} />
        <span>{activeLabel}</span>
        <Icon name="chevronDown" size={8} strokeWidth={3} className="text-surface-500 shrink-0" />
      </button>

      {open && (
        <div className={`${popoverPanel} min-w-36 py-1 z-50`}>
          {THEMES.map(theme => (
            <button
              key={theme.id}
              type="button"
              onClick={() => { onThemeChange(theme.id); close(); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${focusRing} ${
                theme.id === currentTheme ? menuItemActive : menuItemInactive
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
