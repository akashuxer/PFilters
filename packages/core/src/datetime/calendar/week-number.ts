// @arvo/core/datetime - ISO 8601 week numbering
//
// Week 1 is the week containing the first Thursday of the year. Weeks are
// computed as if they start on Monday for the VALUE, regardless of the
// display `weekStart`. There is no alternate numbering scheme in V1.

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function dayOfYear(date: Date): number {
  const monthLengths = [
    31,
    isLeapYear(date.getFullYear()) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let doy = date.getDate();
  for (let m = 0; m < date.getMonth(); m += 1) doy += monthLengths[m];
  return doy;
}

/**
 * ISO 8601 week number (1..53). Shifts the date to the Thursday of its
 * Monday-based week, then divides that Thursday's day-of-year by 7.
 */
export function getWeekNumber(date: Date): number {
  const isoDay = date.getDay() === 0 ? 7 : date.getDay(); // Mon=1..Sun=7
  // Thursday of this ISO week.
  const thursday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + (4 - isoDay),
  );
  return Math.floor((dayOfYear(thursday) - 1) / 7) + 1;
}

/** Display form, e.g. `getWeekNumber` 1 -> "W01". */
export function formatWeekNumber(n: number): string {
  return `W${String(n).padStart(2, '0')}`;
}
