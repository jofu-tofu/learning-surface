import React, { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas.js';
import { Explanation } from './components/Explanation.js';
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

function Pane({ id, title, className, children }: {
  id: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  const flash = usePaneFlash(id);
  return (
    <div data-testid={`pane-${id}`} className={`flex-1 flex flex-col min-w-0 ${flash ? 'pane-updated' : ''} ${className ?? ''}`}>
      <PaneHeader paneId={id} title={title} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}

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
    isProcessing,
    changedPanes,
    versionChangedPanes,
    changedSectionIds,
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

  useEffect(() => { applyTheme(currentTheme); }, [currentTheme]);

  const activeSection = doc ? getActiveSection(doc) : undefined;
  const sectionList = doc?.sections.map((section) => ({ title: section.title })) ?? [];
  const currentVersionMeta = versions.find((v) => v.version === currentVersion);

  return (
    <SurfaceStatusProvider
      isProcessing={isProcessing}
      flashPanes={changedPanes}
      versionChangedPanes={versionChangedPanes}
      changedSectionIds={changedSectionIds}
      activity={activity}
    >
      <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-surface-800/90 border-b border-surface-700/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
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
          <aside data-testid="pane-sidebar" className="w-60 shrink-0 bg-surface-800/40 border-r border-surface-700/50 flex flex-col">
            {/* Chats panel */}
            <SidebarPanel title="Chats">
              <ChatList
                chats={chats}
                activeChatId={activeChatId}
                onChatSelect={switchChat}
                onNewChat={newChat}
                onDeleteChat={deleteChat}
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

            {/* Panes */}
            <div className="flex-1 flex min-h-0">
              <Pane id="canvas" title="Canvas" className="border-r border-surface-700/40">
                <div className="flex items-center justify-center w-full h-full">
                  <Canvas content={activeSection?.canvas ?? null} />
                </div>
              </Pane>

              <Pane id="explanation" title="Explanation">
                <Explanation
                  explanation={activeSection?.explanation ?? null}
                  checks={activeSection?.checks ?? []}
                  followups={activeSection?.followups ?? []}
                  onFollowupClick={submitPrompt}
                />
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
                onSubmit={submitPrompt}
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
    </SurfaceStatusProvider>
  );
}
