// Vanilla JS ArvoDateRangePicker.
//
// Date range picker with three config-gated capability layers:
//   (a) absolute  -- dual calendar with em-dash separator
//   (b) member    -- single scrollable member-tile panel
//   (c) rolling   -- Start/End ArvoNumberInput steppers + sticky Save/Cancel
//
// Single public component; capability gating is purely config-driven:
//   memberData + frequency               -> member capability available
//   memberData + frequency + rolling     -> rolling capability available
//   hasModeToggle                     -> show/hide the absolute/member switch
//
// Descriptor: descriptors/date-range-picker.json
//
// Behavioral parity with packages/react/src/components/DateRangePicker --
// same BEM classes, ARIA attributes, keyboard map, and event payloads.
//
// Generic platform contract: currentMemberIndex and rollingPrefix are
// explicit options. The engine and component NEVER read IsCurrentBucketIndex
// on raw member data; consumer maps.
//
// Loading Pattern: C -- spinner replaces trigger-btn; popover cannot open.
//
// Events dispatched on the host element:
//   drp:change       -- { start, end, formatted, mode, memberRange?, rollingValue? }
//   drp:mode-change  -- { mode } (cancelable)
//   drp:open         -- {} (cancelable)
//   drp:close        -- {} (cancelable)
//   drp:cancel       -- {} (rolling Cancel)
//   drp:save         -- {} (rolling Save)

import {
  addMonths,
  applyPositionToSurface,
  buildMemberIndex,
  createOverlaySurface,
  createSegmentController,
  findMemberForDate,
  formatDate,
  getAdjacentMember,
  getLocaleDateFormat,
  getUserLocale,
  isAfterDay,
  isBeforeDay,
  isSameDay,
  parseDate,
  pickAnchorDate,
  resolveCurrentMember,
  rollingIncludedMessage,
  rollingRangeToMembers,
} from '@arvo/core';
import type {
  Frequency,
  MemberIndex,
  MemberItem,
  NormalizedMember,
  OverlaySurface,
  PositionResult,
  RollingRange,
  SegmentController,
} from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoButton } from '../Button/Button';
import { ArvoButtonGroup } from '../ButtonGroup/ButtonGroup';
import { ArvoSwitch } from '../Switch/Switch';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import { ArvoNumberInput } from '../NumberInput/NumberInput';
import ArvoCalendar, { type ArvoCalendarOptions } from '../Calendar/Calendar';
// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoDateRangePickerMode = 'absolute' | 'member' | 'rolling';

export interface DateRangeValue {
  start: Date | null;
  end: Date | null;
}

export interface MemberRangeValue {
  start: NormalizedMember | null;
  end: NormalizedMember | null;
}

export interface ArvoDateRangePickerChangePayload {
  start: Date | null;
  end: Date | null;
  formatted: { start: string; end: string };
  mode: ArvoDateRangePickerMode;
  memberRange?: { start: NormalizedMember | null; end: NormalizedMember | null };
  rollingValue?: RollingRange;
}

/**
 * Scoped escape-hatch bag for inner `ArvoCalendar` options the parent
 * does not curate as a flat option. Applies to BOTH absolute-mode
 * calendars (member-mode tile panel is parent-owned and unaffected).
 * Mirrors React `DateRangePickerCalendarProps` -- drift checker enforces
 * key-set parity.
 */
export type DateRangePickerCalendarProps = Pick<
  ArvoCalendarOptions,
  'hasOutsideDays' | 'isKeyboardEnabled' | 'size'
>;

/**
 * Scoped escape-hatch bag for popover surface options. DateRangePicker
 * portals a custom overlay (not `ArvoPopover`).
 */
export interface DateRangePickerPopoverProps {
  /** CSS width override on the popover surface. */
  width?: string;
  /** Pixel offset between the trigger and the popover. Default: 4. */
  offset?: number;
}

export interface ArvoDateRangePickerOptions {
  // -- Value -----------------------------------------------------------------
  startValue?: Date | string | null;
  endValue?: Date | string | null;

  // -- Format / Locale -------------------------------------------------------
  format?: string | null;
  locale?: string | null;

  // -- Calendar options ------------------------------------------------------
  weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasWeeks?: boolean;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;

  // -- Trigger field ---------------------------------------------------------
  placeholder?: string | null;
  label?: string | null;
  /**
   * Optional contextual-help icon attached to the field label. When provided,
   * embeds an `ArvoContextHelp` at `size: 'sm'` (14px) absolutely positioned
   * to the right of the label. Has no effect when `label` is omitted.
   */
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  size?: 'sm' | 'lg';
  /**
   * Visual fill of the trigger field. `'filled'` (default) renders the
   * tinted field background. `'base'` swaps to the host surface color so
   * the trigger reads as a flat extension of its parent (toolbars, side
   * panels, table cells, inline-edit rows). Only the at-rest trigger
   * background changes; hover, focus, disabled, readonly, error, text,
   * border, and icon colors are identical across both surfaces.
   */
  surface?: 'filled' | 'base';
  width?: string | null;
  isFullWidth?: boolean;

  // -- State -----------------------------------------------------------------
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMsg?: string | null;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  isLoading?: boolean;
  /** Opt-in clear button (default `false`). */
  isClearable?: boolean;

  // -- Behavior --------------------------------------------------------------
  isAutoClose?: boolean;
  isStrictParsing?: boolean;
  isSegmented?: boolean;

  // -- Member capability -----------------------------------------------------
  frequency?: Frequency | null;
  memberData?: MemberItem[] | null;
  currentMemberIndex?: number | null;
  hasModeToggle?: boolean;

  // -- Rolling capability ----------------------------------------------------
  hasRolling?: boolean;
  rollingPrefix?: string | null;
  rollingValue?: RollingRange | null;

  // -- Anchor / Overlay ------------------------------------------------------
  anchor?: false | true | HTMLElement | string;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';

  // -- Scoped escape-hatch bags ---------------------------------------------
  /**
   * Inner `ArvoCalendar` config the parent doesn't expose flat. Bag-only
   * keys flow through; flat options always win on overlap. Applies to
   * both absolute-mode calendars (member tile panel unaffected).
   */
  calendarProps?: DateRangePickerCalendarProps;
  /**
   * Popover surface options (custom portal -- not `ArvoPopover`). Bag-only
   * keys (`width`, `offset`) flow through; flat options (`placement`)
   * always win on overlap. Z-index is owned by the overlay hub (configure
   * via `overlayHub.configure({ zIndexBase })`).
   */
  popoverProps?: DateRangePickerPopoverProps;

  // -- Callbacks -------------------------------------------------------------
  onChange?: (payload: ArvoDateRangePickerChangePayload) => void;
  onModeChange?: (payload: { mode: ArvoDateRangePickerMode }) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onCancel?: () => void;
  onSave?: () => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

const EM_DASH = '\u2014';
// Right arrow shown between the start and end segments in the trigger input.
const RIGHT_ARROW = '\u2192';

const ZERO_ROLLING: RollingRange = { startOffset: 0, endOffset: 0 };

function coerceDate(
  v: Date | string | null | undefined,
  format: string,
  locale: string,
): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'string') {
    if (v.length === 0) return null;
    return parseDate(v, format, locale);
  }
  return null;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return isSameDay(a, b);
}

function sameRange(a: DateRangeValue, b: DateRangeValue): boolean {
  return sameDay(a.start, b.start) && sameDay(a.end, b.end);
}

function sameRolling(a: RollingRange | null, b: RollingRange | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.startOffset === b.startOffset && a.endOffset === b.endOffset;
}

function clampToBounds(
  v: Date | null,
  min: Date | null,
  max: Date | null,
): Date | null {
  if (v == null) return null;
  if (min && v.getTime() < min.getTime()) return new Date(min.getTime());
  if (max && v.getTime() > max.getTime()) return new Date(max.getTime());
  return v;
}

function orderedRange(a: Date, b: Date): [Date, Date] {
  return isAfterDay(a, b) ? [b, a] : [a, b];
}

function resolveAnchorElement(
  anchor: ArvoDateRangePickerOptions['anchor'],
  host: HTMLElement,
): HTMLElement | null {
  if (anchor === false || anchor == null) return null;
  if (anchor === true) return host;
  if (typeof anchor === 'string') {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>(anchor);
  }
  if (anchor instanceof HTMLElement) return anchor;
  return null;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoDateRangePicker {
  private _element: HTMLElement | null;
  private _opts: Required<Omit<ArvoDateRangePickerOptions,
    | 'onChange' | 'onModeChange' | 'onOpen' | 'onClose' | 'onCancel' | 'onSave'
    | 'startValue' | 'endValue' | 'frequency' | 'memberData' | 'currentMemberIndex'
    | 'rollingValue' | 'minDate' | 'maxDate' | 'anchor'
    | 'calendarProps' | 'popoverProps'
  >> & {
    startValue: Date | string | null | undefined;
    endValue: Date | string | null | undefined;
    minDate: Date | string | null;
    maxDate: Date | string | null;
    frequency: Frequency | null;
    memberData: MemberItem[] | null;
    currentMemberIndex: number | null;
    rollingValue: RollingRange | null;
    anchor: false | true | HTMLElement | string;
    calendarProps: DateRangePickerCalendarProps | null;
    popoverProps: DateRangePickerPopoverProps | null;
    onChange: ((p: ArvoDateRangePickerChangePayload) => void) | null;
    onModeChange: ((p: { mode: ArvoDateRangePickerMode }) => void) | null;
    onOpen: (() => boolean | void) | null;
    onClose: (() => boolean | void) | null;
    onCancel: (() => void) | null;
    onSave: (() => void) | null;
  };

  // Resolved locale + format.
  private _effLocale: string;
  private _effFormat: string;

  // Identity / ids
  private readonly _id: string;
  private readonly _inputId: string;
  private readonly _labelId: string;
  private readonly _errorId: string;
  private readonly _popoverId: string;

  // State
  private _appliedRange: DateRangeValue = { start: null, end: null };
  private _draftRange: DateRangeValue = { start: null, end: null };
  private _draftFirstSet = false;
  private _hoverDate: Date | null = null;
  private _appliedRolling: RollingRange | null = null;
  private _draftRolling: RollingRange = { ...ZERO_ROLLING };
  private _memberToggle = false;
  private _tab: 'absolute' | 'rolling' = 'absolute';
  private _isOpen = false;
  private _visibleYear: number;
  private _visibleMonth: number;
  // Active calendar view in absolute mode. Restricted to the three modes the
  // dual-calendar header / cells understand. Drives the right calendar's
  // visible offset, the header left zone composition, and the header
  // navigation delta (1 month / 1 year / 10 years per click).
  private _viewMode: 'days' | 'months' | 'years' = 'days';
  private _errorOverride: string | null = null;
  private _loadingOverride: boolean | null = null;

  // Member index (engine projection).
  private _memberIndex: MemberIndex | null = null;

  // Anchor mode
  private _useAnchorRender = false;
  private _anchorEl: HTMLElement | null = null;

  // DOM refs
  private _labelEl: HTMLElement | null = null;
  private _fieldEl: HTMLElement | null = null;
  // Dual isSegmented inputs: _inputEl is the start (left, primary focus target);
  // _endInputEl is the end (right). _valueEl wraps both + the arrow glyph.
  private _inputEl: HTMLInputElement | null = null;
  private _endInputEl: HTMLInputElement | null = null;
  private _valueEl: HTMLElement | null = null;
  private _arrowEl: HTMLElement | null = null;
  private _segDividerEl: HTMLElement | null = null;
  private _startCtrl: SegmentController | null = null;
  private _endCtrl: SegmentController | null = null;
  private _focusedSide: 'start' | 'end' | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearBtnEl: HTMLButtonElement | null = null;
  private _triggerBtnEl: HTMLButtonElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errMsgEl: HTMLElement | null = null;
  private _borderEl: HTMLElement | null = null;

  // Popover
  private _popoverEl: HTMLElement | null = null;
  private _modeAnnouncerEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _bodyEl: HTMLElement | null = null;
  private _footerEl: HTMLElement | null = null;
  private _calLeftHostEl: HTMLElement | null = null;
  private _calRightHostEl: HTMLElement | null = null;
  private _calSepEl: HTMLElement | null = null;
  private _tilePanelEl: HTMLElement | null = null;
  private _mtgScrollEl: HTMLElement | null = null;
  private _mtgGridEl: HTMLElement | null = null;
  private _rollingSettingEl: HTMLElement | null = null;
  private _rollingStartHostEl: HTMLElement | null = null;
  private _rollingEndHostEl: HTMLElement | null = null;
  private _infoAlertHostEl: HTMLElement | null = null;
  private _currentIndEl: HTMLElement | null = null;
  private _switchHostEl: HTMLElement | null = null;
  private _tabsHostEl: HTMLElement | null = null;
  private _prevBtnEl: HTMLButtonElement | null = null;
  private _nextBtnEl: HTMLButtonElement | null = null;
  private _todayBtnEl: HTMLButtonElement | null = null;

  // Inner instances
  private _clearBtn: ArvoIconButton | null = null;
  private _triggerBtn: ArvoIconButton | null = null;
  private _errIco: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _infoAlert: ArvoMessageAlert | null = null;
  private _calLeft: ArvoCalendar | null = null;
  private _calRight: ArvoCalendar | null = null;
  private _switch: ArvoSwitch | null = null;
  private _tabs: ArvoButtonGroup | null = null;
  private _rollingStart: ArvoNumberInput | null = null;
  private _rollingEnd: ArvoNumberInput | null = null;
  private _prevBtn: ArvoIconButton | null = null;
  private _nextBtn: ArvoIconButton | null = null;
  private _todayBtn: ArvoIconButton | null = null;
  private _saveBtn: ArvoButton | null = null;
  private _cancelBtn: ArvoButton | null = null;

  // CalendarNav left zone buttons (absolute mode only).
  private _calNavLeftZoneEl: HTMLElement | null = null;
  private _monthBtnL: ArvoButton | null = null;
  private _yearBtnL: ArvoButton | null = null;
  private _monthBtnR: ArvoButton | null = null;
  private _yearBtnR: ArvoButton | null = null;
  private _calNavLeftEl: HTMLElement | null = null;
  private _calNavRightEl: HTMLElement | null = null;
  private _calNavEmDashEl: HTMLElement | null = null;

  // Member / rolling period labels (left zone). One pair of non-interactive
  // spans joined by `__range-sep`; their text is updated reactively as the
  // user scrolls the member tile grid (see #8 visible-tile-tracking).
  private _periodLblPrimaryEl: HTMLElement | null = null;
  private _periodLblSecondaryEl: HTMLElement | null = null;
  private _periodSepEl: HTMLElement | null = null;

  // -- Visible-tile tracking (member / rolling) -----------------------------
  // ResizeObserver + scroll listener on `_mtgScrollEl` recompute the first
  // and last tiles fully visible in the panel. Their `displayName`s drive
  // the header period labels.
  private _firstVisibleMember: NormalizedMember | null = null;
  private _lastVisibleMember: NormalizedMember | null = null;
  private _mtgScrollResizeObserver: ResizeObserver | null = null;
  private _boundMtgScroll: (() => void) | null = null;
  private _mtgScrollRafId: number | null = null;

  private _resizeObserver: ResizeObserver | null = null;

  // OverlaySurface engine (built lazily on first open; reused via surface.open()).
  private _popoverWrapperEl: HTMLElement | null = null;
  private _surface: OverlaySurface | null = null;
  // Set true during programmatic close() so _handleEngineClose knows not to
  // repeat state sync that close() already did.
  private _closingProgrammatically = false;

  // Bound handlers
  private _boundInputKeyDown: (e: KeyboardEvent) => void;
  private _boundSegFocus: (e: FocusEvent) => void;
  private _boundSegBlur: (e: FocusEvent) => void;
  private _boundSegMouseDown: (e: MouseEvent) => void;
  private _boundSegPaste: (e: ClipboardEvent) => void;
  private _boundPopoverKeyDown: (e: KeyboardEvent) => void;
  private _boundAnchorClick: () => void;
  private _boundAnchorKeyDown: (e: KeyboardEvent) => void;

  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options?: ArvoDateRangePickerOptions,
  ): ArvoDateRangePicker {
    return new ArvoDateRangePicker(element, options ?? {});
  }

  constructor(element: HTMLElement, options: ArvoDateRangePickerOptions = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError(
        '[ArvoDateRangePicker] initialize() requires an HTMLElement.',
      );
    }
    this._element = element;

    this._opts = {
      startValue: options.startValue,
      endValue: options.endValue,
      format: options.format ?? null,
      locale: options.locale ?? null,
      weekStart: options.weekStart ?? 0,
      hasWeeks: options.hasWeeks ?? true,
      minDate: options.minDate ?? null,
      maxDate: options.maxDate ?? null,
      placeholder: options.placeholder ?? null,
      label: options.label ?? null,
      contextHelp: options.contextHelp ?? null,
      size: options.size ?? 'lg',
      surface: options.surface ?? 'filled',
      width: options.width ?? null,
      isFullWidth: options.isFullWidth ?? false,
      isDisabled: options.isDisabled ?? false,
      isReadOnly: options.isReadOnly ?? false,
      isRequired: options.isRequired ?? false,
      isInvalid: options.isInvalid ?? false,
      errorMsg: options.errorMsg ?? null,
      errorDisplay: options.errorDisplay ?? 'inline',
      isLoading: options.isLoading ?? false,
      isClearable: options.isClearable ?? false,
      isAutoClose: options.isAutoClose ?? true,
      isStrictParsing: options.isStrictParsing ?? false,
      isSegmented: options.isSegmented ?? true,
      frequency: options.frequency ?? null,
      memberData: options.memberData ?? null,
      currentMemberIndex: options.currentMemberIndex ?? null,
      hasModeToggle: options.hasModeToggle ?? true,
      hasRolling: options.hasRolling ?? false,
      rollingPrefix: options.rollingPrefix ?? null,
      rollingValue: options.rollingValue ?? null,
      anchor: options.anchor ?? false,
      placement: options.placement ?? 'bottom-end',
      calendarProps: options.calendarProps ?? null,
      popoverProps: options.popoverProps ?? null,
      onChange: options.onChange ?? null,
      onModeChange: options.onModeChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onCancel: options.onCancel ?? null,
      onSave: options.onSave ?? null,
    };


    this._effLocale = getUserLocale(this._opts.locale ?? undefined);
    this._effFormat = this._opts.format || getLocaleDateFormat(this._effLocale);

    // Initialize member index FIRST so effective min/max can include the
    // member span when clamping initial values.
    this._memberIndex = this._buildMemberIndex();

    // Initialize applied range.
    this._appliedRange = {
      start: clampToBounds(
        coerceDate(this._opts.startValue ?? null, this._effFormat, this._effLocale),
        this._effMinDate(),
        this._effMaxDate(),
      ),
      end: clampToBounds(
        coerceDate(this._opts.endValue ?? null, this._effFormat, this._effLocale),
        this._effMinDate(),
        this._effMaxDate(),
      ),
    };
    this._draftRange = { ...this._appliedRange };

    // Initialize rolling.
    this._appliedRolling = this._opts.rollingValue ?? null;
    this._draftRolling = this._opts.rollingValue ?? { ...ZERO_ROLLING };

    // Initialize toggles.
    this._memberToggle = this._hasMemberCapability();
    this._tab =
      this._hasRollingCapability() && this._opts.rollingValue
        ? 'rolling'
        : 'absolute';

    // Visible period. pickAnchorDate anchors onto an in-range fallback when
    // no committed range exists, so a bounded picker (e.g. Jan 1-31, 2024)
    // doesn't open onto today when today is out of range.
    const base = pickAnchorDate(
      this._appliedRange.start ?? this._appliedRange.end,
      this._effMinDate(),
      this._effMaxDate(),
    );
    this._visibleYear = base.getFullYear();
    this._visibleMonth = base.getMonth();

    const idNum = ++_idCounter;
    this._id = `arvo-drp-${idNum}`;
    this._inputId = `${this._id}-input`;
    this._labelId = `${this._id}-lbl`;
    this._errorId = `${this._id}-err`;
    this._popoverId = `${this._id}-popover`;

    // Anchor resolution.
    if (this._opts.anchor !== false && this._opts.anchor != null) {
      const resolved = resolveAnchorElement(this._opts.anchor, this._element);
      if (resolved) {
        this._useAnchorRender = true;
        this._anchorEl = resolved;
      } else if (typeof console !== 'undefined') {
        console.warn(
          '[ArvoDateRangePicker] anchor did not resolve to an element; falling back to input mode.',
        );
      }
    }

    this._boundInputKeyDown = (e: KeyboardEvent) =>
      this._handleSegKeyDown(this._segSideOf(e.currentTarget), e);
    this._boundSegFocus = (e: FocusEvent) =>
      this._handleSegFocus(this._segSideOf(e.currentTarget));
    this._boundSegBlur = (e: FocusEvent) =>
      this._handleSegBlur(this._segSideOf(e.currentTarget));
    this._boundSegMouseDown = (e: MouseEvent) =>
      this._handleSegMouseDown(this._segSideOf(e.currentTarget));
    this._boundSegPaste = (e: ClipboardEvent) =>
      this._handleSegPaste(this._segSideOf(e.currentTarget), e);
    this._boundPopoverKeyDown = this._handlePopoverKeyDown.bind(this);
    this._boundAnchorClick = this._handleAnchorClick.bind(this);
    this._boundAnchorKeyDown = this._handleAnchorKeyDown.bind(this);

    // Build DOM (anchor mode skips field/label/input/border/err-msg).
    if (this._useAnchorRender) {
      this._renderDomAnchor();
    } else {
      this._renderDomInput();
      this._observeActions();
    }

    this._applyWidth();
    this._syncRootClasses();
    this._updateInputDisplay();
  }

  // -------------------------------------------------------------------------
  // Capability helpers
  // -------------------------------------------------------------------------

  private _hasMemberCapability(): boolean {
    return Boolean(
      this._opts.memberData &&
        this._opts.memberData.length > 0 &&
        this._opts.frequency,
    );
  }

  private _hasRollingCapability(): boolean {
    return Boolean(this._opts.hasRolling && this._hasMemberCapability());
  }

  private _activeMode(): ArvoDateRangePickerMode {
    if (this._hasRollingCapability() && this._tab === 'rolling') return 'rolling';
    if (this._hasMemberCapability() && this._memberToggle) return 'member';
    return 'absolute';
  }

  private _buildMemberIndex(): MemberIndex | null {
    if (!this._hasMemberCapability()) return null;
    return buildMemberIndex(this._opts.memberData!, {
      frequency: this._opts.frequency!,
      currentMemberIndex: this._opts.currentMemberIndex ?? null,
    });
  }

  private _findMemberFor(date: Date | null): NormalizedMember | null {
    if (!date || !this._memberIndex) return null;
    return findMemberForDate(this._memberIndex, date);
  }

  /**
   * Resolve the member that owns the bucket containing `date`. Returns `null`
   * when the date is outside the configured member span (used both as a
   * validation gate and as the source of truth for input/tile display name).
   */
  private _resolveMemberSnap(date: Date | null): NormalizedMember | null {
    if (!date || !this._memberIndex) return null;
    return findMemberForDate(this._memberIndex, date);
  }

  /**
   * Snap an arbitrary in-bucket date to the canonical edge of its member:
   *   - `start` -> member.keyDate
   *   - `end`   -> member.endDate
   * Returns `null` when the date does not match any bucket so callers can
   * revert to the previously valid value (parity with legacy behavior).
   */
  private _snapDateToMember(
    date: Date | null,
    edge: 'start' | 'end',
  ): Date | null {
    const m = this._resolveMemberSnap(date);
    if (!m) return null;
    return edge === 'start' ? m.keyDate : m.endDate;
  }

  /**
   * Effective min/max dates: when member capability is configured, the picker
   * is hard-bounded by the member span (first.keyDate .. last.endDate). User-
   * supplied min/max can only NARROW that span -- never widen past members.
   */
  private _effMinDate(): Date | null {
    const userMin = this._asDate(this._opts.minDate);
    const memberMin = this._memberIndex?.minDate ?? null;
    if (memberMin && userMin)
      return userMin.getTime() > memberMin.getTime() ? userMin : memberMin;
    return memberMin ?? userMin;
  }

  private _effMaxDate(): Date | null {
    const userMax = this._asDate(this._opts.maxDate);
    const memberMax = this._memberIndex?.maxDate ?? null;
    if (memberMax && userMax)
      return userMax.getTime() < memberMax.getTime() ? userMax : memberMax;
    return memberMax ?? userMax;
  }

  private _effError(): string | null {
    if (this._errorOverride != null) return this._errorOverride;
    if (this._opts.isInvalid) return this._opts.errorMsg ?? null;
    return null;
  }

  private _effLoading(): boolean {
    return this._loadingOverride ?? this._opts.isLoading;
  }

  private _asDate(v: Date | string | null): Date | null {
    return coerceDate(v, this._effFormat, this._effLocale);
  }

  // -------------------------------------------------------------------------
  // DOM construction
  // -------------------------------------------------------------------------

  private _renderDomInput(): void {
    const root = this._element!;
    root.id = this._id;

    if (this._opts.label) {
      this._labelEl = ArvoFormLabel.initialize(null, {
        text: this._opts.label,
        for: `${this._inputId}-start`,
        isRequired: this._opts.isRequired,
        contextHelp: this._opts.contextHelp,
        isDisabled: this._opts.isDisabled,
        // Mirror React: `has-error` flips when isInvalid OR an imperative
        // setError() override is active, so the label's invalid styling
        // tracks both signals.
        isInvalid: this._opts.isInvalid || this._effError() != null,
      }).el as HTMLLabelElement;
      this._labelEl.id = this._labelId;
      this._labelEl.classList.add('arvo-drp__lbl');
      root.appendChild(this._labelEl);
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-drp__field';

    // Dual-segment value: [start segment] [arrow] [end segment].
    this._valueEl = document.createElement('div');
    this._valueEl.className = 'arvo-drp__value';

    this._inputEl = this._buildSegInput('start');
    this._arrowEl = document.createElement('span');
    this._arrowEl.className = 'arvo-drp__arrow';
    this._arrowEl.setAttribute('aria-hidden', 'true');
    this._arrowEl.textContent = RIGHT_ARROW;
    this._endInputEl = this._buildSegInput('end');

    this._valueEl.appendChild(this._inputEl);
    this._valueEl.appendChild(this._arrowEl);
    this._valueEl.appendChild(this._endInputEl);
    this._fieldEl.appendChild(this._valueEl);

    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-drp__actions';
    this._fieldEl.appendChild(this._actionsEl);

    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-drp__border';
    this._fieldEl.appendChild(this._borderEl);

    root.appendChild(this._fieldEl);

    this._renderActions();
    this._renderInlineError();
    this._updateInputDisplay();
  }

  // Builds one isSegmented date input (start | end) with shared attributes and
  // listeners. The bound handlers infer the side from the event target.
  private _buildSegInput(side: 'start' | 'end'): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `${this._inputId}-${side}`;
    input.className = `arvo-drp__seg arvo-drp__seg--${side}`;
    input.setAttribute('role', 'combobox');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-haspopup', 'dialog');
    input.setAttribute('aria-expanded', String(this._isOpen));
    input.setAttribute('aria-controls', this._popoverId);
    input.setAttribute('aria-label', `${this._fieldLabel()} ${side}`);
    input.readOnly = !this._isAbsoluteEditable();
    const ph = this._segPlaceholder();
    if (ph) input.placeholder = ph;
    if (this._opts.isDisabled) {
      input.disabled = true;
      input.setAttribute('aria-disabled', 'true');
    }
    if (side === 'start' && this._opts.isRequired) {
      input.setAttribute('aria-required', 'true');
    }
    if (this._opts.isInvalid || this._effError() != null) {
      input.setAttribute('aria-invalid', 'true');
    }
    // aria-busy only on the start input, matching React (end input omits it).
    if (side === 'start' && this._effLoading()) input.setAttribute('aria-busy', 'true');
    input.addEventListener('keydown', this._boundInputKeyDown);
    input.addEventListener('focus', this._boundSegFocus);
    input.addEventListener('blur', this._boundSegBlur);
    input.addEventListener('mousedown', this._boundSegMouseDown);
    input.addEventListener('paste', this._boundSegPaste);
    return input;
  }

  private _renderDomAnchor(): void {
    const root = this._element!;
    root.id = this._id;

    if (this._anchorEl) {
      this._anchorEl.setAttribute('aria-haspopup', 'dialog');
      this._anchorEl.setAttribute('aria-expanded', 'false');
      this._anchorEl.setAttribute('aria-controls', this._popoverId);
      this._anchorEl.addEventListener('click', this._boundAnchorClick);
      this._anchorEl.addEventListener('keydown', this._boundAnchorKeyDown);
    }
  }

  // Build the actions overlay (clear + err-ico + trigger-btn).
  private _renderActions(): void {
    if (!this._actionsEl) return;

    this._clearBtn?.destroy();
    this._clearBtn = null;
    this._triggerBtn?.destroy();
    this._triggerBtn = null;
    this._errIco?.destroy();
    this._errIco = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._segDividerEl = null;
    this._actionsEl.textContent = '';

    const hasValue =
      this._appliedRange.start != null || this._appliedRange.end != null;
    const disabled = this._opts.isDisabled;
    const readonly = this._opts.isReadOnly;
    const loading = this._effLoading();
    const err = this._effError();
    const showTooltipIcon = err != null && this._opts.errorDisplay === 'tooltip';
    const showClear =
      this._opts.isClearable === true &&
      hasValue &&
      !disabled &&
      !readonly &&
      !loading &&
      !showTooltipIcon;
    const showSep = !loading && (showClear || showTooltipIcon);

    if (showClear) {
      this._clearBtnEl = document.createElement('button') as HTMLButtonElement;
      this._clearBtnEl.classList.add('arvo-drp__clear-btn');
      this._clearBtnEl.setAttribute('tabindex', '-1');
      this._actionsEl.appendChild(this._clearBtnEl);
      this._clearBtn = ArvoIconButton.initialize(this._clearBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'close',
        tooltip: 'Clear',
        onClick: (e: Event) => {
          e.stopPropagation();
          this.clear();
        },
      });
    }

    if (showTooltipIcon) {
      this._errIco = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: err ?? '',
      });
      this._errIcoEl = this._errIco.el;
      this._errIcoEl.classList.add('arvo-drp__err-ico');
      this._actionsEl.appendChild(this._errIcoEl);
    }

    if (showSep) {
      // Vertical divider between the dynamic actions and the trigger button
      // (Figma input separator 32000:3880). Rendered only when at least one
      // dynamic action (clear / error-tooltip-icon) is present so the
      // trigger sits flush against the field edge otherwise.
      this._segDividerEl = document.createElement('span');
      this._segDividerEl.className = 'arvo-drp__seg-divider';
      this._segDividerEl.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(this._segDividerEl);
    }

    if (!loading) {
      this._triggerBtnEl = document.createElement('button') as HTMLButtonElement;
      this._triggerBtnEl.classList.add('arvo-drp__trigger-btn');
      this._triggerBtnEl.setAttribute('aria-haspopup', 'dialog');
      this._triggerBtnEl.setAttribute('aria-controls', this._popoverId);
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
      this._actionsEl.appendChild(this._triggerBtnEl);
      this._triggerBtn = ArvoIconButton.initialize(this._triggerBtnEl, {
        variant: 'tertiary',
        size: 'sm',
        icon: 'calendar-o',
        tooltip: 'Select start and end date',
        isDisabled: disabled || readonly,
        isSelected: this._isOpen,
        onClick: () => this._handleTriggerClick(),
      });
    }

    this._updatePadding();
  }

  private _renderInlineError(): void {
    if (!this._element) return;
    const err = this._effError();
    const showInline = err != null && this._opts.errorDisplay === 'inline';
    if (showInline) {
      if (!this._errMsgEl) {
        this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
          type: 'negative',
          message: err,
          id: this._errorId,
        });
        this._errMsgEl = this._inlineAlert.el;
        this._errMsgEl.classList.add('arvo-drp__err-msg');
        this._element.appendChild(this._errMsgEl);
      } else {
        this._inlineAlert?.message(err);
      }
      this._inputEl?.setAttribute('aria-describedby', this._errorId);
    } else if (this._errMsgEl) {
      this._inlineAlert?.destroy();
      this._inlineAlert = null;
      this._errMsgEl.remove();
      this._errMsgEl = null;
      this._inputEl?.removeAttribute('aria-describedby');
    }
  }

  // -------------------------------------------------------------------------
  // Width + padding
  // -------------------------------------------------------------------------

  private _applyWidth(): void {
    if (!this._element) return;
    const w = this._opts.isFullWidth ? '100%' : this._opts.width;
    if (w) this._element.style.setProperty('--arvo-form-input-width', w);
    else this._element.style.removeProperty('--arvo-form-input-width');
  }

  private _observeActions(): void {
    if (!this._actionsEl) return;
    if (typeof ResizeObserver === 'undefined') return;
    this._resizeObserver = new ResizeObserver(() => this._updatePadding());
    this._resizeObserver.observe(this._actionsEl);
    this._updatePadding();
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${pad}px`);
  }

  // -------------------------------------------------------------------------
  // Class composition
  // -------------------------------------------------------------------------

  private _syncRootClasses(): void {
    if (!this._element) return;
    const opts = this._opts;
    const err = this._effError();
    const loading = this._effLoading();
    const hasValue =
      this._appliedRange.start != null || this._appliedRange.end != null;
    const mode = this._activeMode();

    const classes = [
      'arvo-drp',
      `arvo-drp--${opts.size}`,
      `arvo-drp--surface-${opts.surface}`,
      `arvo-drp--${mode}`,
      opts.isFullWidth && 'arvo-drp--full-width',
      opts.hasWeeks && 'arvo-drp--show-weeks',
      this._useAnchorRender && 'arvo-drp--anchor-mode',
      loading && 'loading',
      opts.isDisabled && 'is-disabled',
      opts.isReadOnly && 'is-readonly',
      err != null && 'has-error',
      err != null && opts.errorDisplay === 'tooltip' && 'error-tooltip',
      hasValue && 'has-value',
      this._focusedSide != null && 'has-text-selected',
      this._isOpen && 'open',
    ].filter(Boolean) as string[];

    this._element.className = classes.join(' ');

    for (const input of [this._inputEl, this._endInputEl]) {
      if (!input) continue;
      input.setAttribute('aria-expanded', String(this._isOpen));
      if (opts.isInvalid || err != null) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      // aria-busy only on the start input, matching React (end input omits it).
      if (input === this._inputEl) {
        if (loading) input.setAttribute('aria-busy', 'true');
        else input.removeAttribute('aria-busy');
      }
      if (opts.isDisabled) {
        input.disabled = true;
        input.setAttribute('aria-disabled', 'true');
      } else {
        input.disabled = false;
        input.removeAttribute('aria-disabled');
      }
    }

    if (this._triggerBtnEl) {
      this._triggerBtnEl.setAttribute('aria-expanded', String(this._isOpen));
    }
    if (this._useAnchorRender && this._anchorEl) {
      this._anchorEl.setAttribute('aria-expanded', String(this._isOpen));
    }

    this._syncPopoverWrapperClasses();
  }

  /**
   * Keeps the display:contents wrapper's modifier classes in sync so the
   * `--arvo-drp-popover-*` CSS variable cascade matches React's
   * `popoverRootClass` wrapper (`arvo-drp`, size, mode, --full-width,
   * --show-weeks, loading). Called from _syncRootClasses() and _buildPopover().
   */
  private _syncPopoverWrapperClasses(): void {
    if (!this._popoverWrapperEl) return;
    const opts = this._opts;
    const loading = this._effLoading();
    const mode = this._activeMode();
    const cls = [
      'arvo-drp',
      `arvo-drp--${opts.size}`,
      `arvo-drp--${mode}`,
      opts.isFullWidth && 'arvo-drp--full-width',
      opts.hasWeeks && 'arvo-drp--show-weeks',
      // --anchor-mode is intentionally omitted here; it belongs on the field
      // root only (mirrors React's popoverRootClass which also omits it).
      loading && 'loading',
    ].filter(Boolean) as string[];
    this._popoverWrapperEl.className = cls.join(' ');
  }

  // -------------------------------------------------------------------------
  // Display value
  // -------------------------------------------------------------------------

  private _fieldLabel(): string {
    return this._opts.label ?? 'Date range';
  }

  private _segPlaceholder(): string {
    return this._opts.placeholder ?? this._effFormat;
  }

  // Segmented editing is wired only in absolute mode and only when interactive;
  // member / rolling inputs are read-only resolved labels.
  private _isAbsoluteEditable(): boolean {
    return (
      (this._opts.isSegmented ?? true) &&
      this._activeMode() === 'absolute' &&
      !this._opts.isReadOnly &&
      !this._opts.isDisabled
    );
  }

  // Read-only per-side text for member / rolling modes (or non-editable absolute).
  private _baseSideText(side: 'start' | 'end'): string {
    if (
      this._appliedRolling &&
      !this._appliedRange.start &&
      !this._appliedRange.end
    ) {
      const off =
        side === 'start'
          ? this._appliedRolling.startOffset
          : this._appliedRolling.endOffset;
      const prefix = this._opts.rollingPrefix ?? '';
      return off > 0 ? `${prefix} +${off}` : `${prefix} ${off}`;
    }
    const d = side === 'start' ? this._appliedRange.start : this._appliedRange.end;
    if (!d) return '';
    if (this._hasMemberCapability()) {
      const m = this._findMemberFor(d);
      if (m) return m.displayName;
    }
    return formatDate(d, this._effFormat, this._effLocale);
  }

  private _segSideOf(target: EventTarget | null): 'start' | 'end' {
    return target === this._endInputEl ? 'end' : 'start';
  }

  private _segCtrl(side: 'start' | 'end'): SegmentController | null {
    return side === 'start' ? this._startCtrl : this._endCtrl;
  }

  private _segInputEl(side: 'start' | 'end'): HTMLInputElement | null {
    return side === 'start' ? this._inputEl : this._endInputEl;
  }

  private _initSegmentControllers(): void {
    const minD = this._effMinDate();
    const maxD = this._effMaxDate();
    const make = (side: 'start' | 'end'): SegmentController => {
      const ctrl = createSegmentController({
        format: this._effFormat,
        locale: this._effLocale,
        value: side === 'start' ? this._appliedRange.start : this._appliedRange.end,
        min: minD,
        max: maxD,
        commit: 'blur',
      });
      ctrl.on('commit', (p) =>
        this._commitSide(side, (p as { date: Date | null }).date),
      );
      ctrl.on('segment', () => {
        this._syncSegHasTextSelected();
        this._restoreSegCaret();
      });
      ctrl.on('change', () => this._refreshSeg(side));
      return ctrl;
    };
    this._startCtrl = make('start');
    this._endCtrl = make('end');
    this._refreshSeg('start');
    this._refreshSeg('end');
  }

  private _destroySegmentControllers(): void {
    this._startCtrl?.destroy();
    this._endCtrl?.destroy();
    this._startCtrl = null;
    this._endCtrl = null;
  }

  private _refreshSeg(side: 'start' | 'end'): void {
    const ctrl = this._segCtrl(side);
    const input = this._segInputEl(side);
    if (!ctrl || !input) return;
    input.value = ctrl.getFormattedDisplay(this._focusedSide === side);
  }

  private _commitSide(side: 'start' | 'end', date: Date | null): void {
    const cur = this._appliedRange;
    let resolved: Date | null = date;

    // When member capability is on, every committed date must snap to a
    // member bucket (start -> keyDate, end -> endDate). Out-of-range or
    // non-resolving dates revert to the previously applied value so the
    // input never shows an invalid date or non-member text.
    if (this._hasMemberCapability() && date != null) {
      const snapped = this._snapDateToMember(date, side);
      if (snapped == null) {
        // Invalid edit -- revert to previously valid value and re-render.
        resolved = side === 'start' ? cur.start : cur.end;
        const ctrl = this._segCtrl(side);
        if (ctrl) ctrl.setValue(resolved, { silent: true });
        this._updateInputDisplay();
        return;
      }
      resolved = snapped;
    }

    const next: DateRangeValue =
      side === 'start'
        ? { start: resolved, end: cur.end }
        : { start: cur.start, end: resolved };
    this._commitRange(next, 'absolute');
  }

  private _syncSegHasTextSelected(): void {
    this._element?.classList.toggle('has-text-selected', this._focusedSide != null);
  }

  private _restoreSegCaret(): void {
    if (!this._isAbsoluteEditable()) return;
    const side = this._focusedSide;
    if (!side) return;
    const ctrl = this._segCtrl(side);
    const input = this._segInputEl(side);
    if (!ctrl || !input) return;
    const seg = ctrl.getFocusedSegment();
    if (!seg) return;
    try {
      input.setSelectionRange(seg.startOffset, seg.endOffset);
    } catch {
      // best-effort caret positioning
    }
  }

  private _focusEndFirst(): void {
    this._endInputEl?.focus();
    this._endCtrl?.focusSegment(0);
  }

  private _focusStartLast(): void {
    this._inputEl?.focus();
    const segs = this._startCtrl?.getValue().segments ?? [];
    this._startCtrl?.focusSegment(Math.max(0, segs.length - 1));
  }

  private _handleSegFocus(side: 'start' | 'end'): void {
    this._focusedSide = side;
    if (!this._isAbsoluteEditable()) return;
    const ctrl = this._segCtrl(side);
    const input = this._segInputEl(side);
    if (!ctrl || !input) return;
    input.value = ctrl.getFormattedDisplay(true);
    ctrl.focusSegment(0);
    this._syncSegHasTextSelected();
    this._restoreSegCaret();
  }

  private _handleSegBlur(side: 'start' | 'end'): void {
    if (this._focusedSide === side) this._focusedSide = null;
    const input = this._segInputEl(side);
    if (input) {
      // When member capability is on, blur swaps the input back to the
      // member's displayName via _baseSideText (covers all valid commits and
      // reverted invalid edits). Otherwise fall back to the segment
      // controller's unfocused formatted date.
      if (this._hasMemberCapability()) {
        input.value = this._baseSideText(side);
      } else {
        const ctrl = this._segCtrl(side);
        if (this._isAbsoluteEditable() && ctrl) {
          input.value = ctrl.getFormattedDisplay(false);
        }
      }
    }
    this._syncSegHasTextSelected();
  }

  /**
   * Click-to-segment. Mirrors the single-input pickers but per-side because
   * the DRP carries two segment controllers. See DatePicker.ts for the rAF
   * rationale.
   */
  private _handleSegMouseDown(side: 'start' | 'end'): void {
    if (!this._isAbsoluteEditable()) return;
    const input = this._segInputEl(side);
    if (!input) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;
      const ctrl = this._segCtrl(side);
      if (!ctrl) return;
      const offset = input.selectionStart ?? null;
      if (offset === null) return;
      const idx = ctrl.findSegmentForOffset(offset);
      if (idx !== null) {
        ctrl.focusSegment(idx);
        this._restoreSegCaret();
      }
    });
  }

  private _handleSegPaste(side: 'start' | 'end', e: ClipboardEvent): void {
    const ctrl = this._segCtrl(side);
    if (!this._isAbsoluteEditable() || !ctrl) return;
    const text = e.clipboardData?.getData('text') ?? '';
    const res = ctrl.handlePaste(text);
    if (res.consumed) e.preventDefault();
  }

  private _updateInputDisplay(): void {
    const editable = this._isAbsoluteEditable();
    const overrideWithMemberName = this._hasMemberCapability();
    if (this._inputEl) this._inputEl.readOnly = !editable;
    if (this._endInputEl) this._endInputEl.readOnly = !editable;
    if (editable) {
      if (!this._startCtrl) {
        this._initSegmentControllers();
      } else {
        this._startCtrl.setValue(this._appliedRange.start, { silent: true });
        this._endCtrl?.setValue(this._appliedRange.end, { silent: true });
      }
      if (overrideWithMemberName) {
        // Member-data mode (absolute, member, or rolling) always reads
        // member.displayName for the input values; the segment controllers
        // still drive keyboard interaction underneath when in absolute
        // editable mode.
        if (this._focusedSide !== 'start' && this._inputEl) {
          this._inputEl.value = this._baseSideText('start');
        }
        if (this._focusedSide !== 'end' && this._endInputEl) {
          this._endInputEl.value = this._baseSideText('end');
        }
      } else {
        if (this._focusedSide !== 'start') this._refreshSeg('start');
        if (this._focusedSide !== 'end') this._refreshSeg('end');
      }
    } else {
      this._destroySegmentControllers();
      if (this._inputEl) this._inputEl.value = this._baseSideText('start');
      if (this._endInputEl) this._endInputEl.value = this._baseSideText('end');
    }
  }

  // -------------------------------------------------------------------------
  // Commit / dispatch
  // -------------------------------------------------------------------------

  private _commitRange(next: DateRangeValue, mode: ArvoDateRangePickerMode): boolean {
    const minD = this._effMinDate();
    const maxD = this._effMaxDate();
    const clamped: DateRangeValue = {
      start: clampToBounds(next.start, minD, maxD),
      end: clampToBounds(next.end, minD, maxD),
    };
    if (clamped.start && clamped.end && isAfterDay(clamped.start, clamped.end)) {
      const [s, e] = orderedRange(clamped.start, clamped.end);
      clamped.start = s;
      clamped.end = e;
    }
    const changed = !sameRange(clamped, this._appliedRange);
    const previouslyRolling = this._appliedRolling;
    if (mode !== 'rolling') {
      this._appliedRolling = null;
    }
    if (!changed && !previouslyRolling) return false;
    this._appliedRange = clamped;
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();

    const formattedStart = clamped.start
      ? formatDate(clamped.start, this._effFormat, this._effLocale)
      : '';
    const formattedEnd = clamped.end
      ? formatDate(clamped.end, this._effFormat, this._effLocale)
      : '';
    const memberRange = this._hasMemberCapability()
      ? {
          start: this._findMemberFor(clamped.start),
          end: this._findMemberFor(clamped.end),
        }
      : undefined;
    const payload: ArvoDateRangePickerChangePayload = {
      start: clamped.start,
      end: clamped.end,
      formatted: { start: formattedStart, end: formattedEnd },
      mode,
      memberRange,
    };
    this._opts.onChange?.(payload);
    this._element?.dispatchEvent(
      new CustomEvent('drp:change', {
        bubbles: true,
        cancelable: false,
        detail: payload,
      }),
    );
    return true;
  }

  private _commitRolling(range: RollingRange): boolean {
    if (!this._memberIndex) return false;
    const resolved = rollingRangeToMembers(this._memberIndex, range);
    const next: DateRangeValue = {
      start: resolved.start?.keyDate ?? null,
      end: resolved.end?.keyDate ?? null,
    };
    const changed =
      !sameRange(next, this._appliedRange) ||
      !sameRolling(range, this._appliedRolling);
    this._appliedRange = next;
    this._appliedRolling = range;
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();

    const payload: ArvoDateRangePickerChangePayload = {
      start: next.start,
      end: next.end,
      formatted: {
        start: next.start
          ? formatDate(next.start, this._effFormat, this._effLocale)
          : '',
        end: next.end
          ? formatDate(next.end, this._effFormat, this._effLocale)
          : '',
      },
      mode: 'rolling',
      memberRange: { start: resolved.start, end: resolved.end },
      rollingValue: range,
    };
    if (changed) {
      this._opts.onChange?.(payload);
      this._element?.dispatchEvent(
        new CustomEvent('drp:change', {
          bubbles: true,
          cancelable: false,
          detail: payload,
        }),
      );
    }
    return changed;
  }

  // -------------------------------------------------------------------------
  // Open / close
  // -------------------------------------------------------------------------

  open(): void {
    if (this._destroyed) return;
    if (this._isOpen) return;
    if (this._opts.isDisabled || this._effLoading() || this._opts.isReadOnly) return;

    // Dispatch cancelable event BEFORE mutating state so listeners calling
    // event.preventDefault() (or onOpen returning false) cancel the open.
    if (this._opts.onOpen?.() === false) return;
    const evt = new CustomEvent('drp:open', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(evt);
    if (proceed === false) return;

    // Open in rolling mode if applied rolling exists; otherwise force
    // the tab back to absolute so reopening after a detach starts fresh.
    if (this._hasRollingCapability() && this._appliedRolling) {
      this._tab = 'rolling';
      this._draftRolling = { ...this._appliedRolling };
    } else {
      this._tab = 'absolute';
    }

    const center = pickAnchorDate(
      this._appliedRange.start ?? this._appliedRange.end,
      this._effMinDate(),
      this._effMaxDate(),
    );
    this._visibleYear = center.getFullYear();
    this._visibleMonth = center.getMonth();
    this._viewMode = 'days';

    // Reset draft to match applied range (clears any leftover hover).
    this._draftRange = { ...this._appliedRange };
    this._draftFirstSet = false;
    this._hoverDate = null;
    this._isOpen = true;

    // Seed visible-tile labels from the start of the member list (the tile
    // tracker on the scroll container will refresh these as soon as the
    // panel mounts).
    if (this._memberIndex && this._memberIndex.members.length > 0) {
      this._firstVisibleMember = this._memberIndex.members[0];
      const lastIndex = Math.min(2, this._memberIndex.members.length - 1);
      this._lastVisibleMember = this._memberIndex.members[lastIndex];
    } else {
      this._firstVisibleMember = null;
      this._lastVisibleMember = null;
    }

    this._buildPopover();
    this._renderPopover();

    // Hide until the engine's first position update lands (avoid flash);
    // the position.apply callback clears visibility on first run.
    if (this._popoverEl) {
      this._popoverEl.style.visibility = 'hidden';
    }

    // Build the surface lazily on first open; subsequent opens reuse it via
    // surface.open() (the engine re-mounts via mount.target on each open).
    if (!this._surface && this._popoverEl) {
      this._surface = createOverlaySurface({
        id: this._id,
        surface: this._popoverEl,
        type: 'dropdown',
        priority: 20,
        trigger:
          (this._useAnchorRender ? this._anchorEl : this._fieldEl) ?? null,
        mount: {
          // The engine appends _popoverEl to the display:contents wrapper on
          // open and removes it on close. The wrapper itself stays on
          // document.body permanently (invisible) so the modifier-class cascade
          // is always available when the engine re-mounts on the next open.
          target: () => this._popoverWrapperEl ?? document.body,
          removeOnClose: true,
        },
        position: {
          placement: this._opts.placement,
          gap: this._opts.popoverProps?.offset ?? 4,
          apply: (pos: PositionResult, surfaceEl: HTMLElement) => {
            applyPositionToSurface(pos, surfaceEl);
            surfaceEl.style.visibility = '';
          },
        },
        focus: {
          mode: 'trap',
          initialFocus: 'none',
          returnFocus: false,
          getOrderedElements: () => this._getOrderedPopoverElements(),
        },
        transition: 'fade',
        transitionDuration: 150,
        // The engine writes aria-haspopup / aria-controls / aria-expanded on
        // the trigger element. The picker already wires the canonical combobox
        // ARIA on the role="combobox" inputs and on the anchor element.
        // Disable the engine writes so there is a single source of truth --
        // same strategy as DatePicker, TimePicker, and DateTimePicker.
        triggerAria: false,
        onClose: this._handleEngineClose,
      });
    } else if (this._surface) {
      // Refresh the trigger in case the consumer swapped the anchor element
      // between opens (rare but supported).
      this._surface.setTrigger(
        (this._useAnchorRender ? this._anchorEl : this._fieldEl) ?? null,
      );
    }

    void this._surface?.open();

    this._syncRootClasses();
    this._triggerBtn?.selected(true);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'true');
  }

  close(): void {
    if (this._destroyed) return;
    if (!this._isOpen) return;

    if (this._opts.onClose?.() === false) return;
    const evt = new CustomEvent('drp:close', { bubbles: true, cancelable: true });
    const proceed = this._element?.dispatchEvent(evt);
    if (proceed === false) return;

    // Discard draft.
    this._draftRange = { ...this._appliedRange };
    this._draftFirstSet = false;
    this._hoverDate = null;

    this._isOpen = false;

    // Signal the engine onClose hook to skip its silent-close work -- we own
    // the cancellable path, so we sync state + classes + focus return here.
    // surface.close() calls onClose (= _handleEngineClose) synchronously
    // before yielding to the exit animation, so the flag is still true when
    // the hook fires.
    this._closingProgrammatically = true;
    void this._surface?.close();
    this._closingProgrammatically = false;

    this._syncRootClasses();
    this._triggerBtn?.selected(false);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'false');

    // Restore focus to trigger.
    const focusTarget = this._anchorEl ?? this._inputEl;
    if (focusTarget) {
      const f = focusTarget as HTMLElement;
      requestAnimationFrame(() => f.focus({ preventScroll: true }));
    }
  }

  /**
   * Engine-driven close callback. Fires for outside-click (via the hub).
   * Per the cross-cutting overlay policy, engine-driven dismissals are
   * unconditional and silent -- no drp:close dispatch, no onClose veto.
   *
   * The `_closingProgrammatically` flag guards the symmetric case where
   * this.close() sets the flag before calling surface.close(). In that path
   * the hook fires while the flag is true and we return early, since the
   * programmatic path already synced state + classes + focus return.
   *
   * Rolling-mode outside-click does not fire drp:cancel / onCancel -- the
   * engine owns dismissal, a deliberate DRP-specific behavior difference
   * from the other overlay-driven pickers.
   */
  private _handleEngineClose = (): void => {
    if (this._closingProgrammatically) {
      // Programmatic close already dispatched drp:close + set state;
      // the engine just confirms by calling onClose. Do nothing extra.
      return;
    }
    // Engine-driven path (outside-click via hub).
    if (!this._isOpen) return;
    this._isOpen = false;
    this._syncRootClasses();
    this._triggerBtn?.selected(false);
    this._triggerBtnEl?.setAttribute('aria-expanded', 'false');
    if (this._useAnchorRender) {
      this._anchorEl?.focus({ preventScroll: true });
    } else {
      this._inputEl?.focus({ preventScroll: true });
    }
  };

  toggle(force?: boolean): void {
    if (force === undefined) {
      if (this._isOpen) this.close();
      else this.open();
    } else if (force) this.open();
    else this.close();
  }

  // -------------------------------------------------------------------------
  // Popover lifecycle
  // -------------------------------------------------------------------------

  private _buildPopover(): void {
    if (this._popoverEl) return;

    // The engine mounts/unmounts the popover via mount.target + removeOnClose
    // on each open/close cycle (mirrors the React portal pattern). Build the
    // DOM once and hand it to the surface; do NOT append to document.body here.
    this._popoverEl = document.createElement('div');
    this._popoverEl.id = this._popoverId;
    this._popoverEl.className = 'arvo-drp__popover';
    this._popoverEl.setAttribute('role', 'dialog');
    this._popoverEl.setAttribute('aria-label', this._popoverAriaLabel());
    this._popoverEl.setAttribute('aria-modal', 'false');
    this._popoverEl.setAttribute('tabindex', '-1');
    this._popoverEl.style.position = 'fixed';
    this._popoverEl.style.top = '0';
    this._popoverEl.style.left = '0';
    this._popoverEl.style.margin = '0';
    // Z-index is assigned by the overlay hub when the surface opens.
    // Hybrid prop surface: popoverProps.width (bag-only) flows through.
    if (this._opts.popoverProps?.width) {
      this._popoverEl.style.width = this._opts.popoverProps.width;
    }
    this._popoverEl.addEventListener('keydown', this._boundPopoverKeyDown);

    // Visually hidden live region. Announces mode flips (Absolute / Member /
    // Rolling) to assistive tech.
    this._modeAnnouncerEl = document.createElement('span');
    this._modeAnnouncerEl.className = 'arvo-sr-only';
    this._modeAnnouncerEl.setAttribute('aria-live', 'polite');
    this._modeAnnouncerEl.setAttribute('aria-atomic', 'true');
    this._popoverEl.appendChild(this._modeAnnouncerEl);

    this._headerEl = document.createElement('div');
    this._headerEl.className = 'arvo-cal-nav arvo-drp__header';
    this._popoverEl.appendChild(this._headerEl);

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'arvo-drp__body';
    this._popoverEl.appendChild(this._bodyEl);

    // Build the display:contents wrapper that carries modifier classes so the
    // --arvo-drp-popover-* CSS variable cascade reaches the popoverEl.
    // Mirrors React's popoverRootClass wrapper. Appended to document.body once
    // and stays permanently (it's invisible with display:contents). The engine
    // mounts/unmounts _popoverEl inside it via mount.target.
    this._popoverWrapperEl = document.createElement('div');
    this._popoverWrapperEl.style.display = 'contents';
    this._syncPopoverWrapperClasses();
    document.body.appendChild(this._popoverWrapperEl);
  }

  /**
   * Destroys inner components without removing the popover shell. Called from
   * _renderPopover() before rebuilding content, and from _destroyPopover().
   */
  private _destroyPopoverContent(): void {
    this._removeMtgVisibleTracker();

    this._calLeft?.destroy(); this._calLeft = null;
    this._calRight?.destroy(); this._calRight = null;
    this._switch = null;
    this._tabs?.destroy?.(); this._tabs = null;
    this._rollingStart?.destroy(); this._rollingStart = null;
    this._rollingEnd?.destroy(); this._rollingEnd = null;
    this._prevBtn?.destroy(); this._prevBtn = null;
    this._nextBtn?.destroy(); this._nextBtn = null;
    this._todayBtn?.destroy(); this._todayBtn = null;
    this._saveBtn?.destroy(); this._saveBtn = null;
    this._cancelBtn?.destroy(); this._cancelBtn = null;
    this._monthBtnL?.destroy(); this._monthBtnL = null;
    this._yearBtnL?.destroy(); this._yearBtnL = null;
    this._monthBtnR?.destroy(); this._monthBtnR = null;
    this._yearBtnR?.destroy(); this._yearBtnR = null;
    this._infoAlert?.destroy(); this._infoAlert = null;

    // Footer is appended directly to `_popoverEl` (NOT to `_bodyEl`), so
    // clearing the body via `textContent = ''` in `_renderPopover()` leaves
    // any existing footer node orphaned. Remove it explicitly here -- otherwise
    // every rolling -> non-rolling -> rolling mode switch (and every reopen
    // while popover DOM is reused via `removeOnClose: true`) would stack a
    // fresh footer on top of the previous one.
    this._footerEl?.remove();
    this._footerEl = null;
    this._calLeftHostEl = null;
    this._calRightHostEl = null;
    this._calSepEl = null;
    this._tilePanelEl = null;
    this._mtgScrollEl = null;
    this._mtgGridEl = null;
    this._rollingSettingEl = null;
    this._rollingStartHostEl = null;
    this._rollingEndHostEl = null;
    this._infoAlertHostEl = null;
    this._currentIndEl = null;
    this._switchHostEl = null;
    this._tabsHostEl = null;
    this._prevBtnEl = null;
    this._nextBtnEl = null;
    this._todayBtnEl = null;
    this._calNavLeftZoneEl = null;
    this._calNavLeftEl = null;
    this._calNavRightEl = null;
    this._calNavEmDashEl = null;
    this._periodLblPrimaryEl = null;
    this._periodLblSecondaryEl = null;
    this._periodSepEl = null;
  }

  private _destroyPopover(): void {
    this._destroyPopoverContent();

    if (this._popoverEl) {
      this._popoverEl.removeEventListener('keydown', this._boundPopoverKeyDown);
      this._popoverEl.remove();
      this._popoverEl = null;
    }
    this._modeAnnouncerEl = null;
    this._headerEl = null;
    this._bodyEl = null;
  }

  private _popoverAriaLabel(): string {
    const mode = this._activeMode();
    if (mode === 'rolling') return 'Choose a rolling time range';
    if (mode === 'member') return 'Choose a time period range';
    return 'Choose a date range';
  }

  // Build header + body based on active mode.
  private _renderPopover(): void {
    if (!this._headerEl || !this._bodyEl) return;
    const mode = this._activeMode();
    // Refresh the wrapper modifier classes so the mode class tracks tab /
    // switch changes while the popover is open. The wrapper carries the same
    // `arvo-drp arvo-drp--{mode}` shell that the picker root carries; SCSS
    // sizing rules (popover-w / popover-h) cascade from it.
    this._syncPopoverWrapperClasses();

    // Destroy any previously built inner components before clearing the DOM
    // so event listeners and JS instances are cleaned up properly.
    this._destroyPopoverContent();

    this._headerEl.textContent = '';
    this._bodyEl.textContent = '';

    // Update the mode announcer so AT picks up the change.
    if (this._modeAnnouncerEl) {
      this._modeAnnouncerEl.textContent =
        mode === 'rolling'
          ? 'Rolling time range mode'
          : mode === 'member'
            ? 'Time period range mode'
            : 'Date range mode';
    }

    this._renderHeader(mode);
    if (mode === 'absolute') this._renderAbsoluteBody();
    else if (mode === 'member') this._renderMemberBody();
    else this._renderRollingBody();

    if (mode === 'rolling') this._renderFooter();
    else this._removeFooter();

    this._popoverEl?.setAttribute('aria-label', this._popoverAriaLabel());
  }


  private _renderHeader(mode: ArvoDateRangePickerMode): void {
    if (!this._headerEl) return;

    // Sync header variant modifier classes so SCSS rules
    // (`.arvo-cal-nav--member`, `.arvo-cal-nav--rolling`) hide / show the
    // appropriate right-zone buttons. Always include `arvo-drp__header`.
    this._headerEl.className = [
      'arvo-cal-nav',
      'arvo-drp__header',
      mode === 'absolute' && 'arvo-cal-nav--range',
      mode === 'member' && 'arvo-cal-nav--member',
      mode === 'rolling' && 'arvo-cal-nav--rolling',
    ].filter(Boolean).join(' ');

    // ----- Left zone -------------------------------------------------------
    this._calNavLeftEl = document.createElement('div');
    this._calNavLeftEl.className = 'arvo-cal-nav__left';
    this._headerEl.appendChild(this._calNavLeftEl);

    if (mode === 'absolute') {
      this._renderAbsoluteLeftZone();
    } else {
      // Member / rolling: non-interactive period label pair. The label
      // contents are seeded from the active range / rolling resolution and
      // updated reactively by the visible-tile tracker once the tile grid
      // is mounted (see #8 visible-tile-tracking).
      this._periodLblPrimaryEl = document.createElement('span');
      this._periodLblPrimaryEl.className = 'arvo-cal-nav__period-lbl';
      this._periodLblPrimaryEl.setAttribute('aria-disabled', 'true');
      this._calNavLeftEl.appendChild(this._periodLblPrimaryEl);

      this._periodSepEl = document.createElement('span');
      this._periodSepEl.className = 'arvo-cal-nav__range-sep';
      this._periodSepEl.setAttribute('aria-hidden', 'true');
      this._periodSepEl.textContent = EM_DASH;
      this._calNavLeftEl.appendChild(this._periodSepEl);

      this._periodLblSecondaryEl = document.createElement('span');
      this._periodLblSecondaryEl.className = 'arvo-cal-nav__period-lbl';
      this._periodLblSecondaryEl.setAttribute('aria-disabled', 'true');
      this._calNavLeftEl.appendChild(this._periodLblSecondaryEl);

      this._syncPeriodLabels();
    }

    // ----- Right zone ------------------------------------------------------
    // The Member switch + label ALWAYS sits at the LEFT of the right-zone
    // -- to the left of the prev/next nav buttons with a divider between
    // the switch and prev -- regardless of whether member mode is on or
    // off. The right zone is:
    //
    //   absolute (no member capability):
    //     prev + next + today
    //   absolute / member (member capability + hasModeToggle):
    //     switch + divider + prev + next + (divider + tabs if rolling)
    //   absolute / member (member capability, hasModeToggle = false):
    //     prev + next + (divider + tabs if rolling)
    //   rolling:
    //     tabs only
    this._calNavRightEl = document.createElement('div');
    this._calNavRightEl.className = 'arvo-cal-nav__right';
    this._headerEl.appendChild(this._calNavRightEl);

    const hasMember = this._hasMemberCapability();
    const hasRolling = this._hasRollingCapability();
    const willHaveSwitch = hasMember && this._opts.hasModeToggle;
    const willHaveNav = mode === 'absolute' || mode === 'member';
    // Today is shown ONLY in plain absolute mode without member capability;
    // member-data mode (member or absolute-with-member) navigates via tile
    // grid scroll, so today loses its meaning.
    const willHaveToday = mode === 'absolute' && !hasMember;

    if (willHaveSwitch && willHaveNav) {
      this._maybeRenderSwitch();
      const dividerAfterSwitch = document.createElement('span');
      dividerAfterSwitch.className = 'arvo-cal-nav__divider';
      dividerAfterSwitch.setAttribute('aria-hidden', 'true');
      this._calNavRightEl.appendChild(dividerAfterSwitch);
    }

    if (willHaveNav) {
      this._prevBtnEl = document.createElement('button');
      this._prevBtnEl.classList.add('arvo-cal-nav__prev');
      this._calNavRightEl.appendChild(this._prevBtnEl);
      this._prevBtn = ArvoIconButton.initialize(this._prevBtnEl, {
        variant: 'tertiary',
        size: 'md',
        icon: 'angle-up',
        tooltip: mode === 'member' ? 'Previous period' : 'Previous month',
        isDisabled: this._opts.isDisabled,
        onClick: () => this._handlePrev(),
      });

      this._nextBtnEl = document.createElement('button');
      this._nextBtnEl.classList.add('arvo-cal-nav__next');
      this._calNavRightEl.appendChild(this._nextBtnEl);
      this._nextBtn = ArvoIconButton.initialize(this._nextBtnEl, {
        variant: 'tertiary',
        size: 'md',
        icon: 'angle-down',
        tooltip: mode === 'member' ? 'Next period' : 'Next month',
        isDisabled: this._opts.isDisabled,
        onClick: () => this._handleNext(),
      });
    }

    if (willHaveToday) {
      this._todayBtnEl = document.createElement('button');
      this._todayBtnEl.classList.add('arvo-cal-nav__today');
      this._calNavRightEl.appendChild(this._todayBtnEl);
      this._todayBtn = ArvoIconButton.initialize(this._todayBtnEl, {
        variant: 'tertiary',
        size: 'md',
        icon: 'calendar-date-selected',
        tooltip: 'Today',
        isDisabled: this._opts.isDisabled,
        onClick: () => this._handleToday(),
      });
    }

    if (willHaveNav && hasRolling) {
      const dividerBeforeTabs = document.createElement('span');
      dividerBeforeTabs.className = 'arvo-cal-nav__divider';
      dividerBeforeTabs.setAttribute('aria-hidden', 'true');
      this._calNavRightEl.appendChild(dividerBeforeTabs);
    }

    if (hasRolling) {
      this._maybeRenderTabs();
    }
  }

  /**
   * Render the absolute-mode header left zone. Composition depends on the
   * active calendar view:
   *
   *   days   -> [Month L] [Year L] -- em-dash -- [Month R] [Year R]
   *             (4 zoom buttons; em-dash joins the two month/year pairs)
   *   months -> [Year L]            -- em-dash -- [Year R]
   *             (2 zoom buttons; year-only labels for the left and right
   *              calendars which now span +1 year apart, not the same year)
   *   years  -> [decade-lbl: "{firstYear} - {lastYear}"]
   *             (single continuous decade label spanning the FIRST year of
   *              the left decade to the LAST year of the right decade,
   *              e.g. "2020 - 2039". No em-dash or duplicate labels.)
   *
   * The right calendar's visible period is always one period after the
   * left (_rightVisible()), so the labels rendered here track that
   * relationship.
   */
  private _renderAbsoluteLeftZone(): void {
    if (!this._calNavLeftEl) return;
    const left = this._calNavLeftEl;
    const view = this._viewMode;
    const rightVis = this._rightVisible();

    if (view === 'years') {
      const leftDecade = this._visibleYear - (((this._visibleYear % 10) + 10) % 10);
      const rightDecade = rightVis.year - (((rightVis.year % 10) + 10) % 10);
      const firstYear = Math.min(leftDecade, rightDecade);
      const lastYear = Math.max(leftDecade, rightDecade) + 9;
      const decadeLabel = `${firstYear} - ${lastYear}`;
      const span = document.createElement('span');
      span.className = 'arvo-cal-nav__decade-lbl';
      span.textContent = decadeLabel;
      span.setAttribute('aria-label', decadeLabel);
      span.setAttribute('aria-disabled', 'true');
      left.appendChild(span);
      return;
    }

    if (view === 'months') {
      // Year-only labels for the left and right calendars (which now span
      // +1 year apart). Clicking either year button drops back to days.
      const yearBtnHostL = document.createElement('button');
      yearBtnHostL.classList.add('arvo-cal-nav__year-btn');
      left.appendChild(yearBtnHostL);
      this._yearBtnL = ArvoButton.initialize(yearBtnHostL, {
        variant: 'tertiary',
        size: 'md',
        label: String(this._visibleYear),
        isDisabled: this._opts.isDisabled,
        onClick: () => this._handleYearButton(),
      });

      this._calNavEmDashEl = document.createElement('span');
      this._calNavEmDashEl.className = 'arvo-cal-nav__range-sep';
      this._calNavEmDashEl.setAttribute('aria-hidden', 'true');
      this._calNavEmDashEl.textContent = EM_DASH;
      left.appendChild(this._calNavEmDashEl);

      const yearBtnHostR = document.createElement('button');
      yearBtnHostR.classList.add('arvo-cal-nav__year-btn');
      left.appendChild(yearBtnHostR);
      this._yearBtnR = ArvoButton.initialize(yearBtnHostR, {
        variant: 'tertiary',
        size: 'md',
        label: String(rightVis.year),
        isDisabled: this._opts.isDisabled,
        onClick: () => this._handleYearButton(),
      });
      return;
    }

    // days view: dual Month + Year pair joined by an em-dash.
    const monthLabel = formatDate(
      new Date(this._visibleYear, this._visibleMonth, 1),
      'MMMM',
      this._effLocale,
    );
    const yearLabel = String(this._visibleYear);

    const monthBtnHost = document.createElement('button');
    monthBtnHost.classList.add('arvo-cal-nav__month-btn');
    left.appendChild(monthBtnHost);
    this._monthBtnL = ArvoButton.initialize(monthBtnHost, {
      variant: 'tertiary',
      size: 'md',
      label: monthLabel,
      isDisabled: this._opts.isDisabled,
      onClick: () => this._handleMonthButton(),
    });

    const yearBtnHost = document.createElement('button');
    yearBtnHost.classList.add('arvo-cal-nav__year-btn');
    left.appendChild(yearBtnHost);
    this._yearBtnL = ArvoButton.initialize(yearBtnHost, {
      variant: 'tertiary',
      size: 'md',
      label: yearLabel,
      isDisabled: this._opts.isDisabled,
      onClick: () => this._handleYearButton(),
    });

    this._calNavEmDashEl = document.createElement('span');
    this._calNavEmDashEl.className = 'arvo-cal-nav__range-sep';
    this._calNavEmDashEl.setAttribute('aria-hidden', 'true');
    this._calNavEmDashEl.textContent = EM_DASH;
    left.appendChild(this._calNavEmDashEl);

    const monthLabelR = formatDate(
      new Date(rightVis.year, rightVis.month, 1),
      'MMMM',
      this._effLocale,
    );
    const yearLabelR = String(rightVis.year);

    const monthBtnHostR = document.createElement('button');
    monthBtnHostR.classList.add('arvo-cal-nav__month-btn');
    left.appendChild(monthBtnHostR);
    this._monthBtnR = ArvoButton.initialize(monthBtnHostR, {
      variant: 'tertiary',
      size: 'md',
      label: monthLabelR,
      isDisabled: this._opts.isDisabled,
      onClick: () => this._handleMonthButton(),
    });

    const yearBtnHostR = document.createElement('button');
    yearBtnHostR.classList.add('arvo-cal-nav__year-btn');
    left.appendChild(yearBtnHostR);
    this._yearBtnR = ArvoButton.initialize(yearBtnHostR, {
      variant: 'tertiary',
      size: 'md',
      label: yearLabelR,
      isDisabled: this._opts.isDisabled,
      onClick: () => this._handleYearButton(),
    });
  }

  /**
   * Refresh the period-label spans for member / rolling header. Pulled into
   * its own helper so the visible-tile tracker can update labels without
   * re-rendering the whole popover.
   */
  private _syncPeriodLabels(): void {
    if (!this._periodLblPrimaryEl || !this._periodLblSecondaryEl) return;
    const mode = this._activeMode();
    let primary = '';
    let secondary = '';
    if (mode === 'rolling') {
      // Rolling header derives labels from the resolved rolling range
      // until the user has scrolled the tile grid; thereafter the visible
      // tile tracker overrides them.
      const resolved = this._rollingResolved();
      primary = resolved?.start?.displayName ?? '';
      secondary = resolved?.end?.displayName ?? '';
    } else {
      // Member header: labels reflect the first / last visible tile in the
      // scrollable area. Seeded from the first members at popover-open
      // until the visible-tile tracker takes over.
      primary = this._firstVisibleMember?.displayName ?? '';
      secondary = this._lastVisibleMember?.displayName ?? '';
    }
    this._periodLblPrimaryEl.textContent = primary;
    this._periodLblPrimaryEl.setAttribute('aria-label', primary);
    this._periodLblSecondaryEl.textContent = secondary;
    this._periodLblSecondaryEl.setAttribute('aria-label', secondary);
    if (this._periodSepEl) {
      this._periodSepEl.style.display = secondary ? '' : 'none';
    }
  }

  private _maybeRenderSwitch(): void {
    if (!this._hasMemberCapability() || !this._opts.hasModeToggle) return;
    const host = this._calNavRightEl ?? this._headerEl;
    if (!host) return;
    this._switchHostEl = document.createElement('div');
    this._switchHostEl.className = 'arvo-drp__hdr-switch';
    host.appendChild(this._switchHostEl);
    this._switch = ArvoSwitch.initialize(this._switchHostEl, {
      label: 'Member',
      isChecked: this._memberToggle,
      onChange: (p) => this._handleMemberToggle(p.isChecked),
    });
  }

  private _maybeRenderTabs(): void {
    if (!this._hasRollingCapability()) return;
    const host = this._calNavRightEl ?? this._headerEl;
    if (!host) return;
    this._tabsHostEl = document.createElement('div');
    this._tabsHostEl.className = 'arvo-drp__hdr-tabs';
    host.appendChild(this._tabsHostEl);
    this._tabs = ArvoButtonGroup.initialize(this._tabsHostEl, {
      items: [
        { value: 'absolute', label: 'Absolute' },
        { value: 'rolling', label: 'Rolling' },
      ],
      value: this._tab,
      size: 'lg',
      ariaLabel: 'Absolute or Rolling range',
      onChange: (detail) => {
        const v = Array.isArray(detail.value) ? detail.value[0] : detail.value;
        if (v === 'absolute' || v === 'rolling') this._handleTabChange(v);
      },
    });
  }

  // -------------------------------------------------------------------------
  // Body renderers per mode
  // -------------------------------------------------------------------------

  private _renderAbsoluteBody(): void {
    if (!this._bodyEl) return;
    const liveStart = this._draftRange.start;
    const liveEnd =
      this._draftRange.end ?? (this._draftFirstSet ? this._hoverDate : null);

    this._calLeftHostEl = document.createElement('div');
    this._calLeftHostEl.className = 'arvo-drp__cal';
    this._bodyEl.appendChild(this._calLeftHostEl);

    this._calRightHostEl = document.createElement('div');
    this._calRightHostEl.className = 'arvo-drp__cal';
    this._bodyEl.appendChild(this._calRightHostEl);

    const rightVis = this._rightVisible();
    const minD = this._effMinDate();
    const maxD = this._effMaxDate();
    const memberIndex = this._memberIndex;
    const frequency = this._opts.frequency ?? undefined;

    // Hybrid prop surface: spread calendarProps first so flat /
    // parent-computed values always win on overlap. Applies to BOTH
    // absolute-mode calendars below.
    this._calLeft = ArvoCalendar.initialize(this._calLeftHostEl, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: this._visibleYear,
      visibleMonth: this._visibleMonth,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      rangeStart: liveStart,
      rangeEnd: liveEnd,
      hoverDate: this._hoverDate,
      isRangeComplete: !this._draftFirstSet,
      minDate: minD,
      maxDate: maxD,
      memberIndex,
      frequency,
      onCellSelect: (p) => this._handleCalendarCellSelect(p),
      onCellHover: (p) => this._handleCalendarCellHover(p),
      onMonthChange: (p) => {
        this._visibleYear = p.year;
        this._visibleMonth = p.month;
        this._renderPopover();
      },
      onViewModeChange: () => { /* zoom handled via header */ },
      onDismiss: () => this.close(),
    });

    this._calRight = ArvoCalendar.initialize(this._calRightHostEl, {
      ...(this._opts.calendarProps ?? undefined),
      visibleYear: rightVis.year,
      visibleMonth: rightVis.month,
      viewMode: this._viewMode,
      locale: this._effLocale,
      weekStart: this._opts.weekStart,
      hasWeeks: this._opts.hasWeeks,
      rangeStart: liveStart,
      rangeEnd: liveEnd,
      hoverDate: this._hoverDate,
      isRangeComplete: !this._draftFirstSet,
      minDate: minD,
      maxDate: maxD,
      memberIndex,
      frequency,
      onCellSelect: (p) => this._handleCalendarCellSelect(p),
      onCellHover: (p) => this._handleCalendarCellHover(p),
      onMonthChange: (p) => {
        // Right calendar always shifts back one full period so the right
        // column lands on the requested period (the inverse of
        // _rightVisible).
        if (this._viewMode === 'months') {
          this._visibleYear = p.year - 1;
          this._visibleMonth = p.month;
        } else if (this._viewMode === 'years') {
          this._visibleYear = p.year - 10;
          this._visibleMonth = p.month;
        } else {
          const d = addMonths(new Date(p.year, p.month, 1), -1);
          this._visibleYear = d.getFullYear();
          this._visibleMonth = d.getMonth();
        }
        this._renderPopover();
      },
      onViewModeChange: () => { /* */ },
      onDismiss: () => this.close(),
    });
  }

  private _renderMemberBody(): void {
    if (!this._bodyEl) return;
    this._renderRangeCountAlert();
    this._renderTilePanel();
  }

  private _renderRollingBody(): void {
    if (!this._bodyEl) return;

    // Rolling setting row (Start + End steppers).
    this._rollingSettingEl = document.createElement('div');
    this._rollingSettingEl.className = 'arvo-drp__rolling-setting';
    this._bodyEl.appendChild(this._rollingSettingEl);

    const row = document.createElement('div');
    row.className = 'arvo-drp__rolling-row';
    this._rollingSettingEl.appendChild(row);

    const buildBlock = (
      labelText: string,
      idSuffix: string,
      initialVal: number,
      onChange: (e: Event) => void,
    ): { block: HTMLElement; hostId: string } => {
      const block = document.createElement('div');
      block.className = 'arvo-drp__rolling-block';
      const lbl = document.createElement('label');
      lbl.className = 'arvo-drp__rolling-lbl';
      lbl.textContent = labelText;
      const hostId = `${this._id}-${idSuffix}`;
      lbl.setAttribute('for', hostId);
      block.appendChild(lbl);
      const host = document.createElement('div');
      host.id = hostId;
      block.appendChild(host);
      void initialVal;
      void onChange;
      return { block, hostId };
    };

    // Helper that wires the rolling-stepper `<label for>` to the actual inner
    // <input> created by ArvoNumberInput.initialize() (the JS class wraps the
    // input in a host <div>; without this rewire, the label's click target
    // would be the host <div> instead of a real form control).
    const wireLabelToInput = (
      host: HTMLElement,
      hostId: string,
    ): void => {
      host.removeAttribute('id');
      const inner = host.querySelector('input');
      if (inner) inner.id = hostId;
    };

    const startBlock = buildBlock('Start', 'rolling-start', this._draftRolling.startOffset, () => {});
    row.appendChild(startBlock.block);
    // Use subtree query instead of document.getElementById so the lookup works
    // while the popover is still detached (engine mounts it after _renderPopover).
    this._rollingStartHostEl = row.querySelector(`#${startBlock.hostId}`) as HTMLElement;
    this._rollingStart = ArvoNumberInput.initialize(this._rollingStartHostEl as HTMLDivElement, {
      value: this._draftRolling.startOffset,
      prefix: this._opts.rollingPrefix ?? undefined,
      prefixTooltip: this._opts.rollingPrefix ?? undefined,
      isDisabled: this._opts.isDisabled || this._opts.isReadOnly,
      onChange: (payload) => {
        const v = payload.value == null ? 0 : payload.value;
        this._handleRollingStartChange(v);
      },
    });
    wireLabelToInput(this._rollingStartHostEl, startBlock.hostId);

    const endBlock = buildBlock('End', 'rolling-end', this._draftRolling.endOffset, () => {});
    row.appendChild(endBlock.block);
    this._rollingEndHostEl = row.querySelector(`#${endBlock.hostId}`) as HTMLElement;
    this._rollingEnd = ArvoNumberInput.initialize(this._rollingEndHostEl as HTMLDivElement, {
      value: this._draftRolling.endOffset,
      prefix: this._opts.rollingPrefix ?? undefined,
      prefixTooltip: this._opts.rollingPrefix ?? undefined,
      isDisabled: this._opts.isDisabled || this._opts.isReadOnly,
      onChange: (payload) => {
        const v = payload.value == null ? 0 : payload.value;
        this._handleRollingEndChange(v);
      },
    });
    wireLabelToInput(this._rollingEndHostEl, endBlock.hostId);

    this._renderRangeCountAlert();
    this._renderTilePanel();
  }

  // The "{N} of {total} members included (Current ... to Current ...)"
  // info alert is anchor-relative and only renders in rolling mode.
  // Absolute / member ranges intentionally suppress the alert.
  private _renderRangeCountAlert(): void {
    if (!this._bodyEl || !this._memberIndex) return;
    if (this._activeMode() !== 'rolling') return;
    const msg = rollingIncludedMessage(
      this._memberIndex,
      this._draftRolling,
      undefined,
      this._effLocale,
    );
    if (!msg) return;

    this._infoAlertHostEl = document.createElement('div');
    this._infoAlertHostEl.className = 'arvo-drp__info-alert';
    this._infoAlertHostEl.setAttribute('aria-live', 'polite');
    this._bodyEl.appendChild(this._infoAlertHostEl);
    this._infoAlert = ArvoMessageAlert.initialize(
      document.createElement('div'),
      { type: 'info', message: msg },
    );
    this._infoAlertHostEl.appendChild(this._infoAlert.el);
  }

  private _renderTilePanel(): void {
    if (!this._bodyEl || !this._memberIndex) return;
    this._tilePanelEl = document.createElement('div');
    this._tilePanelEl.className = 'arvo-drp__tile-panel';
    this._bodyEl.appendChild(this._tilePanelEl);

    this._mtgScrollEl = document.createElement('div');
    this._mtgScrollEl.className = 'arvo-drp__mtg-scroll';
    this._tilePanelEl.appendChild(this._mtgScrollEl);

    this._mtgGridEl = document.createElement('div');
    this._mtgGridEl.className = 'arvo-drp__mtg-grid';
    this._mtgGridEl.setAttribute('role', 'grid');
    this._mtgScrollEl.appendChild(this._mtgGridEl);

    const mode = this._activeMode();
    const rollingResolved = mode === 'rolling' ? this._rollingResolved() : null;
    const liveStart = mode === 'rolling'
      ? rollingResolved?.start?.keyDate ?? null
      : this._draftRange.start;
    const liveEnd = mode === 'rolling'
      ? rollingResolved?.end?.keyDate ?? null
      : this._draftRange.end ?? (this._draftFirstSet ? this._hoverDate : null);
    // Resolve start / end DATES to their containing bucket key so the
    // selected-tile state matches when the range end uses `endDate` (member
    // mode commits set `appliedRange.end` to `corrected.end.endDate`, not
    // `keyDate`). Comparing tile.key to bucket.key avoids the bug where
    // adjacent end tiles only get `in-range` and never `selected`.
    const startKeyCmp =
      mode === 'rolling'
        ? rollingResolved?.start?.key ?? null
        : (liveStart ? this._findMemberFor(liveStart)?.key ?? null : null);
    const endKeyCmp =
      mode === 'rolling'
        ? rollingResolved?.end?.key ?? null
        : (liveEnd ? this._findMemberFor(liveEnd)?.key ?? null : null);

    for (const m of this._memberIndex.members) {
      const tile = document.createElement('div');
      const inRange =
        liveStart && liveEnd
          ? !isBeforeDay(m.keyDate, liveStart) &&
            !isAfterDay(m.keyDate, liveEnd)
          : false;
      const isSelStart = startKeyCmp != null && m.key === startKeyCmp;
      const isSelEnd = endKeyCmp != null && m.key === endKeyCmp;
      const isCurrent =
        this._memberIndex.currentIndex != null &&
        m.index === this._memberIndex.currentIndex;
      tile.className = [
        'arvo-drp__mtg-tile',
        inRange && 'in-range',
        (isSelStart || isSelEnd) && 'selected',
        isCurrent && 'current-member',
      ].filter(Boolean).join(' ');
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('tabindex', isCurrent ? '0' : '-1');
      tile.setAttribute('aria-selected', String(isSelStart || isSelEnd));
      tile.setAttribute('aria-label', m.displayName);
      tile.setAttribute('data-arvo-tooltip', m.displayName);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'arvo-drp__mtg-tile-label';
      labelSpan.textContent = m.displayName;
      tile.appendChild(labelSpan);

      tile.addEventListener('click', () => this._handleTileClick(m));
      tile.addEventListener('pointerenter', () => this._handleTileHover(m));
      tile.addEventListener('pointerleave', () => this._handleTileHover(null));
      this._mtgGridEl.appendChild(tile);
    }

    // Wire up the visible-tile tracker so the header period labels reflect
    // the first / last fully visible tile in the panel as the user scrolls.
    this._installMtgVisibleTracker();
  }

  /**
   * Attach a scroll listener + ResizeObserver to the active `_mtgScrollEl`
   * that recomputes the first / last fully visible tile (rAF-throttled) and
   * pushes their `displayName`s into the header period labels.
   */
  private _installMtgVisibleTracker(): void {
    this._removeMtgVisibleTracker();
    const scroller = this._mtgScrollEl;
    if (!scroller || !this._memberIndex) return;

    const recompute = (): void => {
      this._mtgScrollRafId = null;
      if (!this._mtgScrollEl || !this._memberIndex) return;
      const tiles = this._mtgScrollEl.querySelectorAll<HTMLElement>(
        '.arvo-drp__mtg-tile',
      );
      if (tiles.length === 0) return;
      const cRect = this._mtgScrollEl.getBoundingClientRect();
      let firstIdx = -1;
      let lastIdx = -1;
      for (let i = 0; i < tiles.length; i += 1) {
        const r = tiles[i].getBoundingClientRect();
        if (r.top >= cRect.top - 1 && r.bottom <= cRect.bottom + 1) {
          if (firstIdx === -1) firstIdx = i;
          lastIdx = i;
        }
      }
      if (firstIdx === -1) {
        for (let i = 0; i < tiles.length; i += 1) {
          if (tiles[i].getBoundingClientRect().bottom > cRect.top) {
            firstIdx = i;
            break;
          }
        }
        lastIdx = firstIdx;
      }
      const members = this._memberIndex.members;
      const first = firstIdx >= 0 ? members[firstIdx] ?? null : null;
      const last = lastIdx >= 0 ? members[lastIdx] ?? null : null;
      if (
        first?.key !== this._firstVisibleMember?.key ||
        last?.key !== this._lastVisibleMember?.key
      ) {
        this._firstVisibleMember = first;
        this._lastVisibleMember = last;
        this._syncPeriodLabels();
      }
    };

    this._boundMtgScroll = () => {
      if (this._mtgScrollRafId != null) return;
      this._mtgScrollRafId = requestAnimationFrame(recompute);
    };
    scroller.addEventListener('scroll', this._boundMtgScroll, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      this._mtgScrollResizeObserver = new ResizeObserver(() => {
        if (this._mtgScrollRafId != null) cancelAnimationFrame(this._mtgScrollRafId);
        this._mtgScrollRafId = requestAnimationFrame(recompute);
      });
      this._mtgScrollResizeObserver.observe(scroller);
    }

    // Initial computation after layout has settled.
    this._mtgScrollRafId = requestAnimationFrame(recompute);
  }

  private _removeMtgVisibleTracker(): void {
    if (this._mtgScrollEl && this._boundMtgScroll) {
      this._mtgScrollEl.removeEventListener('scroll', this._boundMtgScroll);
    }
    this._boundMtgScroll = null;
    this._mtgScrollResizeObserver?.disconnect();
    this._mtgScrollResizeObserver = null;
    if (this._mtgScrollRafId != null) {
      cancelAnimationFrame(this._mtgScrollRafId);
      this._mtgScrollRafId = null;
    }
  }

  private _renderFooter(): void {
    if (!this._popoverEl) return;
    this._removeFooter();
    this._footerEl = document.createElement('div');
    this._footerEl.className = 'arvo-drp__footer';

    const currentLabel = this._currentMemberLabel();

    if (currentLabel) {
      this._currentIndEl = document.createElement('span');
      this._currentIndEl.className = 'arvo-drp__current-ind';
    
      const labelText = document.createTextNode(currentLabel.label);
    
      const valueEl = document.createElement('span');
      valueEl.className = 'arvo-drp__current-ind-value';
      valueEl.textContent = currentLabel.value;
    
      this._currentIndEl.appendChild(labelText);
      this._currentIndEl.appendChild(valueEl);
    
      this._footerEl.appendChild(this._currentIndEl);
    }

    const cancelHost = document.createElement('button');
    cancelHost.className = 'arvo-drp__footer-cancel';
    this._footerEl.appendChild(cancelHost);
    this._cancelBtn = ArvoButton.initialize(cancelHost, {
      variant: 'tertiary',
      size: 'md',
      label: 'Cancel',
      onClick: () => this._handleCancelRolling(),
    });

    const saveHost = document.createElement('button');
    saveHost.className = 'arvo-drp__footer-save';
    this._footerEl.appendChild(saveHost);
    this._saveBtn = ArvoButton.initialize(saveHost, {
      variant: 'primary',
      size: 'md',
      label: 'Save',
      isDisabled: !this._rollingDirty(),
      onClick: () => this._handleSaveRolling(),
    });

    this._popoverEl.appendChild(this._footerEl);
  }

  private _removeFooter(): void {
    if (!this._footerEl) return;
    this._saveBtn?.destroy(); this._saveBtn = null;
    this._cancelBtn?.destroy(); this._cancelBtn = null;
    this._footerEl.remove();
    this._footerEl = null;
    this._currentIndEl = null;
  }

  private _rollingDirty(): boolean {
    return !sameRolling(this._draftRolling, this._appliedRolling);
  }

  private _rollingResolved(): ReturnType<typeof rollingRangeToMembers> | null {
    if (!this._memberIndex) return null;
    return rollingRangeToMembers(this._memberIndex, this._draftRolling);
  }

  private _currentMemberLabel(): { label: string; value: string } | null {
    if (!this._memberIndex || !this._hasRollingCapability()) return null;
  
    const current = resolveCurrentMember(this._memberIndex);
    if (!current) return null;
  
    const f = this._opts.frequency;
  
    const periodWord =
      f === 'day'
        ? 'Day'
        : f === 'week'
          ? 'Week'
          : f === 'month'
            ? 'Month'
            : f === 'quarter'
              ? 'Quarter'
              : 'Year';
  
    const prefix = this._opts.rollingPrefix ? ` (${this._opts.rollingPrefix})` : '';
  
    return {
      label: `Current ${periodWord}${prefix}: `,
      value: current.displayName,
    };
  }

  /**
   * Visible period shown by the RIGHT calendar in absolute mode. Always one
   * full period after the left calendar so the dual layout reads as
   * continuous (no duplicates):
   *   days   -> next month
   *   months -> next year
   *   years  -> next decade
   */
  private _rightVisible(): { year: number; month: number } {
    if (this._viewMode === 'months') {
      return { year: this._visibleYear + 1, month: this._visibleMonth };
    }
    if (this._viewMode === 'years') {
      return { year: this._visibleYear + 10, month: this._visibleMonth };
    }
    const d = addMonths(new Date(this._visibleYear, this._visibleMonth, 1), 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  // -------------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------------

  private _handleTriggerClick(): void {
    if (this._effLoading()) return;
    if (this._opts.isDisabled || this._opts.isReadOnly) return;
    if (this._isOpen) this.close();
    else this.open();
  }

  private _handleSegKeyDown(side: 'start' | 'end', e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this._isOpen) this.open();
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._isOpen) this.close();
      return;
    }
    if (!this._isAbsoluteEditable()) {
      if (e.key === 'Escape' && this._isOpen) {
        e.preventDefault();
        this.close();
      }
      return;
    }
    const ctrl = this._segCtrl(side);
    if (!ctrl) return;
    const key = e.key;
    const segs = ctrl.getValue().segments;
    const focused = ctrl.getFocusedSegment();
    const lastIdx = segs.length - 1;

    if (key === 'Escape') {
      e.preventDefault();
      ctrl.handleKey({ key: 'Escape' });
      if (this._focusedSide === side) {
        const input = this._segInputEl(side);
        if (input) input.value = ctrl.getFormattedDisplay(true);
        ctrl.focusSegment(0);
      }
      if (this._isOpen) this.close();
      return;
    }
    // Cross-field handoff at the segment boundaries.
    if (key === 'ArrowRight' && side === 'start' && focused && focused.index === lastIdx) {
      e.preventDefault();
      this._focusEndFirst();
      return;
    }
    if (key === 'ArrowLeft' && side === 'end' && focused && focused.index === 0) {
      e.preventDefault();
      this._focusStartLast();
      return;
    }
    if (key === 'Tab') {
      const res = ctrl.handleKey({ key: 'Tab', shiftKey: e.shiftKey });
      if (res.consumed) e.preventDefault();
      return;
    }
    if (key === 'Enter') {
      e.preventDefault();
      ctrl.handleKey({ key: 'Enter' });
      if (this._isOpen && (this._opts.isAutoClose ?? true)) this.close();
      return;
    }
    if (
      key === 'ArrowLeft' || key === 'ArrowRight' ||
      key === 'ArrowUp' || key === 'ArrowDown' ||
      key === 'Home' || key === 'End' ||
      key === 'Backspace' || key === 'Delete'
    ) {
      const res = ctrl.handleKey({ key });
      if (res.consumed) e.preventDefault();
      return;
    }
    if (key.length === 1 && !e.ctrlKey && !e.metaKey) {
      if (/^[0-9]$/.test(key)) {
        const wasLast = side === 'start' && focused != null && focused.index === lastIdx;
        const res = ctrl.handleDigit(key);
        if (res.consumed) e.preventDefault();
        if (res.advance && wasLast) this._focusEndFirst();
        return;
      }
      if (/^[A-Za-z]$/.test(key)) {
        const res = ctrl.handleLetter(key);
        if (res.consumed) e.preventDefault();
        return;
      }
    }
  }

  private _handlePopoverKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (this._activeMode() === 'rolling') {
      this._handleCancelRolling();
    } else {
      this.close();
    }
  }

  private _handleAnchorClick(): void {
    if (this._opts.isDisabled || this._effLoading() || this._opts.isReadOnly) return;
    if (this._isOpen) this.close();
    else this.open();
  }

  private _handleAnchorKeyDown(e: KeyboardEvent): void {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this._isOpen) this.open();
    } else if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._isOpen) this.close();
    } else if (e.key === 'Escape') {
      if (this._isOpen) { e.preventDefault(); this.close(); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleAnchorClick();
    }
  }

  private _handleMemberToggle(checked: boolean): void {
    this._memberToggle = checked;
    this._draftFirstSet = false;
    this._hoverDate = null;
    this._draftRange = { ...this._appliedRange };
    const newMode: ArvoDateRangePickerMode = checked ? 'member' : 'absolute';
    this._opts.onModeChange?.({ mode: newMode });
    this._element?.dispatchEvent(
      new CustomEvent('drp:mode-change', {
        bubbles: true,
        cancelable: true,
        detail: { mode: newMode },
      }),
    );
    this._updateInputDisplay();
    this._renderPopover();
    this._syncRootClasses();
  }

  private _handleTabChange(next: 'absolute' | 'rolling'): void {
    if (next === this._tab) return;
    this._tab = next;
    if (next === 'rolling') {
      this._draftRolling = this._appliedRolling ?? { ...ZERO_ROLLING };
    } else {
      this._draftRange = { ...this._appliedRange };
      // When the user explicitly clicks the Absolute tab, also turn the
      // Member switch OFF so the popover renders the dual calendars
      // instead of the member-tile panel (the switch otherwise defaults to
      // ON whenever memberData is supplied).
      this._memberToggle = false;
    }
    this._draftFirstSet = false;
    this._hoverDate = null;
    const newMode: ArvoDateRangePickerMode =
      next === 'rolling'
        ? 'rolling'
        : this._memberToggle
          ? 'member'
          : 'absolute';
    this._opts.onModeChange?.({ mode: newMode });
    this._element?.dispatchEvent(
      new CustomEvent('drp:mode-change', {
        bubbles: true,
        cancelable: true,
        detail: { mode: newMode },
      }),
    );
    this._updateInputDisplay();
    this._renderPopover();
    this._syncRootClasses();
  }

  private _handleCalendarCellSelect(payload: {
    date?: Date;
    mode: string;
  }): void {
    const { date, mode } = payload;
    if (!date) return;
    if (mode !== 'days') {
      // Zoom step: jump to the clicked period and step down one level.
      // months -> days, years -> months. Mirrors React's
      // handleCalendarCellSelect behavior.
      this._visibleYear = date.getFullYear();
      this._visibleMonth = date.getMonth();
      if (mode === 'months') this._viewMode = 'days';
      else if (mode === 'years') this._viewMode = 'months';
      this._renderPopover();
      return;
    }
    // Snap-to-member: when member capability is on, every click resolves to
    // the bucket containing that day. Start clicks land on member.keyDate;
    // end clicks land on member.endDate. Out-of-bucket clicks (shouldn't
    // happen since calendars clamp to member bounds, but defensive) drop.
    const memberCapable = this._hasMemberCapability();
    const firstClick = !this._draftFirstSet;
    const startCandidate = memberCapable
      ? this._snapDateToMember(date, 'start')
      : date;
    const endCandidate = memberCapable
      ? this._snapDateToMember(date, 'end')
      : date;
    if (memberCapable && firstClick && !startCandidate) return;
    if (memberCapable && !firstClick && !startCandidate && !endCandidate) return;

    if (firstClick) {
      const next = startCandidate ?? date;
      this._draftRange = { start: next, end: null };
      this._draftFirstSet = true;
      this._hoverDate = next;
      this._calLeft?.update({
        rangeStart: this._draftRange.start,
        rangeEnd: null,
        hoverDate: this._hoverDate,
        isRangeComplete: false,
      });
      this._calRight?.update({
        rangeStart: this._draftRange.start,
        rangeEnd: null,
        hoverDate: this._hoverDate,
        isRangeComplete: false,
      });
      return;
    }
    const first = this._draftRange.start ?? date;
    if (memberCapable) {
      // Determine the start/end member buckets and orient them so start <= end.
      const firstMember = this._resolveMemberSnap(first);
      const clickMember = this._resolveMemberSnap(date);
      if (!firstMember || !clickMember) return;
      let startMember: NormalizedMember;
      let endMember: NormalizedMember;
      if (firstMember.keyDate.getTime() <= clickMember.keyDate.getTime()) {
        startMember = firstMember;
        endMember = clickMember;
      } else {
        startMember = clickMember;
        endMember = firstMember;
      }
      const corrected = this._enforceDistinctMembers(startMember, endMember);
      if (!corrected) return;
      this._draftRange = {
        start: corrected.start.keyDate,
        end: corrected.end.endDate,
      };
    } else {
      const [s, e] = orderedRange(first, date);
      this._draftRange = { start: s, end: e };
    }
    this._draftFirstSet = false;
    this._hoverDate = null;
    this._commitRange(this._draftRange, this._activeMode());
    if (this._opts.isAutoClose && this._activeMode() !== 'rolling') this.close();
  }

  /**
   * Auto-correct a member-mode range whose start and end resolve to the same
   * bucket. Tries to push end forward to the next bucket; if there is no
   * next, pulls start back to the previous bucket. Returns the corrected
   * pair, or the original pair when the dataset only has a single member.
   */
  private _enforceDistinctMembers(
    startMember: NormalizedMember,
    endMember: NormalizedMember,
  ): { start: NormalizedMember; end: NormalizedMember } | null {
    if (!this._memberIndex) return null;
    if (startMember.key !== endMember.key) {
      return { start: startMember, end: endMember };
    }
    const next = getAdjacentMember(this._memberIndex, startMember, 'next');
    if (next) return { start: startMember, end: next };
    const prev = getAdjacentMember(this._memberIndex, startMember, 'prev');
    if (prev) return { start: prev, end: endMember };
    return { start: startMember, end: endMember };
  }

  private _handleCalendarCellHover(payload: { date?: Date }): void {
    if (!this._draftFirstSet) return;
    this._hoverDate = payload.date ?? null;
    this._calLeft?.update({ hoverDate: this._hoverDate });
    this._calRight?.update({ hoverDate: this._hoverDate });
  }

  private _handleTileClick(m: NormalizedMember): void {
    if (this._activeMode() === 'rolling') return;
    if (!this._draftFirstSet) {
      this._draftRange = { start: m.keyDate, end: null };
      this._draftFirstSet = true;
      this._hoverDate = m.keyDate;
      // Update the existing tiles in place rather than calling
      // `_renderPopover()` -- rebuilding the popover here would destroy the
      // tile grid and rebuild it under the user's cursor, which (combined
      // with pointerenter also rebuilding) would drop the mousedown -> click
      // sequence on the second tile entirely.
      this._refreshTileSelectionClasses();
      return;
    }
    const firstStart = this._draftRange.start;
    const firstMember = firstStart ? this._resolveMemberSnap(firstStart) : null;
    if (!firstMember) {
      this._draftRange = { start: m.keyDate, end: null };
      this._draftFirstSet = true;
      this._hoverDate = m.keyDate;
      this._refreshTileSelectionClasses();
      return;
    }
    let startMember: NormalizedMember;
    let endMember: NormalizedMember;
    if (firstMember.keyDate.getTime() <= m.keyDate.getTime()) {
      startMember = firstMember;
      endMember = m;
    } else {
      startMember = m;
      endMember = firstMember;
    }
    const corrected = this._enforceDistinctMembers(startMember, endMember);
    if (!corrected) return;
    this._draftRange = {
      start: corrected.start.keyDate,
      end: corrected.end.endDate,
    };
    this._draftFirstSet = false;
    this._hoverDate = null;
    this._commitRange(this._draftRange, 'member');
    if (this._opts.isAutoClose) this.close();
  }

  private _handleTileHover(m: NormalizedMember | null): void {
    if (!this._draftFirstSet) return;
    this._hoverDate = m?.keyDate ?? null;
    // Update class names on the existing tiles instead of rebuilding the
    // tile panel. Rebuilding the entire grid on every pointerenter /
    // pointerleave would (a) reset the scroll position, (b) disconnect the
    // click handler from the tile the user was about to click (mousedown on
    // the old tile, mouseup on a freshly-mounted tile), and (c) prevent the
    // end-of-range selection entirely. Toggling .in-range / .selected /
    // aria-selected on the tiles that already exist mirrors React's
    // declarative approach without those failure modes.
    this._refreshTileSelectionClasses();
  }

  /**
   * In-place refresh of `.in-range`, `.selected`, and `aria-selected` on the
   * existing tile elements. Called from hover (draft-end preview), rolling
   * stepper changes, and any other path that mutates the live start / end
   * without changing the member list itself. The `.current-member` class is
   * derived from `currentIndex` (which is static while the popover is open)
   * so it's set once at tile-creation time in `_renderTilePanel`.
   */
  private _refreshTileSelectionClasses(): void {
    if (!this._mtgGridEl || !this._memberIndex) return;
    const mode = this._activeMode();
    const rollingResolved =
      mode === 'rolling' ? this._rollingResolved() : null;
    const liveStart =
      mode === 'rolling'
        ? rollingResolved?.start?.keyDate ?? null
        : this._draftRange.start;
    const liveEnd =
      mode === 'rolling'
        ? rollingResolved?.end?.keyDate ?? null
        : this._draftRange.end ??
          (this._draftFirstSet ? this._hoverDate : null);
    const startKeyCmp =
      mode === 'rolling'
        ? rollingResolved?.start?.key ?? null
        : liveStart
          ? this._findMemberFor(liveStart)?.key ?? null
          : null;
    const endKeyCmp =
      mode === 'rolling'
        ? rollingResolved?.end?.key ?? null
        : liveEnd
          ? this._findMemberFor(liveEnd)?.key ?? null
          : null;

    const tiles = this._mtgGridEl.querySelectorAll<HTMLElement>(
      '.arvo-drp__mtg-tile',
    );
    let i = 0;
    for (const m of this._memberIndex.members) {
      const tile = tiles[i++];
      if (!tile) continue;
      const inRange =
        liveStart && liveEnd
          ? !isBeforeDay(m.keyDate, liveStart) &&
            !isAfterDay(m.keyDate, liveEnd)
          : false;
      const isSelStart = startKeyCmp != null && m.key === startKeyCmp;
      const isSelEnd = endKeyCmp != null && m.key === endKeyCmp;
      const isSelected = isSelStart || isSelEnd;
      tile.classList.toggle('in-range', inRange);
      tile.classList.toggle('selected', isSelected);
      tile.setAttribute('aria-selected', String(isSelected));
    }
  }

  private _handleRollingStartChange(v: number): void {
    let next = { ...this._draftRolling, startOffset: v };
    if (next.startOffset > next.endOffset) next = { ...next, endOffset: v };
    this._draftRolling = next;
    this._refreshRollingDerived();
  }

  private _handleRollingEndChange(v: number): void {
    let next = { ...this._draftRolling, endOffset: v };
    if (next.endOffset < next.startOffset) next = { ...next, startOffset: v };
    this._draftRolling = next;
    this._refreshRollingDerived();
  }

  private _refreshRollingDerived(): void {
    // Refresh count alert + tile highlights + footer Save disabled state.
    // Update class names on the existing tiles instead of rebuilding the
    // tile panel (same rationale as `_handleTileHover`: preserves scroll
    // position and keeps stable click targets).
    this._refreshInfoAlert();
    this._refreshTileSelectionClasses();
    if (this._saveBtn) {
      this._saveBtn.disabled(!this._rollingDirty());
    }
    // Reflect normalized values back into the steppers when start>end swap.
    this._rollingStart?.value(this._draftRolling.startOffset);
    this._rollingEnd?.value(this._draftRolling.endOffset);
  }

  private _refreshInfoAlert(): void {
    if (!this._memberIndex) return;
    if (this._activeMode() !== 'rolling') return;
    const msg = rollingIncludedMessage(
      this._memberIndex,
      this._draftRolling,
      undefined,
      this._effLocale,
    );
    if (msg && this._infoAlert) {
      this._infoAlert.message(msg);
    }
  }

  private _handleSaveRolling(): void {
    if (!this._hasRollingCapability()) return;
    this._commitRolling({ ...this._draftRolling });
    this._opts.onSave?.();
    this._element?.dispatchEvent(
      new CustomEvent('drp:save', { bubbles: true, cancelable: false, detail: {} }),
    );
    this.close();
  }

  private _handleCancelRolling(): void {
    this._opts.onCancel?.();
    this._element?.dispatchEvent(
      new CustomEvent('drp:cancel', { bubbles: true, cancelable: false, detail: {} }),
    );
    this._draftRolling = this._appliedRolling ?? { ...ZERO_ROLLING };
    this.close();
  }

  // -------------------------------------------------------------------------
  // Calendar nav (absolute mode) buttons
  // -------------------------------------------------------------------------

  /**
   * Toggle the months zoom level. Mirrors the React DRP: clicking the month
   * button while already in months view returns to days. The right
   * calendar's visible period is recomputed by _rightVisible() based on the
   * new view mode so it stays continuous with the left.
   */
  private _handleMonthButton(): void {
    this._setViewMode(this._viewMode === 'months' ? 'days' : 'months');
  }

  /**
   * Toggle the years zoom level. Same semantics as _handleMonthButton.
   */
  private _handleYearButton(): void {
    this._setViewMode(this._viewMode === 'years' ? 'days' : 'years');
  }

  private _setViewMode(mode: 'days' | 'months' | 'years'): void {
    if (this._viewMode === mode) return;
    this._viewMode = mode;
    this._renderPopover();
  }

  private _handlePrev(): void {
    if (this._mtgScrollEl && (this._activeMode() === 'member' || this._activeMode() === 'rolling')) {
      const page = this._mtgScrollEl.clientHeight || 240;
      this._mtgScrollEl.scrollBy({ top: -page, behavior: 'smooth' });
      return;
    }
    if (this._viewMode === 'months') {
      this._visibleYear -= 1;
    } else if (this._viewMode === 'years') {
      this._visibleYear -= 10;
    } else {
      const d = addMonths(new Date(this._visibleYear, this._visibleMonth, 1), -1);
      this._visibleYear = d.getFullYear();
      this._visibleMonth = d.getMonth();
    }
    this._renderPopover();
  }

  private _handleNext(): void {
    if (this._mtgScrollEl && (this._activeMode() === 'member' || this._activeMode() === 'rolling')) {
      const page = this._mtgScrollEl.clientHeight || 240;
      this._mtgScrollEl.scrollBy({ top: page, behavior: 'smooth' });
      return;
    }
    if (this._viewMode === 'months') {
      this._visibleYear += 1;
    } else if (this._viewMode === 'years') {
      this._visibleYear += 10;
    } else {
      const d = addMonths(new Date(this._visibleYear, this._visibleMonth, 1), 1);
      this._visibleYear = d.getFullYear();
      this._visibleMonth = d.getMonth();
    }
    this._renderPopover();
  }

  private _handleToday(): void {
    const today = new Date();
    this._visibleYear = today.getFullYear();
    this._visibleMonth = today.getMonth();
    this._viewMode = 'days';
    this._renderPopover();
  }

  // -------------------------------------------------------------------------
  // Focus trap tab-order
  // -------------------------------------------------------------------------

  /**
   * Build the Tab cycle for the active popover mode. Mirrors the React
   * focus-trap order. Disabled buttons (e.g. rolling Save when clean) are
   * filtered out so the cycle never deadlocks.
   */
  private _getOrderedPopoverElements(): HTMLElement[] {
    const root = this._popoverEl;
    if (!root) return [];

    const calendarCells = Array.from(
      root.querySelectorAll<HTMLElement>('.arvo-cal__cell[tabindex="0"]'),
    );
    const firstTile = root.querySelector<HTMLElement>(
      '.arvo-drp__mtg-tile[tabindex="0"]',
    );
    const monthBtns = Array.from(
      root.querySelectorAll<HTMLElement>('.arvo-cal-nav__month-btn'),
    );
    const yearBtns = Array.from(
      root.querySelectorAll<HTMLElement>('.arvo-cal-nav__year-btn'),
    );
    const interleavedMY: HTMLElement[] = [];
    const pairs = Math.max(monthBtns.length, yearBtns.length);
    for (let i = 0; i < pairs; i += 1) {
      if (monthBtns[i]) interleavedMY.push(monthBtns[i]);
      if (yearBtns[i]) interleavedMY.push(yearBtns[i]);
    }
    const prev = root.querySelector<HTMLElement>('.arvo-cal-nav__prev');
    const next = root.querySelector<HTMLElement>('.arvo-cal-nav__next');
    const today = root.querySelector<HTMLElement>('.arvo-cal-nav__today');
    const switchEl = root.querySelector<HTMLElement>(
      '.arvo-drp__hdr-switch input',
    );
    const tabBtns = Array.from(
      root.querySelectorAll<HTMLElement>('.arvo-drp__hdr-tabs button[data-value]'),
    );
    const rollingInputs = Array.from(
      root.querySelectorAll<HTMLElement>('.arvo-drp__rolling-block input'),
    );
    const footerCancel = root.querySelector<HTMLElement>(
      '.arvo-drp__footer-cancel',
    );
    const footerSave = root.querySelector<HTMLElement>(
      '.arvo-drp__footer-save',
    );

    let raw: Array<HTMLElement | null>;
    if (rollingInputs.length > 0) {
      raw = [
        ...tabBtns,
        ...rollingInputs,
        footerCancel,
        footerSave,
      ];
    } else if (firstTile) {
      raw = [firstTile, switchEl, prev, next, ...tabBtns];
    } else {
      raw = [
        ...calendarCells,
        prev,
        ...interleavedMY,
        next,
        today,
        switchEl,
        ...tabBtns,
      ];
    }

    return raw.filter((el): el is HTMLElement => {
      if (!el) return false;
      const native = el as HTMLButtonElement | HTMLInputElement;
      if (native.disabled === true) return false;
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      return true;
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  range(): DateRangeValue;
  range(v: DateRangeValue): void;
  range(v?: DateRangeValue): DateRangeValue | void {
    if (v === undefined) return { ...this._appliedRange };
    const minD = this._effMinDate();
    const maxD = this._effMaxDate();
    this._appliedRange = {
      start: clampToBounds(v.start, minD, maxD),
      end: clampToBounds(v.end, minD, maxD),
    };
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();
  }

  memberRange(): MemberRangeValue;
  memberRange(v: MemberRangeValue): void;
  memberRange(v?: MemberRangeValue): MemberRangeValue | void {
    if (v === undefined) {
      return {
        start: this._findMemberFor(this._appliedRange.start),
        end: this._findMemberFor(this._appliedRange.end),
      };
    }
    this._appliedRange = {
      start: v.start?.keyDate ?? null,
      end: v.end?.keyDate ?? null,
    };
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();
  }

  rolling(): RollingRange | null;
  rolling(v: RollingRange): void;
  rolling(v?: RollingRange): RollingRange | null | void {
    if (v === undefined) return this._appliedRolling;
    this._appliedRolling = v;
    this._draftRolling = { ...v };
    if (this._memberIndex) {
      const resolved = rollingRangeToMembers(this._memberIndex, v);
      this._appliedRange = {
        start: resolved.start?.keyDate ?? null,
        end: resolved.end?.keyDate ?? null,
      };
    }
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();
  }

  mode(): ArvoDateRangePickerMode;
  mode(m: ArvoDateRangePickerMode): void;
  mode(m?: ArvoDateRangePickerMode): ArvoDateRangePickerMode | void {
    if (m === undefined) return this._activeMode();
    if (m === 'rolling') {
      if (this._hasRollingCapability()) this._tab = 'rolling';
    } else {
      this._tab = 'absolute';
      this._memberToggle = m === 'member' && this._hasMemberCapability();
    }
    this._updateInputDisplay();
    this._syncRootClasses();
  }

  memberToggle(): boolean;
  memberToggle(v: boolean): void;
  memberToggle(v?: boolean): boolean | void {
    if (v === undefined) return this._memberToggle;
    this._memberToggle = Boolean(v);
    this._updateInputDisplay();
    this._syncRootClasses();
  }

  clear(): void {
    this._commitRange({ start: null, end: null }, this._activeMode());
    this._appliedRolling = null;
    this._updateInputDisplay();
    this._renderActions();
    this._syncRootClasses();
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    this._opts.isDisabled = state;
    this._renderActions();
    this._syncRootClasses();
  }

  setError(message: string | false): void {
    this._errorOverride = message === false ? null : message;
    this._renderActions();
    this._renderInlineError();
    this._syncRootClasses();
  }

  setLoading(loading: boolean): void {
    this._loadingOverride = loading;
    this._renderActions();
    this._syncRootClasses();
    if (loading && this._isOpen) this.close();
  }

  focus(): void {
    if (this._useAnchorRender) this._anchorEl?.focus();
    else this._inputEl?.focus();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    // Tear the surface down first: this drops the hub registration, the
    // focus trap, outside-click listeners, and the position watcher in one call.
    this._surface?.destroy();
    this._surface = null;
    this._isOpen = false;

    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    // Destroy inner components + remove popover shell.
    this._destroyPopover();
    // Remove the display:contents wrapper (always on document.body after first
    // open, regardless of open/closed state).
    this._popoverWrapperEl?.remove();
    this._popoverWrapperEl = null;

    for (const input of [this._inputEl, this._endInputEl]) {
      if (!input) continue;
      input.removeEventListener('keydown', this._boundInputKeyDown);
      input.removeEventListener('focus', this._boundSegFocus);
      input.removeEventListener('blur', this._boundSegBlur);
      input.removeEventListener('mousedown', this._boundSegMouseDown);
      input.removeEventListener('paste', this._boundSegPaste);
    }
    this._destroySegmentControllers();
    if (this._useAnchorRender && this._anchorEl) {
      this._anchorEl.removeEventListener('click', this._boundAnchorClick);
      this._anchorEl.removeEventListener('keydown', this._boundAnchorKeyDown);
      this._anchorEl.removeAttribute('aria-haspopup');
      this._anchorEl.removeAttribute('aria-expanded');
      this._anchorEl.removeAttribute('aria-controls');
    }

    this._clearBtn?.destroy();
    this._triggerBtn?.destroy();
    this._errIco?.destroy();
    this._inlineAlert?.destroy();

    if (this._element) {
      this._element.textContent = '';
      this._element.removeAttribute('class');
      this._element.removeAttribute('id');
      this._element.style.removeProperty('--arvo-form-input-width');
    }

    this._labelEl = null;
    this._fieldEl = null;
    this._inputEl = null;
    this._endInputEl = null;
    this._actionsEl = null;
    this._clearBtnEl = null;
    this._triggerBtnEl = null;
    this._errIcoEl = null;
    this._errMsgEl = null;
    this._anchorEl = null;
    this._element = null;
  }
}

export default ArvoDateRangePicker;
