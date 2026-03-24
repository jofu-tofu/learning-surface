import React, { useMemo, useCallback } from 'react';
import type { Section, VersionMeta } from '../../shared/types.js';
import { getAllSecondPaneIds, type SecondPaneEntry } from './panes/registry.js';
import { SurfaceActionsProvider } from './panes/SurfaceActionsContext.js';
import { PaneLayout } from './PaneLayout.js';
import { VersionTimeline } from './VersionTimeline.js';
import { PromptPreview } from './PromptPreview.js';
import { ErrorBanner } from './ErrorBanner.js';
import { ActivityStatus } from './ActivityStatus.js';
import { ChatBar } from './ChatBar.js';
import type { ProviderSelectorProps } from './ProviderSelector.js';

interface ContentAreaProps {
  activeSection: Section | undefined;
  activePhase: string;
  secondPane: SecondPaneEntry;
  currentVersionMeta: VersionMeta | undefined;
  providerError: string | null;
  clearProviderError: () => void;
  chatBarDisabled: boolean;
  providerSelection: ProviderSelectorProps;
  path: VersionMeta[];
  versions: VersionMeta[];
  currentVersion: number;
  forwardPath: VersionMeta[];
  onVersionSelect: (version: number) => void;
  submitPrompt: (text: string) => void;
  submitPrediction: (sectionId: string, responses: Record<string, string>) => void;
}

export function ContentArea({
  activeSection,
  activePhase,
  secondPane,
  currentVersionMeta,
  providerError,
  clearProviderError,
  chatBarDisabled,
  providerSelection,
  path,
  versions,
  currentVersion,
  forwardPath,
  onVersionSelect,
  submitPrompt,
  submitPrediction,
}: ContentAreaProps): React.ReactElement {
  const paneScrollRefs = useMemo(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {};
    refs['canvas'] = React.createRef<HTMLDivElement>();
    for (const id of getAllSecondPaneIds()) {
      refs[id] = React.createRef<HTMLDivElement>();
    }
    return refs;
  }, []);

  const handlePromptSubmit = useCallback((text: string) => {
    for (const ref of Object.values(paneScrollRefs)) {
      ref.current?.scrollTo({ top: 0 });
    }
    submitPrompt(text);
  }, [submitPrompt, paneScrollRefs]);

  return (
    <SurfaceActionsProvider value={{ submitPrompt: handlePromptSubmit, submitResponse: submitPrediction }}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Prompt preview */}
        <PromptPreview prompt={currentVersionMeta?.prompt ?? null} />

        {/* Panes — resizable split */}
        <PaneLayout
          activeSection={activeSection}
          activePhase={activePhase}
          secondPane={secondPane}
          paneScrollRefs={paneScrollRefs}
        />

        {/* Breadcrumb path */}
        <VersionTimeline
          path={path}
          versions={versions}
          currentVersion={currentVersion}
          forwardPath={forwardPath}
          onVersionSelect={onVersionSelect}
        />

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
            studyModeDisabled={chatBarDisabled}
            providerSelection={providerSelection}
          />
        </div>
      </div>
    </SurfaceActionsProvider>
  );
}
