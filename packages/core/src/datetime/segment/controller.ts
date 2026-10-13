// @arvo/core/datetime - Headless segmented-input controller
//
// Framework-agnostic. React (`useSegmentedInput`) and JS (`SegmentedInputAdapter`)
// wrap this. The controller owns focus/blur display swapping, member-aware
// snapping, partial-edit retention, and commit timing. It never touches the
// DOM.

import type { Locale, Token, TokenKind } from '../types';
import { tokenizeFormat } from '../format/tokenize';
import { getDayNames, getMonthNames, getAmPmStrings, getUserLocale } from '../format/locale';
import { formatDate } from '../format/format';
import { parseDateTime } from '../format/parse';
import { applyYearPivot, buildDateFromFields, type DateFields } from '../format/fields';
import { findMemberForDate } from '../member/index';
import { getSegmentBounds, type SegmentBoundsContext } from './bounds';
import type {
  SegmentController,
  SegmentControllerOptions,
  SegmentDescriptor,
  SegmentEventName,
  SegmentEventPayload,
  SegmentValue,
} from './types';

const NUMERIC_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'year',
  'month',
  'day',
  'hour24',
  'hour12',
  'minute',
  'second',
  'fraction',
]);

const EDITABLE_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  ...NUMERIC_KINDS,
  'monthName',
  'ampm',
]);

// Optional segments do not block a value from being commit-eligible.
const OPTIONAL_KINDS: ReadonlySet<TokenKind> = new Set<TokenKind>([
  'second',
  'fraction',
  'ampm',
]);

interface SegDef {
  tokenIndex: number;
  kind: TokenKind;
  length: number;
}

interface SegState {
  value: number | string | null;
  buffer: string;
  filled: boolean;
  fresh: boolean;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function fractionText(ms: number, length: number): string {
  const base = pad(ms, 3);
  return length <= 3 ? base.slice(0, length) : base + '0'.repeat(length - 3);
}

function sameTime(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

export function createSegmentController(
  options: SegmentControllerOptions,
): SegmentController {
  let opts: SegmentControllerOptions = { ...options };
  let tokens: Token[] = [];
  let segDefs: SegDef[] = [];
  let states: SegState[] = [];

  let value: Date | null = opts.value ?? null;
  let focused = false;
  let activeIndex = 0;
  let preFocusValue: Date | null = null;

  const listeners: Record<SegmentEventName, Set<(p: SegmentEventPayload) => void>> = {
    change: new Set(),
    commit: new Set(),
    segment: new Set(),
  };

  // ----- derived helpers -------------------------------------------------

  const locale = (): Locale => getUserLocale(opts.locale);
  const commitMode = (): 'blur' | 'live' => opts.commit ?? 'blur';
  const pasteAllowed = (): boolean => opts.allowPaste !== false;

  function isNumeric(kind: TokenKind): boolean {
    return NUMERIC_KINDS.has(kind);
  }
  function isRequired(kind: TokenKind): boolean {
    return EDITABLE_KINDS.has(kind) && !OPTIONAL_KINDS.has(kind);
  }
  function segWidth(def: SegDef): number {
    if (def.kind === 'year') return def.length >= 4 ? 4 : 2;
    if (def.kind === 'fraction') return def.length;
    return 2;
  }

  function rebuild(): void {
    tokens = tokenizeFormat(opts.format);
    segDefs = [];
    tokens.forEach((token, tokenIndex) => {
      if (EDITABLE_KINDS.has(token.kind)) {
        segDefs.push({
          tokenIndex,
          kind: token.kind,
          length: token.length ?? token.raw.length,
        });
      }
    });
    states = segDefs.map(() => ({ value: null, buffer: '', filled: false, fresh: false }));
    if (activeIndex >= segDefs.length) activeIndex = Math.max(0, segDefs.length - 1);
    populateFromValue(value);
  }

  function valueFromDate(kind: TokenKind, date: Date): number | string {
    switch (kind) {
      case 'year':
        return date.getFullYear();
      case 'month':
        return date.getMonth() + 1;
      case 'monthName':
        return date.getMonth();
      case 'day':
        return date.getDate();
      case 'hour24':
        return date.getHours();
      case 'hour12':
        return ((date.getHours() + 11) % 12) + 1;
      case 'minute':
        return date.getMinutes();
      case 'second':
        return date.getSeconds();
      case 'fraction':
        return date.getMilliseconds();
      case 'ampm':
        return date.getHours() < 12 ? 'am' : 'pm';
      /* c8 ignore next 2 -- only editable kinds populate segments */
      default:
        return 0;
    }
  }

  function populateFromValue(date: Date | null): void {
    segDefs.forEach((def, i) => {
      const st = states[i];
      if (date === null) {
        st.value = null;
        st.buffer = '';
        st.filled = false;
        st.fresh = false;
      } else {
        st.value = valueFromDate(def.kind, date);
        st.buffer = '';
        st.filled = true;
        st.fresh = false;
      }
    });
  }

  function context(): SegmentBoundsContext {
    let year: number | undefined;
    let month: number | undefined;
    segDefs.forEach((def, i) => {
      const st = states[i];
      if (!st.filled || st.value === null) return;
      if (def.kind === 'year') {
        const v = st.value as number;
        year = def.length <= 2 && v < 100 ? applyYearPivot(v) : v;
      } else if (def.kind === 'month') {
        month = (st.value as number) - 1;
      } else if (def.kind === 'monthName') {
        month = st.value as number;
      }
    });
    if (year === undefined) {
      year = value ? value.getFullYear() : new Date().getFullYear();
    }
    if (month === undefined && value) month = value.getMonth();
    const ctx: SegmentBoundsContext = { year };
    if (month !== undefined) ctx.month = month;
    return ctx;
  }

  function collectFields(): { fields: DateFields; complete: boolean } {
    const fields: DateFields = {};
    let hour12: number | undefined;
    let period: 'am' | 'pm' | undefined;
    let complete = true;

    segDefs.forEach((def, i) => {
      const st = states[i];
      if (st.value === null || !st.filled) {
        if (isRequired(def.kind)) complete = false;
        return;
      }
      switch (def.kind) {
        case 'year': {
          const v = st.value as number;
          fields.year = def.length <= 2 && v < 100 ? applyYearPivot(v) : v;
          break;
        }
        case 'month':
          fields.month = (st.value as number) - 1;
          break;
        case 'monthName':
          fields.month = st.value as number;
          break;
        case 'day':
          fields.day = st.value as number;
          break;
        case 'hour24':
          fields.hour = st.value as number;
          break;
        case 'hour12':
          hour12 = st.value as number;
          break;
        case 'minute':
          fields.minute = st.value as number;
          break;
        case 'second':
          fields.second = st.value as number;
          break;
        case 'fraction':
          fields.millisecond = Number((String(st.value) + '000').slice(0, 3));
          break;
        case 'ampm':
          period = st.value as 'am' | 'pm';
          break;
        /* c8 ignore next 2 -- segDefs only hold editable kinds handled above */
        default:
          break;
      }
    });

    if (hour12 !== undefined) {
      fields.hour = (hour12 % 12) + (period === 'pm' ? 12 : 0);
    }
    return { fields, complete };
  }

  function computeDate(): Date | null {
    const { fields, complete } = collectFields();
    if (!complete) return null;
    return buildDateFromFields(fields);
  }

  // ----- rendering -------------------------------------------------------

  function renderEditable(def: SegDef, st: SegState): string {
    if (st.value === null) return tokens[def.tokenIndex].raw; // placeholder
    if (!st.filled) return st.buffer;
    const len = def.length;
    switch (def.kind) {
      case 'year':
        return len >= 4 ? pad(st.value as number, 4) : pad((st.value as number) % 100, 2);
      case 'month':
        return len >= 2 ? pad(st.value as number, 2) : String(st.value);
      case 'monthName':
        return getMonthNames(locale(), len >= 4 ? 'full' : 'abbrev')[st.value as number];
      case 'day':
        return len >= 2 ? pad(st.value as number, 2) : String(st.value);
      case 'hour24':
      case 'hour12':
      case 'minute':
      case 'second':
        return len >= 2 ? pad(st.value as number, 2) : String(st.value);
      case 'fraction':
        return fractionText(st.value as number, len);
      case 'ampm': {
        const { am, pm } = getAmPmStrings(locale());
        return st.value === 'am' ? am : pm;
      }
      /* c8 ignore next 2 -- segDefs only hold editable kinds handled above */
      default:
        return String(st.value);
    }
  }

  function render(): { display: string; descriptors: SegmentDescriptor[] } {
    const ctx = context();
    const provisional = computeDate();
    const descriptors: SegmentDescriptor[] = [];
    let display = '';
    let segIdx = 0;

    for (const token of tokens) {
      if (EDITABLE_KINDS.has(token.kind)) {
        const def = segDefs[segIdx];
        const st = states[segIdx];
        const text = renderEditable(def, st);
        const start = display.length;
        display += text;
        descriptors.push({
          kind: token.kind,
          index: segIdx,
          raw: text,
          value: st.value,
          bounds: getSegmentBounds(token.kind, ctx),
          startOffset: start,
          endOffset: display.length,
          isPlaceholder: st.value === null,
        });
        segIdx += 1;
      } else if (token.kind === 'dayName') {
        const len = token.length ?? token.raw.length;
        display += provisional
          ? getDayNames(locale(), len >= 4 ? 'full' : 'abbrev')[provisional.getDay()]
          : token.raw;
      } else if (token.kind === 'timezone') {
        display += provisional ? formatDate(provisional, token.raw, opts.locale) : token.raw;
      } else {
        display += token.text ?? token.raw;
      }
    }

    return { display, descriptors };
  }

  function displayBlurred(): string {
    if (value === null) {
      // When no value is set the input renders the format-as-placeholder
      // string (token literals separated by their natural delimiters) so the
      // user always sees the field's format whether or not the input has
      // focus. The picker layer applies a placeholder style class so the
      // text reads as muted, matching the blurred-segment treatment used
      // when the input is focused but empty.
      return render().display;
    }
    if (opts.memberIndex) {
      const member = findMemberForDate(opts.memberIndex, value);
      if (member) return member.displayName;
    }
    return formatDate(value, opts.format, opts.locale);
  }

  // ----- events ----------------------------------------------------------

  function emit(event: SegmentEventName, payload: SegmentEventPayload): void {
    listeners[event].forEach((listener) => listener(payload));
  }

  // ----- commit / focus --------------------------------------------------

  function commitFromEdit(snap: boolean): void {
    const date = computeDate();
    if (date === null) return; // incomplete / invalid -> revert (no emit)

    let committed: Date;
    if (snap && opts.memberIndex) {
      const member = findMemberForDate(opts.memberIndex, date);
      if (!member) return; // outside member range -> revert (no emit)
      committed = new Date(member.keyDate.getTime());
    } else {
      committed = date;
    }

    if (!sameTime(committed, value)) {
      value = committed;
      emit('change', getValue());
      emit('commit', { date: value });
    }
  }

  function setFocused(target: boolean): void {
    if (target === focused) return;
    if (target) {
      preFocusValue = value ? new Date(value.getTime()) : null;
      focused = true;
      populateFromValue(value);
      activeIndex = segDefs.length > 0 ? 0 : 0;
      if (segDefs.length > 0) states[0].fresh = true;
    } else {
      focused = false;
      commitFromEdit(true);
      populateFromValue(value);
    }
  }

  function handleEscape(): void {
    value = preFocusValue ? new Date(preFocusValue.getTime()) : null;
    focused = false;
    populateFromValue(value);
  }

  function clearActive(): void {
    if (activeIndex < 0 || activeIndex >= states.length) return;
    const st = states[activeIndex];
    st.value = null;
    st.buffer = '';
    st.filled = false;
    st.fresh = true;
    emit('change', getValue());
    if (commitMode() === 'live') commitFromEdit(false);
  }

  function adjust(delta: number): void {
    if (activeIndex < 0 || activeIndex >= segDefs.length) return;
    const def = segDefs[activeIndex];
    const st = states[activeIndex];

    if (def.kind === 'ampm') {
      st.value = st.value === 'pm' ? 'am' : 'pm';
      st.filled = true;
      st.fresh = false;
    } else if (def.kind === 'monthName') {
      const cur = (st.value as number | null) ?? (delta > 0 ? -1 : 0);
      st.value = (((cur + delta) % 12) + 12) % 12;
      st.filled = true;
      st.fresh = false;
    } else {
      const bounds = getSegmentBounds(def.kind, context());
      if (!bounds) return;
      const range = bounds.max - bounds.min + 1;
      // The minute segment honours the picker's `minuteInterval` when set so
      // arrow nudges land on the same options the time dropdown renders
      // (e.g. interval=15 -> 0, 15, 30, 45). Other segments step by `delta`.
      const step =
        def.kind === 'minute' && opts.minuteInterval && opts.minuteInterval > 1
          ? Math.max(1, Math.floor(opts.minuteInterval)) * (delta > 0 ? 1 : -1)
          : delta;
      let base = (st.value as number | null) ?? (step > 0 ? bounds.min - step : bounds.max - step);
      // For the interval-aware minute path, snap the base value down to the
      // nearest interval boundary BEFORE stepping so the result is always a
      // multiple of the interval (e.g. 23 -> 15, +15 -> 30; 23 -> 15, -15 -> 0).
      if (def.kind === 'minute' && opts.minuteInterval && opts.minuteInterval > 1) {
        const ival = Math.max(1, Math.floor(opts.minuteInterval));
        base = Math.floor(base / ival) * ival;
      }
      const next = bounds.min + ((((base - bounds.min + step) % range) + range) % range);
      st.value = next;
      st.buffer = String(next);
      st.filled = true;
      st.fresh = false;
    }

    emit('change', getValue());
    if (commitMode() === 'live') commitFromEdit(false);
  }

  // ----- public API ------------------------------------------------------

  function getValue(): SegmentValue {
    const { descriptors } = render();
    return { date: computeDate(), segments: descriptors };
  }

  function getFormattedDisplay(focusedArg: boolean): string {
    if (focusedArg !== focused) setFocused(focusedArg);
    return focused ? render().display : displayBlurred();
  }

  function getFocusedSegment(): SegmentDescriptor | null {
    if (!focused || activeIndex < 0) return null;
    return render().descriptors[activeIndex] ?? null;
  }

  function setValue(date: Date | null, setOpts?: { silent?: boolean }): void {
    value = date ? new Date(date.getTime()) : null;
    populateFromValue(value);
    if (!setOpts?.silent) emit('change', getValue());
  }

  function setOptions(partial: Partial<SegmentControllerOptions>): void {
    const formatChanged =
      partial.format !== undefined && partial.format !== opts.format;
    opts = { ...opts, ...partial };
    if (partial.value !== undefined) value = partial.value ?? null;
    if (formatChanged) {
      rebuild();
    } else {
      populateFromValue(value);
    }
  }

  function focusSegment(index: number): void {
    if (!focused) setFocused(true);
    if (index < 0 || index >= segDefs.length) return;
    activeIndex = index;
    states[index].fresh = true;
    emit('segment', getFocusedSegment());
  }

  function findSegmentForOffset(offset: number): number | null {
    if (segDefs.length === 0) return null;
    const { descriptors } = render();
    if (descriptors.length === 0) return null;
    // Clamp the offset into the rendered display range; clicks past the end
    // of the text land on the last segment, clicks before the start on the
    // first.
    const first = descriptors[0];
    const last = descriptors[descriptors.length - 1];
    if (offset <= first.startOffset) return first.index;
    if (offset >= last.endOffset) return last.index;
    for (const seg of descriptors) {
      if (offset >= seg.startOffset && offset <= seg.endOffset) {
        return seg.index;
      }
    }
    // The offset fell on a literal separator between two segments. Snap to
    // the closer of the two by checking the gap midpoint.
    for (let i = 0; i < descriptors.length - 1; i += 1) {
      const a = descriptors[i];
      const b = descriptors[i + 1];
      if (offset > a.endOffset && offset < b.startOffset) {
        const mid = (a.endOffset + b.startOffset) / 2;
        return offset < mid ? a.index : b.index;
      }
    }
    return null;
  }

  function moveSegment(direction: 'prev' | 'next' | 'first' | 'last'): void {
    if (segDefs.length === 0) return;
    let next = activeIndex;
    if (direction === 'first') next = 0;
    else if (direction === 'last') next = segDefs.length - 1;
    else if (direction === 'prev') next = Math.max(0, activeIndex - 1);
    else next = Math.min(segDefs.length - 1, activeIndex + 1);
    activeIndex = next;
    states[next].fresh = true;
    emit('segment', getFocusedSegment());
  }

  function handleKey(event: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  }): { consumed: boolean; commit?: 'live' | null } {
    const live = commitMode() === 'live';
    switch (event.key) {
      case 'ArrowLeft':
        moveSegment('prev');
        return { consumed: true };
      case 'ArrowRight':
        moveSegment('next');
        return { consumed: true };
      case 'Home':
        moveSegment('first');
        return { consumed: true };
      case 'End':
        moveSegment('last');
        return { consumed: true };
      case 'ArrowUp':
        adjust(1);
        return { consumed: true, commit: live ? 'live' : null };
      case 'ArrowDown':
        adjust(-1);
        return { consumed: true, commit: live ? 'live' : null };
      case 'Tab':
        // Tab is never consumed by the segment controller. The picker host
        // owns Tab semantics: Tab moves focus from the segmented input to the
        // dropdown trigger button (and Shift+Tab back to the previous tab
        // stop). Segment-to-segment navigation is keyboard-only via the
        // ArrowLeft / ArrowRight keys (or Home / End).
        return { consumed: false };
      case 'Enter':
        commitFromEdit(true);
        if (focused) populateFromValue(value);
        return { consumed: true, commit: live ? 'live' : null };
      case 'Escape':
        handleEscape();
        return { consumed: true };
      case 'Backspace':
      case 'Delete':
        clearActive();
        return { consumed: true };
      default:
        return { consumed: false };
    }
  }

  function handleDigit(digit: string): { consumed: boolean; advance: boolean } {
    if (!focused || activeIndex < 0 || activeIndex >= segDefs.length) {
      return { consumed: false, advance: false };
    }
    const def = segDefs[activeIndex];
    if (!isNumeric(def.kind)) return { consumed: false, advance: false };
    if (!/^[0-9]$/.test(digit)) return { consumed: false, advance: false };

    const st = states[activeIndex];
    const width = segWidth(def);
    let buffer = st.fresh ? digit : st.buffer + digit;
    if (buffer.length > width) buffer = digit;
    let val = Number(buffer);

    const bounds = getSegmentBounds(def.kind, context());
    if (bounds && val > bounds.max) {
      buffer = digit;
      val = Number(buffer);
    }

    st.buffer = buffer;
    st.value = val;
    st.fresh = false;

    let advance = false;
    if (buffer.length >= width) {
      advance = true;
    } else if (bounds && val * 10 > bounds.max) {
      advance = true;
    }
    st.filled = advance || buffer.length >= width;

    emit('change', getValue());
    if (commitMode() === 'live') commitFromEdit(false);
    if (advance) moveSegment('next');

    return { consumed: true, advance };
  }

  function handleLetter(letter: string): { consumed: boolean; advance: boolean } {
    if (!focused || activeIndex < 0 || activeIndex >= segDefs.length) {
      return { consumed: false, advance: false };
    }
    const def = segDefs[activeIndex];
    const st = states[activeIndex];

    if (def.kind === 'ampm') {
      const lower = letter.toLowerCase();
      if (lower !== 'a' && lower !== 'p') return { consumed: false, advance: false };
      st.value = lower === 'a' ? 'am' : 'pm';
      st.filled = true;
      st.fresh = false;
      emit('change', getValue());
      if (commitMode() === 'live') commitFromEdit(false);
      moveSegment('next');
      return { consumed: true, advance: true };
    }

    if (def.kind === 'monthName') {
      const buffer = (st.fresh ? '' : st.buffer) + letter.toLowerCase();
      const names = getMonthNames(locale(), def.length >= 4 ? 'full' : 'abbrev');
      const matchIndex = names.findIndex((name) =>
        name.toLowerCase().startsWith(buffer),
      );
      if (matchIndex === -1) return { consumed: true, advance: false };
      st.buffer = buffer;
      st.value = matchIndex;
      st.filled = true;
      st.fresh = false;
      emit('change', getValue());
      if (commitMode() === 'live') commitFromEdit(false);
      return { consumed: true, advance: false };
    }

    return { consumed: false, advance: false };
  }

  // Attempts to parse `text` as a value for the currently active segment.
  // Returns the parsed value (number | 'am' | 'pm') or null when the text is
  // ambiguous, unrecognizable, or out of range. Used by handlePaste to allow
  // a single-segment paste when the full-value parse fails -- e.g. pasting
  // "15" into a focused day segment or "Mar" into a focused monthName
  // segment. Multi-segment partial pastes are NEVER allowed; the caller only
  // applies the value to the active segment.
  function tryParseSingleSegment(
    text: string,
    def: SegDef,
  ): number | 'am' | 'pm' | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (def.kind === 'ampm') {
      const { am, pm } = getAmPmStrings(locale());
      const upper = trimmed.toUpperCase();
      if (upper === am.toUpperCase()) return 'am';
      if (upper === pm.toUpperCase()) return 'pm';
      // Fallback to the canonical short forms regardless of locale.
      if (upper === 'AM' || upper === 'A') return 'am';
      if (upper === 'PM' || upper === 'P') return 'pm';
      return null;
    }

    if (def.kind === 'monthName') {
      const full = getMonthNames(locale(), 'full');
      const abbrev = getMonthNames(locale(), 'abbrev');
      const norm = trimmed.toLowerCase();
      let idx = full.findIndex((m) => m.toLowerCase() === norm);
      if (idx === -1) idx = abbrev.findIndex((m) => m.toLowerCase() === norm);
      if (idx === -1) {
        // Allow longest unique prefix match (e.g. "Sep" -> September) only
        // when it is unambiguous across the full month names.
        const matches = full
          .map((m, i) => ({ name: m.toLowerCase(), i }))
          .filter(({ name }) => name.startsWith(norm));
        if (matches.length === 1) idx = matches[0].i;
      }
      return idx === -1 ? null : idx;
    }

    if (!isNumeric(def.kind)) return null;
    if (!/^\d+$/.test(trimmed)) return null;

    const num = Number(trimmed);
    if (!Number.isFinite(num)) return null;

    if (def.kind === 'year') {
      // Year accepts either a 2- or 4-digit numeric paste; the existing
      // year-pivot logic handles the 2-digit case during commit.
      const yearLen = def.length >= 4 ? 4 : 2;
      if (trimmed.length > 4) return null;
      if (yearLen === 2 && trimmed.length > 2) return null;
      return num;
    }

    const bounds = getSegmentBounds(def.kind, context());
    if (!bounds) return null;
    if (num < bounds.min || num > bounds.max) return null;
    return num;
  }

  function handlePaste(text: string): { consumed: boolean; commit: boolean } {
    if (!pasteAllowed()) return { consumed: false, commit: false };

    // 1) Full-value paste: try the picker's format first. When the pasted
    //    text parses cleanly to a complete Date the controller populates ALL
    //    segments at once regardless of which segment is currently active.
    const parsed = parseDateTime(text, opts.format, opts.locale);
    if (parsed) {
      populateFromValue(parsed);
      let committed = false;
      if (commitMode() === 'live') {
        const before = value;
        commitFromEdit(true);
        committed = !sameTime(before, value);
      }
      emit('change', getValue());
      return { consumed: true, commit: committed };
    }

    // 2) Single-segment paste: only when the pasted text is unambiguously a
    //    value for the active segment (e.g. "05" into a focused day segment,
    //    "Mar" into a focused monthName, "PM" into an ampm). Partial pastes
    //    that would only fill some segments are never allowed.
    if (activeIndex >= 0 && activeIndex < segDefs.length) {
      const def = segDefs[activeIndex];
      const next = tryParseSingleSegment(text, def);
      if (next !== null) {
        const st = states[activeIndex];
        st.value = next;
        st.buffer = typeof next === 'number' ? String(next) : '';
        st.filled = true;
        st.fresh = false;
        let committed = false;
        if (commitMode() === 'live') {
          const before = value;
          commitFromEdit(false);
          committed = !sameTime(before, value);
        }
        emit('change', getValue());
        return { consumed: true, commit: committed };
      }
    }

    // 3) Otherwise the paste is ignored. The picker layer should call
    //    preventDefault only when consumed=true; readOnly inputs will
    //    naturally drop the native paste.
    return { consumed: false, commit: false };
  }

  function on(
    event: SegmentEventName,
    listener: (payload: SegmentEventPayload) => void,
  ): () => void {
    listeners[event].add(listener);
    return () => {
      listeners[event].delete(listener);
    };
  }

  function destroy(): void {
    listeners.change.clear();
    listeners.commit.clear();
    listeners.segment.clear();
  }

  rebuild();

  return {
    getValue,
    getFormattedDisplay,
    getFocusedSegment,
    setValue,
    setOptions,
    focusSegment,
    moveSegment,
    findSegmentForOffset,
    handleKey,
    handleDigit,
    handleLetter,
    handlePaste,
    on,
    destroy,
  };
}
