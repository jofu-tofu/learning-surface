import type { Section } from '../../shared/types.js';

/** A raw block parsed from ### headers in the structured markdown. */
export interface RawBlock {
  header: string;  // the full ### line, e.g. "### canvas: mermaid"
  content: string; // trimmed content between this header and the next
}

/**
 * A self-contained block definition that knows how to match, parse,
 * serialize, and describe one block type in the structured markdown format.
 *
 * Each block type (canvas, explanation, check, followups) implements this
 * interface. The parser and serializer loop over registered definitions
 * instead of hardcoding block-specific logic.
 */
export interface BlockDefinition {
  /** Block type identifier — matches the Section property name (e.g. 'canvas', 'explanation'). */
  readonly type: string;

  /** Test whether a ### header line belongs to this block type. */
  match(header: string): RegExpMatchArray | null;

  /**
   * Parse a raw block into typed data and apply it to the section.
   * Called once per matching block encountered during parsing.
   * Mutates the section in place (consistent with the existing builder pattern).
   */
  parse(header: string, content: string, section: Section): void;

  /**
   * Serialize this block's data from a section into markdown lines.
   * Returns an empty array if the section has no data for this block type.
   */
  serialize(section: Section): string[];

  /**
   * Return a human-readable format description for system prompt generation.
   * Used to auto-generate the CLI system prompt's format specification.
   */
  describe(): BlockFormatDescription;
}

/** Structured format description for system prompt generation. */
export interface BlockFormatDescription {
  /** Header format, e.g. "### canvas: TYPE" */
  header: string;
  /** Max instances per section, e.g. "1" or "Unlimited" */
  maxPerSection: string;
  /** Content format description */
  contentFormat: string;
  /** Additional notes for the AI */
  notes?: string;
  /** Human-readable pane description for system prompt generation. Falls back to contentFormat if omitted. */
  paneDescription?: string;
}
