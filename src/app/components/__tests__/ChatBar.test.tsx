import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBar } from '../ChatBar.js';

describe('ChatBar', () => {
  it('send button is disabled when input is empty', () => {
    render(<ChatBar />);
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toHaveProperty('disabled', true);
  });

});
