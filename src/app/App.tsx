import React from 'react';

export function App(): React.ReactElement {
  return (
    <div style={{ display: 'grid' }}>
      <div data-testid="pane-sidebar" />
      <div data-testid="pane-canvas" />
      <div data-testid="pane-explanation" />
      <div data-testid="pane-timeline" />
      <div data-testid="pane-chatbar" />
    </div>
  );
}
