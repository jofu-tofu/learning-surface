import React, { useState, useEffect } from 'react';
import { ChatList } from './components/ChatList.js';
import { SidebarPanel } from './components/SidebarPanel.js';
import { AppHeader } from './components/AppHeader.js';
import { ContentArea } from './components/ContentArea.js';
import { Icon } from './components/Icon.js';
import { useSurface } from './hooks/useSurface.js';
import { ProcessingProvider } from './hooks/ProcessingContext.js';
import { ChangeDetectionProvider } from './hooks/ChangeDetectionContext.js';
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
    submitResponses,
    selectVersion,
    newChat,
    switchChat,
    deleteChat,
    deleteChats,
    renameChat,
    isProcessing,
    changedPanes,
    versionChangedPanes,
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

  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getStoredTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSelectMode, setChatSelectMode] = useState(false);

  const currentVersionMeta = versions.find((v) => v.version === currentVersion);

  useEffect(() => { applyTheme(currentTheme); }, [currentTheme]);

  return (
    <ProcessingProvider isProcessing={isProcessing} activity={activity}>
    <ChangeDetectionProvider
      flashPanes={changedPanes}
      versionChangedPanes={versionChangedPanes}
    >
      <div className="h-dvh flex flex-col bg-surface-900 text-surface-100 overflow-hidden">
        {/* Header */}
        <AppHeader
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          connected={connected}
        />

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar — Chats only */}
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
          </aside>

          {/* Center content area */}
          <ContentArea
            document={doc}
            currentVersionMeta={currentVersionMeta}
            providerError={providerError}
            clearProviderError={clearProviderError}
            chatBarDisabled={false}
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
            submitResponses={submitResponses}
          />
        </div>
      </div>
    </ChangeDetectionProvider>
    </ProcessingProvider>
  );
}
