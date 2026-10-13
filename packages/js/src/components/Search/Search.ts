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
import { ArvoMessageAlert, ARVO_MSG_ALERT_DEFAULT_ERROR } from '../MessageAlert/MessageAlert';
// ---------------------------------------------------------------------------
// Multiline config types
// ---------------------------------------------------------------------------

type DelimiterBehavior =
  | 'none'
  | 'comma-to-new-row'
  | 'comma-and-linebreak'
  | 'shift+enter';

interface MultiLineConfig {
  enabled: boolean;
  minRows: number;
  maxRows: number;
  collapseBehavior: 'none' | 'summary';
  delimiterBehavior: DelimiterBehavior;
  delimiter: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ArvoSearchOptions {
  variant?: 'filter' | 'expandable-filter' | 'find';
  value?: string;
  /**
   * Uncontrolled initial input value. Only consulted when `value` is omitted.
   * Mirrors the React `defaultValue` prop seeded via internal state when the
   * controlled `value` is undefined.
   */
  defaultValue?: string;
  placeholder?: string;
  isDisabled?: boolean;
  /** Renders the field read-only: focusable for copy but not editable. */
  isReadOnly?: boolean;
  isInvalid?: boolean;
  errorMsg?: string;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  isClearable?: boolean;
  shortcut?: string | null;
  counter?: { current: number; total: number } | null;
  searchMode?: 'input' | 'submit';
  minChars?: number;
  /**
   * Milliseconds to debounce `onSearch` in `input` mode.
   * Does not apply in `submit` mode.
   *
   * Default is `0` (synchronous) for design-system stability: every Arvo
   * component that composes `ArvoSearch` internally for in-memory filtering
   * (Listbox, ActionMenu, OptionList, PanelShell, etc.) needs the filter to
   * apply on the same tick as the keystroke. Direct consumers driving a
   * backend search should opt into a positive value (the figma spec
   * recommends `150`-`300` ms; `200` is a sensible default).
   * @default 0
   */
  debounceMs?: number;
  isMultiLine?:
    | boolean
    | {
        enabled: boolean;
        minRows?: number;
        maxRows?: number;
        collapseBehavior?: 'none' | 'summary';
        delimiterBehavior?: DelimiterBehavior;
        delimiter?: string;
        /** @deprecated Use delimiterBehavior instead */
        expandRows?: boolean;
      };
  isLoading?: boolean;
  width?: string;
  isFullWidth?: boolean;
  /** Controlled expanded state for `expandable-filter` variant. */
  isExpanded?: boolean;
  /** Uncontrolled initial expanded state for `expandable-filter` variant. */
  defaultExpanded?: boolean;
  /** Direction the field expands when trigger is clicked. @default 'end' */
  expandDirection?: 'start' | 'end';
  /** When false, the "Previous match" button is omitted in `find` variant. @default true */
  hasPreviousButton?: boolean;
  /** When false, the "Next match" button is omitted in `find` variant. @default true */
  hasNextButton?: boolean;
  onSearch?: ((value: string, values?: string[]) => void) | null;
  onInput?: ((event: Event) => void) | null;
  onChange?: ((value: string) => void) | null;
  onClear?: (() => void) | null;
  onFocus?: ((event: Event) => void) | null;
  onBlur?: ((event: Event) => void) | null;
  onNext?: (() => void) | null;
  onPrevious?: (() => void) | null;
  onExpandedChange?: ((expanded: boolean) => void) | null;
  'aria-label'?: string;
}

type RequiredSearchOptions = Required<
  Omit<
    ArvoSearchOptions,
    | 'onSearch'
    | 'onInput'
    | 'onChange'
    | 'onClear'
    | 'onFocus'
    | 'onBlur'
    | 'onNext'
    | 'onPrevious'
    | 'onExpandedChange'
    | 'errorMsg'
    | 'shortcut'
    | 'counter'
    | 'width'
    | 'defaultValue'
  >
> & {
  width: string | null;
  errorMsg: string | null;
  shortcut: string | null;
  counter: { current: number; total: number } | null;
  onSearch: ((value: string, values?: string[]) => void) | null;
  onInput: ((event: Event) => void) | null;
  onChange: ((value: string) => void) | null;
  onClear: (() => void) | null;
  onFocus: ((event: Event) => void) | null;
  onBlur: ((event: Event) => void) | null;
  onNext: (() => void) | null;
  onPrevious: (() => void) | null;
  onExpandedChange: ((expanded: boolean) => void) | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ML_DEFAULTS: MultiLineConfig = {
  enabled: true,
  minRows: 1,
  maxRows: 5,
  collapseBehavior: 'none',
  delimiterBehavior: 'comma-to-new-row',
  delimiter: ',',
};

const VALID_DELIMITER_BEHAVIORS: readonly DelimiterBehavior[] = [
  'none',
  'comma-to-new-row',
  'comma-and-linebreak',
  'shift+enter',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function parseValues(value: string, mlConfig: MultiLineConfig): string[] {
  const lines = value.split('\n');
  const { delimiterBehavior, delimiter } = mlConfig;
  // For behaviors where comma is literal, only split on newlines
  if (delimiterBehavior === 'none' || delimiterBehavior === 'shift+enter') {
    return lines.map(s => s.trim()).filter(Boolean);
  }
  return lines
    .flatMap(line => line.split(delimiter))
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Normalize a multiline value by collapsing consecutive newlines into a
 * single newline and stripping leading newlines. Keeps a trailing newline (if
 * any) so the user retains their "new row" cursor position while still
 * typing. Mirrors `normalizeMultilineValue` in the React twin.
 */
function normalizeMultilineValue(v: string): string {
  let out = v.replace(/\n[ \t]*\n+/g, '\n').replace(/\n{2,}/g, '\n');
  out = out.replace(/^\n+/, '');
  return out;
}

/**
 * Returns true when the line surrounding the cursor in `textarea` contains
 * only whitespace. Mirrors `isCursorLineEmpty` in the React twin.
 */
function isCursorLineEmpty(textarea: HTMLTextAreaElement): boolean {
  const value = textarea.value;
  const cursor = textarea.selectionStart ?? value.length;
  const before = value.slice(0, cursor);
  const after = value.slice(cursor);
  const lineStart = before.lastIndexOf('\n') + 1;
  const afterBreak = after.indexOf('\n');
  const lineEnd = afterBreak === -1 ? after.length : afterBreak;
  const currentLine = before.slice(lineStart) + after.slice(0, lineEnd);
  return currentLine.trim().length === 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoSearch {
  private _element: HTMLDivElement | null;
  private _options: RequiredSearchOptions;

  private _inputEl: HTMLInputElement | HTMLTextAreaElement | null = null;
  private _fieldEl: HTMLDivElement | null = null;
  private _actionsEl: HTMLDivElement | null = null;
  private _borderEl: HTMLDivElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _clearEl: HTMLButtonElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _sep1El: HTMLSpanElement | null = null;
  private _sep2El: HTMLSpanElement | null = null;
  private _shortcutEl: HTMLSpanElement | null = null;
  private _counterHostEl: HTMLElement | null = null;
  private _counterBadge: ArvoBadge | null = null;
  private _prevEl: HTMLButtonElement | null = null;
  private _prevBtn: ArvoIconButton | null = null;
  private _nextEl: HTMLButtonElement | null = null;
  private _nextBtn: ArvoIconButton | null = null;
  private _submitEl: HTMLButtonElement | null = null;
  private _submitBtn: ArvoButton | null = null;
  private _expandTriggerEl: HTMLDivElement | null = null;
  private _expandTriggerBtnEl: HTMLButtonElement | null = null;
  private _expandTriggerBtn: ArvoIconButton | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _previousValue: string = '';
  private _errorId: string = '';
  private _inputId: string = '';
  private _shortcutCombo: ParsedShortcut | null = null;
  private _boundShortcutHandler: ((event: KeyboardEvent) => void) | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  /** Active setTimeout id for debounced search; null when idle. */
  private _searchDebounceId: number | null = null;
  /** Current expanded state for expandable-filter variant. */
  private _isExpanded: boolean = false;
  /**
   * Guard window between expand-trigger focus and the rAF-scheduled input
   * focus. While true, the root `focusout` listener will not auto-collapse
   * (the trigger losing focus to `inert` would otherwise immediately undo
   * the expand the user just initiated). Cleared once focus has settled
   * inside the field.
   */
  private _suppressAutoCollapse: boolean = false;
  /** Stashed real value while collapseBehavior='summary' is active (null when not in summary mode). */
  private _realValueRef: string | null = null;

  private _boundHandleInput: (event: Event) => void;
  private _boundHandleFocus: (event: Event) => void;
  private _boundHandleBlur: (event: Event) => void;
  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _boundHandleClearClick: (event: Event) => void;
  private _boundHandlePrevClick: (event: Event) => void;
  private _boundHandleNextClick: (event: Event) => void;
  private _boundHandleSubmitClick: (event: Event) => void;
  private _boundHandleExpandTriggerClick: (event: Event) => void;
  private _boundHandleExpandTriggerFocus: (event: Event) => void;
  private _boundHandleRootFocusOut: (event: FocusEvent) => void;
  private _boundHandlePaste: (event: Event) => void;

  static readonly VARIANTS = ['filter', 'expandable-filter', 'find'] as const;
  static readonly SEARCH_MODES = ['input', 'submit'] as const;

  static readonly DEFAULTS: RequiredSearchOptions = {
    variant: 'filter',
    value: '',
    placeholder: 'Search',
    isDisabled: false,
    isReadOnly: false,
    isInvalid: false,
    errorMsg: null,
    errorDisplay: 'inline',
    isClearable: true,
    shortcut: null,
    counter: null,
    searchMode: 'input',
    minChars: 0,
    debounceMs: 0,
    isMultiLine: false,
    isLoading: false,
    width: null,
    isFullWidth: false,
    isExpanded: false,
    defaultExpanded: false,
    expandDirection: 'end',
    hasPreviousButton: true,
    hasNextButton: true,
    onSearch: null,
    onInput: null,
    onChange: null,
    onClear: null,
    onFocus: null,
    onBlur: null,
    onNext: null,
    onPrevious: null,
    onExpandedChange: null,
    'aria-label': 'Search',
  };

  static initialize(element: HTMLDivElement, options?: ArvoSearchOptions): ArvoSearch {
    return new ArvoSearch(element, options);
  }

  constructor(element: HTMLDivElement, options?: ArvoSearchOptions) {
    this._element = element;

    const variant =
      options?.variant && (ArvoSearch.VARIANTS as readonly string[]).includes(options.variant)
        ? options.variant
        : ArvoSearch.DEFAULTS.variant;

    const searchMode =
      options?.searchMode && (ArvoSearch.SEARCH_MODES as readonly string[]).includes(options.searchMode)
        ? options.searchMode
        : ArvoSearch.DEFAULTS.searchMode;

    // Seed uncontrolled value from `defaultValue` when controlled `value` is omitted.
    const initialValue =
      options?.value !== undefined
        ? options.value
        : (options?.defaultValue ?? ArvoSearch.DEFAULTS.value);

    this._options = {
      ...ArvoSearch.DEFAULTS,
      ...options,
      variant,
      searchMode,
      value: initialValue,
      width: options?.width ?? null,
      errorMsg: options?.errorMsg ?? null,
      shortcut: options?.shortcut ?? null,
      counter: options?.counter ?? null,
      onSearch: options?.onSearch ?? null,
      onInput: options?.onInput ?? null,
      onChange: options?.onChange ?? null,
      onClear: options?.onClear ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
      onNext: options?.onNext ?? null,
      onPrevious: options?.onPrevious ?? null,
      onExpandedChange: options?.onExpandedChange ?? null,
    };


    this._previousValue = this._options.value;

    // Seed expanded state from isExpanded (controlled initial) or defaultExpanded (uncontrolled).
    // Subsequent state lives in _isExpanded; treat isExpanded option as initial value only.
    this._isExpanded = options?.isExpanded ?? options?.defaultExpanded ?? false;

    this._boundHandleInput = this._handleInput.bind(this);
    this._boundHandleFocus = this._handleFocus.bind(this);
    this._boundHandleBlur = this._handleBlur.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleClearClick = this._handleClearClick.bind(this);
    this._boundHandlePrevClick = this._handlePrevClick.bind(this);
    this._boundHandleNextClick = this._handleNextClick.bind(this);
    this._boundHandleSubmitClick = this._handleSubmitClick.bind(this);
    this._boundHandleExpandTriggerClick = this._handleExpandTriggerClick.bind(this);
    this._boundHandleExpandTriggerFocus = this._handleExpandTriggerFocus.bind(this);
    this._boundHandleRootFocusOut = this._handleRootFocusOut.bind(this);
    this._boundHandlePaste = this._handlePaste.bind(this);

    this._render();
    this._bindEvents();
    this._registerShortcut();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    const uid = ++_idCounter;
    this._errorId = `arvo-search-err-${uid}`;
    this._inputId = `arvo-search-input-${uid}`;

    const {
      variant, value, placeholder, isDisabled, isReadOnly, isInvalid, errorMsg, errorDisplay,
      isClearable, shortcut, counter, isLoading, searchMode, hasPreviousButton, hasNextButton,
      expandDirection,
    } = this._options;

    const useTooltipError = errorDisplay === 'tooltip';
    const useInlineAlert = errorDisplay === 'inline';
    const ariaLabel = this._options['aria-label'];
    const mlConfig = this._resolveMultiLineConfig();
    const effectiveClearable = mlConfig.enabled ? false : (isReadOnly ? false : isClearable);
    const isExpandableFilter = variant === 'expandable-filter';

    // Root classes
    el.classList.add('arvo-search', `arvo-search--${variant}`);
    el.setAttribute('role', 'search');
    if (isExpandableFilter && !this._isExpanded) el.classList.add('arvo-search--collapsed');
    if (isExpandableFilter) el.classList.add(`arvo-search--expand-${expandDirection}`);
    if (this._options.isFullWidth) el.classList.add('arvo-search--full-width');
    if (mlConfig.enabled) el.classList.add('arvo-search--multi-line');

    this._applyWidthStyle();

    // Expandable-filter trigger: always in DOM; CSS shows/hides based on --collapsed modifier.
    // Size `md` so the trigger button fully occupies the 32x32 collapsed footprint.
    // Using `sm` left the trigger at 24x24 inside a 32px field, exposing the
    // field's own `__ico` next to the trigger glyph (two overlapping search icons).
    if (isExpandableFilter) {
      this._expandTriggerEl = document.createElement('div');
      this._expandTriggerEl.className = 'arvo-search__expand-trigger';

      this._expandTriggerBtnEl = document.createElement('button');
      this._expandTriggerBtn = ArvoIconButton.initialize(this._expandTriggerBtnEl, {
        size: 'md',
        variant: 'tertiary',
        icon: 'search',
        tooltip: 'Open search',
        isDisabled: isDisabled || isLoading,
      });
      this._expandTriggerBtnEl.setAttribute('aria-expanded', String(this._isExpanded));
      this._expandTriggerBtnEl.setAttribute('aria-controls', this._inputId);
      this._expandTriggerEl.appendChild(this._expandTriggerBtnEl);
      el.appendChild(this._expandTriggerEl);
    }

    // Field container
    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-search__field';

    // Search icon
    this._icoEl = document.createElement('i');
    this._icoEl.className = 'arvo-search__ico o9con o9con-search';
    this._icoEl.setAttribute('aria-hidden', 'true');
    this._fieldEl.appendChild(this._icoEl);

    // Input or textarea
    if (mlConfig.enabled) {
      const ta = document.createElement('textarea');
      ta.id = this._inputId;
      ta.className = 'arvo-search__input';
      ta.rows = 1;
      ta.value = value;
      if (placeholder) ta.placeholder = placeholder;
      ta.disabled = isDisabled;
      ta.readOnly = isReadOnly;
      ta.setAttribute('aria-multiline', 'true');
      if (ariaLabel) ta.setAttribute('aria-label', ariaLabel);
      if (isReadOnly) ta.setAttribute('aria-readonly', 'true');

      // Initial summary state: when collapseBehavior='summary' and the seeded
      // value already contains > 1 parsed entry, paint the field in summary
      // mode on mount. Mirrors the React initial-summary lazy useState.
      if (
        mlConfig.collapseBehavior === 'summary' &&
        this._realValueRef === null &&
        value
      ) {
        const values = parseValues(value, mlConfig);
        if (values.length > 1) {
          this._realValueRef = value;
          ta.value = `${values[0]}, +${values.length - 1} more`;
          el.classList.add('arvo-search--summary');
        }
      }

      this._inputEl = ta;
    } else {
      const inp = document.createElement('input');
      inp.id = this._inputId;
      inp.className = 'arvo-search__input';
      inp.type = 'search';
      inp.value = value;
      if (placeholder) inp.placeholder = placeholder;
      inp.disabled = isDisabled;
      inp.readOnly = isReadOnly;
      if (ariaLabel) inp.setAttribute('aria-label', ariaLabel);
      if (isReadOnly) inp.setAttribute('aria-readonly', 'true');
      this._inputEl = inp;
    }

    this._fieldEl.appendChild(this._inputEl);

    // Actions container
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-search__actions';

    // Clear button
    if (effectiveClearable) {
      this._clearEl = document.createElement('button');
      this._clearBtn = ArvoIconButton.initialize(this._clearEl, {
        size: 'xs',
        variant: 'tertiary',
        icon: 'close',
        tooltip: 'Clear',
        isDisabled: isDisabled || isLoading,
      });
      this._clearEl.setAttribute('aria-label', 'Clear');
      this._clearEl.tabIndex = -1;
      this._clearEl.classList.add('arvo-search__clear');
      this._actionsEl.appendChild(this._clearEl);
    }

    // Sep1: between clear and badge area. Starts hidden via the BEM modifier;
    // `_updateSeparators` toggles `--hidden` based on which actions are visible.
    this._sep1El = document.createElement('span');
    this._sep1El.className = 'arvo-search__sep arvo-search__sep--hidden';
    this._actionsEl.appendChild(this._sep1El);

    // Shortcut badge. The label is run through `formatShortcutDisplay` so
    // the visible text matches the active OS (`Ctrl P` on Windows /
    // Linux, `\u2318 P` on macOS) without the consumer having to branch.
    if (shortcut !== null) {
      this._shortcutEl = document.createElement('span');
      this._shortcutEl.className = 'arvo-search__shortcut';
      this._shortcutEl.textContent = formatShortcutDisplay(shortcut);
      this._actionsEl.appendChild(this._shortcutEl);
    }

    // Counter: ArvoBadge inner-composition per design system rules.
    // ArvoBadge._render() replaces className, so add arvo-search__counter back after init.
    // The counter slot is locked to icon-off across all surfaces -- the
    // neutral semantic's default leading icon (speaker) carries no
    // information here and competes with the count visually.
    if (counter) {
      this._counterHostEl = document.createElement('span');
      this._counterBadge = ArvoBadge.initialize(this._counterHostEl, {
        variant: 'counter',
        appearance: 'outline',
        size: 'md',
        semanticType: 'neutral',
        counterMode: 'ratio',
        hasBadgeIcon: false,
        count: counter.current,
        total: counter.total,
      });
      this._counterHostEl.classList.add('arvo-search__counter');
      this._counterHostEl.setAttribute('aria-live', 'polite');
      this._actionsEl.appendChild(this._counterHostEl);
    }

    // Find variant: sep2 + prev/next
    if (variant === 'find') {
      const hasFindButtons = hasPreviousButton || hasNextButton;
      if (hasFindButtons) {
        this._sep2El = document.createElement('span');
        this._sep2El.className = 'arvo-search__sep';
        this._actionsEl.appendChild(this._sep2El);
      }

      const navDisabled = isDisabled || isLoading || isReadOnly || (counter ? counter.total === 0 : false);

      if (hasPreviousButton) {
        this._prevEl = document.createElement('button');
        this._prevBtn = ArvoIconButton.initialize(this._prevEl, {
          size: 'sm',
          variant: 'tertiary',
          icon: 'angle-up',
          tooltip: 'Previous match',
          isDisabled: navDisabled,
        });
        this._prevEl.setAttribute('aria-label', 'Previous match');
        this._prevEl.classList.add('arvo-search__prev');
        this._actionsEl.appendChild(this._prevEl);
      }

      if (hasNextButton) {
        this._nextEl = document.createElement('button');
        this._nextBtn = ArvoIconButton.initialize(this._nextEl, {
          size: 'sm',
          variant: 'tertiary',
          icon: 'angle-down',
          tooltip: 'Next match',
          isDisabled: navDisabled,
        });
        this._nextEl.setAttribute('aria-label', 'Next match');
        this._nextEl.classList.add('arvo-search__next');
        this._actionsEl.appendChild(this._nextEl);
      }
    }

    // Submit button: renders only in submit mode (after find buttons, before err icon)
    if (searchMode === 'submit') {
      this._submitEl = document.createElement('button');
      this._submitBtn = ArvoButton.initialize(this._submitEl, {
        variant: 'primary',
        size: 'sm',
        label: 'Search',
        isDisabled: isDisabled || isLoading || isReadOnly,
      });
      this._submitEl.classList.add('arvo-search__submit');
      this._actionsEl.appendChild(this._submitEl);
    }

    if (useTooltipError) {
      const tooltip = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: tooltip,
      });
      this._errIcoEl = this._errMsgAlert.el as HTMLElement;
      this._errIcoEl.classList.add('arvo-search__err-ico');
      this._errIcoConnector = connectTooltip(tooltipManager, {
        anchor: this._errIcoEl,
        content: tooltip,
      });
      this._actionsEl.appendChild(this._errIcoEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    // Border element
    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-search__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    if (useInlineAlert) {
      const message = errorMsg ?? ARVO_MSG_ALERT_DEFAULT_ERROR;
      this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        message,
        id: this._errorId,
      });
      this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
      this._inlineAlertEl.style.display = 'none';
      el.appendChild(this._inlineAlertEl);
    }

    if (isDisabled) el.classList.add('is-disabled');
    if (isReadOnly && !isDisabled) el.classList.add('is-readonly');
    if (value.length > 0) el.classList.add('has-value');

    // When the expandable-filter is collapsed, the field is visually a
    // 32x32 icon-only trigger -- there is no input or value to validate, so
    // any invalid affordance (red border, inline alert, tooltip icon,
    // aria-invalid) is suppressed until the field is expanded again. Parity
    // with the React twin's `effectiveInvalid` derivation.
    const collapsedExpandable = isExpandableFilter && !this._isExpanded;
    const effectiveInvalid = isInvalid && !collapsedExpandable;

    if (effectiveInvalid) el.classList.add('has-error');
    if (effectiveInvalid && useTooltipError) el.classList.add('error-tooltip');
    if (isLoading) el.classList.add('loading');

    if (effectiveInvalid) {
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) this._inputEl.setAttribute('aria-describedby', this._errorId);
    }
    if (isDisabled) {
      // Native `disabled` on the input is sufficient -- no aria-disabled on
      // the input itself (parity with React). aria-disabled lives on the
      // root for consumers that style off the search landmark.
      el.setAttribute('aria-disabled', 'true');
    }
    if (isLoading) el.setAttribute('aria-busy', 'true');

    if (effectiveInvalid && useInlineAlert && this._inlineAlertEl) {
      this._inlineAlertEl.style.display = '';
    }

    // Expandable-filter: keep both trigger + field in DOM at all times so
    // the width transition has a stable target. `inert` removes the
    // currently-invisible half from tab order + accessibility.
    if (isExpandableFilter) {
      this._applyExpandableInert();
    }

    // Auto-resize textarea
    if (mlConfig.enabled && this._inputEl instanceof HTMLTextAreaElement) {
      this._autoResizeTextarea();
    }

    // Padding + separators
    this._updateSeparators();
    this._updatePadding();
  }

  /**
   * Toggle the `inert` attribute on the expand-trigger and the field so the
   * currently-invisible half cannot receive Tab focus or be announced by
   * assistive tech. The visible half is left interactive.
   */
  private _applyExpandableInert(): void {
    if (this._options.variant !== 'expandable-filter') return;

    if (this._expandTriggerEl) {
      if (this._isExpanded) {
        this._expandTriggerEl.setAttribute('inert', '');
      } else {
        this._expandTriggerEl.removeAttribute('inert');
      }
    }

    if (this._fieldEl) {
      if (this._isExpanded) {
        this._fieldEl.removeAttribute('inert');
      } else {
        this._fieldEl.setAttribute('inert', '');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private _bindEvents(): void {
    const input = this._inputEl;
    if (!input) return;

    input.addEventListener('input', this._boundHandleInput);
    input.addEventListener('focus', this._boundHandleFocus);
    input.addEventListener('blur', this._boundHandleBlur);
    input.addEventListener('keydown', this._boundHandleKeydown as EventListener);

    if (this._resolveMultiLineConfig().enabled) {
      input.addEventListener('paste', this._boundHandlePaste);
    }

    if (this._clearEl) {
      this._clearEl.addEventListener('click', this._boundHandleClearClick);
    }

    if (this._prevEl) {
      this._prevEl.addEventListener('click', this._boundHandlePrevClick);
    }

    if (this._nextEl) {
      this._nextEl.addEventListener('click', this._boundHandleNextClick);
    }

    if (this._submitEl) {
      this._submitEl.addEventListener('click', this._boundHandleSubmitClick);
    }

    if (this._expandTriggerBtnEl) {
      this._expandTriggerBtnEl.addEventListener('click', this._boundHandleExpandTriggerClick);
      this._expandTriggerBtnEl.addEventListener('focus', this._boundHandleExpandTriggerFocus);
    }

    // Root focusout: expandable-filter auto-collapse when blurred + empty.
    // We use `focusout` (which bubbles) instead of `blur` so a single
    // listener on the root catches transitions out of any inner element
    // (input, trigger, clear, etc.).
    if (this._element && this._options.variant === 'expandable-filter') {
      this._element.addEventListener('focusout', this._boundHandleRootFocusOut);
    }

    // ResizeObserver for dynamic actions width
    if (this._actionsEl) {
      this._resizeObserver = new ResizeObserver(() => {
        this._updatePadding();
      });
      this._resizeObserver.observe(this._actionsEl);
    }
  }

  private _registerShortcut(): void {
    if (this._options.shortcut) {
      this._shortcutCombo = parseShortcut(this._options.shortcut);
      this._boundShortcutHandler = this._handleShortcutKeyDown.bind(this);
      document.addEventListener('keydown', this._boundShortcutHandler, true);
    }
  }

  private _handleInput(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const rawVal = (this._inputEl as HTMLInputElement | HTMLTextAreaElement).value;
    let val = rawVal;

    const mlConfig = this._resolveMultiLineConfig();

    // Comma -> newline replacement for comma-to-new-row and comma-and-linebreak modes
    if (
      mlConfig.enabled &&
      (mlConfig.delimiterBehavior === 'comma-to-new-row' ||
        mlConfig.delimiterBehavior === 'comma-and-linebreak') &&
      val.includes(mlConfig.delimiter)
    ) {
      const escapedDelimiter = mlConfig.delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      val = val.replace(new RegExp(escapedDelimiter, 'g'), '\n');
    }

    // Multiline contract: each row is a filter value. Strip empty / whitespace
    // rows that would otherwise materialize from repeated `,`, repeated
    // Shift+Enter, leading `,`, or manual mid-row deletions. We keep a
    // trailing newline so the user retains their "new row" cursor position.
    if (mlConfig.enabled) {
      val = normalizeMultilineValue(val);
    }

    if (val !== rawVal && this._inputEl) {
      this._inputEl.value = val;
    }

    this._element?.classList.toggle('has-value', val.length > 0);
    this._options.value = val;

    if (mlConfig.enabled && this._inputEl instanceof HTMLTextAreaElement) {
      this._autoResizeTextarea();
    }

    this._dispatchEvent('search:input', { value: val });
    this._options.onInput?.(event);

    if (this._options.searchMode === 'input' && val.length >= this._options.minChars) {
      if (this._options.debounceMs > 0) {
        this._cancelDebounce();
        this._searchDebounceId = window.setTimeout(() => {
          this._triggerSearch();
        }, this._options.debounceMs);
      } else {
        this._triggerSearch();
      }
    }

    this._updateSeparators();
    this._updatePadding();
  }

  private _handleFocus(event: Event): void {
    // Restore real value if we're in summary mode
    if (this._realValueRef !== null && this._inputEl instanceof HTMLTextAreaElement) {
      this._inputEl.value = this._realValueRef;
      this._realValueRef = null;
      this._element?.classList.remove('arvo-search--summary');
      this._autoResizeTextarea();
    }
    this._updateSeparators();
    this._updatePadding();
    this._options.onFocus?.(event);
  }

  private _handleBlur(event: Event): void {
    const val = this._inputEl?.value ?? '';
    if (val !== this._previousValue) {
      this._dispatchEvent('search:change', { value: val, previousValue: this._previousValue });
      this._previousValue = val;
      this._options.onChange?.(val);
    }

    // Multiline summary collapse on blur. After swapping the textarea contents
    // to the single-line summary string we MUST re-run auto-resize, otherwise
    // the textarea keeps its taller height from the previous multi-row value
    // and the field renders as a multi-line box with a single-line preview
    // inside it.
    const mlConfig = this._resolveMultiLineConfig();
    if (mlConfig.enabled && mlConfig.collapseBehavior === 'summary' && this._realValueRef === null) {
      const values = parseValues(val, mlConfig);
      if (values.length > 1 && this._inputEl instanceof HTMLTextAreaElement) {
        this._realValueRef = val;
        this._inputEl.value = `${values[0]}, +${values.length - 1} more`;
        this._element?.classList.add('arvo-search--summary');
        this._autoResizeTextarea();
      }
    }

    this._updateSeparators();
    this._updatePadding();
    this._options.onBlur?.(event);
  }

  /**
   * Expand on trigger focus. Mirrors the React `onFocus={expandFromTrigger}`
   * wiring: tabbing into the collapsed trigger should expand the field (and
   * `expanded()` forwards focus to the input), keeping click and keyboard
   * entry paths identical for the expandable-filter variant.
   *
   * Sets `_suppressAutoCollapse` so the trigger's own `inert`-driven blur
   * (which happens before the rAF-scheduled input focus lands) does not
   * re-trigger our auto-collapse focusout listener.
   */
  private _handleExpandTriggerFocus(_event: Event): void {
    if (this._options.variant !== 'expandable-filter') return;
    if (this._isExpanded) return;
    if (this._options.isDisabled || this._options.isLoading) return;
    this._suppressAutoCollapse = true;
    this.expanded(true);
    requestAnimationFrame(() => {
      this._suppressAutoCollapse = false;
    });
  }

  /**
   * Root `focusout` listener -- expandable-filter auto-collapse. When focus
   * leaves the entire root and the field is empty, collapse back to the icon
   * trigger. A non-empty value (or an in-progress summary, whose underlying
   * `_realValueRef` is preserved) pins the field open.
   *
   * We deliberately do NOT route through `this.expanded(false)` here because
   * that path schedules a `_expandTriggerBtnEl.focus()` (used by Esc-to-
   * collapse and programmatic API calls); on auto-collapse the user has just
   * moved focus elsewhere and yanking it back to the trigger would be
   * disruptive. The state change + event + ARIA sync is replicated inline.
   */
  private _handleRootFocusOut(event: FocusEvent): void {
    if (this._options.variant !== 'expandable-filter') return;
    if (!this._isExpanded || !this._element) return;
    if (this._suppressAutoCollapse) return;
    const next = event.relatedTarget as Node | null;
    if (next && this._element.contains(next)) return;

    const liveVal = this._inputEl?.value ?? '';
    const realVal = this._realValueRef;
    const isEmpty = !liveVal && !realVal;
    if (!isEmpty) return;

    this._isExpanded = false;
    this._element.classList.add('arvo-search--collapsed');
    this._expandTriggerBtnEl?.setAttribute('aria-expanded', 'false');
    this._dispatchEvent('search:collapse', {});
    this._options.onExpandedChange?.(false);
    this._applyExpandableInert();
    this._syncCollapsedErrorState();
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const mlConfig = this._resolveMultiLineConfig();
    const isExpandableFilter = this._options.variant === 'expandable-filter';

    if (event.key === 'Escape') {
      // Expandable-filter: Escape on empty value collapses the field
      if (isExpandableFilter && this._isExpanded) {
        const val = this._inputEl?.value ?? '';
        if (!val) {
          this.expanded(false);
          return;
        }
      }
      const effectiveClearable = mlConfig.enabled ? false : (this._options.isReadOnly ? false : this._options.isClearable);
      const val = this._inputEl?.value ?? '';
      if (effectiveClearable && val.length > 0) {
        this.clear();
        return;
      }
      this._inputEl?.blur();
      return;
    }

    if (event.key === 'Enter') {
      if (this._options.variant === 'find') {
        event.preventDefault();
        if (event.shiftKey) {
          if (this._options.hasPreviousButton) this.previous();
        } else {
          if (this._options.hasNextButton) this.next();
        }
        return;
      }

      if (this._options.isReadOnly) return;

      // Filter variant multiline handling
      if (mlConfig.enabled) {
        const behavior = mlConfig.delimiterBehavior;
        const ta = this._inputEl as HTMLTextAreaElement | null;
        if (behavior === 'comma-and-linebreak') {
          if (event.shiftKey) {
            // Shift+Enter fires search in comma-and-linebreak mode
            event.preventDefault();
            this._cancelDebounce();
            this._triggerSearch();
          } else {
            // Plain Enter inserts newline. Suppress when the current row is
            // already empty/whitespace so the user cannot stack empty rows.
            if (ta && isCursorLineEmpty(ta)) {
              event.preventDefault();
              return;
            }
            requestAnimationFrame(() => {
              if (this._inputEl instanceof HTMLTextAreaElement) {
                this._autoResizeTextarea();
              }
              this._updatePadding();
            });
          }
          return;
        }
        // Default multiline (none, comma-to-new-row, shift+enter):
        // Shift+Enter inserts newline, plain Enter fires search
        if (event.shiftKey) {
          if (ta && isCursorLineEmpty(ta)) {
            event.preventDefault();
            return;
          }
          requestAnimationFrame(() => {
            if (this._inputEl instanceof HTMLTextAreaElement) {
              this._autoResizeTextarea();
            }
            this._updatePadding();
          });
          return;
        }
        event.preventDefault();
        this._cancelDebounce();
        this._triggerSearch();
        return;
      }

      // Filter, non-multiline: Enter always triggers search
      event.preventDefault();
      this._cancelDebounce();
      this._triggerSearch();
    }
  }

  private _handlePaste(_event: Event): void {
    requestAnimationFrame(() => {
      if (this._inputEl instanceof HTMLTextAreaElement) {
        this._autoResizeTextarea();
      }
      this._updatePadding();
    });
  }

  private _handleClearClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clear();
    this._inputEl?.focus();
  }

  private _handlePrevClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.previous();
  }

  private _handleNextClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.next();
  }

  private _handleSubmitClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this._cancelDebounce();
    this._triggerSearch();
  }

  private _handleExpandTriggerClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    // Same guard as `_handleExpandTriggerFocus`: the trigger's own
    // `inert`-driven blur on expand must not re-collapse the field before
    // the rAF-scheduled input focus settles.
    this._suppressAutoCollapse = true;
    this.expanded(true);
    requestAnimationFrame(() => {
      this._suppressAutoCollapse = false;
    });
  }

  private _handleShortcutKeyDown(event: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const target = event.target as HTMLElement;
    if (
      target !== this._inputEl &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    ) {
      return;
    }
    if (document.activeElement === this._inputEl) return;

    const combo = this._shortcutCombo!;
    if (matchesShortcut(event, combo)) {
      event.preventDefault();
      event.stopPropagation();
      this._inputEl?.focus();
      (this._inputEl as HTMLInputElement | null)?.select?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _cancelDebounce(): void {
    if (this._searchDebounceId !== null) {
      window.clearTimeout(this._searchDebounceId);
      this._searchDebounceId = null;
    }
  }

  private _resolveMultiLineConfig(): MultiLineConfig {
    const ml = this._options.isMultiLine;
    if (!ml) return { ...ML_DEFAULTS, enabled: false };
    if (ml === true) return { ...ML_DEFAULTS };
    if (typeof ml === 'object' && ml.enabled) {
      let delimiterBehavior: DelimiterBehavior;
      if (
        ml.delimiterBehavior != null &&
        VALID_DELIMITER_BEHAVIORS.includes(ml.delimiterBehavior as DelimiterBehavior)
      ) {
        delimiterBehavior = ml.delimiterBehavior as DelimiterBehavior;
      } else if (ml.delimiter != null) {
        // Legacy: only delimiter provided, no delimiterBehavior -> treat as comma-to-new-row
        delimiterBehavior = 'comma-to-new-row';
      } else {
        delimiterBehavior = ML_DEFAULTS.delimiterBehavior;
      }
      return {
        enabled: true,
        minRows: ml.minRows ?? ML_DEFAULTS.minRows,
        maxRows: ml.maxRows ?? ML_DEFAULTS.maxRows,
        collapseBehavior: ml.collapseBehavior ?? ML_DEFAULTS.collapseBehavior,
        delimiterBehavior,
        delimiter: ml.delimiter ?? ML_DEFAULTS.delimiter,
      };
    }
    return { ...ML_DEFAULTS, enabled: false };
  }

  private _autoResizeTextarea(): void {
    const ta = this._inputEl as HTMLTextAreaElement | null;
    if (!ta) return;

    const mlConfig = this._resolveMultiLineConfig();
    ta.style.height = 'auto';

    const lineHeight = 20;
    const padding = 12;
    const minHeight = mlConfig.minRows * lineHeight + padding;
    const maxHeight = mlConfig.maxRows * lineHeight + padding;
    const targetHeight = Math.max(ta.scrollHeight, minHeight);

    if (targetHeight > maxHeight) {
      ta.style.height = `${maxHeight}px`;
      ta.style.overflowY = 'auto';
    } else {
      ta.style.height = `${targetHeight}px`;
      ta.style.overflowY = 'hidden';
    }
  }

  private _triggerSearch(): void {
    const val = this._inputEl?.value ?? '';
    const mlConfig = this._resolveMultiLineConfig();
    const detail: Record<string, unknown> = { value: val };

    if (mlConfig.enabled) {
      const values = parseValues(val, mlConfig);
      detail.values = values;
      this._dispatchEvent('search:search', detail);
      this._options.onSearch?.(val, values);
    } else {
      this._dispatchEvent('search:search', detail);
      this._options.onSearch?.(val);
    }
  }

  private _applyWidthStyle(): void {
    if (!this._element) return;
    const effectiveWidth = this._options.isFullWidth ? '100%' : this._options.width;
    if (effectiveWidth) {
      this._element.style.setProperty('--arvo-form-input-width', effectiveWidth);
    } else {
      this._element.style.removeProperty('--arvo-form-input-width');
    }
  }

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const actionsWidth = this._actionsEl.offsetWidth;
    const gap = 4;
    const padR = actionsWidth > 0 ? actionsWidth + gap : 4;
    this._fieldEl.style.setProperty('--arvo-form-input-pad-r', `${padR}px`);
  }

  private _updateSeparators(): void {
    if (this._sep1El) {
      const clearVisible = this._clearEl ? getComputedStyle(this._clearEl).display !== 'none' : false;
      const counterVisible = this._counterHostEl ? getComputedStyle(this._counterHostEl).display !== 'none' : false;
      const shortcutVisible = this._shortcutEl ? getComputedStyle(this._shortcutEl).display !== 'none' : false;
      const badgeVisible = counterVisible || shortcutVisible;
      this._sep1El.classList.toggle('arvo-search__sep--hidden', !(clearVisible && badgeVisible));
    }
    if (this._sep2El) {
      const hidden = this._options.isDisabled || this._options.isLoading || this._options.isReadOnly;
      this._sep2El.classList.toggle('arvo-search__sep--hidden', hidden);
    }
  }

  private _updateNavState(): void {
    if (this._options.variant !== 'find') return;

    const navDisabled =
      this._options.isDisabled ||
      this._options.isLoading ||
      this._options.isReadOnly ||
      (this._options.counter ? this._options.counter.total === 0 : false);

    this._prevBtn?.disabled(navDisabled);
    this._nextBtn?.disabled(navDisabled);
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail })
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  value(): string;
  value(newValue: string): void;
  value(newValue?: string): string | void {
    if (newValue === undefined) {
      return this._inputEl?.value ?? this._options.value;
    }

    this._cancelDebounce();
    const previousValue = this._previousValue;
    this._previousValue = newValue;
    this._options.value = newValue;

    if (this._inputEl) {
      this._inputEl.value = newValue;
    }

    // Clear summary state when value is set programmatically
    if (this._realValueRef !== null) {
      this._realValueRef = null;
      this._element?.classList.remove('arvo-search--summary');
    }

    this._element?.classList.toggle('has-value', newValue.length > 0);

    const mlConfig = this._resolveMultiLineConfig();
    if (mlConfig.enabled && this._inputEl instanceof HTMLTextAreaElement) {
      this._autoResizeTextarea();
    }

    if (newValue !== previousValue) {
      this._dispatchEvent('search:change', { value: newValue, previousValue });
    }

    this._updateSeparators();
    this._updatePadding();
  }

  clear(): void {
    this._cancelDebounce();
    this._dispatchEvent('search:clear', {});
    this._options.onClear?.();

    // Reset the value WITHOUT dispatching `search:change` (parity with the
    // React twin's `doClear`, which only fires `search:clear`). Going through
    // `value('')` would also fire `search:change`.
    this._previousValue = '';
    this._options.value = '';
    if (this._inputEl) {
      this._inputEl.value = '';
    }
    this._element?.classList.remove('has-value');

    const mlConfig = this._resolveMultiLineConfig();
    if (mlConfig.enabled && this._inputEl instanceof HTMLTextAreaElement) {
      this._autoResizeTextarea();
    }
    this._updateSeparators();
    this._updatePadding();

    this._inputEl?.focus();
    if (this._options.searchMode === 'input') {
      this._triggerSearch();
    }
  }

  counter(): { current: number; total: number } | null;
  counter(current: number | null, total?: number): void;
  counter(current?: number | null, total?: number): { current: number; total: number } | null | void {
    if (current === undefined) {
      return this._options.counter;
    }

    // null clears the counter entirely.
    if (current === null) {
      this._options.counter = null;
      if (this._counterBadge) {
        this._counterBadge.destroy();
        this._counterBadge = null;
      }
      if (this._counterHostEl) {
        this._counterHostEl.remove();
        this._counterHostEl = null;
      }
      this._updateNavState();
      this._updateSeparators();
      this._updatePadding();
      return;
    }

    this._options.counter = { current, total: total! };

    if (!this._counterHostEl && this._actionsEl) {
      this._counterHostEl = document.createElement('span');
      // Insert before find-separator/prev/next/submit/errIco so layout order stays correct:
      // clear, sep1, shortcut, counter, sep2, prev, next, submit, err-ico
      const refNode = this._sep2El ?? this._prevEl ?? this._nextEl ?? this._submitEl ?? this._errIcoEl ?? null;
      this._actionsEl.insertBefore(this._counterHostEl, refNode);
    }

    if (!this._counterBadge && this._counterHostEl) {
      this._counterBadge = ArvoBadge.initialize(this._counterHostEl, {
        variant: 'counter',
        appearance: 'outline',
        size: 'md',
        semanticType: 'neutral',
        counterMode: 'ratio',
        // Matches the initial render path -- counter never carries the
        // neutral semantic's default leading speaker icon.
        hasBadgeIcon: false,
        count: current,
        total: total ?? 0,
      });
      // ArvoBadge._render() replaces className; restore our BEM class
      this._counterHostEl.classList.add('arvo-search__counter');
      this._counterHostEl.setAttribute('aria-live', 'polite');
    } else if (this._counterBadge) {
      this._counterBadge.count(current);
      this._counterBadge.setTotal(total ?? null);
    }

    this._updateNavState();
    this._updateSeparators();
    this._updatePadding();
  }

  search(): void {
    this._cancelDebounce();
    this._triggerSearch();
  }

  next(): void {
    if (this._options.variant !== 'find') return;
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    if (this._options.counter && this._options.counter.total === 0) return;

    this._dispatchEvent('search:next', {});
    this._options.onNext?.();
  }

  previous(): void {
    if (this._options.variant !== 'find') return;
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;
    if (this._options.counter && this._options.counter.total === 0) return;

    this._dispatchEvent('search:previous', {});
    this._options.onPrevious?.();
  }

  expanded(): boolean;
  expanded(state: boolean): void;
  expanded(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._isExpanded;
    }

    if (this._options.variant !== 'expandable-filter') return;

    this._isExpanded = state;

    if (state) {
      this._element?.classList.remove('arvo-search--collapsed');
      this._expandTriggerBtnEl?.setAttribute('aria-expanded', 'true');
      this._dispatchEvent('search:expand', {});
      this._options.onExpandedChange?.(true);
      // Focus the input after expansion
      requestAnimationFrame(() => this._inputEl?.focus());
    } else {
      this._element?.classList.add('arvo-search--collapsed');
      this._expandTriggerBtnEl?.setAttribute('aria-expanded', 'false');
      this._dispatchEvent('search:collapse', {});
      this._options.onExpandedChange?.(false);
      // Return focus to the trigger button
      requestAnimationFrame(() => this._expandTriggerBtnEl?.focus());
    }

    // Re-evaluate inert + invalid affordance whenever the collapsed state
    // changes -- a collapsed icon-only trigger has nothing to validate, so
    // we mirror the React `effectiveInvalid` rule and toggle the error UI
    // back on once expanded.
    this._applyExpandableInert();
    this._syncCollapsedErrorState();
  }

  /**
   * When the variant is expandable-filter, the `has-error` affordance is
   * suppressed while collapsed and reapplied while expanded. This keeps the
   * SCSS layer free of variant-specific `has-error` overrides and matches
   * the React component's `effectiveInvalid` behavior.
   */
  private _syncCollapsedErrorState(): void {
    if (this._options.variant !== 'expandable-filter') return;
    if (!this._element || !this._inputEl) return;

    const useTooltipError = this._options.errorDisplay === 'tooltip';
    const useInlineAlert = this._options.errorDisplay === 'inline';
    const effectiveInvalid = this._options.isInvalid && this._isExpanded;

    if (effectiveInvalid) {
      this._element.classList.add('has-error');
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useTooltipError) this._element.classList.add('error-tooltip');
      if (useInlineAlert) {
        this._inputEl.setAttribute('aria-describedby', this._errorId);
        if (this._inlineAlertEl) this._inlineAlertEl.style.display = '';
      }
    } else {
      this._element.classList.remove('has-error', 'error-tooltip');
      this._inputEl.removeAttribute('aria-invalid');
      this._inputEl.removeAttribute('aria-describedby');
      if (this._inlineAlertEl) this._inlineAlertEl.style.display = 'none';
    }
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;

    if (state) {
      this._element?.classList.add('is-disabled');
      this._element?.setAttribute('aria-disabled', 'true');
      if (this._inputEl) {
        this._inputEl.disabled = true;
        if (document.activeElement === this._inputEl) {
          this._inputEl.blur();
        }
      }
      this._clearBtn?.disabled(true);
      this._submitBtn?.disabled(true);
      this._expandTriggerBtn?.disabled(true);
    } else {
      this._element?.classList.remove('is-disabled');
      this._element?.removeAttribute('aria-disabled');
      if (this._inputEl) {
        this._inputEl.disabled = false;
      }
      if (!this._options.isLoading && !this._options.isReadOnly) {
        this._clearBtn?.disabled(false);
        this._submitBtn?.disabled(false);
        this._expandTriggerBtn?.disabled(false);
      }
    }

    this._updateNavState();
    this._updateSeparators();
    this._updatePadding();
  }

  readOnly(): boolean;
  readOnly(state: boolean): void;
  readOnly(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isReadOnly;
    }

    this._options.isReadOnly = state;

    if (state && !this._options.isDisabled) {
      this._element?.classList.add('is-readonly');
    } else {
      this._element?.classList.remove('is-readonly');
    }

    if (this._inputEl) {
      this._inputEl.readOnly = state;
      if (state) {
        this._inputEl.setAttribute('aria-readonly', 'true');
      } else {
        this._inputEl.removeAttribute('aria-readonly');
      }
    }

    // Clear button: suppress when readonly (mirrors React effectiveClearable logic)
    const mlConfig = this._resolveMultiLineConfig();
    const effectiveClearable = !mlConfig.enabled && !state && this._options.isClearable;
    if (!effectiveClearable || state) {
      this._clearBtn?.disabled(true);
    } else if (!this._options.isDisabled && !this._options.isLoading) {
      this._clearBtn?.disabled(false);
    }

    // Submit button: disabled when readonly
    if (this._submitBtn) {
      this._submitBtn.disabled(state || this._options.isDisabled || this._options.isLoading);
    }

    this._updateNavState();
    this._updateSeparators();
    this._updatePadding();
  }

  shortcut(): string | null;
  shortcut(newValue: string | null): void;
  shortcut(newValue?: string | null): string | null | void {
    if (newValue === undefined) return this._options.shortcut ?? null;

    if (this._boundShortcutHandler) {
      document.removeEventListener('keydown', this._boundShortcutHandler, true);
      this._boundShortcutHandler = null;
    }

    this._options.shortcut = newValue ?? null;

    if (this._shortcutEl) {
      this._shortcutEl.textContent = newValue ? formatShortcutDisplay(newValue) : '';
    }

    if (newValue) {
      this._shortcutCombo = parseShortcut(newValue);
      this._boundShortcutHandler = this._handleShortcutKeyDown.bind(this);
      document.addEventListener('keydown', this._boundShortcutHandler, true);
    } else {
      this._shortcutCombo = null;
    }

    this._updateSeparators();
    this._updatePadding();
  }

  width(): string | null;
  width(newValue: string | null): void;
  width(newValue?: string | null): string | null | void {
    if (newValue === undefined) return this._options.width;
    this._options.width = newValue ?? null;
    this._applyWidthStyle();
  }

  fullWidth(): boolean;
  fullWidth(state: boolean): void;
  fullWidth(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isFullWidth;
    this._options.isFullWidth = state;
    this._element?.classList.toggle('arvo-search--full-width', state);
    this._applyWidthStyle();
  }

  setError(message: string | false): void {
    const useTooltipError = this._options.errorDisplay === 'tooltip';
    const useInlineAlert = this._options.errorDisplay === 'inline';
    // Expandable-filter while collapsed: the visual affordance is
    // suppressed even when the underlying isInvalid flag is true. Parity
    // with the React `effectiveInvalid` rule.
    const collapsedExpandable =
      this._options.variant === 'expandable-filter' && !this._isExpanded;

    if (message === false) {
      this._options.isInvalid = false;
      this._options.errorMsg = null;

      this._element?.classList.remove('has-error', 'error-tooltip');

      if (this._inputEl) {
        this._inputEl.removeAttribute('aria-invalid');
        this._inputEl.removeAttribute('aria-describedby');
      }

      if (this._inlineAlertEl) {
        this._inlineAlertEl.style.display = 'none';
      }

      return;
    }

    const msg = message || ARVO_MSG_ALERT_DEFAULT_ERROR;
    this._options.isInvalid = true;
    this._options.errorMsg = msg;

    if (useTooltipError && this._errIcoEl) {
      this._errMsgAlert?.message(msg);
      if (this._errIcoConnector) {
        this._errIcoConnector.update({ content: msg });
      }
    }

    if (useInlineAlert) {
      this._inlineAlert?.message(msg);
    }

    if (collapsedExpandable) {
      // Keep the message in state so it can be re-applied on expand, but do
      // NOT surface any visual / ARIA invalid affordance while collapsed.
      this._element?.classList.remove('has-error', 'error-tooltip');
      if (this._inputEl) {
        this._inputEl.removeAttribute('aria-invalid');
        this._inputEl.removeAttribute('aria-describedby');
      }
      if (this._inlineAlertEl) {
        this._inlineAlertEl.style.display = 'none';
      }
      return;
    }

    this._element?.classList.add('has-error');

    if (this._inputEl) {
      this._inputEl.setAttribute('aria-invalid', 'true');
      if (useInlineAlert) {
        this._inputEl.setAttribute('aria-describedby', this._errorId);
      }
    }

    if (useTooltipError) {
      this._element?.classList.add('error-tooltip');
    }

    if (useInlineAlert && this._inlineAlertEl) {
      this._inlineAlertEl.style.display = '';
    }

    this._updateSeparators();
    this._updatePadding();
  }

  focus(): void {
    if (!this._options.isDisabled && !this._options.isLoading) {
      this._inputEl?.focus();
    }
  }

  setLoading(isLoading: boolean): void {
    const wasFocused = document.activeElement === this._inputEl;
    this._options.isLoading = isLoading;

    if (isLoading) {
      this._element?.classList.add('loading');
      this._element?.setAttribute('aria-busy', 'true');
      this._clearBtn?.disabled(true);
      this._submitBtn?.disabled(true);
      this._expandTriggerBtn?.disabled(true);
      if (wasFocused) {
        this._inputEl?.blur();
      }
    } else {
      this._element?.classList.remove('loading');
      this._element?.removeAttribute('aria-busy');
      if (!this._options.isDisabled && !this._options.isReadOnly) {
        this._clearBtn?.disabled(false);
        this._submitBtn?.disabled(false);
        this._expandTriggerBtn?.disabled(false);
      }
    }

    this._updateNavState();
    this._updateSeparators();
    this._updatePadding();
  }

  destroy(): void {
    const el = this._element;
    if (!el) return;

    this._cancelDebounce();

    // Remove input listeners
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._boundHandleInput);
      this._inputEl.removeEventListener('focus', this._boundHandleFocus);
      this._inputEl.removeEventListener('blur', this._boundHandleBlur);
      this._inputEl.removeEventListener('keydown', this._boundHandleKeydown as EventListener);
      this._inputEl.removeEventListener('paste', this._boundHandlePaste);
    }

    if (this._clearEl) {
      this._clearEl.removeEventListener('click', this._boundHandleClearClick);
    }

    if (this._prevEl) {
      this._prevEl.removeEventListener('click', this._boundHandlePrevClick);
    }

    if (this._nextEl) {
      this._nextEl.removeEventListener('click', this._boundHandleNextClick);
    }

    if (this._submitEl) {
      this._submitEl.removeEventListener('click', this._boundHandleSubmitClick);
    }

    if (this._expandTriggerBtnEl) {
      this._expandTriggerBtnEl.removeEventListener('click', this._boundHandleExpandTriggerClick);
      this._expandTriggerBtnEl.removeEventListener('focus', this._boundHandleExpandTriggerFocus);
    }

    if (el && this._options.variant === 'expandable-filter') {
      el.removeEventListener('focusout', this._boundHandleRootFocusOut);
    }

    // Remove global shortcut listener
    if (this._boundShortcutHandler) {
      document.removeEventListener('keydown', this._boundShortcutHandler, true);
      this._boundShortcutHandler = null;
    }

    // Destroy ResizeObserver
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // Destroy inner component instances
    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;
    this._clearBtn?.destroy();
    this._clearBtn = null;
    this._prevBtn?.destroy();
    this._prevBtn = null;
    this._nextBtn?.destroy();
    this._nextBtn = null;
    this._submitBtn?.destroy();
    this._submitBtn = null;
    this._counterBadge?.destroy();
    this._counterBadge = null;
    this._expandTriggerBtn?.destroy();
    this._expandTriggerBtn = null;

    // Clean up root classes
    el.classList.remove(
      'arvo-search',
      'arvo-search--filter',
      'arvo-search--expandable-filter',
      'arvo-search--find',
      'arvo-search--collapsed',
      'arvo-search--expand-start',
      'arvo-search--expand-end',
      'arvo-search--multi-line',
      'arvo-search--summary',
      'arvo-search--full-width',
      'is-disabled',
      'is-readonly',
      'has-error',
      'error-tooltip',
      'loading',
      'has-value',
    );

    el.removeAttribute('role');
    el.removeAttribute('aria-busy');
    el.removeAttribute('aria-disabled');
    el.style.removeProperty('--arvo-form-input-width');

    // Remove DOM children
    this._inlineAlertEl?.remove();
    this._expandTriggerEl?.remove();
    this._fieldEl?.remove();

    // Null all element refs
    this._element = null;
    this._inputEl = null;
    this._fieldEl = null;
    this._actionsEl = null;
    this._borderEl = null;
    this._icoEl = null;
    this._clearEl = null;
    this._sep1El = null;
    this._sep2El = null;
    this._shortcutEl = null;
    this._counterHostEl = null;
    this._prevEl = null;
    this._nextEl = null;
    this._submitEl = null;
    this._expandTriggerEl = null;
    this._expandTriggerBtnEl = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;
    this._errIcoEl = null;
    this._inlineAlertEl = null;
    this._shortcutCombo = null;
    this._realValueRef = null;
  }
}
