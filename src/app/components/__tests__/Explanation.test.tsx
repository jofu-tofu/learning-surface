import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Explanation } from '../Explanation.js';
import { buildCheck } from '../../../test/helpers.js';

describe('Explanation', () => {
  it('renders markdown explanation text', () => {
    render(
      <Explanation
        explanation="TCP is a **connection-oriented** protocol."
        checks={[]}
        followups={[]}
      />,
    );
    expect(screen.getByText(/connection-oriented/)).toBeDefined();
  });

  it('renders concept check cards with question text', () => {
    const checks = [buildCheck({ id: 'c1', question: 'What is TCP?' })];
    render(
      <Explanation explanation={null} checks={checks} followups={[]} />,
    );
    expect(screen.getByText('What is TCP?')).toBeDefined();
  });

  it('check card shows "Think" button when unanswered', () => {
    const checks = [buildCheck({ id: 'c1', status: 'unanswered' })];
    render(
      <Explanation explanation={null} checks={checks} followups={[]} />,
    );
    expect(screen.getByRole('button', { name: /think/i })).toBeDefined();
  });

  it('check card shows answer when revealed', () => {
    const checks = [
      buildCheck({
        id: 'c1',
        status: 'revealed',
        answer: 'Because reliability requires acknowledgment.',
        answerExplanation: 'Each step confirms the previous.',
      }),
    ];
    render(
      <Explanation explanation={null} checks={checks} followups={[]} />,
    );
    expect(screen.getByText(/Because reliability/)).toBeDefined();
  });

  it('renders follow-up chips as clickable buttons', () => {
    render(
      <Explanation
        explanation={null}
        checks={[]}
        followups={['What is UDP?', 'TCP vs UDP']}
      />,
    );
    expect(screen.getByRole('button', { name: 'What is UDP?' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'TCP vs UDP' })).toBeDefined();
  });

  it('calls onFollowupClick when chip is clicked', () => {
    const handler = vi.fn();
    render(
      <Explanation
        explanation={null}
        checks={[]}
        followups={['What is UDP?']}
        onFollowupClick={handler}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'What is UDP?' }));
    expect(handler).toHaveBeenCalledWith('What is UDP?');
  });
});
