import { describe, it, expect } from 'vitest';
import type { MemberItem } from '../types';
import { buildMemberIndex } from '../member/index';
import { createSegmentController } from '../segment/controller';
import { getSegmentBounds } from '../segment/bounds';

// Weekly buckets for January 2020 (Mondays). Jan 20 is ISO week W04.
const WEEKLY_2020: MemberItem[] = [
  { key: '2020/01/06 00:00:00', name: 'w02', displayName: 'W02-2020', index: 0 },
  { key: '2020/01/13 00:00:00', name: 'w03', displayName: 'W03-2020', index: 1 },
  { key: '2020/01/20 00:00:00', name: 'w04', displayName: 'W04-2020', index: 2 },
  { key: '2020/01/27 00:00:00', name: 'w05', displayName: 'W05-2020', index: 3 },
];

function memberIndex() {
  return buildMemberIndex(WEEKLY_2020, { frequency: 'week' });
}

function type(controller: ReturnType<typeof createSegmentController>, digits: string): void {
  for (const ch of digits) controller.handleDigit(ch);
}

function commitSpy(controller: ReturnType<typeof createSegmentController>): Array<Date | null> {
  const seen: Array<Date | null> = [];
  controller.on('commit', (payload) => {
    seen.push((payload as { date: Date | null }).date);
  });
  return seen;
}

describe('OQ-4 / C8 member-mode segment behavior', () => {
  it('1. focus -> edit valid date -> Enter -> commit snaps to member keyDate; display shows displayName', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true); // focus
    type(c, '20200125'); // edit to 2020-01-25
    c.handleKey({ key: 'Enter' });

    expect(commits).toHaveLength(1);
    expect(commits[0]!.getMonth()).toBe(0);
    expect(commits[0]!.getDate()).toBe(20); // snapped to W04 keyDate
    expect(c.getFormattedDisplay(false)).toBe('W04-2020');
  });

  it('2. focus -> edit valid date -> blur -> same snap + displayName', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    type(c, '20200125');
    const display = c.getFormattedDisplay(false); // blur

    expect(commits).toHaveLength(1);
    expect(commits[0]!.getDate()).toBe(20);
    expect(display).toBe('W04-2020');
  });

  it('3. focus -> edit valid date -> Escape -> no commit; pre-focus value + display restored', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    type(c, '20200125');
    c.handleKey({ key: 'Escape' });

    expect(commits).toHaveLength(0);
    expect(c.getFormattedDisplay(false)).toBe('W02-2020');
  });

  it('4. focus -> incomplete (cleared) segment -> blur -> revert to pre-focus; no commit', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    c.moveSegment('last'); // day
    c.handleKey({ key: 'Backspace' }); // clear day -> incomplete
    expect(c.getValue().date).toBeNull();
    const display = c.getFormattedDisplay(false);

    expect(commits).toHaveLength(0);
    expect(display).toBe('W02-2020');
  });

  it('5. focus -> edit date outside member range -> blur -> revert; no commit', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    type(c, '20190615'); // 2019-06-15, outside Jan 2020 members
    const display = c.getFormattedDisplay(false);

    expect(commits).toHaveLength(0);
    expect(display).toBe('W02-2020');
  });

  it('6. focus -> Tab mid-edit -> partial digits preserved; no commit; Tab not consumed (exits to trigger)', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: null,
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    c.handleDigit('2');
    c.handleDigit('0'); // year partial "20"
    const result = c.handleKey({ key: 'Tab' });

    // Tab is never consumed by the segment controller; the picker host
    // forwards it to the dropdown trigger button (and Shift+Tab back to the
    // previous tab stop). Segment-to-segment navigation is via arrow keys.
    expect(result.consumed).toBe(false);
    expect(commits).toHaveLength(0);
    const yearSeg = c.getValue().segments[0];
    expect(yearSeg.raw).toBe('20'); // partial retained
    expect(yearSeg.isPlaceholder).toBe(false);
  });

  it('7. date-mode rejects a time-only edit; revert on blur', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2020, 0, 6),
      memberIndex: memberIndex(),
    });
    const commits = commitSpy(c);

    c.getFormattedDisplay(true);
    // Pasting a time-only string into a date format fails to parse.
    const paste = c.handlePaste('16:05');
    expect(paste.consumed).toBe(false);

    // Clearing the required segments leaves no parseable date.
    c.moveSegment('first');
    c.handleKey({ key: 'Backspace' });
    c.moveSegment('next');
    c.handleKey({ key: 'Backspace' });
    c.moveSegment('next');
    c.handleKey({ key: 'Backspace' });
    expect(c.getValue().date).toBeNull();

    expect(c.getFormattedDisplay(false)).toBe('W02-2020');
    expect(commits).toHaveLength(0);
  });
});

describe('segment editing - digits, arrows, backspace', () => {
  it('auto-advances and produces a valid date in blur mode', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    c.getFormattedDisplay(true);
    type(c, '20251225');
    const v = c.getValue().date!;
    expect(v.getFullYear()).toBe(2025);
    expect(v.getMonth()).toBe(11);
    expect(v.getDate()).toBe(25);
  });

  it('does not commit in blur mode until blur', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    const commits = commitSpy(c);
    c.getFormattedDisplay(true);
    type(c, '20251225');
    expect(commits).toHaveLength(0);
    c.getFormattedDisplay(false);
    expect(commits).toHaveLength(1);
    expect(commits[0]!.getDate()).toBe(25);
  });

  it('commits live on each completing change when commit is "live"', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null, commit: 'live' });
    const commits = commitSpy(c);
    c.getFormattedDisplay(true);
    type(c, '20251225');
    expect(commits.length).toBeGreaterThanOrEqual(1);
    expect(commits[commits.length - 1]!.getDate()).toBe(25);
  });

  it('ArrowUp/ArrowDown respects month-aware day bounds (leap Feb)', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2024, 1, 28) });
    c.getFormattedDisplay(true);
    c.moveSegment('last'); // day
    expect(c.getFocusedSegment()!.bounds).toEqual({ min: 1, max: 29 });
    c.handleKey({ key: 'ArrowUp' });
    expect(c.getFocusedSegment()!.value).toBe(29);
  });

  it('ArrowUp wraps within non-leap February bounds', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 1, 28) });
    c.getFormattedDisplay(true);
    c.moveSegment('last');
    expect(c.getFocusedSegment()!.bounds).toEqual({ min: 1, max: 28 });
    c.handleKey({ key: 'ArrowUp' }); // 28 -> wrap to 1
    expect(c.getFocusedSegment()!.value).toBe(1);
  });

  it('Backspace clears the focused segment', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    c.moveSegment('last');
    c.handleKey({ key: 'Backspace' });
    expect(c.getFocusedSegment()!.value).toBeNull();
    expect(c.getFocusedSegment()!.isPlaceholder).toBe(true);
  });

  it('rolls a new buffer when a typed value would exceed the max', () => {
    const c = createSegmentController({ format: 'MM/dd/yyyy', value: null });
    c.getFormattedDisplay(true); // month active
    c.handleDigit('1');
    c.handleDigit('3'); // "13" > 12 -> restart at "3" (March) and auto-advance
    expect(c.getValue().segments[0].value).toBe(3); // month segment
    expect(c.getFocusedSegment()!.kind).toBe('day'); // advanced
  });
});

describe('segment paste', () => {
  it('parses and fills on paste (blur mode)', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    c.getFormattedDisplay(true);
    const result = c.handlePaste('2025-12-25');
    expect(result.consumed).toBe(true);
    expect(c.getValue().date!.getDate()).toBe(25);
  });

  it('commits on paste in live mode', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null, commit: 'live' });
    const commits = commitSpy(c);
    c.getFormattedDisplay(true);
    const result = c.handlePaste('2025-12-25');
    expect(result.commit).toBe(true);
    expect(commits[commits.length - 1]!.getDate()).toBe(25);
  });

  it('rejects paste when allowPaste is false', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null, allowPaste: false });
    expect(c.handlePaste('2025-12-25')).toEqual({ consumed: false, commit: false });
  });
});

describe('segment letters (monthName, ampm)', () => {
  it('type-ahead selects a month by first letter', () => {
    const c = createSegmentController({ format: 'dd MMMM yyyy', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    c.moveSegment('next'); // monthName
    c.handleLetter('j'); // January (first match)
    expect(c.getFocusedSegment()!.value).toBe(0);
  });

  it('type-ahead accumulates letters to disambiguate (ju -> June)', () => {
    const c = createSegmentController({ format: 'dd MMMM yyyy', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    c.moveSegment('next'); // monthName
    c.handleLetter('j');
    c.handleLetter('u'); // "ju" -> June (first of June/July)
    expect(c.getFocusedSegment()!.value).toBe(5);
  });

  it('renders localized month names (locale-aware width)', () => {
    const en = createSegmentController({ format: 'dd MMMM yyyy', value: new Date(2025, 0, 15) });
    expect(en.getFormattedDisplay(true)).toContain('January');

    const de = createSegmentController({
      format: 'dd MMMM yyyy',
      value: new Date(2025, 0, 15),
      locale: 'de-DE',
    });
    expect(de.getFormattedDisplay(true)).toContain('Januar');
  });

  it('toggles AM/PM with a letter and with arrows', () => {
    const c = createSegmentController({ format: 'hh:mm tt', value: new Date(2025, 0, 1, 9, 0) });
    c.getFormattedDisplay(true);
    c.moveSegment('last'); // ampm
    c.handleLetter('p');
    expect(c.getValue().date!.getHours()).toBe(21);
    c.handleKey({ key: 'ArrowUp' }); // toggle back to am
    expect(c.getValue().date!.getHours()).toBe(9);
  });
});

describe('segment navigation, options, lifecycle', () => {
  it('moves between segments and reports the focused one', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    c.moveSegment('first');
    expect(c.getFocusedSegment()!.kind).toBe('year');
    c.moveSegment('next');
    expect(c.getFocusedSegment()!.kind).toBe('month');
    c.moveSegment('last');
    expect(c.getFocusedSegment()!.kind).toBe('day');
    c.focusSegment(0);
    expect(c.getFocusedSegment()!.kind).toBe('year');
  });

  it('returns null focused segment when blurred', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    expect(c.getFocusedSegment()).toBeNull();
  });

  it('setValue updates the display and emits change unless silent', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    let changes = 0;
    c.on('change', () => {
      changes += 1;
    });
    c.setValue(new Date(2025, 5, 1));
    expect(changes).toBe(1);
    expect(c.getValue().date!.getMonth()).toBe(5);
    c.setValue(new Date(2025, 6, 1), { silent: true });
    expect(changes).toBe(1); // unchanged
  });

  it('setOptions can change the format', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.setOptions({ format: 'dd/MM/yyyy' });
    expect(c.getFormattedDisplay(false)).toBe('15/01/2025');
  });

  it('on() returns an unsubscribe and destroy() clears listeners', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    let count = 0;
    const off = c.on('change', () => {
      count += 1;
    });
    c.setValue(new Date(2025, 0, 1));
    off();
    c.setValue(new Date(2025, 0, 2));
    expect(count).toBe(1);
    c.destroy();
    c.setValue(new Date(2025, 0, 3));
    expect(count).toBe(1);
  });

  it('blurred display renders the format-as-placeholder string when there is no value', () => {
    // Per the persistent-placeholder contract, an empty segmented input
    // always renders its format tokens (e.g. `yyyy-MM-dd`) whether focused
    // or blurred. The picker layer applies the placeholder color via the
    // root `.has-no-value` class so the text reads as muted.
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    expect(c.getFormattedDisplay(false)).toBe('yyyy-MM-dd');
  });

  it('non-member controller commits the raw edited date', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    const commits = commitSpy(c);
    c.getFormattedDisplay(true);
    type(c, '20250704');
    c.getFormattedDisplay(false);
    expect(commits[0]!.getMonth()).toBe(6);
    expect(commits[0]!.getDate()).toBe(4);
  });
});

describe('segment input handler branches', () => {
  it('ignores digits when not focused or on a non-numeric segment', () => {
    const c = createSegmentController({ format: 'dd MMMM yyyy', value: new Date(2025, 0, 15) });
    expect(c.handleDigit('5')).toEqual({ consumed: false, advance: false }); // blurred
    c.getFormattedDisplay(true);
    c.moveSegment('next'); // monthName (non-numeric)
    expect(c.handleDigit('5')).toEqual({ consumed: false, advance: false });
  });

  it('ignores non-digit characters in handleDigit', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    c.getFormattedDisplay(true);
    expect(c.handleDigit('x')).toEqual({ consumed: false, advance: false });
  });

  it('ignores letters when not focused, on numeric segments, or unmatched', () => {
    const c = createSegmentController({ format: 'dd MMMM yyyy hh:mm tt', value: new Date(2025, 0, 15, 9, 0) });
    expect(c.handleLetter('j')).toEqual({ consumed: false, advance: false }); // blurred
    c.getFormattedDisplay(true);
    c.focusSegment(0); // day (numeric)
    expect(c.handleLetter('j')).toEqual({ consumed: false, advance: false });
    c.moveSegment('next'); // monthName
    expect(c.handleLetter('z')).toEqual({ consumed: true, advance: false }); // no match
  });

  it('rejects an invalid AM/PM letter', () => {
    const c = createSegmentController({ format: 'hh:mm tt', value: new Date(2025, 0, 1, 9, 0) });
    c.getFormattedDisplay(true);
    c.moveSegment('last'); // ampm
    expect(c.handleLetter('x')).toEqual({ consumed: false, advance: false });
  });

  it('navigates with ArrowLeft/ArrowRight/Home/End', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    c.handleKey({ key: 'End' });
    expect(c.getFocusedSegment()!.kind).toBe('day');
    c.handleKey({ key: 'ArrowLeft' });
    expect(c.getFocusedSegment()!.kind).toBe('month');
    c.handleKey({ key: 'ArrowRight' });
    expect(c.getFocusedSegment()!.kind).toBe('day');
    c.handleKey({ key: 'Home' });
    expect(c.getFocusedSegment()!.kind).toBe('year');
  });

  it('returns not-consumed for unknown keys and Tab at boundaries', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    expect(c.handleKey({ key: 'F1' })).toEqual({ consumed: false });
    c.moveSegment('first');
    expect(c.handleKey({ key: 'Tab', shiftKey: true })).toEqual({ consumed: false });
    c.moveSegment('last');
    expect(c.handleKey({ key: 'Tab' })).toEqual({ consumed: false });
  });

  it('reports a live commit signal on Enter and ArrowUp in live mode', () => {
    const c = createSegmentController({
      format: 'yyyy-MM-dd',
      value: new Date(2025, 0, 15),
      commit: 'live',
    });
    c.getFormattedDisplay(true);
    expect(c.handleKey({ key: 'Enter' }).commit).toBe('live');
    c.moveSegment('last');
    expect(c.handleKey({ key: 'ArrowUp' }).commit).toBe('live');
  });

  it('adjusts from an empty segment to min (up) and max (down)', () => {
    const up = createSegmentController({ format: 'HH:mm', value: null });
    up.getFormattedDisplay(true); // hour active, empty
    up.handleKey({ key: 'ArrowUp' });
    expect(up.getFocusedSegment()!.value).toBe(0); // min hour

    const down = createSegmentController({ format: 'HH:mm', value: null });
    down.getFormattedDisplay(true);
    down.handleKey({ key: 'ArrowDown' });
    expect(down.getFocusedSegment()!.value).toBe(23); // max hour
  });

  it('cycles a monthName segment with arrows from empty', () => {
    const up = createSegmentController({ format: 'MMMM', value: null });
    up.getFormattedDisplay(true);
    up.handleKey({ key: 'ArrowUp' });
    expect(up.getFocusedSegment()!.value).toBe(0); // January

    const down = createSegmentController({ format: 'MMMM', value: null });
    down.getFormattedDisplay(true);
    down.handleKey({ key: 'ArrowDown' });
    expect(down.getFocusedSegment()!.value).toBe(11); // December
  });

  it('focusSegment auto-focuses and ignores out-of-range indices', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.focusSegment(2); // not yet focused -> focuses
    expect(c.getFocusedSegment()!.kind).toBe('day');
    c.focusSegment(99); // out of range -> no-op
    expect(c.getFocusedSegment()!.kind).toBe('day');
  });

  it('handles a literal-only format with no editable segments', () => {
    const c = createSegmentController({ format: '----', value: null });
    c.getFormattedDisplay(true);
    expect(c.getValue().segments).toHaveLength(0);
    c.moveSegment('next'); // no-op, no throw
    expect(c.getFocusedSegment()).toBeNull();
  });

  it('renders dayName and timezone read-only segments from the provisional date', () => {
    const c = createSegmentController({ format: 'ddd yyyy-MM-dd', value: new Date(2025, 10, 20) });
    const display = c.getFormattedDisplay(true);
    expect(display.startsWith('Thu ')).toBe(true); // Nov 20 2025 is Thursday
  });

  it('shows placeholders while the date is incomplete', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    const display = c.getFormattedDisplay(true);
    expect(display).toBe('yyyy-MM-dd'); // all placeholders
  });

  it('setOptions with only a locale change repopulates names', () => {
    const c = createSegmentController({ format: 'dd MMMM yyyy', value: new Date(2025, 0, 15) });
    c.setOptions({ locale: 'de-DE' });
    expect(c.getFormattedDisplay(false)).toBe('15 Januar 2025');
  });

  it('setValue(null) clears the value and shows format-as-placeholder when blurred', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.setValue(null);
    expect(c.getValue().date).toBeNull();
    expect(c.getFormattedDisplay(false)).toBe('yyyy-MM-dd');
  });

  it('re-focusing with the same state is a no-op transition', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    c.getFormattedDisplay(true);
    expect(c.getFormattedDisplay(true)).toBe('2025-01-15');
  });

  it('does not emit commit when the value is unchanged on blur', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: new Date(2025, 0, 15) });
    const commits = commitSpy(c);
    c.getFormattedDisplay(true);
    c.getFormattedDisplay(false); // blur without editing
    expect(commits).toHaveLength(0);
  });

  it('clamps the active segment when a format change shrinks the segment count', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd HH:mm', value: new Date(2025, 0, 15, 9, 30) });
    c.getFormattedDisplay(true);
    c.moveSegment('last'); // minute
    c.setOptions({ format: 'yyyy' });
    expect(c.getValue().segments).toHaveLength(1);
    expect(c.getFormattedDisplay(false)).toBe('2025');
  });

  it('accepts paste while not yet focused', () => {
    const c = createSegmentController({ format: 'yyyy-MM-dd', value: null });
    expect(c.handlePaste('2025-07-04').consumed).toBe(true);
  });

  it('round-trips second and fraction segments through value and display', () => {
    const sec = createSegmentController({
      format: 'HH:mm:ss',
      value: new Date(2025, 0, 1, 10, 20, 30),
    });
    expect(sec.getValue().date!.getSeconds()).toBe(30);
    expect(sec.getFormattedDisplay(true)).toBe('10:20:30');

    const frac = createSegmentController({
      format: 'HH:mm:ss.fff',
      value: new Date(2025, 0, 1, 10, 20, 30, 123),
    });
    expect(frac.getValue().date!.getMilliseconds()).toBe(123);
    expect(frac.getFormattedDisplay(true)).toBe('10:20:30.123');
  });

  it('renders read-only dayName/timezone as placeholders when incomplete', () => {
    const c = createSegmentController({ format: 'ddd yyyy-MM-dd zzz', value: null });
    const display = c.getFormattedDisplay(true);
    expect(display).toContain('ddd');
    expect(display).toContain('zzz');
  });
});

describe('formatTime timezone + utc', () => {
  it('uses a captured timezone string for tz tokens', async () => {
    const { formatTime } = await import('../format/format');
    expect(formatTime({ hours: 16, minutes: 5, timezone: '+05:30' }, 'HH:mmzzz')).toBe(
      '16:05+05:30',
    );
    expect(formatTime({ hours: 16, minutes: 5, timezone: '-03' }, 'HH:mmzz')).toBe('16:05-03');
    expect(formatTime({ hours: 0, minutes: 0, timezone: 'Z' }, 'HH:mm:sszzz')).toBe(
      '00:00:00+00:00',
    );
  });
});

describe('getSegmentBounds', () => {
  it('returns numeric bounds per kind', () => {
    expect(getSegmentBounds('year')).toEqual({ min: 1, max: 9999 });
    expect(getSegmentBounds('month')).toEqual({ min: 1, max: 12 });
    expect(getSegmentBounds('hour24')).toEqual({ min: 0, max: 23 });
    expect(getSegmentBounds('hour12')).toEqual({ min: 1, max: 12 });
    expect(getSegmentBounds('minute')).toEqual({ min: 0, max: 59 });
    expect(getSegmentBounds('second')).toEqual({ min: 0, max: 59 });
  });

  it('is month/year aware for the day segment', () => {
    expect(getSegmentBounds('day', { year: 2024, month: 1 })).toEqual({ min: 1, max: 29 });
    expect(getSegmentBounds('day', { year: 2025, month: 1 })).toEqual({ min: 1, max: 28 });
    expect(getSegmentBounds('day', { year: 2025, month: 3 })).toEqual({ min: 1, max: 30 });
    expect(getSegmentBounds('day')).toEqual({ min: 1, max: 31 });
  });

  it('returns null for text segments', () => {
    expect(getSegmentBounds('monthName')).toBeNull();
    expect(getSegmentBounds('ampm')).toBeNull();
    expect(getSegmentBounds('dayName')).toBeNull();
  });
});
