import { describe, it, expect } from 'vitest';
import { parse } from '../markdown.js';
import {
  EMPTY_SECTION_DOC, UNKNOWN_BLOCK_DOC,
  DUPLICATE_BLOCK_DOC,
} from '../../test/helpers.js';

describe('parse snapshots', () => {
  it('EMPTY_SECTION_DOC', () => {
    expect(parse(EMPTY_SECTION_DOC)).toMatchSnapshot();
  });
  it('UNKNOWN_BLOCK_DOC', () => {
    expect(parse(UNKNOWN_BLOCK_DOC)).toMatchSnapshot();
  });
  it('DUPLICATE_BLOCK_DOC', () => {
    expect(parse(DUPLICATE_BLOCK_DOC)).toMatchSnapshot();
  });
});
