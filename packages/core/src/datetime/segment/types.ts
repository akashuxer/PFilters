// @arvo/core/datetime - Segment controller types

import type { Locale, MemberIndex, TokenKind } from '../types';

/** Editable / display segment kinds map 1:1 with format tokens. */
export type SegmentKind = TokenKind;

export interface SegmentDescriptor {
  kind: SegmentKind;
  index: number;                              // 0..n-1 across editable segments
  raw: string;                                // current rendered text
  value: number | string | null;             // typed value (null when empty)
  bounds: { min: number; max: number } | null; // numeric bounds; null for text
  startOffset: number;                        // caret offset in the rendered view
  endOffset: number;
  isPlaceholder: boolean;                     // true when value is null
}

export interface SegmentValue {
  date: Date | null;            // commit-eligible date (null if incomplete)
  segments: SegmentDescriptor[];
}

export interface SegmentControllerOptions {
  format: string;
  locale?: Locale;
  min?: Date | null;
  max?: Date | null;
  /** 'blur' commits when focus leaves; 'live' commits on every change. */
  commit?: 'blur' | 'live';
  /** Initial value. */
  value?: Date | null;
  /** Mode hint; derived from the format when omitted. */
  mode?: 'date' | 'time' | 'datetime';
  /** When provided, the blurred display swaps to the matched member name. */
  memberIndex?: MemberIndex;
  /** Whether paste is allowed (default true). */
  allowPaste?: boolean;
  /**
   * Step (minutes) used by ArrowUp/ArrowDown on the minute segment and any
   * derived "available time" navigation. Defaults to 1. Pickers that surface
   * an interval (e.g. ArvoTimePicker's `interval` prop) forward it here so
   * keyboard nudges land on the same options the dropdown exposes.
   */
  minuteInterval?: number;
}

export interface SegmentCommitPayload {
  date: Date | null;
}

export type SegmentEventName = 'change' | 'commit' | 'segment';

export type SegmentEventPayload =
  | SegmentValue
  | SegmentCommitPayload
  | SegmentDescriptor
  | null;

export interface SegmentController {
  // Reading
  getValue(): SegmentValue;
  getFormattedDisplay(focused: boolean): string;
  getFocusedSegment(): SegmentDescriptor | null;

  // Writing
  setValue(date: Date | null, options?: { silent?: boolean }): void;
  setOptions(options: Partial<SegmentControllerOptions>): void;

  // Caret / focus
  focusSegment(index: number): void;
  moveSegment(direction: 'prev' | 'next' | 'first' | 'last'): void;
  /**
   * Returns the segment index whose `[startOffset, endOffset]` range contains
   * the given caret offset in the rendered display string, or null when no
   * editable segment matches (e.g. the offset lands on a literal separator).
   * Used by pickers to map click coordinates back to the targeted segment.
   */
  findSegmentForOffset(offset: number): number | null;

  // Input handlers
  handleKey(event: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  }): { consumed: boolean; commit?: 'live' | null };
  handleDigit(digit: string): { consumed: boolean; advance: boolean };
  handleLetter(letter: string): { consumed: boolean; advance: boolean };
  handlePaste(text: string): { consumed: boolean; commit: boolean };

  // Lifecycle
  on(event: SegmentEventName, listener: (payload: SegmentEventPayload) => void): () => void;
  destroy(): void;
}
