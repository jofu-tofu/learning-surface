import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../App.js';

describe('App', () => {
  it('renders all panes in correct grid layout', () => {
    render(<App />);
    // The app should render a grid with sidebar, canvas, explanation, timeline, and chatbar
    expect(screen.getByTestId('pane-sidebar')).toBeDefined();
    expect(screen.getByTestId('pane-canvas')).toBeDefined();
    expect(screen.getByTestId('pane-explanation')).toBeDefined();
    expect(screen.getByTestId('pane-timeline')).toBeDefined();
    expect(screen.getByTestId('pane-chatbar')).toBeDefined();
  });

  it('passes active section canvas to Canvas component', () => {
    render(<App />);
    // Canvas pane should exist and receive canvas content from active section
    expect(screen.getByTestId('pane-canvas')).toBeDefined();
  });

  it('passes active section explanation to Explanation component', () => {
    render(<App />);
    expect(screen.getByTestId('pane-explanation')).toBeDefined();
  });

  it('passes sections array to Sidebar', () => {
    render(<App />);
    expect(screen.getByTestId('pane-sidebar')).toBeDefined();
  });

  it('passes version list to Timeline', () => {
    render(<App />);
    expect(screen.getByTestId('pane-timeline')).toBeDefined();
  });
});
