import React, { useState } from 'react';
import { Canvas } from './components/Canvas.js';
import { Explanation } from './components/Explanation.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatList } from './components/ChatList.js';
import { Breadcrumb } from './components/Breadcrumb.js';
import { BranchPopover } from './components/BranchPopover.js';
import { ChatBar } from './components/ChatBar.js';
import { PromptPreview } from './components/PromptPreview.js';
import { PaneHeader } from './components/PaneHeader.js';
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
    providers,
    selectedProvider,
    selectedModel,
    setSelectedProvider,
    setSelectedModel,
  } = useSurface();

  const [branchPopover, setBranchPopover] = useState<number | null>(null);

  const activeSection = doc?.sections.find((s) => s.id === doc.activeSection);
  const sectionList = doc?.sections.map((s) => ({ title: s.title, status: s.status })) ?? [];
  const currentMeta = versions.find((v) => v.version === currentVersion);

  return (
    <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 bg-surface-800 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-surface-50 tracking-tight">Learning Surface</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs text-surface-400">{connected ? 'Connected' : 'Reconnecting...'}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — split into Chats (top) and Sections (bottom) */}
        <aside data-testid="pane-sidebar" className="w-56 shrink-0 bg-surface-800/50 border-r border-surface-700 flex flex-col">
          {/* Chats panel */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-surface-700/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Chats</h2>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <ChatList
                chats={chats}
                activeChatId={activeChatId}
                onChatSelect={switchChat}
                onNewChat={newChat}
                onDeleteChat={deleteChat}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-surface-700/50" />

          {/* Sections panel */}
          <div className={`flex flex-col min-h-0 flex-1 ${changedPanes.has('sections') ? 'pane-updated' : ''}`}>
            <div className="px-4 py-3 border-b border-surface-700/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400">Sections</h2>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <Sidebar
                sections={sectionList}
                activeSection={doc?.activeSection ?? ''}
                onSectionClick={selectSection}
              />
              {sectionList.length === 0 && (
                <p className="px-4 text-sm text-surface-500 italic">No sections yet. Send a prompt to begin.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Center content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Panes */}
          <div className="flex-1 flex min-h-0">
            {/* Canvas pane */}
            <div data-testid="pane-canvas" className={`flex-1 flex flex-col min-w-0 border-r border-surface-700/50 ${changedPanes.has('canvas') ? 'pane-updated' : ''}`}>
              <PaneHeader title="Canvas" />
              <div className="flex-1 overflow-auto p-5 flex items-start justify-center">
                <Canvas content={activeSection?.canvas ?? null} />
              </div>
            </div>

            {/* Explanation pane */}
            <div data-testid="pane-explanation" className={`flex-1 flex flex-col min-w-0 ${changedPanes.has('explanation') ? 'pane-updated' : ''}`}>
              <PaneHeader title="Explanation" />
              <div className="flex-1 overflow-auto p-5">
                <Explanation
                  explanation={activeSection?.explanation ?? null}
                  checks={activeSection?.checks ?? []}
                  followups={activeSection?.followups ?? []}
                  onFollowupClick={submitPrompt}
                />
              </div>
            </div>
          </div>

          {/* Prompt preview */}
          <PromptPreview
            prompt={currentMeta?.prompt ?? null}
            version={currentVersion}
          />

          {/* Breadcrumb path */}
          <div data-testid="pane-timeline" className="shrink-0 border-t border-surface-700/50 bg-surface-800/30 relative">
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

          {/* Chat bar */}
          <div data-testid="pane-chatbar" className="shrink-0 border-t border-surface-700">
            <ChatBar
              onSubmit={submitPrompt}
              isProcessing={isProcessing}
              providers={providers}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={setSelectedProvider}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
