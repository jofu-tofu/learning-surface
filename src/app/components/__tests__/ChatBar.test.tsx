import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatBar } from '../ChatBar.js';

describe('ChatBar', () => {
  it('renders text input and send button', () => {
    render(<ChatBar />);
    expect(screen.getByRole('textbox')).toBeDefined();
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('calls onSubmit with input text when send is clicked', () => {
    const handler = vi.fn();
    render(<ChatBar onSubmit={handler} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Explain TCP' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(handler).toHaveBeenCalledWith('Explain TCP');
  });

  it('clears input after submit', () => {
    const handler = vi.fn();
    render(<ChatBar onSubmit={handler} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Explain TCP' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(input.value).toBe('');
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatBar />);
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toHaveProperty('disabled', true);
  });

  it('fillPrompt prop populates the input for follow-up auto-fill', () => {
    render(<ChatBar fillPrompt="What is UDP?" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('What is UDP?');
  });
});
