import React, { useState } from 'react';
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
import { Icon } from './components/Icon.js';
import { useSurface } from './hooks/useSurface.js';

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

  const [branchPopover, setBranchPopover] = useState<number | null>(null);

  const activeSection = doc?.sections.find((s) => s.id === doc.activeSection);
  const sectionList = doc?.sections.map((s) => ({ title: s.title })) ?? [];
  const currentMeta = versions.find((v) => v.version === currentVersion);

  return (
    <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-surface-800/90 border-b border-surface-700/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-sm shadow-accent-500/20">
            <Icon name="book" size={15} strokeWidth={2.5} className="text-white" />
          </div>
          <h1 className="text-sm font-semibold text-surface-50 tracking-tight">Learning Surface</h1>
        </div>
        <div className="flex items-center gap-2">
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
          <PromptPreview
            prompt={currentMeta?.prompt ?? null}
          />

          {/* Panes */}
          <div className="flex-1 flex min-h-0">
            {/* Canvas pane */}
            <div data-testid="pane-canvas" className={`flex-1 flex flex-col min-w-0 border-r border-surface-700/40 ${changedPanes.has('canvas') ? 'pane-updated' : ''}`}>
              <PaneHeader title="Canvas" isProcessing={isProcessing} />
              <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
                <Canvas content={activeSection?.canvas ?? null} />
              </div>
            </div>

            {/* Explanation pane */}
            <div data-testid="pane-explanation" className={`flex-1 flex flex-col min-w-0 ${changedPanes.has('explanation') ? 'pane-updated' : ''}`}>
              <PaneHeader title="Explanation" isProcessing={isProcessing} />
              <div className="flex-1 overflow-auto p-6">
                <Explanation
                  explanation={activeSection?.explanation ?? null}
                  checks={activeSection?.checks ?? []}
                  followups={activeSection?.followups ?? []}
                  onFollowupClick={submitPrompt}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          </div>

          {/* Breadcrumb path */}
          <div data-testid="pane-timeline" className="shrink-0 border-t border-surface-700/40 bg-surface-800/20 relative">
            <Breadcrumb
              path={path}
              versions={versions}
              currentVersion={currentVersion}
              forwardPath={forwardPath}
              onVersionSelect={selectVersion}
              onBranchClick={(v) => setBranchPopover(branchPopover === v ? null : v)}
            />
            {branchPopover !== null && (
              <BranchPopover
                parentVersion={branchPopover}
                versions={versions}
                currentVersion={currentVersion}
                onSelect={selectVersion}
                onClose={() => setBranchPopover(null)}
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
          <ActivityStatus activity={activity} isProcessing={isProcessing} />

          {/* Chat bar */}
          <div data-testid="pane-chatbar" className="shrink-0 border-t border-surface-700/40">
            <ChatBar
              onSubmit={submitPrompt}
              isProcessing={isProcessing}
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
  );
}
