// ArvoAdvanceSearch -- vanilla JS implementation.
//
// Mirrors the React `ArvoAdvanceSearch` (packages/react/src/components/
// AdvanceSearch/AdvanceSearch.tsx) on every public surface: BEM block,
// elements, modifiers, state classes, custom events (`adv-search:*`),
// methods, defaults. Composes the JS twins of the same primitives
// (Badge, IconButton, Button, MessageAlert, Popover, HybridPopover,
// OptionList, DatePicker, DateRangePicker, TimePicker, DateTimePicker).
// Renders DOM once via `_render()`; subsequent state changes mutate the
// existing nodes.

import { connectTooltip, tooltipManager } from '@arvo/core';
import type { TooltipConnector } from '@arvo/core';
import {
  formatShortcutDisplay,
  matchesShortcut,
  parseShortcut,
  type ParsedShortcut,
} from '@arvo/utils';
import { ArvoBadge } from '../Badge/Badge';
import { ArvoButton } from '../Button/Button';
import { ArvoIconButton } from '../IconButton/IconButton';
import {
  ArvoMessageAlert,
  ARVO_MSG_ALERT_DEFAULT_ERROR,
} from '../MessageAlert/MessageAlert';
import { ArvoOptionList } from '../OptionList/OptionList';
import type { ArvoOptionListOptions } from '../OptionList/OptionList';
import { ArvoPopover } from '../Popover/Popover';
import type { ArvoPopoverOptions } from '../Popover/Popover';
import { ArvoHybridPopover } from '../HybridPopover/HybridPopover';
import type { ArvoHybridPopoverOptions } from '../HybridPopover/HybridPopover';
import { ArvoDatePicker } from '../DatePicker/DatePicker';
import type { ArvoDatePickerOptions } from '../DatePicker/DatePicker';
import { ArvoDateRangePicker } from '../DateRangePicker/DateRangePicker';
import type { ArvoDateRangePickerOptions } from '../DateRangePicker/DateRangePicker';
import { ArvoTimePicker } from '../TimePicker/TimePicker';
import type { ArvoTimePickerOptions } from '../TimePicker/TimePicker';
import { ArvoDateTimePicker } from '../DateTimePicker/DateTimePicker';
import type { ArvoDateTimePickerOptions } from '../DateTimePicker/DateTimePicker';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ArvoAdvanceSearchVariant =
  | 'scopedSearch'
  | 'customFilter'
  | 'filterBy';

export type ArvoAdvanceSearchSearchMode = 'input' | 'submit';

export type ArvoAdvanceSearchErrorDisplay = 'inline' | 'tooltip' | 'none';

export type ArvoAdvanceSearchSelectionMode = 'single' | 'multiple';

export type ArvoAdvanceSearchFilterContentType =
  | 'hybridPopover'
  | 'optionList'
  | 'calendar'
  | 'dateRange'
  | 'time'
  | 'dateTime';

export interface ArvoAdvanceSearchCounter {
  current: number;
  total: number;
}

export interface ArvoAdvanceSearchScopeOption {
  key: string;
  label: string;
  icon?: string;
  isDisabled?: boolean;
}

export interface ArvoAdvanceSearchPopoverFooterConfig {
  hasReset?: boolean;
  secondaryLabel?: string | null;
  primaryLabel?: string | null;
  leftSlot?: HTMLElement | string | null;
}

export type ArvoAdvanceSearchSize = 'sm' | 'md' | 'lg';

export interface ArvoAdvanceSearchOptions {
  variant?: ArvoAdvanceSearchVariant;
  /**
   * Density. Affects the field row height + vertical padding only -- the
   * inner controls (search icon, input typography, trigger buttons,
   * badge, clear, separator) stay at their canonical sizes across all
   * three options. `md` is the default canonical field height.
   */
  size?: ArvoAdvanceSearchSize;

  searchMode?: ArvoAdvanceSearchSearchMode;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  hasWildcardSupport?: boolean;

  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;

  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: ((isOpen: boolean) => void) | null;

  shortcut?: string | null;
  counter?: ArvoAdvanceSearchCounter | null;

  errorDisplay?: ArvoAdvanceSearchErrorDisplay;
  errorMessage?: string | null;

  triggerLabel?: string;
  triggerProps?: Record<string, unknown>;

  selectionMode?: ArvoAdvanceSearchSelectionMode;
  scopeOptions?: ArvoAdvanceSearchScopeOption[];
  selectedScope?: string | string[] | null;
  defaultSelectedScope?: string | string[] | null;
  onScopeChange?: ((next: string | string[]) => void) | null;

  hasPopoverHeader?: boolean;
  popoverTitle?: string;
  popoverFooter?: false | ArvoAdvanceSearchPopoverFooterConfig;
  customFilterContent?: HTMLElement | string | null;
  popoverProps?: Partial<ArvoPopoverOptions>;

  filterContentType?: ArvoAdvanceSearchFilterContentType;
  filterSelectionMode?: ArvoAdvanceSearchSelectionMode;
  selectedFilter?: unknown;
  defaultSelectedFilter?: unknown;
  onFilterChange?: ((next: unknown) => void) | null;
  onFilterApply?: ((value: unknown) => void) | null;
  onFilterReset?: (() => void) | null;
  hybridPopoverProps?: Partial<ArvoHybridPopoverOptions>;
  optionListProps?: Partial<ArvoOptionListOptions>;
  calendarProps?: Partial<ArvoDatePickerOptions>;
  dateRangeProps?: Partial<ArvoDateRangePickerOptions>;
  timeProps?: Partial<ArvoTimePickerOptions>;
  dateTimeProps?: Partial<ArvoDateTimePickerOptions>;

  width?: string | null;
  isFullWidth?: boolean;

  ariaLabel?: string;
  ariaDescribedBy?: string | null;

  onChange?: ((value: string) => void) | null;
  onSearch?: ((value: string) => void) | null;
  onClear?: (() => void) | null;
  onBack?: (() => void) | null;
  onClose?: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

const WILDCARD_PREFIX = ':';

/** Returns true when the query starts with the Arvo wildcard prefix. */
export function isWildcardQuery(value: string): boolean {
  return typeof value === 'string' && value.startsWith(WILDCARD_PREFIX);
}

function findScopeLabel(
  options: ArvoAdvanceSearchScopeOption[] | undefined,
  selected: string | string[] | null,
): string | null {
  if (!options || !selected) return null;
  if (Array.isArray(selected)) {
    if (selected.length === 0) return null;
    const first = options.find((o) => o.key === selected[0]);
    if (!first) return null;
    return selected.length === 1
      ? first.label
      : `${first.label} +${selected.length - 1}`;
  }
  return options.find((o) => o.key === selected)?.label ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoAdvanceSearch {
  private _element: HTMLDivElement | null;
  private _options: Required<
    Omit<
      ArvoAdvanceSearchOptions,
      | 'value'
      | 'defaultValue'
      | 'isOpen'
      | 'defaultOpen'
      | 'selectedScope'
      | 'defaultSelectedScope'
      | 'selectedFilter'
      | 'defaultSelectedFilter'
      | 'errorMessage'
      | 'shortcut'
      | 'counter'
      | 'triggerLabel'
      | 'triggerProps'
      | 'scopeOptions'
      | 'popoverTitle'
      | 'popoverFooter'
      | 'customFilterContent'
      | 'popoverProps'
      | 'hybridPopoverProps'
      | 'optionListProps'
      | 'calendarProps'
      | 'dateRangeProps'
      | 'timeProps'
      | 'dateTimeProps'
      | 'width'
      | 'ariaDescribedBy'
      | 'onChange'
      | 'onSearch'
      | 'onClear'
      | 'onOpenChange'
      | 'onScopeChange'
      | 'onFilterChange'
      | 'onFilterApply'
      | 'onFilterReset'
      | 'onBack'
      | 'onClose'
    >
  > & {
    width: string | null;
    errorMessage: string | null;
    shortcut: string | null;
    counter: ArvoAdvanceSearchCounter | null;
    triggerLabel: string | undefined;
    triggerProps: Record<string, unknown> | null;
    scopeOptions: ArvoAdvanceSearchScopeOption[];
    popoverTitle: string | undefined;
    popoverFooter: false | ArvoAdvanceSearchPopoverFooterConfig;
    customFilterContent: HTMLElement | string | null;
    popoverProps: Partial<ArvoPopoverOptions> | null;
    hybridPopoverProps: Partial<ArvoHybridPopoverOptions> | null;
    optionListProps: Partial<ArvoOptionListOptions> | null;
    calendarProps: Partial<ArvoDatePickerOptions> | null;
    dateRangeProps: Partial<ArvoDateRangePickerOptions> | null;
    timeProps: Partial<ArvoTimePickerOptions> | null;
    dateTimeProps: Partial<ArvoDateTimePickerOptions> | null;
    ariaDescribedBy: string | null;
    onChange: ((value: string) => void) | null;
    onSearch: ((value: string) => void) | null;
    onClear: (() => void) | null;
    onOpenChange: ((isOpen: boolean) => void) | null;
    onScopeChange: ((next: string | string[]) => void) | null;
    onFilterChange: ((next: unknown) => void) | null;
    onFilterApply: ((value: unknown) => void) | null;
    onFilterReset: (() => void) | null;
    onBack: (() => void) | null;
    onClose: (() => void) | null;
  };

  // -- DOM refs ---------------------------------------------------------
  private _fieldEl: HTMLDivElement | null = null;
  private _leadEl: HTMLDivElement | null = null;
  private _inputGroupEl: HTMLDivElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _shortcutEl: HTMLSpanElement | null = null;
  private _counterEl: HTMLElement | null = null;
  private _counterBadge: ArvoBadge | null = null;
  private _clearEl: HTMLButtonElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _separatorEls: HTMLSpanElement[] = [];
  private _submitEl: HTMLButtonElement | null = null;
  private _submitBtn: ArvoButton | null = null;
  private _triggerEl: HTMLButtonElement | null = null;
  private _triggerLabelEl: HTMLSpanElement | null = null;
  private _triggerChevronEl: HTMLSpanElement | null = null;
  private _triggerIconBtn: ArvoIconButton | null = null;
  private _underlineEl: HTMLSpanElement | null = null;
  private _messageEl: HTMLDivElement | null = null;
  private _messageAlert: ArvoMessageAlert | null = null;

  // -- Overlay instances -----------------------------------------------
  private _optionListInstance: ArvoOptionList | null = null;
  private _popoverInstance: ArvoPopover | null = null;
  private _hybridPopoverInstance: ArvoHybridPopover | null = null;
  private _datePickerInstance: ArvoDatePicker | null = null;
  private _dateRangeInstance: ArvoDateRangePicker | null = null;
  private _timePickerInstance: ArvoTimePicker | null = null;
  private _dateTimeInstance: ArvoDateTimePicker | null = null;

  // -- State -----------------------------------------------------------
  private _value: string;
  private _previousValue: string;
  private _isOpen: boolean;
  private _isFocused = false;
  private _selectedScope: string | string[] | null;
  private _selectedFilter: unknown;
  private _debounceTimerId: number | null = null;
  private _shortcutCombo: ParsedShortcut | null = null;
  private _boundShortcutHandler:
    | ((event: KeyboardEvent) => void)
    | null = null;
  private _inputId = '';
  private _errorId = '';
  private _destroyed = false;

  // -- Bound handlers ---------------------------------------------------
  // NOTE: We intentionally do NOT bind a click handler on `_triggerEl`. The
  // inner overlay component (ArvoOptionList / ArvoPopover / ArvoHybridPopover
  // / ArvoDatePicker / ArvoDateRangePicker / ArvoTimePicker / ArvoDateTimePicker)
  // owns its own trigger-click toggling. Adding our own click here would
  // double-fire on every press -- the overlay opens, our handler runs first
  // (or last) and toggles to the opposite state -- causing the "flicker then
  // hide" symptom. Open-state mirroring flows through each overlay's
  // onOpen / onClose / onOpenChange callbacks via `_mirrorOverlayOpen`.
  private _boundHandleInput = (e: Event) => this._handleInput(e);
  private _boundHandleKeyDown = (e: KeyboardEvent) => this._handleKeyDown(e);
  private _boundHandleFocus = () => this._handleFocus();
  private _boundHandleBlur = () => this._handleBlur();
  private _boundHandleClearClick = () => this.clear();
  private _boundHandleSubmitClick = () => this.search();

  static readonly VARIANTS: readonly ArvoAdvanceSearchVariant[] = [
    'scopedSearch',
    'customFilter',
    'filterBy',
  ];
  static readonly SEARCH_MODES: readonly ArvoAdvanceSearchSearchMode[] = [
    'input',
    'submit',
  ];
  static readonly FILTER_CONTENT_TYPES: readonly ArvoAdvanceSearchFilterContentType[] =
    [
      'hybridPopover',
      'optionList',
      'calendar',
      'dateRange',
      'time',
      'dateTime',
    ];

  static initialize(
    element: HTMLDivElement,
    options?: ArvoAdvanceSearchOptions,
  ): ArvoAdvanceSearch {
    return new ArvoAdvanceSearch(element, options);
  }

  constructor(element: HTMLDivElement, options: ArvoAdvanceSearchOptions = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new TypeError(
        '[ArvoAdvanceSearch] initialize() requires an HTMLElement.',
      );
    }
    this._element = element;

    const initialValue =
      options.value !== undefined
        ? options.value
        : (options.defaultValue ?? '');
    const initialOpen =
      options.isOpen !== undefined
        ? options.isOpen
        : (options.defaultOpen ?? false);

    const initialScope = (() => {
      if (options.selectedScope !== undefined) return options.selectedScope;
      if (options.defaultSelectedScope !== undefined)
        return options.defaultSelectedScope;
      return (options.selectionMode ?? 'single') === 'multiple' ? [] : null;
    })();

    const initialFilter =
      options.selectedFilter !== undefined
        ? options.selectedFilter
        : (options.defaultSelectedFilter ?? null);

    this._options = {
      variant: options.variant ?? 'filterBy',
      size: options.size ?? 'md',
      searchMode: options.searchMode ?? 'input',
      placeholder: options.placeholder ?? 'Search',
      minChars: options.minChars ?? 1,
      debounceMs: options.debounceMs ?? 200,
      hasWildcardSupport: options.hasWildcardSupport ?? true,
      isDisabled: options.isDisabled ?? false,
      isReadOnly: options.isReadOnly ?? false,
      isInvalid: options.isInvalid ?? false,
      isLoading: (options.isLoading ?? false) === true,
      isClearable: options.isClearable ?? true,
      shortcut: options.shortcut ?? null,
      counter: options.counter ?? null,
      errorDisplay: options.errorDisplay ?? 'inline',
      errorMessage: options.errorMessage ?? null,
      triggerLabel: options.triggerLabel,
      triggerProps: options.triggerProps ?? null,
      selectionMode: options.selectionMode ?? 'single',
      scopeOptions: options.scopeOptions ?? [],
      hasPopoverHeader: options.hasPopoverHeader ?? false,
      popoverTitle: options.popoverTitle,
      popoverFooter:
        options.popoverFooter === undefined ? {} : options.popoverFooter,
      customFilterContent: options.customFilterContent ?? null,
      popoverProps: options.popoverProps ?? null,
      filterContentType: options.filterContentType ?? 'hybridPopover',
      filterSelectionMode: options.filterSelectionMode ?? 'multiple',
      hybridPopoverProps: options.hybridPopoverProps ?? null,
      optionListProps: options.optionListProps ?? null,
      calendarProps: options.calendarProps ?? null,
      dateRangeProps: options.dateRangeProps ?? null,
      timeProps: options.timeProps ?? null,
      dateTimeProps: options.dateTimeProps ?? null,
      width: options.width ?? null,
      isFullWidth: options.isFullWidth ?? false,
      ariaLabel: options.ariaLabel ?? 'Search',
      ariaDescribedBy: options.ariaDescribedBy ?? null,
      onChange: options.onChange ?? null,
      onSearch: options.onSearch ?? null,
      onClear: options.onClear ?? null,
      onOpenChange: options.onOpenChange ?? null,
      onScopeChange: options.onScopeChange ?? null,
      onFilterChange: options.onFilterChange ?? null,
      onFilterApply: options.onFilterApply ?? null,
      onFilterReset: options.onFilterReset ?? null,
      onBack: options.onBack ?? null,
      onClose: options.onClose ?? null,
    };

    this._value = initialValue;
    this._previousValue = initialValue;
    this._isOpen = initialOpen;
    this._selectedScope = initialScope;
    this._selectedFilter = initialFilter;

    this._render();
    this._bindEvents();
    this._registerShortcut();
    this._initializeOverlay();

    if (this._isOpen) this._openOverlay();
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._inputId = `arvo-adv-search-input-${uid}`;
    this._errorId = `arvo-adv-search-err-${uid}`;

    const o = this._options;

    el.classList.add('arvo-adv-search');
    el.classList.add(this._variantClass());
    // Size modifier (sm/md/lg) only changes the field row height +
    // vertical padding; it never affects the inner controls.
    el.classList.add(`arvo-adv-search--${o.size}`);
    el.setAttribute('role', 'search');

    if (o.isFullWidth) el.classList.add('arvo-adv-search--full-width');
    this._applyWidthStyle();

    // -- __field ------------------------------------------------------
    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-adv-search__field';

    // -- __lead (scopedSearch only) ----------------------------------
    if (o.variant === 'scopedSearch') {
      this._leadEl = document.createElement('div');
      this._leadEl.className = 'arvo-adv-search__lead';
      this._renderDdTrigger(this._leadEl);
      this._appendSeparator(this._leadEl);
      this._fieldEl.appendChild(this._leadEl);
    }

    // -- __input-group -----------------------------------------------
    this._inputGroupEl = document.createElement('div');
    this._inputGroupEl.className = 'arvo-adv-search__input-group';

    this._icoEl = document.createElement('i');
    this._icoEl.className = 'arvo-adv-search__ico o9con o9con-search';
    this._icoEl.setAttribute('aria-hidden', 'true');
    this._inputGroupEl.appendChild(this._icoEl);

    const inp = document.createElement('input');
    inp.id = this._inputId;
    inp.className = 'arvo-adv-search__input';
    inp.type = 'search';
    inp.setAttribute('role', 'searchbox');
    inp.placeholder = o.placeholder;
    inp.value = this._value;
    inp.disabled = o.isDisabled;
    inp.readOnly = o.isReadOnly;
    inp.setAttribute('aria-label', o.ariaLabel);
    if (o.isInvalid) inp.setAttribute('aria-invalid', 'true');
    if (o.isDisabled) inp.setAttribute('aria-disabled', 'true');
    if (o.isReadOnly) inp.setAttribute('aria-readonly', 'true');
    this._inputEl = inp;
    this._inputGroupEl.appendChild(inp);

    this._fieldEl.appendChild(this._inputGroupEl);

    // -- __actions ----------------------------------------------------
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-adv-search__actions';

    // Shortcut (visible when empty + not focused). The label runs through
    // `formatShortcutDisplay` so the visible text matches the active OS
    // (`Ctrl K` on Windows / Linux, `\u2318 K` on macOS).
    if (o.shortcut) {
      this._shortcutEl = document.createElement('span');
      this._shortcutEl.className = 'arvo-adv-search__shortcut';
      this._shortcutEl.textContent = formatShortcutDisplay(o.shortcut);
      this._actionsEl.appendChild(this._shortcutEl);
    }

    // Counter (visible only with value). ArvoBadge._render() reassigns
    // className, so we re-add the slot class after initializing. The badge
    // is text-only in AdvanceSearch -- per descriptor + spec the counter
    // NEVER displays an icon (hasBadgeIcon:false suppresses Badge's
    // default semantic icon resolution).
    if (o.counter) {
      this._counterEl = document.createElement('span');
      this._counterBadge = ArvoBadge.initialize(this._counterEl, {
        variant: 'counter',
        appearance: 'outline',
        size: 'md',
        semanticType: 'neutral',
        counterMode: 'ratio',
        hasBadgeIcon: false,
        count: o.counter.current,
        total: o.counter.total,
      });
      this._counterEl.classList.add('arvo-adv-search__counter');
      this._counterEl.setAttribute('aria-live', 'polite');
      this._actionsEl.appendChild(this._counterEl);
    }

    // Clear
    if (o.isClearable && !o.isReadOnly) {
      this._clearEl = document.createElement('button');
      this._clearEl.type = 'button';
      this._clearEl.className = 'arvo-adv-search__clear';
      this._clearBtn = ArvoIconButton.initialize(this._clearEl, {
        variant: 'tertiary',
        size: 'xs',
        icon: 'close',
        tooltip: 'Clear search',
        isDisabled: o.isDisabled || o.isLoading,
      });
      this._actionsEl.appendChild(this._clearEl);
    }

    // Tooltip-mode err icon
    if (o.errorDisplay === 'tooltip') {
      this._errIcoEl = document.createElement('span');
      this._errIcoEl.className =
        'arvo-adv-search__err-ico o9con o9con-status-error-filled';
      this._errIcoEl.setAttribute('role', 'img');
      const msg = o.errorMessage ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._errIcoEl.setAttribute('aria-label', msg);
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: msg,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }

    // For customFilter / filterBy, append separator + submit + trigger.
    if (o.variant !== 'scopedSearch') {
      if (o.searchMode === 'submit') this._renderSubmit(this._actionsEl);
      this._appendSeparator(this._actionsEl);
      if (o.variant === 'customFilter')
        this._renderIconTrigger(this._actionsEl);
      else this._renderDdTrigger(this._actionsEl);
    } else if (o.searchMode === 'submit') {
      this._renderSubmit(this._actionsEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    // Underline
    this._underlineEl = document.createElement('span');
    this._underlineEl.className = 'arvo-adv-search__underline';
    this._underlineEl.setAttribute('aria-hidden', 'true');
    this._fieldEl.appendChild(this._underlineEl);

    el.appendChild(this._fieldEl);

    // Inline message
    if (o.isInvalid && o.errorDisplay === 'inline') this._renderInlineMessage();

    this._updateStateClasses();
    this._updateShortcutVisibility();
    this._updateCounterVisibility();
    this._updateClearVisibility();
    this._updateSubmitDisabled();
  }

  private _variantClass(): string {
    if (this._options.variant === 'scopedSearch')
      return 'arvo-adv-search--scoped-search';
    if (this._options.variant === 'customFilter')
      return 'arvo-adv-search--custom-filter';
    return 'arvo-adv-search--filter-by';
  }

  private _appendSeparator(host: HTMLElement): void {
    const sep = document.createElement('span');
    sep.className = 'arvo-adv-search__sep';
    sep.setAttribute('aria-hidden', 'true');
    host.appendChild(sep);
    this._separatorEls.push(sep);
  }

  private _renderSubmit(host: HTMLElement): void {
    this._submitEl = document.createElement('button');
    this._submitEl.type = 'button';
    this._submitEl.className = 'arvo-adv-search__submit';
    this._submitBtn = ArvoButton.initialize(this._submitEl, {
      variant: 'primary',
      size: 'sm',
      label: 'Search',
      isDisabled: this._isSubmitDisabled(),
    });
    host.appendChild(this._submitEl);
  }

  private _renderDdTrigger(host: HTMLElement): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'arvo-adv-search__trigger arvo-btn arvo-btn--tertiary arvo-btn--md arvo-dd-btn';
    if (this._isOpen) btn.classList.add('open');
    if (this._options.isDisabled || this._options.isLoading) {
      btn.disabled = true;
    }
    btn.setAttribute('aria-expanded', String(this._isOpen));

    const label = document.createElement('span');
    label.className = 'arvo-btn__txt';
    label.textContent = this._computeTriggerLabel();
    btn.appendChild(label);

    const chev = document.createElement('span');
    chev.className =
      'arvo-btn__ico arvo-btn__ico--end o9con ' +
      (this._isOpen ? 'o9con-angle-up' : 'o9con-angle-down');
    chev.setAttribute('aria-hidden', 'true');
    btn.appendChild(chev);

    host.appendChild(btn);
    this._triggerEl = btn;
    this._triggerLabelEl = label;
    this._triggerChevronEl = chev;
  }

  private _renderIconTrigger(host: HTMLElement): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'arvo-adv-search__trigger';
    if (this._isOpen) btn.classList.add('open');
    host.appendChild(btn);
    this._triggerEl = btn;
    this._triggerIconBtn = ArvoIconButton.initialize(btn, {
      variant: 'tertiary',
      size: 'md',
      icon: 'sliders',
      tooltip:
        (this._options.triggerProps?.tooltip as string) ||
        'Open advanced filters',
      isDisabled: this._options.isDisabled || this._options.isLoading,
    });
    btn.setAttribute('aria-expanded', String(this._isOpen));
  }

  private _renderInlineMessage(): void {
    if (!this._element) return;
    this._messageEl = document.createElement('div');
    this._messageEl.id = this._errorId;
    this._messageEl.className = 'arvo-adv-search__message';
    this._messageAlert = ArvoMessageAlert.initialize(this._messageEl, {
      type: 'negative',
      message: this._options.errorMessage ?? ARVO_MSG_ALERT_DEFAULT_ERROR,
      isDismissable: false,
    });
    this._element.appendChild(this._messageEl);
    if (this._inputEl) {
      const existing = this._options.ariaDescribedBy;
      this._inputEl.setAttribute(
        'aria-describedby',
        [this._errorId, existing].filter(Boolean).join(' '),
      );
    }
  }

  private _computeTriggerLabel(): string {
    const o = this._options;
    if (o.triggerLabel != null) return o.triggerLabel;
    if (o.variant === 'scopedSearch') {
      const fallback = o.selectionMode === 'multiple' ? 'Scopes' : 'Scope';
      return findScopeLabel(o.scopeOptions, this._selectedScope) ?? fallback;
    }
    if (o.variant === 'filterBy') return 'Filter';
    return '';
  }

  private _applyWidthStyle(): void {
    const el = this._element;
    if (!el) return;
    if (this._options.isFullWidth) {
      el.style.removeProperty('--arvo-form-input-width');
      return;
    }
    if (this._options.width != null) {
      el.style.setProperty('--arvo-form-input-width', this._options.width);
    } else {
      el.style.removeProperty('--arvo-form-input-width');
    }
  }

  // ---------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------

  private _bindEvents(): void {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('input', this._boundHandleInput);
    this._inputEl.addEventListener('keydown', this._boundHandleKeyDown);
    this._inputEl.addEventListener('focus', this._boundHandleFocus);
    this._inputEl.addEventListener('blur', this._boundHandleBlur);
    if (this._clearEl)
      this._clearEl.addEventListener('click', this._boundHandleClearClick);
    // The trigger element click is owned by the inner overlay component
    // (see comment near `_boundHandleSubmitClick`). We mirror open state
    // via the overlay's onOpen / onClose / onOpenChange.
    if (this._submitEl)
      this._submitEl.addEventListener('click', this._boundHandleSubmitClick);
  }

  private _registerShortcut(): void {
    if (!this._options.shortcut) return;
    if (this._options.isDisabled || this._options.isLoading) return;
    this._shortcutCombo = parseShortcut(this._options.shortcut);
    this._boundShortcutHandler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        t !== this._inputEl &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable)
      )
        return;
      if (document.activeElement === this._inputEl) return;
      if (matchesShortcut(e, this._shortcutCombo!)) {
        e.preventDefault();
        e.stopPropagation();
        this.focus();
        this._inputEl?.select();
      }
    };
    document.addEventListener('keydown', this._boundShortcutHandler, true);
  }

  private _unregisterShortcut(): void {
    if (this._boundShortcutHandler) {
      document.removeEventListener(
        'keydown',
        this._boundShortcutHandler,
        true,
      );
      this._boundShortcutHandler = null;
    }
    this._shortcutCombo = null;
  }

  // ---------------------------------------------------------------------
  // Overlay initialization
  // ---------------------------------------------------------------------

  private _initializeOverlay(): void {
    const v = this._options.variant;
    if (v === 'scopedSearch') this._initOptionList();
    else if (v === 'customFilter') this._initPopover();
    else this._initFilterByOverlay();
  }

  private _initOptionList(): void {
    if (!this._triggerEl) return;
    const o = this._options;
    const items = o.scopeOptions.map((opt) => ({
      id: opt.key,
      label: opt.label,
      icon: opt.icon,
      isDisabled: opt.isDisabled,
      value: opt.key,
    }));
    // Inward-opening default: the scopedSearch trigger sits on the LEFT
    // edge of the field, so anchor the option list's start edge under the
    // trigger and grow it rightward into the field. Placed BEFORE the bag
    // spread so a consumer-supplied `optionListProps.placement` still wins.
    this._optionListInstance = ArvoOptionList.initialize(this._triggerEl, {
      placement: 'bottom-start',
      ...(o.optionListProps as ArvoOptionListOptions),
      items,
      isMultiple: o.selectionMode === 'multiple',
      value: this._selectedScope ?? undefined,
      defaultOpen: false,
      closeOnSelect: o.selectionMode === 'single',
      // OptionList owns trigger click + keyboard; AdvanceSearch only mirrors
      // open state via onOpenChange. Setting bindTrigger:false here while
      // ALSO binding our own click on the trigger would double-fire and
      // cause a "flicker then close" -- both handlers toggle the open state.
      bindTrigger: true,
      onOpenChange: (open) => this._mirrorOverlayOpen(open),
      onChange: (detail) => {
        if (o.selectionMode === 'multiple') {
          this._selectedScope = (detail.value as string[]) ?? [];
        } else {
          this._selectedScope = (detail.value as string) ?? null;
        }
        if (this._triggerLabelEl) {
          this._triggerLabelEl.textContent = this._computeTriggerLabel();
        }
        this._dispatch('adv-search:scope-change', {
          value: this._selectedScope,
        });
        o.onScopeChange?.(this._selectedScope as string | string[]);
      },
    });
  }

  private _initPopover(): void {
    if (!this._triggerEl) return;
    const o = this._options;
    const footer = o.popoverFooter === false ? null : (o.popoverFooter ?? {});
    const actions = (() => {
      if (!footer) return [];
      const out: NonNullable<ArvoPopoverOptions['actions']> = [];
      const hasReset = footer.hasReset ?? true;
      const secondaryLabel = footer.secondaryLabel ?? 'Cancel';
      const primaryLabel = footer.primaryLabel ?? 'Apply';
      if (hasReset) {
        out.push({
          id: 'adv-search-reset',
          icon: 'rotate-left',
          variant: 'tertiary',
          action: () => {
            this._dispatch('adv-search:filter-reset', {});
            o.onFilterReset?.();
            return false; // keep popover open
          },
        });
      }
      if (secondaryLabel) {
        out.push({
          id: 'adv-search-cancel',
          label: secondaryLabel,
          variant: 'secondary',
          action: () => {
            o.onClose?.();
            this._setOpen(false);
          },
        });
      }
      if (primaryLabel) {
        out.push({
          id: 'adv-search-apply',
          label: primaryLabel,
          variant: 'primary',
          action: () => {
            this._dispatch('adv-search:filter-apply', {
              value: this._selectedFilter,
            });
            o.onFilterApply?.(this._selectedFilter);
            this._setOpen(false);
          },
        });
      }
      return out;
    })();

    const headerOptions: Partial<ArvoPopoverOptions> = o.hasPopoverHeader
      ? {
          hasHeader: true,
          title: o.popoverTitle ?? '',
        }
      : {
          hasHeader: false,
          isClosable: false,
          hasBackButton: false,
        };

    // Inward-opening default: the customFilter trigger sits on the RIGHT
    // edge of the field, so anchor the popover's end edge under the trigger
    // and grow it leftward. Placed BEFORE the popoverProps spread so a
    // consumer-supplied placement still wins.
    this._popoverInstance = ArvoPopover.initialize(this._triggerEl, {
      placement: 'bottom-end',
      ...(o.popoverProps as ArvoPopoverOptions),
      ...headerOptions,
      actions,
      hasFooter: !!footer,
      content: o.customFilterContent ?? '',
      onOpen: () => {
        this._mirrorOverlayOpen(true);
      },
      onClose: () => {
        this._mirrorOverlayOpen(false);
      },
      onBack: () => {
        this._dispatch('adv-search:back', {});
        o.onBack?.();
      },
    });
  }

  private _initFilterByOverlay(): void {
    if (!this._triggerEl) return;
    const o = this._options;
    // Inward-opening default for the right-anchored filterBy trigger: end
    // edge of the overlay aligns with the right edge of the trigger and
    // grows leftward into the field. Applied to every filter overlay below
    // before the consumer bag spread so the bag still wins.
    if (o.filterContentType === 'hybridPopover') {
      this._hybridPopoverInstance = ArvoHybridPopover.initialize(
        this._triggerEl,
        {
          placement: 'bottom-end',
          ...(o.hybridPopoverProps as ArvoHybridPopoverOptions),
          selectionMode:
            o.filterSelectionMode === 'multiple' ? 'multi' : 'single',
          variant: o.filterSelectionMode === 'multiple' ? 'multi' : 'single',
          value: this._selectedFilter as ArvoHybridPopoverOptions['value'],
          onChange: (next) => {
            this._selectedFilter = next;
            this._dispatch('adv-search:filter-change', { value: next });
            o.onFilterChange?.(next);
          },
          onApply: (next: unknown) => {
            this._selectedFilter = next;
            this._dispatch('adv-search:filter-apply', { value: next });
            o.onFilterApply?.(next);
          },
          onReset: () => {
            this._dispatch('adv-search:filter-reset', {});
            o.onFilterReset?.();
          },
          onCancel: () => {
            o.onClose?.();
          },
        },
      );
      this._triggerEl.addEventListener('hpop:open', () =>
        this._mirrorOverlayOpen(true),
      );
      this._triggerEl.addEventListener('hpop:close', () =>
        this._mirrorOverlayOpen(false),
      );
      return;
    }
    if (o.filterContentType === 'optionList') {
      const items =
        (o.hybridPopoverProps?.items as Parameters<
          typeof ArvoOptionList.initialize
        >[1]['items']) ??
        ((o.optionListProps as Record<string, unknown>)?.items as Parameters<
          typeof ArvoOptionList.initialize
        >[1]['items']) ??
        [];
      this._optionListInstance = ArvoOptionList.initialize(this._triggerEl, {
        placement: 'bottom-end',
        ...(o.optionListProps as ArvoOptionListOptions),
        items,
        isMultiple: o.filterSelectionMode === 'multiple',
        value: this._selectedFilter ?? undefined,
        defaultOpen: false,
        closeOnSelect: o.filterSelectionMode === 'single',
        bindTrigger: true,
        onOpenChange: (open) => this._mirrorOverlayOpen(open),
        onChange: (detail) => {
          this._selectedFilter = detail.value;
          this._dispatch('adv-search:filter-change', { value: detail.value });
          o.onFilterChange?.(detail.value);
        },
      });
      return;
    }
    // Date/time pickers all share the anchor:true pattern.
    const onPickerOpen = () => this._mirrorOverlayOpen(true);
    const onPickerClose = () => this._mirrorOverlayOpen(false);
    if (o.filterContentType === 'calendar') {
      this._datePickerInstance = ArvoDatePicker.initialize(this._triggerEl, {
        placement: 'bottom-end',
        ...(o.calendarProps as ArvoDatePickerOptions),
        anchor: true,
        value: (this._selectedFilter as Date | string | null) ?? null,
        onOpen: onPickerOpen,
        onClose: onPickerClose,
        onChange: (payload) => {
          this._selectedFilter = payload.value;
          this._dispatch('adv-search:filter-change', { value: payload.value });
          o.onFilterChange?.(payload.value);
        },
      });
      return;
    }
    if (o.filterContentType === 'dateRange') {
      const range = this._selectedFilter as
        | { start: Date | string | null; end: Date | string | null }
        | null;
      this._dateRangeInstance = ArvoDateRangePicker.initialize(
        this._triggerEl,
        {
          placement: 'bottom-end',
          ...(o.dateRangeProps as ArvoDateRangePickerOptions),
          anchor: true,
          startValue: range?.start ?? null,
          endValue: range?.end ?? null,
          onOpen: onPickerOpen,
          onClose: onPickerClose,
          onChange: (payload) => {
            const next = {
              start: payload.start,
              end: payload.end,
              formatted: payload.formatted,
              mode: payload.mode,
            };
            this._selectedFilter = next;
            this._dispatch('adv-search:filter-change', { value: next });
            o.onFilterChange?.(next);
          },
        },
      );
      return;
    }
    if (o.filterContentType === 'time') {
      this._timePickerInstance = ArvoTimePicker.initialize(this._triggerEl, {
        placement: 'bottom-end',
        ...(o.timeProps as ArvoTimePickerOptions),
        anchor: true,
        value: this._selectedFilter as ArvoTimePickerOptions['value'],
        onOpen: onPickerOpen,
        onClose: onPickerClose,
        onChange: (payload) => {
          this._selectedFilter = payload.value;
          this._dispatch('adv-search:filter-change', { value: payload.value });
          o.onFilterChange?.(payload.value);
        },
      });
      return;
    }
    // dateTime
    this._dateTimeInstance = ArvoDateTimePicker.initialize(this._triggerEl, {
      placement: 'bottom-end',
      ...(o.dateTimeProps as ArvoDateTimePickerOptions),
      anchor: true,
      value: (this._selectedFilter as Date | string | null) ?? null,
      onOpen: onPickerOpen,
      onClose: onPickerClose,
      onChange: (payload) => {
        this._selectedFilter = payload.value;
        this._dispatch('adv-search:filter-change', { value: payload.value });
        o.onFilterChange?.(payload.value);
      },
    });
  }

  private _mirrorOverlayOpen(next: boolean): void {
    if (next === this._isOpen) return;
    this._isOpen = next;
    this._options.onOpenChange?.(next);
    this._dispatch(next ? 'adv-search:open' : 'adv-search:close', {});
    this._updateStateClasses();
    this._updateTriggerOpenStyling();
  }

  private _setOpen(next: boolean): void {
    if (next === this._isOpen) {
      // Even when the value is unchanged, ensure DOM reflects requested state.
      return;
    }
    if (next) this._openOverlay();
    else this._closeOverlay();
  }

  private _openOverlay(): void {
    if (this._optionListInstance) {
      this._optionListInstance.open();
      return;
    }
    if (this._popoverInstance) {
      this._popoverInstance.open();
      return;
    }
    if (this._hybridPopoverInstance) {
      this._hybridPopoverInstance.open();
      return;
    }
    if (this._datePickerInstance) {
      this._datePickerInstance.open();
      return;
    }
    if (this._dateRangeInstance) {
      this._dateRangeInstance.open();
      return;
    }
    if (this._timePickerInstance) {
      this._timePickerInstance.open();
      return;
    }
    if (this._dateTimeInstance) {
      this._dateTimeInstance.open();
      return;
    }
  }

  private _closeOverlay(): void {
    if (this._optionListInstance) this._optionListInstance.close();
    if (this._popoverInstance) this._popoverInstance.close();
    if (this._hybridPopoverInstance) this._hybridPopoverInstance.close();
    if (this._datePickerInstance) this._datePickerInstance.close();
    if (this._dateRangeInstance) this._dateRangeInstance.close();
    if (this._timePickerInstance) this._timePickerInstance.close();
    if (this._dateTimeInstance) this._dateTimeInstance.close();
  }

  // ---------------------------------------------------------------------
  // Input handlers
  // ---------------------------------------------------------------------

  private _handleInput(_e: Event): void {
    if (
      this._options.isDisabled ||
      this._options.isLoading ||
      this._options.isReadOnly
    )
      return;
    const v = this._inputEl?.value ?? '';
    this._value = v;
    this._dispatch('adv-search:input', { value: v });
    this._options.onChange?.(v);

    this._updateStateClasses();
    this._updateShortcutVisibility();
    this._updateCounterVisibility();
    this._updateClearVisibility();
    this._updateSubmitDisabled();

    if (
      this._options.searchMode === 'input' &&
      v.length >= this._options.minChars
    ) {
      if (this._options.debounceMs > 0) {
        this._cancelDebounce();
        this._debounceTimerId = window.setTimeout(() => {
          this._fireSearch(v);
        }, this._options.debounceMs);
      } else {
        this._fireSearch(v);
      }
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') {
      if (this._isOpen) return;
      if (
        this._options.isClearable &&
        !this._options.isReadOnly &&
        this._value.length > 0
      ) {
        e.preventDefault();
        this.clear();
        return;
      }
      (e.target as HTMLElement).blur();
      return;
    }
    if (e.key === 'Enter') {
      if (
        this._options.searchMode === 'submit' &&
        !this._options.isReadOnly &&
        this._value.length >= this._options.minChars
      ) {
        e.preventDefault();
        this._cancelDebounce();
        this._fireSearch(this._value);
      }
    }
  }

  private _handleFocus(): void {
    this._isFocused = true;
    this._previousValue = this._value;
    this._updateStateClasses();
    this._updateShortcutVisibility();
  }

  private _handleBlur(): void {
    this._isFocused = false;
    if (this._value !== this._previousValue) {
      this._dispatch('adv-search:change', {
        value: this._value,
        previousValue: this._previousValue,
      });
      this._previousValue = this._value;
    }
    this._updateStateClasses();
    this._updateShortcutVisibility();
  }

  private _fireSearch(v: string): void {
    this._dispatch('adv-search:search', { value: v });
    this._options.onSearch?.(v);
  }

  private _cancelDebounce(): void {
    if (this._debounceTimerId !== null) {
      window.clearTimeout(this._debounceTimerId);
      this._debounceTimerId = null;
    }
  }

  // ---------------------------------------------------------------------
  // State-class updates
  // ---------------------------------------------------------------------

  private _updateStateClasses(): void {
    const el = this._element;
    if (!el) return;
    el.classList.toggle('has-value', this._value.length > 0);
    el.classList.toggle('is-focused', this._isFocused);
    el.classList.toggle('is-open', this._isOpen);
    el.classList.toggle('has-error', this._options.isInvalid);
    el.classList.toggle(
      'error-tooltip',
      this._options.isInvalid && this._options.errorDisplay === 'tooltip',
    );
    el.classList.toggle('is-disabled', this._options.isDisabled);
    el.classList.toggle(
      'is-readonly',
      this._options.isReadOnly && !this._options.isDisabled,
    );
    el.classList.toggle('loading', this._options.isLoading);
  }

  private _updateShortcutVisibility(): void {
    if (!this._shortcutEl) return;
    const visible =
      !!this._options.shortcut && this._value.length === 0 && !this._isFocused;
    this._shortcutEl.style.display = visible ? '' : 'none';
  }

  private _updateCounterVisibility(): void {
    if (!this._counterEl) return;
    const visible =
      !!this._options.counter &&
      this._value.length > 0 &&
      !this._options.isDisabled;
    this._counterEl.style.display = visible ? '' : 'none';
  }

  private _updateClearVisibility(): void {
    if (!this._clearEl) return;
    const visible =
      this._options.isClearable &&
      this._value.length > 0 &&
      !this._options.isDisabled &&
      !this._options.isReadOnly &&
      !this._options.isLoading;
    this._clearEl.style.display = visible ? '' : 'none';
  }

  private _updateSubmitDisabled(): void {
    if (this._submitBtn) this._submitBtn.disabled(this._isSubmitDisabled());
  }

  private _isSubmitDisabled(): boolean {
    return (
      this._options.isDisabled ||
      this._options.isLoading ||
      this._options.isReadOnly ||
      this._value.length < Math.max(this._options.minChars, 1)
    );
  }

  private _updateTriggerOpenStyling(): void {
    if (!this._triggerEl) return;
    this._triggerEl.classList.toggle('open', this._isOpen);
    this._triggerEl.setAttribute('aria-expanded', String(this._isOpen));
    if (this._triggerChevronEl) {
      this._triggerChevronEl.classList.toggle('o9con-angle-up', this._isOpen);
      this._triggerChevronEl.classList.toggle(
        'o9con-angle-down',
        !this._isOpen,
      );
    }
  }

  private _dispatch(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  value(): string;
  value(next: string): void;
  value(next?: string): string | void {
    if (next === undefined) return this._value;
    this._cancelDebounce();
    const prev = this._value;
    this._value = next;
    if (this._inputEl) this._inputEl.value = next;
    if (next !== prev) {
      this._dispatch('adv-search:change', { value: next, previousValue: prev });
      this._options.onChange?.(next);
    }
    this._previousValue = next;
    this._updateStateClasses();
    this._updateShortcutVisibility();
    this._updateCounterVisibility();
    this._updateClearVisibility();
    this._updateSubmitDisabled();
  }

  clear(): void {
    this._cancelDebounce();
    this._value = '';
    if (this._inputEl) this._inputEl.value = '';
    this._dispatch('adv-search:clear', {});
    this._options.onClear?.();
    this._inputEl?.focus();
    if (this._options.searchMode === 'input') this._fireSearch('');
    this._updateStateClasses();
    this._updateShortcutVisibility();
    this._updateCounterVisibility();
    this._updateClearVisibility();
    this._updateSubmitDisabled();
  }

  search(): void {
    this._cancelDebounce();
    this._fireSearch(this._value);
  }

  open(): void {
    this._setOpen(true);
  }
  close(): void {
    this._setOpen(false);
  }
  toggle(force?: boolean): void {
    this._setOpen(force === undefined ? !this._isOpen : force);
  }
  isOpen(): boolean {
    return this._isOpen;
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;
    this._options.isDisabled = state;
    if (this._inputEl) this._inputEl.disabled = state;
    this._clearBtn?.disabled(state || this._options.isLoading);
    this._submitBtn?.disabled(this._isSubmitDisabled());
    this._updateStateClasses();
  }

  readOnly(): boolean;
  readOnly(state: boolean): void;
  readOnly(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isReadOnly;
    this._options.isReadOnly = state;
    if (this._inputEl) this._inputEl.readOnly = state;
    this._updateStateClasses();
    this._updateClearVisibility();
  }

  setError(message: string | false): void {
    if (message === false) {
      this._options.isInvalid = false;
      this._options.errorMessage = null;
    } else {
      this._options.isInvalid = true;
      this._options.errorMessage = message;
    }
    this._messageAlert?.destroy();
    this._messageEl?.remove();
    this._messageEl = null;
    this._messageAlert = null;
    if (this._options.isInvalid && this._options.errorDisplay === 'inline') {
      this._renderInlineMessage();
    }
    this._updateStateClasses();
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading === true;
    this._updateStateClasses();
    this._clearBtn?.disabled(
      this._options.isLoading || this._options.isDisabled,
    );
    this._submitBtn?.disabled(this._isSubmitDisabled());
  }

  focus(): void {
    this._inputEl?.focus();
  }

  counter(): ArvoAdvanceSearchCounter | null;
  counter(current: number | null, total?: number): void;
  counter(
    current?: number | null,
    total?: number,
  ): ArvoAdvanceSearchCounter | null | void {
    if (current === undefined) return this._options.counter;
    if (current === null) {
      this._options.counter = null;
      this._counterBadge?.destroy();
      this._counterEl?.remove();
      this._counterEl = null;
      this._counterBadge = null;
      return;
    }
    const next = { current, total: total ?? 0 };
    this._options.counter = next;
    if (!this._counterEl && this._actionsEl) {
      this._counterEl = document.createElement('span');
      this._counterBadge = ArvoBadge.initialize(this._counterEl, {
        variant: 'counter',
        appearance: 'outline',
        size: 'md',
        semanticType: 'neutral',
        counterMode: 'ratio',
        hasBadgeIcon: false,
        count: next.current,
        total: next.total,
      });
      this._counterEl.classList.add('arvo-adv-search__counter');
      this._counterEl.setAttribute('aria-live', 'polite');
      // Insert before the first separator if present, else append.
      const sep = this._actionsEl.querySelector('.arvo-adv-search__sep');
      if (sep) this._actionsEl.insertBefore(this._counterEl, sep);
      else this._actionsEl.appendChild(this._counterEl);
    } else if (this._counterBadge) {
      this._counterBadge.count(next.current);
      this._counterBadge.setTotal(next.total);
    }
    this._updateCounterVisibility();
  }

  shortcut(): string | null;
  shortcut(combo: string | null): void;
  shortcut(combo?: string | null): string | null | void {
    if (combo === undefined) return this._options.shortcut;
    this._options.shortcut = combo;
    this._unregisterShortcut();
    if (combo && this._shortcutEl) {
      this._shortcutEl.textContent = formatShortcutDisplay(combo);
    }
    this._registerShortcut();
    this._updateShortcutVisibility();
  }

  selectedScope(): string | string[] | null;
  selectedScope(next: string | string[] | null): void;
  selectedScope(
    next?: string | string[] | null,
  ): string | string[] | null | void {
    if (next === undefined) return this._selectedScope;
    this._selectedScope = next;
    this._dispatch('adv-search:scope-change', { value: next });
    this._options.onScopeChange?.(next as string | string[]);
    if (this._triggerLabelEl) {
      this._triggerLabelEl.textContent = this._computeTriggerLabel();
    }
  }

  selectedFilter(): unknown;
  selectedFilter(next: unknown): void;
  selectedFilter(next?: unknown): unknown | void {
    if (arguments.length === 0) return this._selectedFilter;
    this._selectedFilter = next;
    this._dispatch('adv-search:filter-change', { value: next });
    this._options.onFilterChange?.(next);
  }

  width(): string | null;
  width(value: string | null): void;
  width(value?: string | null): string | null | void {
    if (value === undefined) return this._options.width;
    this._options.width = value;
    this._applyWidthStyle();
  }

  fullWidth(): boolean;
  fullWidth(state: boolean): void;
  fullWidth(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isFullWidth;
    this._options.isFullWidth = state;
    this._element?.classList.toggle('arvo-adv-search--full-width', state);
    this._applyWidthStyle();
  }

  setSize(next: ArvoAdvanceSearchSize): void {
    if (next === this._options.size) return;
    this._options.size = next;
    if (!this._element) return;
    this._element.classList.remove(
      'arvo-adv-search--sm',
      'arvo-adv-search--md',
      'arvo-adv-search--lg',
    );
    this._element.classList.add(`arvo-adv-search--${next}`);
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._cancelDebounce();
    this._unregisterShortcut();
    if (this._errIcoConnector) this._errIcoConnector.destroy();
    this._clearBtn?.destroy();
    this._submitBtn?.destroy();
    this._counterBadge?.destroy();
    this._triggerIconBtn?.destroy();
    this._messageAlert?.destroy();
    this._optionListInstance?.destroy();
    this._popoverInstance?.destroy();
    this._hybridPopoverInstance?.destroy();
    this._datePickerInstance?.destroy();
    this._dateRangeInstance?.destroy();
    this._timePickerInstance?.destroy();
    this._dateTimeInstance?.destroy();
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._boundHandleInput);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeyDown);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
    }
    this._clearEl?.removeEventListener('click', this._boundHandleClearClick);
    this._submitEl?.removeEventListener('click', this._boundHandleSubmitClick);
    if (this._element) {
      this._element.textContent = '';
      [
        'arvo-adv-search',
        'arvo-adv-search--scoped-search',
        'arvo-adv-search--custom-filter',
        'arvo-adv-search--filter-by',
        'arvo-adv-search--sm',
        'arvo-adv-search--md',
        'arvo-adv-search--lg',
        'arvo-adv-search--full-width',
        'has-value',
        'is-focused',
        'is-open',
        'has-error',
        'error-tooltip',
        'is-disabled',
        'is-readonly',
        'loading',
      ].forEach((c) => this._element!.classList.remove(c));
      this._element.removeAttribute('role');
      this._element.style.removeProperty('--arvo-form-input-width');
    }
    this._element = null;
  }
}

export default ArvoAdvanceSearch;
