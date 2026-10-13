// @arvo/core/datetime - Segment numeric bounds (locale & date aware)

import type { SegmentKind } from './types';
import { daysInMonth } from '../format/fields';

export interface SegmentBoundsContext {
  year?: number;  // full year (for month-aware day bounds)
  month?: number; // 0..11
}

/**
 * Numeric increment/decrement bounds for an editable segment. Returns `null`
 * for non-numeric (text) segments such as `monthName`, `ampm`, `dayName`.
 * Day bounds are MONTH/YEAR-AWARE when the context supplies them.
 */
export function getSegmentBounds(
  kind: SegmentKind,
  context?: SegmentBoundsContext,
): { min: number; max: number } | null {
  switch (kind) {
    case 'year':
      return { min: 1, max: 9999 };
    case 'month':
      return { min: 1, max: 12 };
    case 'day': {
      const year = context?.year ?? 2000; // leap year -> permissive default
      const month = context?.month;
      const max = month === undefined ? 31 : daysInMonth(year, month);
      return { min: 1, max };
    }
    case 'hour24':
      return { min: 0, max: 23 };
    case 'hour12':
      return { min: 1, max: 12 };
    case 'minute':
    case 'second':
      return { min: 0, max: 59 };
    case 'fraction':
      return { min: 0, max: 999 };
    default:
      return null;
  }
}
