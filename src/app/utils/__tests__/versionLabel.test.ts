import { describe, it, expect } from 'vitest';
import { getVersionLabel } from '../versionLabel.js';
import { buildVersionMeta } from '../../../test/helpers.js';

describe('getVersionLabel', () => {
  it('returns summary when present', () => {
    const meta = buildVersionMeta({ summary: 'TCP Basics', prompt: 'teach TCP', version: 2 });
    expect(getVersionLabel(meta)).toBe('TCP Basics');
  });

  it('falls back to prompt when summary is null', () => {
    const meta = buildVersionMeta({ summary: null, prompt: 'teach TCP', version: 2 });
    expect(getVersionLabel(meta)).toBe('teach TCP');
  });

  it('falls back to "Step N" when both summary and prompt are falsy', () => {
    const meta = buildVersionMeta({ summary: null, prompt: '', version: 3 });
    expect(getVersionLabel(meta)).toBe('Step 3');
  });

  it('returns "Initial" when isFirst=true and no summary/prompt', () => {
    const meta = buildVersionMeta({ summary: null, prompt: '', version: 1 });
    expect(getVersionLabel(meta, true)).toBe('Initial');
  });

  it('prefers summary over prompt even when isFirst=true', () => {
    const meta = buildVersionMeta({ summary: 'Overview', prompt: 'start', version: 1 });
    expect(getVersionLabel(meta, true)).toBe('Overview');
  });
});
