import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CanvasGrid } from './components/CanvasGrid.js';
import { Explanation } from './components/Explanation.js';
import type { Section } from '../shared/types.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatList } from './components/ChatList.js';
import { SidebarPanel } from './components/SidebarPanel.js';
import { Breadcrumb } from './components/Breadcrumb.js';
import { BranchPopover } from './components/BranchPopover.js';
import { ChatBar } from './components/ChatBar.js';
import { PromptPreview } from './components/PromptPreview.js';
import { PaneHeader } from './components/PaneHeader.js';
import { ErrorBanner } from './components/ErrorBanner.js';
import { ActivityStatus } from './components/ActivityStatus.js';
import { ThemeSelector } from './components/ThemeSelector.js';
import { Icon } from './components/Icon.js';
import { useSurface } from './hooks/useSurface.js';
import { SurfaceStatusProvider, usePaneFlash } from './hooks/SurfaceStatusContext.js';
import { getActiveSection } from '../shared/types.js';
import { applyTheme, getStoredTheme, type ThemeId } from '../shared/themes.js';
import { useResizablePane } from './hooks/useResizablePane.js';

function Pane({ id, title, className, scrollRef, children, style, actions }: {
  id: string;
  title: string;
  className?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}): React.ReactElement {
  const flash = usePaneFlash(id);
  return (
    <div data-testid={`pane-${id}`} style={style} className={`flex flex-col min-w-0 ${flash ? 'pane-updated' : ''} ${className ?? ''}`}>
      <PaneHeader paneId={id} title={title} actions={actions} />
      <div ref={scrollRef} className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}

/** Small icon button used in pane headers and the sidebar toggle. */
function IconButton({ icon, title, onClick, className = '' }: {
  icon: string;
  title: string;
  onClick: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded-md text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors ${className}`}
    >
      <Icon name={icon} size={14} strokeWidth={2} />
    </button>
  );
}

interface PaneConfig {
  id: string;
  title: string;
  render: (props: { section: Section | undefined; onFollowupClick: (q: string) => void }) => React.ReactElement;
  centerContent?: boolean;
}

const PANE_CONFIGS: PaneConfig[] = [
  {
    id: 'canvas',
    title: 'Canvas',
    centerContent: true,
    render: ({ section }) => <CanvasGrid canvases={section?.canvases ?? []} />,
  },
  {
    id: 'explanation',
    title: 'Explanation',
    render: ({ section, onFollowupClick }) =>
      <Explanation section={section} onFollowupClick={onFollowupClick} />,
  },
];

export function App(): React.ReactElement {
  const {
    document: doc,
    versions,
    currentVersion,
    path,
    forwardPath,
    connected,
    chats,
    activeChatId,
    submitPrompt,
    selectVersion,
    selectSection,
    newChat,
    switchChat,
    deleteChat,
    renameChat,
    isProcessing,
    changedPanes,
    versionChangedPanes,
    changedSectionIds,
    flashSectionIds,
    activity,
    providers,
    selectedProvider,
    selectedModel,
    selectedReasoningEffort,
    setSelectedProvider,
    setSelectedModel,
    setSelectedReasoningEffort,
    providerError,
    clearProviderError,
  } = useSurface();

  const [branchPopoverParentVersion, setBranchPopoverParentVersion] = useState<number | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getStoredTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const { splitPercent, isDragging, containerRef, startDrag } = useResizablePane({ initialSplit: 50, minPercent: 20 });

  const paneScrollRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {};
    for (const config of PANE_CONFIGS) {
      refs[config.id] = React.createRef<HTMLDivElement>();
    }
    return refs;
  }, []);

  useEffect(() => { applyTheme(currentTheme); }, [currentTheme]);

  // Escape key exits canvas fullscreen
  useEffect(() => {
    if (!canvasFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCanvasFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [canvasFullscreen]);

  const handlePromptSubmit = useCallback((text: string) => {
    for (const ref of Object.values(paneScrollRefs)) {
      ref.current?.scrollTo({ top: 0 });
    }
    submitPrompt(text);
  }, [submitPrompt, paneScrollRefs]);

  const activeSection = doc ? getActiveSection(doc) : undefined;
  const sectionList = doc?.sections.map((section) => ({ id: section.id, title: section.title })) ?? [];
  const currentVersionMeta = versions.find((v) => v.version === currentVersion);

  const canvasConfig = PANE_CONFIGS[0];
  const explanationConfig = PANE_CONFIGS[1];

  return (
    <SurfaceStatusProvider
      isProcessing={isProcessing}
      flashPanes={changedPanes}
      versionChangedPanes={versionChangedPanes}
      changedSectionIds={changedSectionIds}
      flashSectionIds={flashSectionIds}
      activity={activity}
    >
      <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-surface-800/90 border-b border-surface-700/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button */}
            <IconButton
              icon={sidebarCollapsed ? 'panelLeft' : 'panelLeftClose'}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-sm shadow-accent-500/20">
              <Icon name="book" size={15} strokeWidth={2.5} className="text-inverse-text" />
            </div>
            <h1 className="text-sm font-semibold text-surface-50 tracking-tight">Learning Surface</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSelector currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-[11px] text-surface-500">{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — split into Chats (top) and Sections (bottom) */}
          <aside
            data-testid="pane-sidebar"
            className={`sidebar-collapsible shrink-0 bg-surface-800/40 border-r border-surface-700/50 flex flex-col ${sidebarCollapsed ? 'collapsed' : ''}`}
            style={sidebarCollapsed ? undefined : { width: '15rem' }}
          >
            {/* Chats panel */}
            <SidebarPanel title="Chats">
              <ChatList
                chats={chats}
                activeChatId={activeChatId}
                onChatSelect={switchChat}
                onNewChat={newChat}
                onDeleteChat={deleteChat}
                onRenameChat={renameChat}
              />
            </SidebarPanel>

            {/* Divider */}
            <div className="border-t border-surface-700/30" />

            {/* Sections panel */}
            <SidebarPanel title="Sections" className={`flex-1 ${changedPanes.has('sections') ? 'pane-updated' : ''}`}>
              <Sidebar
                sections={sectionList}
                activeSection={doc?.activeSection ?? ''}
                onSectionClick={selectSection}
              />
              {sectionList.length === 0 && (
                <p className="px-4 text-sm text-surface-500 italic">No sections yet. Send a prompt to begin.</p>
              )}
            </SidebarPanel>
          </aside>

          {/* Center content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Prompt preview */}
            <PromptPreview prompt={currentVersionMeta?.prompt ?? null} />

            {/* Panes — resizable split */}
            <div ref={containerRef} className="flex-1 flex min-h-0">
              {/* Canvas pane */}
              <Pane
                id={canvasConfig.id}
                title={canvasConfig.title}
                style={{ width: `${splitPercent}%`, flexShrink: 0, flexGrow: 0 }}
                scrollRef={paneScrollRefs[canvasConfig.id]}
                actions={
                  <IconButton
                    icon="maximize"
                    title="Expand canvas to fullscreen"
                    onClick={() => setCanvasFullscreen(true)}
                  />
                }
              >
                <div className="flex items-center justify-center w-full h-full">
                  {canvasConfig.render({ section: activeSection, onFollowupClick: handlePromptSubmit })}
                </div>
              </Pane>

              {/* Resize handle */}
              <div
                className={`resize-handle ${isDragging ? 'dragging' : ''}`}
                onPointerDown={startDrag}
              >
                <Icon name="gripVertical" size={12} strokeWidth={0} className="resize-grip" />
              </div>

              {/* Explanation pane */}
              <Pane
                id={explanationConfig.id}
                title={explanationConfig.title}
                className="flex-1"
                scrollRef={paneScrollRefs[explanationConfig.id]}
              >
                {explanationConfig.render({ section: activeSection, onFollowupClick: handlePromptSubmit })}
              </Pane>
            </div>

            {/* Breadcrumb path */}
            <div data-testid="pane-timeline" className="shrink-0 border-t border-surface-700/40 bg-surface-800/20 relative">
              <Breadcrumb
                path={path}
                versions={versions}
                currentVersion={currentVersion}
                forwardPath={forwardPath}
                onVersionSelect={selectVersion}
                onBranchClick={(v) => setBranchPopoverParentVersion(branchPopoverParentVersion === v ? null : v)}
              />
              {branchPopoverParentVersion !== null && (
                <BranchPopover
                  parentVersion={branchPopoverParentVersion}
                  versions={versions}
                  currentVersion={currentVersion}
                  onSelect={selectVersion}
                  onClose={() => setBranchPopoverParentVersion(null)}
                />
              )}
            </div>

            {/* Provider error banner */}
            {providerError && (
              <div className="shrink-0 px-4 py-2 border-t border-surface-700/40">
                <ErrorBanner message={providerError} onDismiss={clearProviderError} />
              </div>
            )}

            {/* Activity status */}
            <ActivityStatus />

            {/* Chat bar */}
            <div data-testid="pane-chatbar" className="shrink-0 border-t border-surface-700/40">
              <ChatBar
                onSubmit={handlePromptSubmit}
                providerSelection={{
                  providers,
                  selectedProvider,
                  selectedModel,
                  selectedReasoningEffort,
                  onProviderChange: setSelectedProvider,
                  onModelChange: setSelectedModel,
                  onReasoningEffortChange: setSelectedReasoningEffort,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Canvas fullscreen overlay */}
      {canvasFullscreen && (
        <div className="canvas-fullscreen">
          <div className="canvas-fullscreen-header">
            <h2 className="text-sm font-semibold text-surface-50">Canvas</h2>
            <div className="flex items-center gap-2">
              <IconButton
                icon="minimize"
                title="Exit fullscreen (Esc)"
                onClick={() => setCanvasFullscreen(false)}
              />
              <button
                onClick={() => setCanvasFullscreen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-600/60 transition-colors"
              >
                <Icon name="close" size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="canvas-fullscreen-body">
            <CanvasGrid canvases={activeSection?.canvases ?? []} />
          </div>
        </div>
      )}
    </SurfaceStatusProvider>
  );
}
