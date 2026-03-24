import React, { useState, useEffect } from 'react';
import { getSecondPane } from './components/panes/registry.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatList } from './components/ChatList.js';
import { SidebarPanel } from './components/SidebarPanel.js';
import { AppHeader } from './components/AppHeader.js';
import { ContentArea } from './components/ContentArea.js';
import { Icon } from './components/Icon.js';
import { useSurface } from './hooks/useSurface.js';
import { ProcessingProvider } from './hooks/ProcessingContext.js';
import { ChangeDetectionProvider } from './hooks/ChangeDetectionContext.js';
import { getActiveSection } from '../shared/types.js';
import { applyTheme, getStoredTheme, type ThemeId } from './utils/themes.js';
import { focusRing } from './utils/styles.js';

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
    isDraftChat,
    submitPrompt,
    selectVersion,
    selectSection,
    newChat,
    switchChat,
    deleteChat,
    deleteChats,
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
    studyMode,
    studyModeLocked,
    setStudyMode,
    submitPrediction,
  } = useSurface();

  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getStoredTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSelectMode, setChatSelectMode] = useState(false);

  const activeSection = doc ? getActiveSection(doc) : undefined;
  const activePhase = activeSection?.phase ?? 'explain';
  const secondPane = getSecondPane(activePhase) ?? getSecondPane('explain')!;
  const sectionList = doc?.sections.map((section) => ({ id: section.id, title: section.title })) ?? [];
  const currentVersionMeta = versions.find((v) => v.version === currentVersion);
  const chatBarDisabled = studyModeLocked;

  useEffect(() => { applyTheme(currentTheme); }, [currentTheme]);

  return (
    <ProcessingProvider isProcessing={isProcessing} activity={activity}>
    <ChangeDetectionProvider
      flashPanes={changedPanes}
      versionChangedPanes={versionChangedPanes}
      changedSectionIds={changedSectionIds}
      flashSectionIds={flashSectionIds}
    >
      <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
        {/* Header */}
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          studyMode={studyMode}
          studyModeLocked={studyModeLocked}
          onStudyModeToggle={() => setStudyMode(!studyMode)}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          connected={connected}
        />

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — split into Chats (top) and Sections (bottom) */}
          <aside
            data-testid="pane-sidebar"
            className={`sidebar-collapsible shrink-0 bg-surface-800/40 border-r border-surface-700/50 flex flex-col ${sidebarCollapsed ? 'collapsed' : ''}`}
            style={sidebarCollapsed ? undefined : { width: '15rem' }}
          >
            {/* Chats panel */}
            <SidebarPanel
              title="Chats"
              headerAction={chats.length >= 2 && !chatSelectMode ? (
                <button
                  data-testid="manage-chats-btn"
                  onClick={() => setChatSelectMode(true)}
                  className={`p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700/40 transition-colors cursor-pointer ${focusRing}`}
                  title="Select and delete multiple chats"
                >
                  <Icon name="trash" size={13} />
                </button>
              ) : undefined}
            >
              <ChatList
                chats={chats}
                activeChatId={activeChatId}
                isDraftChat={isDraftChat}
                selectMode={chatSelectMode}
                onExitSelectMode={() => setChatSelectMode(false)}
                onChatSelect={switchChat}
                onNewChat={newChat}
                onDeleteChat={deleteChat}
                onDeleteChats={deleteChats}
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
          <ContentArea
            activeSection={activeSection}
            activePhase={activePhase}
            secondPane={secondPane}
            currentVersionMeta={currentVersionMeta}
            providerError={providerError}
            clearProviderError={clearProviderError}
            chatBarDisabled={chatBarDisabled}
            providerSelection={{
              providers,
              selectedProvider,
              selectedModel,
              selectedReasoningEffort,
              onProviderChange: setSelectedProvider,
              onModelChange: setSelectedModel,
              onReasoningEffortChange: setSelectedReasoningEffort,
            }}
            path={path}
            versions={versions}
            currentVersion={currentVersion}
            forwardPath={forwardPath}
            onVersionSelect={selectVersion}
            submitPrompt={submitPrompt}
            submitPrediction={submitPrediction}
          />
        </div>
      </div>
    </ChangeDetectionProvider>
    </ProcessingProvider>
  );
}
