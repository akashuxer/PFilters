// @arvo/core/datetime - Month grid (always 6 rows x 7 days)
//
// `weekStart` rotates the visible columns only; it never changes the ISO week
// number attached to a row. Adjacent-month days are included so the grid is
// always full.

import { getDateTimeConfig } from '../config';
import { getWeekNumber } from './week-number';

export interface MonthMatrixOptions {
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // default from config
  showWeeks?: boolean;                   // precompute ISO week numbers
}

export interface MonthDay {
  date: Date;
  inMonth: boolean; // false for adjacent-month padding days
}

export interface MonthWeek {
  weekNumber: number | null; // null when showWeeks is false
  days: MonthDay[];          // always 7
}

export interface MonthMatrix {
  weeks: MonthWeek[]; // always 6
  weekStart: number;
}

/**
 * Build the 6x7 day matrix for the given month (month is 0..11). The week
 * number for each row is the ISO week of that row's Thursday, so it is stable
 * regardless of `weekStart`.
 */
export function getMonthMatrix(
  year: number,
  month: number,
  options?: MonthMatrixOptions,
): MonthMatrix {
  const weekStart =
    options?.weekStart ?? getDateTimeConfig().weekStart ?? 0;
  const showWeeks = options?.showWeeks ?? false;

  const firstWeekday = new Date(year, month, 1).getDay(); // 0..6
  const lead = (firstWeekday - weekStart + 7) % 7;

  const weeks: MonthWeek[] = [];
  for (let row = 0; row < 6; row += 1) {
    const days: MonthDay[] = [];
    let thursday: Date | null = null;
    for (let col = 0; col < 7; col += 1) {
      const date = new Date(year, month, 1 - lead + row * 7 + col);
      days.push({ date, inMonth: date.getMonth() === month });
      if (date.getDay() === 4) thursday = date;
    }
    weeks.push({
      weekNumber: showWeeks && thursday ? getWeekNumber(thursday) : null,
      days,
    });
  }

  return { weeks, weekStart };
}
