// @arvo/core/datetime - Public barrel
//
// Framework-agnostic Date/Time engine consumed by @arvo/react and @arvo/js
// pickers.

// ----- Types ---------------------------------------------------------------
export type {
  Locale,
  TimeObject,
  TokenKind,
  Token,
  DateTimeConfig,
  MemberItem,
  NormalizedMember,
  Frequency,
  MemberIndex,
} from './types';

// ----- Config --------------------------------------------------------------
export { configureDateTime, getDateTimeConfig, resetDateTimeConfig } from './config';

// ----- Tokenizer -----------------------------------------------------------
export { tokenizeFormat, hasTimeTokens, hasDateTokens } from './format/tokenize';

// ----- Locale --------------------------------------------------------------
export {
  getUserLocale,
  getMonthNames,
  getDayNames,
  getWeekdayHeaders,
  getAmPmStrings,
  shouldUse12Hour,
  getLocaleDateFormat,
  getLocaleTimeFormat,
  getLocaleDateTimeFormat,
} from './format/locale';

// ----- Format / Parse ------------------------------------------------------
export { formatDate, formatTime, formatDateTime } from './format/format';
export { parseDate, parseTime, parseDateTime, splitDateTimeFormat } from './format/parse';

// ----- Calendar math -------------------------------------------------------
export {
  normalizeDate,
  normalize,
  isSameDay,
  isBeforeDay,
  isAfterDay,
  isSameWeek,
  isSameMonth,
  isSameQuarter,
  isSameYear,
  addDays,
  addMonths,
  inDateRange,
  pickAnchorDate,
} from './calendar/compare';
export { getWeekNumber, formatWeekNumber } from './calendar/week-number';
export { getMonthMatrix } from './calendar/month-matrix';
export type {
  MonthMatrix,
  MonthWeek,
  MonthDay,
  MonthMatrixOptions,
} from './calendar/month-matrix';
export {
  getMonthRange,
  getYearRange,
  monthOverlapsRange,
  yearOverlapsRange,
} from './calendar/range';

// ----- Member index --------------------------------------------------------
export {
  parseMemberKey,
  buildMemberIndex,
  findMemberForDate,
  findMemberByDate,
  findMemberByIndex,
  getMembersForYear,
  getMembersForMonth,
  getMembersForDecade,
  getMembersInRange,
  listMembersBetween,
  getMemberRange,
  isMemberInRange,
} from './member/index';
export type { BuildMemberIndexOptions } from './member/index';
export {
  detectFrequency,
  getFrequencyViewConfig,
  getAdjacentMember,
} from './member/frequency';
export type { FrequencyViewConfig } from './member/frequency';

// ----- Rolling time --------------------------------------------------------
export {
  resolveCurrentMember,
  rollingRangeToMembers,
  validateRollingRange,
  formatRollingValue,
  formatRollingRange,
  rangeIncludedCount,
  rangeIncludedMessage,
  rollingIncludedCount,
  rollingIncludedMessage,
} from './member/rolling';
export type {
  RollingRange,
  RollingPrefix,
  RollingRangeWithPrefix,
  RollingValidation,
} from './member/rolling';

// ----- Segment controller --------------------------------------------------
export { createSegmentController } from './segment/controller';
export { getSegmentBounds } from './segment/bounds';
export type { SegmentBoundsContext } from './segment/bounds';
export type {
  SegmentKind,
  SegmentDescriptor,
  SegmentValue,
  SegmentControllerOptions,
  SegmentController,
  SegmentEventName,
  SegmentEventPayload,
  SegmentCommitPayload,
} from './segment/types';
