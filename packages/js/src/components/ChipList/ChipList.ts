import { createSortableList, getFocusableElements, type SortableHandle } from '@arvo/core';
import {
  ArvoChip,
  type ArvoChipOptions,
  type ArvoChipVariant,
  type ArvoChipAppearance,
  type ArvoChipSize,
  type ArvoChipColorMode,
  type ArvoChipSemanticType,
  type ArvoChipCustomColor,
} from '../Chip/Chip';
import { ArvoDisclosureButton } from '../DisclosureButton/DisclosureButton';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** JS-only item shape. Carries a stable key plus per-chip config for each ArvoChip instance. */
export interface ArvoChipListItem {
  /** Stable identity for selection (selectedKeys) and reorder ordering. Unique within the list. */
  key: string | number;
  /** Primary chip label (required by ArvoChip). */
  label: string;
  /** Per-chip override of the list variant default. */
  variant?: ArvoChipVariant;
  /** Per-chip override of the list appearance default. */
  appearance?: ArvoChipAppearance;
  /** Per-chip override of the list size default. */
  size?: ArvoChipSize;
  /** Per-chip override of the list colorMode default. */
  colorMode?: ArvoChipColorMode;
  /** Semantic color intent (honored in semantic color mode). */
  semanticType?: ArvoChipSemanticType;
  /** Custom util color family (honored in custom color mode). */
  customColor?: ArvoChipCustomColor;
  /** Leading o9con icon name (without the o9con- prefix). */
  icon?: string;
  /** Avatar image src; wrapped in an `<img>` inside `<span class="arvo-chip__avatar">`. */
  avatar?: string;
  /** Optional secondary title shown before the label. */
  title?: string;
  /** Optional counter mapped to an internal ArvoBadge. */
  counter?: number;
  /** Per-chip controlled selected state (filter). */
  isSelected?: boolean;
  /** Per-chip initial selected state (filter). */
  defaultSelected?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isWarning?: boolean;
  isExcluded?: boolean;
  /** Accessible label for the chip's dismiss action (input chips). */
  dismissLabel?: string;
  /** Optional CSS max-width for label truncation. */
  maxWidth?: string;
}

export interface ArvoChipListOptions {
  /** Array of ArvoChipListItem configs; the JS component builds an ArvoChip per item. */
  items?: ArvoChipListItem[];
  variant?: 'general' | 'filter' | 'input';
  appearance?: 'primary' | 'outline' | 'utility';
  size?: 'sm' | 'md' | 'lg';
  colorMode?: 'default' | 'semantic' | 'custom';
  selectionMode?: 'none' | 'single' | 'multiple';
  selectedKeys?: Array<string | number>;
  defaultSelectedKeys?: Array<string | number>;
  onSelectionChange?: (detail: { keys: Array<string | number>; key: string | number; isSelected: boolean }) => void;
  overflowMode?: 'none' | 'wrap' | 'single-line' | 'max-rows';
  maxVisibleChips?: number | 'auto';
  maxRows?: number;
  overflowLabel?: (hiddenCount: number) => string;
  overflowAriaLabel?: (hiddenCount: number) => string;
  /**
   * Returns the visible label for the __overflow disclosure when
   * isExpanded=true. Receives no arguments. Defaults to `() => 'Show less'`.
   */
  expandedLabel?: () => string;
  /**
   * Legacy callback fired on overflow disclosure activation. Still fires for
   * backwards compatibility, but new consumers should drive
   * `isExpanded`/`onExpandedChange` (or call `expanded()`) instead.
   */
  onOverflowPress?: () => void;
  /**
   * Initial expanded state. Update after init via `expanded()`. While
   * expanded, the chip-list internally treats its overflowMode as `'wrap'`
   * (no chips hidden) and the persistent `__overflow` ArvoDisclosureButton
   * flips its label + aria-expanded in place.
   */
  isExpanded?: boolean;
  /** Initial uncontrolled expanded state. Ignored when `isExpanded` is provided. */
  defaultExpanded?: boolean;
  /** Called when the expanded state changes via the disclosure (click / Enter / Space). */
  onExpandedChange?: (isExpanded: boolean) => void;
  /**
   * Internal hint for parent token-field components (e.g. ArvoMultiSelect).
   * When true: (1) the disclosure renders at size='md' instead of 'sm' to
   * match a 32px field row; (2) the disclosure renders with tabIndex=-1
   * so the parent field's single tab stop is preserved; (3) the disclosure
   * click stops propagation defensively. Should NOT be set by application
   * code.
   */
  isWithinField?: boolean;
  /**
   * Forces the overflow indicator to be a STATIC, non-interactive label
   * (a `<span>` carrying the `arvo-chip-list__overflow` class with the
   * `--static` modifier). The chevron is suppressed, the click handler is
   * a no-op, the element is not focusable, and the chip-list never pivots
   * its internal overflow mode to `'wrap'` on expansion -- the chips stay
   * strictly within the configured overflow bounds. Used by ArvoMultiSelect
   * when `overflowMode='single-line'` to enforce a true single-row field
   * where surplus chips simply collapse behind an informational "+N more"
   * indicator. When this flag is set the expansion contract is fully
   * disabled (`isExpanded` / `onExpandedChange` / `expandedLabel` are
   * ignored).
   */
  isStaticOverflow?: boolean;
  isReorderable?: boolean;
  onReorder?: (detail: { keys: Array<string | number>; key: string | number; fromIndex: number; toIndex: number }) => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

type RequiredChipListOptions = Required<
  Omit<
    ArvoChipListOptions,
    | 'onSelectionChange'
    | 'onReorder'
    | 'onOverflowPress'
    | 'onExpandedChange'
    | 'expandedLabel'
    | 'overflowLabel'
    | 'overflowAriaLabel'
    | 'ariaLabel'
    | 'ariaLabelledBy'
    | 'selectedKeys'
    | 'defaultSelectedKeys'
    | 'maxRows'
    // Init-only seeds for the expanded state -- never re-read from this
    // bag once the instance is built.
    | 'isExpanded'
    | 'defaultExpanded'
  >
> & {
  selectedKeys: Array<string | number> | null;
  defaultSelectedKeys: Array<string | number> | null;
  maxRows: number | null;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  overflowLabel: ((hiddenCount: number) => string) | null;
  overflowAriaLabel: ((hiddenCount: number) => string) | null;
  expandedLabel: (() => string) | null;
  onSelectionChange: ((detail: { keys: Array<string | number>; key: string | number; isSelected: boolean }) => void) | null;
  onReorder: ((detail: { keys: Array<string | number>; key: string | number; fromIndex: number; toIndex: number }) => void) | null;
  onOverflowPress: (() => void) | null;
  onExpandedChange: ((isExpanded: boolean) => void) | null;
};

/** Per-chip bookkeeping record, index-aligned with the `.arvo-chip` DOM order. */
interface ChipRecord {
  instance: ArvoChip;
  el: HTMLElement;
  /** Original key as supplied (used for event payloads). */
  rawKey: string | number;
  /** Coerced string key (used for selectedKeys Set membership). */
  key: string;
}

// ---------------------------------------------------------------------------
// Overflow helpers (mirror the React twin's imperative hide/show)
// ---------------------------------------------------------------------------

function hideChipEl(el: HTMLElement): void {
  el.style.visibility = 'hidden';
  el.style.position = 'absolute';
  el.style.pointerEvents = 'none';
  el.setAttribute('tabindex', '-1');
}

function showChipEl(el: HTMLElement): void {
  el.style.visibility = '';
  el.style.position = '';
  el.style.pointerEvents = '';
  // Only clear the tabindex we (or an explicit -1) set; never invent a tab stop.
  if (el.getAttribute('tabindex') === '-1') el.removeAttribute('tabindex');
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

/**
 * ArvoChipList -- collection container for ArvoChip instances (vanilla JS twin
 * of the React ArvoChipList). Owns collection-level concerns only: layout,
 * inter-chip gap, wrapping, overflow (with an inline `+n more` action),
 * collection accessibility, filter single/multi selection coordination,
 * reorder, and propagation of shared variant/appearance/size/colorMode plus
 * disabled/readonly/loading context to its child chips. The JS list OWNS its
 * chips: it builds one ArvoChip per item (merging list-context defaults with
 * per-item overrides) instead of consuming React children.
 */
export class ArvoChipList {
  readonly el: HTMLElement;

  private _options: RequiredChipListOptions;
  private _chips: ChipRecord[] = [];
  // The overflow indicator DOM element. When `isStaticOverflow=true` this
  // is a non-interactive `<span>`; otherwise it is the `<button>` host
  // backing the `ArvoDisclosureButton` instance below.
  private _overflowEl: HTMLElement | null = null;
  private _overflowBtn: ArvoDisclosureButton | null = null;
  private _liveRegionEl: HTMLDivElement | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _sortable: SortableHandle | null = null;
  private _selectedSet: Set<string> = new Set();
  private _hiddenCount = 0;
  /** True when the chip-overflow is in the expanded state. */
  private _isExpanded = false;
  /**
   * True when the consumer opted into the chip-list managing its own
   * expanded state (provided `isExpanded`, `defaultExpanded`,
   * `onExpandedChange`, `expandedLabel`, or `isWithinField`). Without
   * opt-in the disclosure click only fires `onOverflowPress` (legacy
   * contract preserved).
   */
  private _expansionOptIn = false;
  // True while a pointer drag is in progress (set from the sortable onPreview).
  // Lets us disambiguate the engine's pointer commit (pre-removal insertion
  // index) from its keyboard commit (post-removal destination index).
  private _pointerReorder = false;
  // Roving tabindex active key. Tracks which focusable chip currently
  // carries tabindex=0; others get tabindex=-1 so Tab into the list lands
  // on a single chip and arrows move within.
  private _activeKey: string | null = null;

  private _boundOverflowClick: (event: Event) => void;
  private _boundOverflowMouseDown: (event: Event) => void;
  private _boundChipDismiss: (event: Event) => void;
  private _boundKeyDown: (event: KeyboardEvent) => void;

  static readonly DEFAULTS: RequiredChipListOptions = {
    items: [],
    variant: 'general',
    appearance: 'primary',
    size: 'md',
    colorMode: 'default',
    selectionMode: 'none',
    selectedKeys: null,
    defaultSelectedKeys: null,
    onSelectionChange: null,
    overflowMode: 'wrap',
    maxVisibleChips: 'auto',
    maxRows: null,
    overflowLabel: null,
    overflowAriaLabel: null,
    expandedLabel: null,
    onOverflowPress: null,
    onExpandedChange: null,
    isWithinField: false,
    isStaticOverflow: false,
    isReorderable: false,
    onReorder: null,
    isDisabled: false,
    isReadOnly: false,
    isLoading: false,
    ariaLabel: null,
    ariaLabelledBy: null,
  };

  static initialize(element: HTMLElement, options?: ArvoChipListOptions): ArvoChipList {
    return new ArvoChipList(element, options);
  }

  constructor(element: HTMLElement, options: ArvoChipListOptions = {}) {
    this.el = element;

    const variant = options.variant ?? ArvoChipList.DEFAULTS.variant;

    this._options = {
      ...ArvoChipList.DEFAULTS,
      ...options,
      items: options.items ?? [],
      // selectionMode resolves from variant when unset: general/input -> none,
      // filter -> multiple (mirror React).
      selectionMode: options.selectionMode ?? (variant === 'filter' ? 'multiple' : 'none'),
      selectedKeys: options.selectedKeys ?? null,
      defaultSelectedKeys: options.defaultSelectedKeys ?? null,
      maxRows: options.maxRows ?? null,
      ariaLabel: options.ariaLabel ?? null,
      ariaLabelledBy: options.ariaLabelledBy ?? null,
      overflowLabel: options.overflowLabel ?? null,
      overflowAriaLabel: options.overflowAriaLabel ?? null,
      expandedLabel: options.expandedLabel ?? null,
      onSelectionChange: options.onSelectionChange ?? null,
      onReorder: options.onReorder ?? null,
      onOverflowPress: options.onOverflowPress ?? null,
      onExpandedChange: options.onExpandedChange ?? null,
    } as RequiredChipListOptions;


    // Seed selection: controlled selectedKeys, else uncontrolled
    // defaultSelectedKeys, else empty (mirror React's useControllableState seed).
    const seed = options.selectedKeys ?? options.defaultSelectedKeys ?? [];
    this._selectedSet = new Set(seed.map((k) => String(k)));

    // Seed the expanded state: controlled isExpanded, else uncontrolled
    // defaultExpanded, else false. The opt-in flag mirrors React's
    // expansionOptIn detection.
    this._isExpanded =
      options.isExpanded !== undefined
        ? options.isExpanded
        : (options.defaultExpanded ?? false);
    // `isStaticOverflow` disables the expansion contract entirely so the
    // overflow indicator is a non-interactive label (no chevron, no click,
    // no pivot to wrap). Parent token-fields use this for strict
    // single-line layouts where chips can never expand back into view.
    this._expansionOptIn =
      this._options.isStaticOverflow !== true &&
      (options.isExpanded !== undefined ||
        options.defaultExpanded !== undefined ||
        options.onExpandedChange !== undefined ||
        options.expandedLabel !== undefined ||
        this._options.isWithinField === true);

    this._boundOverflowClick = (event: Event) => this._handleOverflowPress(event);
    this._boundOverflowMouseDown = (event: Event) => this._handleOverflowMouseDown(event);
    this._boundChipDismiss = (event: Event) => this._onChipDismiss(event);
    this._boundKeyDown = (event: KeyboardEvent) => this._handleListKeyDown(event);
    // The list root is the chips' parent; chip:dismiss bubbles up to it.
    this.el.addEventListener('chip:dismiss', this._boundChipDismiss);
    // Roving Arrow / Home / End navigation across visible focusable chips.
    this.el.addEventListener('keydown', this._boundKeyDown);

    this._build();
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  private get _reorderAllowed(): boolean {
    const o = this._options;
    return o.isReorderable && !o.isDisabled && !o.isReadOnly;
  }

  private get _showOverflowAction(): boolean {
    const m = this._options.overflowMode;
    return m === 'single-line' || m === 'max-rows';
  }

  /**
   * Effective overflow mode used for chip measurement. While expanded AND the
   * consumer opted into the expansion contract, treat the mode as 'wrap' so
   * no chips are hidden -- the SCSS modifier class still reflects the
   * consumer-provided overflowMode so layout rules apply correctly.
   */
  private get _effectiveOverflowMode(): 'none' | 'wrap' | 'single-line' | 'max-rows' {
    if (this._isExpanded && this._expansionOptIn && this._showOverflowAction) {
      return 'wrap';
    }
    return this._options.overflowMode;
  }

  private get _effectiveAppearance(): 'primary' | 'outline' | 'utility' {
    return this._options.colorMode === 'custom' ? 'utility' : this._options.appearance;
  }

  // ---------------------------------------------------------------------------
  // Build / teardown lifecycle
  // ---------------------------------------------------------------------------

  private _build(): void {
    this.el.textContent = '';
    this._applyRootClassesAndAria();
    this._buildChips();
    this._buildOverflow();
    this._buildLiveRegion();
    this._setupOverflow();
    this._setupReorder();
    this._applyRovingTabindex();
  }

  private _teardown(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;

    this._sortable?.destroy();
    this._sortable = null;

    for (const rec of this._chips) rec.instance.destroy();
    this._chips = [];

    if (this._overflowEl) {
      // Listeners + ArvoDisclosureButton instance only exist for the
      // interactive button branch; the static span has neither.
      if (this._overflowBtn) {
        this._overflowEl.removeEventListener('click', this._boundOverflowClick, true);
        this._overflowEl.removeEventListener('mousedown', this._boundOverflowMouseDown);
        this._overflowBtn.destroy();
        this._overflowBtn = null;
      }
      this._overflowEl.remove();
      this._overflowEl = null;
    }

    if (this._liveRegionEl) {
      this._liveRegionEl.remove();
      this._liveRegionEl = null;
    }
  }

  private _rebuild(): void {
    this._teardown();
    this._build();
  }

  private _applyRootClassesAndAria(): void {
    const o = this._options;
    const classes = [
      'arvo-chip-list',
      `arvo-chip-list--${o.variant}`,
      `arvo-chip-list--${this._effectiveAppearance}`,
      `arvo-chip-list--${o.size}`,
      // overflowMode 'none' emits no layout class (parent owns clipping).
      o.overflowMode !== 'none' ? `arvo-chip-list--${o.overflowMode}` : '',
      this._reorderAllowed ? 'arvo-chip-list--reorderable' : '',
      o.isDisabled ? 'is-disabled' : '',
      o.isReadOnly ? 'is-readonly' : '',
      o.isLoading ? 'loading' : '',
    ]
      .filter(Boolean)
      .join(' ');

    this.el.className = classes;
    this.el.setAttribute('role', 'group');
    this._setOrRemoveAttr('aria-label', o.ariaLabel);
    this._setOrRemoveAttr('aria-labelledby', o.ariaLabelledBy);
    this._toggleAttr('aria-disabled', o.isDisabled);
    this._toggleAttr('aria-readonly', o.isReadOnly);
    this._toggleAttr('aria-busy', o.isLoading);
    if (o.isWithinField) {
      this.el.setAttribute('data-within-field', 'true');
    } else {
      this.el.removeAttribute('data-within-field');
    }

    if (o.overflowMode === 'max-rows' && typeof o.maxRows === 'number' && o.maxRows > 0) {
      this.el.style.setProperty('--arvo-chip-list-max-rows', String(o.maxRows));
    } else {
      this.el.style.removeProperty('--arvo-chip-list-max-rows');
    }
  }

  private _buildChips(): void {
    const o = this._options;
    this._chips = [];

    for (const item of o.items) {
      const resolvedVariant: ArvoChipVariant = item.variant ?? o.variant;
      // Interactive chips (filter) render as <button> in React; everything else
      // (general w/o action, input) renders as <span>. Match that host tag so
      // the ArvoChip applies identical root semantics.
      const hostEl = document.createElement(resolvedVariant === 'filter' ? 'button' : 'span');
      this.el.appendChild(hostEl);

      const rawKey = item.key;
      const keyStr = String(rawKey);

      const chipOpts: ArvoChipOptions = {
        // Shared axis defaults from the list, overridden per item where set.
        variant: resolvedVariant,
        appearance: item.appearance ?? o.appearance,
        size: item.size ?? o.size,
        colorMode: item.colorMode ?? o.colorMode,
        isDisabled: item.isDisabled ?? o.isDisabled,
        isReadOnly: item.isReadOnly ?? o.isReadOnly,
        isLoading: o.isLoading,
        // Per-chip content / validation pass through (chip applies its defaults).
        label: item.label,
        title: item.title,
        icon: item.icon,
        avatar: item.avatar,
        counter: item.counter,
        semanticType: item.semanticType,
        customColor: item.customColor,
        isInvalid: item.isInvalid,
        isWarning: item.isWarning,
        isExcluded: item.isExcluded,
        maxWidth: item.maxWidth,
      };

      // Filter selection -- the list is authoritative for selected state.
      if (o.selectionMode !== 'none') {
        chipOpts.isSelected = this._selectedSet.has(keyStr);
        chipOpts.onSelectedChange = (selected: boolean) => this._handleChipToggle(rawKey, selected);
      }

      // Reorder -- inject the drag-handle bag so the chip renders its grip.
      if (this._reorderAllowed) {
        chipOpts.dragHandleProps = {
          'aria-label': `Reorder ${item.label}`,
          tabIndex: 0,
        };
      }

      // Input chips -- wire dismiss so the chip renders its dismiss button. The
      // actual re-emit of chip-list:dismiss happens in the bubbling chip:dismiss
      // listener (which carries the originalEvent); onDismiss handles focus.
      if (resolvedVariant === 'input') {
        chipOpts.dismissLabel = item.dismissLabel;
        chipOpts.onDismiss = () => this._focusAfterDismiss(rawKey);
      }

      const instance = ArvoChip.initialize(hostEl, chipOpts);
      this._chips.push({ instance, el: hostEl, rawKey, key: keyStr });
    }
  }

  private _buildOverflow(): void {
    if (!this._showOverflowAction) return;

    // Static overflow: render a non-interactive `<span>` with the
    // `arvo-chip-list__overflow` + `arvo-chip-list__overflow--static`
    // class set. The chevron is suppressed, no click handler is wired,
    // and the element is not focusable. Used by strict single-line
    // consumers (e.g. ArvoMultiSelect overflowMode='single-line') where
    // chips cannot expand back into view.
    if (this._options.isStaticOverflow) {
      const span = document.createElement('span');
      span.className = 'arvo-chip-list__overflow arvo-chip-list__overflow--static';
      span.style.display = 'none';
      if (this._options.isDisabled) {
        span.setAttribute('aria-hidden', 'true');
      }
      this.el.appendChild(span);
      this._overflowEl = span;
      return;
    }

    const btn = document.createElement('button');
    // The chip-list composes the real ArvoDisclosureButton (NOT a hand-rolled
    // inline button). size='md' inside a token-field (matches the 32px field
    // row); size='sm' standalone (matches the legacy chip-list layout).
    // hasChevron=true so the chevron flips automatically between angle-down
    // (collapsed) and angle-up (expanded). The chip-list adds the
    // arvo-chip-list__overflow hook AFTER initialize so overflow measurement
    // (`:scope > .arvo-chip-list__overflow`) and consumer test selectors keep
    // working. The disclosure has no `disabled` prop by design -- the
    // disabled visual + tab-skip route via tabindex + aria-hidden plus the
    // chip-list parent-CSS dim.
    // The disclosure always renders at 'md' (14px label), in both standalone
    // and within-field mode.
    const disclosureSize: 'sm' | 'md' = 'md';
    this._overflowBtn = ArvoDisclosureButton.initialize(btn, {
      size: disclosureSize,
      hasChevron: true,
      isExpanded: this._isExpanded,
      label: '',
    });
    btn.classList.add('arvo-chip-list__overflow');
    btn.style.display = 'none';
    // Inside a token-field the parent owns the single tab stop; the
    // disclosure becomes non-tabbable (still mouse / Arrow / programmatic
    // activation via the parent's keyboard handler).
    if (this._options.isDisabled || this._options.isWithinField) {
      btn.setAttribute('tabindex', '-1');
    }
    if (this._options.isDisabled) {
      btn.setAttribute('aria-hidden', 'true');
    }
    // Capture-phase click handler so we run BEFORE ArvoDisclosureButton's
    // own bubble-phase handler. We then `stopImmediatePropagation()` so the
    // disclosure's internal auto-toggle never fires -- the chip-list
    // explicitly drives the state via `_setExpanded()` (when opted in) or
    // leaves it alone (legacy `onOverflowPress` consumers). This mirrors
    // how the React twin's controlled `useControllableState` suppresses
    // the disclosure's internal toggle for controlled consumers.
    btn.addEventListener('click', this._boundOverflowClick, true);
    // When the chip-list is composed inside a token-field, preventDefault
    // on mousedown so the browser does not move focus to the disclosure --
    // the parent field's input keeps focus across the click. Click handler
    // still runs and toggles isExpanded.
    if (this._options.isWithinField) {
      btn.addEventListener('mousedown', this._boundOverflowMouseDown);
    }
    this.el.appendChild(btn);
    this._overflowEl = btn;
  }

  private _handleOverflowMouseDown(event: Event): void {
    if (!this._options.isWithinField) return;
    event.preventDefault();
  }

  // ---------------------------------------------------------------------------
  // Live-region status node -- announces selection / dismissal / overflow
  // changes to assistive technology. Visually hidden.
  // ---------------------------------------------------------------------------

  private _buildLiveRegion(): void {
    const div = document.createElement('div');
    div.className = 'arvo-chip-list__live';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-atomic', 'true');
    div.style.cssText =
      'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    this.el.appendChild(div);
    this._liveRegionEl = div;
  }

  private _announce(message: string): void {
    if (!this._liveRegionEl || !message) return;
    // Clearing the region first ensures repeat announcements re-fire.
    this._liveRegionEl.textContent = '';
    requestAnimationFrame(() => {
      if (this._liveRegionEl) this._liveRegionEl.textContent = message;
    });
  }

  // ---------------------------------------------------------------------------
  // Overflow detection (ResizeObserver)
  // ---------------------------------------------------------------------------

  private _setupOverflow(): void {
    // Always observe the root when the consumer enabled overflow handling --
    // the ResizeObserver handles the expanded -> collapsed pivot too (which
    // re-measures with no chips hidden via the early return below).
    const mode = this._options.overflowMode;
    if (mode === 'none' || mode === 'wrap') {
      this._measureOverflow();
      return;
    }
    if (typeof ResizeObserver === 'undefined') {
      this._measureOverflow();
      return;
    }
    this._resizeObserver = new ResizeObserver(() => this._measureOverflow());
    this._resizeObserver.observe(this.el);
    this._measureOverflow();
  }

  private _getChipEls(): HTMLElement[] {
    return Array.from(this.el.querySelectorAll<HTMLElement>(':scope > .arvo-chip'));
  }

  private _measureOverflow(): void {
    // While expanded (and opted in) the effective mode is 'wrap' so we skip
    // the hide/show pass entirely -- every chip stays visible.
    const mode = this._effectiveOverflowMode;
    const chips = this._getChipEls();

    // Reset every chip before measuring so positions are accurate.
    for (const el of chips) showChipEl(el);

    if (mode === 'none' || mode === 'wrap') {
      this._setHiddenCount(0);
      return;
    }

    // Explicit cap: hide everything past maxVisibleChips, no measuring.
    if (typeof this._options.maxVisibleChips === 'number') {
      const cap = this._options.maxVisibleChips;
      let hidden = 0;
      chips.forEach((el, i) => {
        if (i >= cap) {
          hideChipEl(el);
          hidden += 1;
        }
      });
      this._setHiddenCount(hidden);
      return;
    }

    let firstHidden = -1;

    if (mode === 'single-line') {
      const rootRect = this.el.getBoundingClientRect();
      const overflowWidth = this._overflowEl?.offsetWidth ?? 0;
      const limitRight = rootRect.right - overflowWidth;
      for (let i = 0; i < chips.length; i++) {
        if (chips[i].getBoundingClientRect().right > limitRight) {
          firstHidden = i;
          break;
        }
      }
    } else {
      // max-rows: bucket chips into rows by offsetTop, collapse the rest.
      const rows =
        typeof this._options.maxRows === 'number' && this._options.maxRows > 0
          ? this._options.maxRows
          : 1;
      const rowTops: number[] = [];
      for (let i = 0; i < chips.length; i++) {
        const top = chips[i].offsetTop;
        if (!rowTops.includes(top)) rowTops.push(top);
        if (rowTops.indexOf(top) >= rows) {
          firstHidden = i;
          break;
        }
      }
    }

    if (firstHidden >= 0) {
      for (let i = firstHidden; i < chips.length; i++) hideChipEl(chips[i]);
      this._setHiddenCount(chips.length - firstHidden);
    } else {
      this._setHiddenCount(0);
    }
  }

  private _setHiddenCount(n: number): void {
    const prev = this._hiddenCount;
    this._hiddenCount = n;
    this._updateOverflowButton();
    // Refresh roving tabindex assignments since hide/show changed which
    // chips are reachable.
    this._applyRovingTabindex();
    if (n !== prev && (n > 0 || prev > 0)) {
      this._announce(
        n > 0
          ? `${n} more ${n === 1 ? 'chip' : 'chips'} hidden.`
          : 'All chips visible.',
      );
    }
  }

  private _updateOverflowButton(): void {
    const el = this._overflowEl;
    if (!el) return;
    const n = this._hiddenCount;
    const isStatic = this._options.isStaticOverflow === true;
    // Visibility rules: mirror the React twin. Interactive disclosures
    // also stay visible while expanded (so the user can collapse) when
    // the consumer opted into the expansion contract. Static overflow
    // indicators show ONLY when chips are actually hidden.
    const showNow = isStatic
      ? n > 0
      : n > 0 || (this._isExpanded && this._expansionOptIn);
    if (!showNow) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    const labelFn = this._options.overflowLabel ?? ((c: number) => `+${c} more`);
    const ariaFn = this._options.overflowAriaLabel ?? ((c: number) => `Show ${c} more chips`);
    if (isStatic) {
      // Static span: write the label directly into textContent and the
      // accessible name. No chevron, no ArvoDisclosureButton instance.
      el.textContent = labelFn(n);
      el.setAttribute('aria-label', ariaFn(n));
      return;
    }
    if (this._isExpanded) {
      const expandedFn = this._options.expandedLabel ?? (() => 'Show less');
      const label = expandedFn();
      this._overflowBtn?.setLabel(label);
      el.setAttribute('aria-label', label);
    } else {
      this._overflowBtn?.setLabel(labelFn(n));
      el.setAttribute('aria-label', ariaFn(n));
    }
  }

  private _handleOverflowPress(event?: Event): void {
    if (this._options.isDisabled) return;
    if (event) {
      // Capture-phase: `stopImmediatePropagation()` suppresses the
      // ArvoDisclosureButton's internal bubble-phase click handler (which
      // would otherwise auto-toggle `aria-expanded`). The chip-list drives
      // the state explicitly via `_setExpanded()` instead.
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    }
    // When the consumer opted into the expansion contract, flip the local
    // expanded state and rebuild the measurement / disclosure label. Always
    // fire the legacy onOverflowPress for backwards compatibility.
    if (this._showOverflowAction && this._expansionOptIn) {
      this._setExpanded(!this._isExpanded);
    }
    const detail = { hiddenCount: this._hiddenCount };
    this._dispatch('chip-list:overflow-press', detail, false);
    this._options.onOverflowPress?.();
  }

  private _setExpanded(next: boolean): void {
    if (this._isExpanded === next) return;
    this._isExpanded = next;
    // Update the disclosure's internal isExpanded so its label + chevron
    // direction + aria-expanded flip in place (no DOM re-mount).
    this._overflowBtn?.expanded(next);
    // Re-apply root classes (so SCSS modifier classes update if needed) and
    // re-measure so the chip-list pivots into 'wrap' / back to the prop
    // value. Re-measurement clears or re-applies the hidden chips.
    this._applyRootClassesAndAria();
    this._measureOverflow();
    // Refresh disclosure label / aria-label for the new state.
    this._updateOverflowButton();
    this._options.onExpandedChange?.(next);
    this._dispatch('chip-list:expand-change', { isExpanded: next }, false);
  }

  // ---------------------------------------------------------------------------
  // Reorder (@arvo/core dnd)
  // ---------------------------------------------------------------------------

  private _setupReorder(): void {
    if (!this._reorderAllowed) return;
    this._sortable = createSortableList(this.el, {
      itemSelector: '.arvo-chip',
      handleSelector: '.arvo-chip__grip',
      onPreview: () => {
        this._pointerReorder = true;
      },
      onCancel: () => {
        this._pointerReorder = false;
      },
      onCommit: (fromIndex, toIndex) => this._handleReorderCommit(fromIndex, toIndex),
    });
  }

  private _handleReorderCommit(fromIndex: number, toIndex: number): void {
    const records = this._chips;
    if (fromIndex < 0 || fromIndex >= records.length) return;

    const fromPointer = this._pointerReorder;
    this._pointerReorder = false;

    // Compute the new key order (same splice logic as React).
    const keys = records.map((r) => r.rawKey);
    const next = keys.slice();
    const [movedKey] = next.splice(fromIndex, 1);
    // Pointer commits report a pre-removal insertion index; keyboard commits
    // report the post-removal destination index.
    const insertAt = fromPointer ? (fromIndex < toIndex ? toIndex - 1 : toIndex) : toIndex;
    const clamped = Math.max(0, Math.min(insertAt, next.length));
    next.splice(clamped, 0, movedKey);

    const detail = { keys: next, key: movedKey, fromIndex, toIndex };
    // Cancelable: a preventDefault() on the event reverts (DOM/state unchanged).
    const notPrevented = this._dispatch('chip-list:reorder', detail, true);
    this._options.onReorder?.(detail);
    if (!notPrevented) return;

    // Apply: reorder the records + move the chip DOM nodes (the list owns them).
    const [movedRec] = records.splice(fromIndex, 1);
    records.splice(clamped, 0, movedRec);
    const anchor = this._overflowEl;
    for (const rec of records) this.el.insertBefore(rec.el, anchor);

    // Keep focus on the moved chip's grip after the DOM settles.
    requestAnimationFrame(() => {
      const moved = this._chips[clamped];
      moved?.el.querySelector<HTMLElement>('.arvo-chip__grip')?.focus();
    });

    this._measureOverflow();
  }

  // ---------------------------------------------------------------------------
  // Filter selection
  // ---------------------------------------------------------------------------

  private _handleChipToggle(rawKey: string | number, selected: boolean): void {
    if (this._options.selectionMode === 'none') return;
    const keyStr = String(rawKey);

    let nextSet: Set<string>;
    if (this._options.selectionMode === 'single') {
      // Single: selecting replaces the set with just this key (deselecting the
      // previous); deselecting clears it.
      nextSet = selected ? new Set([keyStr]) : new Set();
    } else {
      // Multiple: toggle this key independently of the others.
      nextSet = new Set(this._selectedSet);
      if (selected) nextSet.add(keyStr);
      else nextSet.delete(keyStr);
    }

    this._selectedSet = nextSet;
    this._syncChipSelection();

    // Activate the toggled chip in the roving model so subsequent
    // arrow-key navigation starts from it.
    this._activeKey = keyStr;
    this._applyRovingTabindex();

    const detail = { keys: Array.from(this._selectedSet), key: rawKey, isSelected: selected };
    this._dispatch('chip-list:selection-change', detail, false);
    this._options.onSelectionChange?.(detail);

    // Live-region announcement.
    const rec = this._chips.find((r) => r.key === keyStr);
    if (rec) {
      const label = this._chipLabel(rec);
      this._announce(
        selected ? `${label} filter selected.` : `${label} filter removed.`,
      );
    }
  }

  private _syncChipSelection(): void {
    for (const rec of this._chips) {
      rec.instance.selected(this._selectedSet.has(rec.key));
    }
  }

  // ---------------------------------------------------------------------------
  // Dismiss (input chips)
  // ---------------------------------------------------------------------------

  private _onChipDismiss(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const record = this._chips.find((r) => r.el === target || r.el.contains(target));
    if (!record) return;
    const originalEvent = (event as CustomEvent).detail?.originalEvent ?? event;
    // Live-region announcement before the consumer removes the chip.
    this._announce(`${this._chipLabel(record)} removed.`);
    // Re-emit at the list level with the chip's key. The consumer owns the
    // actual item removal (cancelable mirrors the child chip:dismiss).
    this._dispatch('chip-list:dismiss', { key: record.rawKey, originalEvent }, true);
  }

  private _chipLabel(record: ChipRecord): string {
    return (
      record.el.querySelector('.arvo-chip__lbl')?.textContent ??
      String(record.rawKey)
    );
  }

  private _focusAfterDismiss(rawKey: string | number): void {
    const idx = this._chips.findIndex((r) => r.rawKey === rawKey);
    if (idx === -1) return;
    // Prefer the next sibling, then the previous, then nothing.
    const order: ChipRecord[] = [];
    for (let i = idx + 1; i < this._chips.length; i++) order.push(this._chips[i]);
    for (let i = idx - 1; i >= 0; i--) order.push(this._chips[i]);
    for (const rec of order) {
      const f = this._firstFocusable(rec);
      if (f) {
        f.focus();
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public methods (descriptor-driven)
  // ---------------------------------------------------------------------------

  setItems(items: ArvoChipListItem[]): void {
    this._options.items = items;
    this._rebuild();
  }

  /**
   * Get or set the chip-overflow expanded state. Setting fires
   * `onExpandedChange` + `chip-list:expand-change` and flips the
   * `__overflow` ArvoDisclosureButton label / aria-expanded in place (no
   * DOM re-mount). No-op when overflowMode is 'wrap' / 'none' (no overflow
   * disclosure exists).
   */
  expanded(): boolean;
  expanded(state: boolean): void;
  expanded(state?: boolean): boolean | void {
    if (state === undefined) return this._isExpanded;
    if (!this._showOverflowAction) return;
    // Calling expanded() programmatically counts as opt-in: from this point
    // forward the disclosure click also auto-toggles.
    this._expansionOptIn = true;
    this._setExpanded(state);
  }

  selectedKeys(): Array<string | number>;
  selectedKeys(next: Array<string | number>): void;
  selectedKeys(next?: Array<string | number>): Array<string | number> | void {
    if (next === undefined) {
      return Array.from(this._selectedSet);
    }
    if (this._options.selectionMode === 'none') return;

    const prev = this._selectedSet;
    const nextSet = new Set(next.map((k) => String(k)));

    // Find a representative changed key so the event payload stays meaningful.
    let changedKey: string | number | undefined;
    let changedSelected = true;
    for (const k of nextSet) {
      if (!prev.has(k)) {
        changedKey = k;
        changedSelected = true;
        break;
      }
    }
    if (changedKey === undefined) {
      for (const k of prev) {
        if (!nextSet.has(k)) {
          changedKey = k;
          changedSelected = false;
          break;
        }
      }
    }

    this._selectedSet = nextSet;
    this._syncChipSelection();

    if (changedKey !== undefined) {
      const detail = { keys: Array.from(this._selectedSet), key: changedKey, isSelected: changedSelected };
      this._dispatch('chip-list:selection-change', detail, false);
      this._options.onSelectionChange?.(detail);
    }
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;

    const prevReorder = this._reorderAllowed;
    this._options.isDisabled = state;
    this.el.classList.toggle('is-disabled', state);
    this._toggleAttr('aria-disabled', state);
    // The overflow action is an ArvoDisclosureButton (no `disabled` prop by
    // design). Route disabled through tab-skip + a11y-hide; the parent CSS
    // (.arvo-chip-list.is-disabled .arvo-chip-list__overflow.arvo-disc-btn)
    // supplies the dim color tone.
    if (this._overflowEl) {
      if (state) {
        this._overflowEl.setAttribute('tabindex', '-1');
        this._overflowEl.setAttribute('aria-hidden', 'true');
      } else {
        this._overflowEl.removeAttribute('tabindex');
        this._overflowEl.removeAttribute('aria-hidden');
      }
    }

    // Reorder eligibility depends on disabled/readonly; when it changes the
    // chips' grips must be added/removed, so rebuild (mirrors React re-render).
    if (this._reorderAllowed !== prevReorder) {
      this._rebuild();
    } else {
      for (const rec of this._chips) rec.instance.disabled(state);
    }
  }

  readOnly(): boolean;
  readOnly(state: boolean): void;
  readOnly(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isReadOnly;

    const prevReorder = this._reorderAllowed;
    this._options.isReadOnly = state;
    this.el.classList.toggle('is-readonly', state);
    this._toggleAttr('aria-readonly', state);

    if (this._reorderAllowed !== prevReorder) {
      this._rebuild();
    } else {
      for (const rec of this._chips) rec.instance.readOnly(state);
    }
  }

  setLoading(loading: boolean): void {
    this._options.isLoading = loading;
    this.el.classList.toggle('loading', loading);
    this._toggleAttr('aria-busy', loading);
    for (const rec of this._chips) rec.instance.setLoading(loading);
    this._dispatch('chip-list:loading', { isLoading: loading }, false);
  }

  focus(): void {
    for (const rec of this._chips) {
      const f = this._firstFocusable(rec);
      if (f) {
        f.focus();
        return;
      }
    }
    const btn = this._overflowEl;
    if (
      btn &&
      btn.style.display !== 'none' &&
      btn.getAttribute('tabindex') !== '-1'
    ) {
      btn.focus();
    }
  }

  destroy(): void {
    this.el.removeEventListener('chip:dismiss', this._boundChipDismiss);
    this.el.removeEventListener('keydown', this._boundKeyDown);
    this._teardown();
    this.el.textContent = '';
    this.el.className = '';
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('aria-labelledby');
    this.el.removeAttribute('aria-disabled');
    this.el.removeAttribute('aria-readonly');
    this.el.removeAttribute('aria-busy');
    this.el.style.removeProperty('--arvo-chip-list-max-rows');
  }

  // ---------------------------------------------------------------------------
  // Roving tabindex (Arrow / Home / End across visible focusable chips)
  // ---------------------------------------------------------------------------

  private _isChipFocusable(rec: ChipRecord): boolean {
    const el = rec.el;
    if (el.style.visibility === 'hidden') return false;
    if (el instanceof HTMLButtonElement) return !el.disabled;
    return el.hasAttribute('tabindex');
  }

  /**
   * Apply roving tabindex among visible focusable chips: only the active
   * chip carries tabindex=0, all others carry tabindex=-1. Resolves the
   * active chip from `_activeKey` (preserved across renders), else the
   * first selected chip (filter), else the first focusable chip.
   */
  private _applyRovingTabindex(): void {
    const focusable = this._chips.filter((rec) => this._isChipFocusable(rec));
    if (focusable.length <= 1) {
      // Single (or zero) focusable chip -- nothing to rove. Leave the chip's
      // own default tabindex untouched.
      return;
    }

    let activeRec: ChipRecord | undefined;
    if (this._activeKey !== null) {
      activeRec = focusable.find((r) => r.key === this._activeKey);
    }
    if (!activeRec && this._options.selectionMode !== 'none' && this._selectedSet.size > 0) {
      activeRec = focusable.find((r) => this._selectedSet.has(r.key));
    }
    if (!activeRec) activeRec = focusable[0];
    this._activeKey = activeRec.key;

    for (const rec of focusable) {
      rec.el.setAttribute('tabindex', rec === activeRec ? '0' : '-1');
    }
  }

  private _handleListKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (
      key !== 'ArrowRight' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) return;
    const visible = this._chips.filter((rec) => this._isChipFocusable(rec));
    if (visible.length === 0) return;

    const currentIdx = visible.findIndex(
      (rec) => rec.el === target || rec.el.contains(target),
    );
    if (currentIdx === -1) return;

    let nextIdx = currentIdx;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIdx = Math.min(currentIdx + 1, visible.length - 1);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIdx = Math.max(currentIdx - 1, 0);
    } else if (key === 'Home') {
      nextIdx = 0;
    } else if (key === 'End') {
      nextIdx = visible.length - 1;
    }

    event.preventDefault();
    if (nextIdx === currentIdx) return;

    // Update tabindex assignment + focus the new chip.
    this._activeKey = visible[nextIdx].key;
    for (const rec of visible) {
      rec.el.setAttribute('tabindex', rec === visible[nextIdx] ? '0' : '-1');
    }
    visible[nextIdx].el.focus();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _firstFocusable(rec: ChipRecord): HTMLElement | null {
    const el = rec.el;
    if (el.style.visibility === 'hidden') return null;
    if (el instanceof HTMLButtonElement && !el.disabled) return el;
    if (el.hasAttribute('tabindex')) return el;
    const focusables = getFocusableElements(el);
    return focusables[0] ?? null;
  }

  private _dispatch(name: string, detail: Record<string, unknown>, cancelable: boolean): boolean {
    return this.el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable, detail }));
  }

  private _toggleAttr(name: string, on: boolean): void {
    if (on) this.el.setAttribute(name, 'true');
    else this.el.removeAttribute(name);
  }

  private _setOrRemoveAttr(name: string, value: string | null): void {
    if (value != null) this.el.setAttribute(name, value);
    else this.el.removeAttribute(name);
  }
}
