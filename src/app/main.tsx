import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './index.css';

// --- Debug helpers (visible to Browser skill's `console` / `errors` commands) ---

window.addEventListener('error', (e) => {
  console.error('[LS:uncaught]', e.message, e.filename, e.lineno, e.colno, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[LS:unhandled-rejection]', e.reason);
});

// --- Error boundary — renders visible text so `a11y` / screenshots show failures ---

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LS:error-boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <h1 style={{ fontSize: 18 }}>React render error</h1>
          <p>{this.state.error.message}</p>
          <pre style={{ fontSize: 12, color: '#94a3b8' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Mount ---

const root = document.getElementById('root');
if (root) {
  console.info('[LS:mount] creating root');
  try {
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.info('[LS:mount] render called');
  } catch (e) {
    console.error('[LS:mount-crash]', e);
    root.textContent = `Mount failed: ${e}`;
  }
} else {
  console.error('[LS:mount] #root element not found');
}
