import React from 'react';
import { Canvas } from './components/Canvas.js';
import { Explanation } from './components/Explanation.js';
import { Sidebar } from './components/Sidebar.js';
import { Timeline } from './components/Timeline.js';
import { ChatBar } from './components/ChatBar.js';
import { useSurface } from './hooks/useSurface.js';

export function App(): React.ReactElement {
  const {
    document: doc,
    versions,
    currentVersion,
    submitPrompt,
    selectVersion,
    selectSection,
  } = useSurface();

  const activeSection = doc?.sections.find((s) => s.id === doc.activeSection);
  const sectionList = doc?.sections.map((s) => ({ title: s.title, status: s.status })) ?? [];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr 1fr',
        gridTemplateRows: '1fr auto auto',
        height: '100vh',
        gap: '1px',
        background: '#e5e7eb',
      }}
    >
      <div data-testid="pane-sidebar" style={{ gridRow: '1 / -1', background: '#f9fafb', padding: '16px', overflow: 'auto' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Sections</h2>
        <Sidebar
          sections={sectionList}
          activeSection={doc?.activeSection ?? ''}
          onSectionClick={selectSection}
        />
        {sectionList.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>No sections yet. Send a prompt to begin.</p>
        )}
      </div>

      <div data-testid="pane-canvas" style={{ background: '#fff', padding: '16px', overflow: 'auto' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Canvas</h2>
        <Canvas content={activeSection?.canvas ?? null} />
      </div>

      <div data-testid="pane-explanation" style={{ background: '#fff', padding: '16px', overflow: 'auto' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Explanation</h2>
        <Explanation
          explanation={activeSection?.explanation ?? null}
          checks={activeSection?.checks ?? []}
          followups={activeSection?.followups ?? []}
          onFollowupClick={submitPrompt}
        />
      </div>

      <div data-testid="pane-timeline" style={{ gridColumn: '2 / -1', background: '#f9fafb', padding: '12px 16px' }}>
        <Timeline
          versions={versions}
          currentVersion={currentVersion}
          onVersionSelect={selectVersion}
        />
        {versions.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>No versions yet</p>
        )}
      </div>

      <div data-testid="pane-chatbar" style={{ gridColumn: '2 / -1', background: '#fff', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
        <ChatBar onSubmit={submitPrompt} />
      </div>
    </div>
  );
}
