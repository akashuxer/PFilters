import {
  createArrowNav,
  createOverflowManager,
  type ArrowNav,
  type OverflowManager,
} from '@arvo/core';
import { ArvoButton, type ArvoButtonOptions } from '../Button/Button';
import { ArvoIconButton, type ArvoIconButtonOptions } from '../IconButton/IconButton';
import {
  ArvoActionMenu,
  type ArvoActionMenuOptions,
  type MenuItemData,
} from '../ActionMenu/ActionMenu';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ButtonGroupItem {
  value: string;
  label?: string;
  icon?: string;
  isDisabled?: boolean;
  isExcluded?: boolean;
}

// NOTE: ArvoButtonGroup intentionally does NOT expose a scoped `buttonProps`
// escape-hatch bag for its inner `ArvoButton` / `ArvoIconButton` children.
// The component's items API (`items: ButtonGroupItem[]`) is the single
// authoring surface: per-item label, icon, value, and disabled state are
// already first-class. There is no parity-safe long-tail option today --
// JS components decorate an existing element so they don't accept a
// `className` option, and other ArvoButtonOptions keys are either
// parent-owned or non-applicable inside a toolbar group. Mirrors the
// React twin's documented omission.

/**
 * Scoped escape-hatch bag for the overflow `ArvoActionMenu` (the "More
 * actions" trigger). Mirrors the React `ButtonGroupOverflowMenuProps`
 * type exactly -- drift checker enforces parity. `placement` is parent-
 * owned (`bottom-end`) and intentionally excluded.
 */
export type ButtonGroupOverflowMenuProps = Pick<
  ArvoActionMenuOptions,
  'maxHeight' | 'hasGroupDividers' | 'search' | 'actionsVisibility' | 'menuWidth' | 'submenuWidth'
>;

export interface ArvoButtonGroupOptions {
  items?: ButtonGroupItem[];
  value?: string | string[] | null;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'lg';
  isMultiSelect?: boolean;
  isIconOnly?: boolean;
  hasOverflow?: boolean;
  expandOnSelect?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  ariaLabel: string;
  /**
   * Escape hatch for the overflow `ArvoActionMenu` options the parent
   * doesn't expose flat. Bag-only keys flow through; on any conflict with
   * a parent-owned option the parent wins.
   */
  overflowMenuProps?: ButtonGroupOverflowMenuProps;
  onChange?: (detail: ButtonGroupChangeDetail) => void;
}

export interface ButtonGroupChangeDetail {
  value: string | string[] | null;
  previousValue: string | string[] | null;
  changedValue?: string;
  isSelected?: boolean;
  [key: string]: unknown;
}

type RequiredGroupOptions = Required<
  Omit<ArvoButtonGroupOptions, 'onChange' | 'items' | 'value' | 'overflowMenuProps'>
> & {
  items: ButtonGroupItem[];
  value: string | string[] | null;
  overflowMenuProps: ButtonGroupOverflowMenuProps | null;
  onChange: ((detail: ButtonGroupChangeDetail) => void) | null;
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoButtonGroup {
  private _element: HTMLElement | null;
  private _options: RequiredGroupOptions;

  private _childButtons: (ArvoButton | ArvoIconButton)[] = [];
  private _childElements: HTMLButtonElement[] = [];
  private _overflowTrigger: ArvoIconButton | null = null;
  private _overflowTriggerEl: HTMLButtonElement | null = null;
  private _overflowMenu: ArvoActionMenu | null = null;

  private _indicatorEl: HTMLSpanElement | null = null;
  private _indicatorResizeObs: ResizeObserver | null = null;

  private _arrowNav: ArrowNav | null = null;
  private _overflowMgr: OverflowManager | null = null;
  private _hiddenValues: Set<string> = new Set();

  // Token for the most recent label-width measurement schedule. Bumped on
  // every `_render`/destroy so a late `document.fonts.ready` callback from a
  // prior render is ignored if items have since changed (or the component
  // was torn down).
  private _labelMeasureToken = 0;

  private _boundHandleKeydown: (event: KeyboardEvent) => void;
  private _boundHandleClick: (event: Event) => void;

  static readonly VARIANTS = ['primary', 'secondary', 'outline'] as const;
  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredGroupOptions = {
    items: [],
    value: null,
    variant: 'primary',
    size: 'lg',
    isMultiSelect: false,
    isIconOnly: false,
    hasOverflow: false,
    expandOnSelect: false,
    isDisabled: false,
    isLoading: false,
    ariaLabel: '',
    overflowMenuProps: null,
    onChange: null,
  };

  static initialize(element: HTMLElement, options?: ArvoButtonGroupOptions): ArvoButtonGroup {
    return new ArvoButtonGroup(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoButtonGroupOptions) {
    this._element = element;

    const variant = options?.variant && (ArvoButtonGroup.VARIANTS as readonly string[]).includes(options.variant)
      ? options.variant
      : ArvoButtonGroup.DEFAULTS.variant;

    const size = options?.size && (ArvoButtonGroup.SIZES as readonly string[]).includes(options.size)
      ? options.size
      : ArvoButtonGroup.DEFAULTS.size;

    this._options = {
      ...ArvoButtonGroup.DEFAULTS,
      ...options,
      variant,
      size,
      items: options?.items ?? [],
      value: options?.value ?? null,
      overflowMenuProps: options?.overflowMenuProps ?? null,
      onChange: options?.onChange ?? null,
    };

    if (this._options.isMultiSelect) {
      this._options.expandOnSelect = false;
    }


    this._boundHandleKeydown = this._handleKeydown.bind(this);
    this._boundHandleClick = this._handleClick.bind(this);

    this._render();
    this._bindEvents();
  }

  // -- Render -------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    this._childButtons = [];
    this._childElements = [];
    this._hiddenValues = new Set();

    const {
      items, value: _value, variant: _variant, size, isMultiSelect: _multiSelect, isIconOnly,
      hasOverflow, expandOnSelect: _expandOnSelect, isDisabled, isLoading, ariaLabel,
    } = this._options;

    el.className = this._buildRootClasses();
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-orientation', 'horizontal');
    el.setAttribute('aria-label', ariaLabel);
    if (isLoading) el.setAttribute('aria-busy', 'true');

    const buttonSize = size === 'sm' ? 'sm' : 'md';

    for (const item of items) {
      const btnEl = document.createElement('button');
      el.appendChild(btnEl);
      this._childElements.push(btnEl);

      const isActive = this._isItemActive(item.value);
      const isItemDisabled = isDisabled || (item.isDisabled ?? false);
      // `expandOnSelect` is a purely CSS-driven animation (label fades in
      // on `.active` via .arvo-btn-grp--expand-lbl). ALL labelled items
      // must therefore render as ArvoButton so the `.arvo-btn__lbl`
      // element stays in the DOM and is available to transition when
      // selection moves between segments. Mirrors the React twin.
      const useIconOnly = isIconOnly;

      let instance: ArvoButton | ArvoIconButton;

      if (useIconOnly || (!item.label && item.icon)) {
        instance = ArvoIconButton.initialize(btnEl, {
          icon: item.icon ?? '',
          tooltip: item.label ?? item.value,
          variant: 'tertiary',
          size: buttonSize,
          isDisabled: isItemDisabled,
          isLoading: isLoading && !(item.isExcluded ?? false),
          isSelected: isActive,
        } as ArvoIconButtonOptions);
      } else {
        instance = ArvoButton.initialize(btnEl, {
          label: item.label ?? item.value,
          icon: item.icon ?? null,
          variant: 'tertiary',
          size: buttonSize,
          isDisabled: isItemDisabled,
          isLoading: isLoading && !(item.isExcluded ?? false),
          isSelected: isActive,
        } as ArvoButtonOptions);
      }

      btnEl.setAttribute('data-value', item.value);
      this._childButtons.push(instance);
    }

    if (hasOverflow) {
      this._mountOverflowTrigger(buttonSize);
    }

    // Sliding indicator for single-select
    if (!this._options.isMultiSelect) {
      this._indicatorEl = document.createElement('span');
      this._indicatorEl.className = 'arvo-btn-grp__ind';
      this._indicatorEl.style.display = 'none';
      el.insertBefore(this._indicatorEl, el.firstChild);

      // Position without transition on first paint, then re-measure after layout
      this._indicatorEl.style.transition = 'none';
      this._updateIndicator();
      requestAnimationFrame(() => {
        this._updateIndicator();
        requestAnimationFrame(() => {
          if (this._indicatorEl) {
            this._indicatorEl.style.transition = '';
          }
        });
      });
    }

    this._syncRovingTabindex();
    this._setupArrowNav();

    if (hasOverflow) {
      this._setupOverflowManager();
    }

    // Stamp per-button label widths so the expand-on-select transition
    // animates over the actual content range (see `_measureLabelWidths`).
    // Safe no-op when `expandOnSelect` is off or in multi-select mode.
    this._scheduleMeasureLabelWidths();
  }

  // -- Label-width measurement (expand-on-select smoothing) --------------
  //
  // The `.arvo-btn-grp--expand-lbl` modifier transitions each label's
  // `max-width` between `0` and `var(--arvo-btn-grp-lbl-w, 200px)`. The
  // hard 200px fallback is far wider than the typical short button label,
  // so on a class-driven `.active` toggle the segment width stops
  // visibly changing once `max-width` exceeds the content width -- the
  // collapsing label keeps its full visual width almost until the end
  // of the transition, then snaps shut (visible stutter), and during the
  // cross-segment swap the group temporarily bloats wider than the start
  // or end state. Pegging `max-width` to each label's measured natural
  // width restores lockstep: the activating segment grows while the
  // deactivating segment shrinks over identical ranges, total group
  // width stays constant, and the indicator follows the active button
  // smoothly via the existing ResizeObserver.

  private _scheduleMeasureLabelWidths(): void {
    if (!this._options.expandOnSelect || this._options.isMultiSelect) return;

    const token = ++this._labelMeasureToken;

    // Synchronous measurement happens after `_render` already attached
    // the DOM, so layout is available. We additionally re-measure once
    // fonts have loaded -- the initial `scrollWidth` reading uses the
    // system fallback metrics and can be a couple of pixels off the
    // final webfont metrics, which would otherwise clip the bold-weight
    // active label at the tail of the expand.
    this._measureLabelWidths();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (token !== this._labelMeasureToken) return;
          this._measureLabelWidths();
        })
        .catch(() => {
          /* font-load failure is non-fatal; the synchronous pass already
             ran and the 200px fallback covers any unmeasured case. */
        });
    }
  }

  private _measureLabelWidths(): void {
    if (!this._element) return;
    if (!this._options.expandOnSelect || this._options.isMultiSelect) return;

    for (let i = 0; i < this._childElements.length; i++) {
      const btnEl = this._childElements[i];
      if (!btnEl) continue;

      const lblEl = btnEl.querySelector('.arvo-btn__lbl') as HTMLElement | null;
      if (!lblEl) {
        btnEl.style.removeProperty('--arvo-btn-grp-lbl-w');
        continue;
      }

      // `scrollWidth` returns the natural content width even when the
      // visible width is clamped by `max-width: 0` + `overflow: hidden`
      // on the inactive labels, so we can read the right value for
      // every segment regardless of selection state.
      const natural = lblEl.scrollWidth;
      if (natural <= 0) continue;

      // The active state bumps font-weight from regular to medium via
      // the parent group's CSS variable, which can widen short labels
      // by a pixel or two. A small fixed buffer absorbs that delta and
      // keeps the bold-weight label from clipping at the tail of the
      // expand. Ceiling guards against sub-pixel fractional widths.
      const expanded = Math.ceil(natural) + 2;
      btnEl.style.setProperty('--arvo-btn-grp-lbl-w', `${expanded}px`);
    }
  }

  private _buildRootClasses(): string {
    const { variant, size, isMultiSelect, isIconOnly, hasOverflow, expandOnSelect, isDisabled, isLoading } = this._options;
    return [
      'arvo-btn-grp',
      `arvo-btn-grp--${variant}`,
      `arvo-btn-grp--${size}`,
      isMultiSelect && 'arvo-btn-grp--multi',
      isIconOnly && 'arvo-btn-grp--icon-only',
      hasOverflow && 'arvo-btn-grp--overflow',
      expandOnSelect && !isMultiSelect && 'arvo-btn-grp--expand-lbl',
      isDisabled && 'is-disabled',
      isLoading && 'loading',
    ].filter(Boolean).join(' ');
  }

  // -- Events -------------------------------------------------------------

  private _bindEvents(): void {
    this._element?.addEventListener('keydown', this._boundHandleKeydown);
    this._element?.addEventListener('click', this._boundHandleClick);
  }

  private _handleKeydown(event: KeyboardEvent): void {
    if (this._options.isDisabled || this._options.isLoading) return;
    this._arrowNav?.handleKeyDown(event);
  }

  private _handleClick(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading) return;

    const target = event.target as HTMLElement;
    const btnEl = target.closest('button[data-value]') as HTMLButtonElement | null;
    if (!btnEl) return;

    // Ignore clicks on the overflow trigger (which has no `data-value` --
    // but defend in depth in case it ever picks one up).
    if (btnEl === this._overflowTriggerEl) return;

    const itemValue = btnEl.getAttribute('data-value');
    if (!itemValue) return;

    const item = this._options.items.find(i => i.value === itemValue);
    if (!item || item.isDisabled || this._options.isDisabled) return;

    if (this._options.isMultiSelect) {
      this._toggleMulti(itemValue);
    } else {
      this._selectSingle(itemValue);
    }
  }

  private _selectSingle(newValue: string): void {
    const previousValue = this._options.value as string | null;
    if (previousValue === newValue) return;

    this._options.value = newValue;
    this._syncActiveStates();
    this._syncRovingTabindex();
    this._updateIndicator();

    // After the selection visually shifts, re-measure overflow with the
    // newly-selected value promoted so it stays in the visible region.
    this._overflowMgr?.refresh();
    this._updateOverflowMenuItems();

    const detail: ButtonGroupChangeDetail = { value: newValue, previousValue };
    this._dispatchEvent('btn-grp:change', detail);
    this._options.onChange?.(detail);
  }

  private _toggleMulti(itemValue: string): void {
    const currentValues = (this._options.value as string[] | null) ?? [];
    const previousValue = [...currentValues];
    const idx = currentValues.indexOf(itemValue);
    const isSelected = idx === -1;

    if (isSelected) {
      currentValues.push(itemValue);
    } else {
      currentValues.splice(idx, 1);
    }

    this._options.value = [...currentValues];
    this._syncActiveStates();
    this._syncRovingTabindex();
    this._updateOverflowMenuItems();

    const detail: ButtonGroupChangeDetail = {
      value: [...currentValues],
      previousValue,
      changedValue: itemValue,
      isSelected,
    };
    this._dispatchEvent('btn-grp:change', detail);
    this._options.onChange?.(detail);
  }

  // -- State sync ---------------------------------------------------------

  private _isItemActive(itemValue: string): boolean {
    const { value, isMultiSelect } = this._options;
    if (isMultiSelect) {
      return Array.isArray(value) && value.includes(itemValue);
    }
    return value === itemValue;
  }

  private _syncActiveStates(): void {
    const { items } = this._options;
    for (let i = 0; i < items.length; i++) {
      const isActive = this._isItemActive(items[i].value);
      const btn = this._childButtons[i];
      if (btn) {
        btn.selected(isActive);
      }
    }
  }

  private _syncIndicatorToButton(activeBtn: HTMLButtonElement): boolean {
    if (!this._element || !this._indicatorEl) return false;

    const containerRect = this._element.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    const width = btnRect.width;

    if (width === 0) return false;

    this._indicatorEl.style.display = '';
    this._element.style.setProperty(
      '--arvo-btn-grp-ind-x',
      `${btnRect.left - containerRect.left}px`,
    );
    this._element.style.setProperty('--arvo-btn-grp-ind-w', `${width}px`);
    return true;
  }

  private _updateIndicator(): void {
    if (!this._indicatorEl || !this._element || this._options.isMultiSelect) return;

    const activeIdx = this._options.items.findIndex(item => this._isItemActive(item.value));
    if (activeIdx === -1) {
      this._indicatorEl.style.display = 'none';
      this._indicatorResizeObs?.disconnect();
      this._indicatorResizeObs = null;
      return;
    }

    const activeBtn = this._childElements[activeIdx];
    if (!activeBtn) return;

    this._syncIndicatorToButton(activeBtn);
    this._watchActiveResize(activeBtn);
  }

  private _watchActiveResize(activeBtn: HTMLButtonElement): void {
    this._indicatorResizeObs?.disconnect();

    if (typeof ResizeObserver === 'undefined') return;

    this._indicatorResizeObs = new ResizeObserver(() => {
      this._syncIndicatorToButton(activeBtn);
    });

    if (this._options.expandOnSelect) {
      for (const btn of this._childElements) {
        this._indicatorResizeObs.observe(btn);
      }
    } else {
      this._indicatorResizeObs.observe(activeBtn);
    }
  }

  private _syncRovingTabindex(): void {
    const { items, value, isMultiSelect } = this._options;
    let selectedIdx = -1;
    let firstEnabledIdx = -1;

    for (let i = 0; i < items.length; i++) {
      if (this._hiddenValues.has(items[i].value)) continue;
      const isEnabled = !items[i].isDisabled && !this._options.isDisabled;
      if (isEnabled && firstEnabledIdx === -1) firstEnabledIdx = i;

      if (!isMultiSelect && value === items[i].value && isEnabled) {
        selectedIdx = i;
      } else if (isMultiSelect && Array.isArray(value) && value.includes(items[i].value) && isEnabled) {
        if (selectedIdx === -1) selectedIdx = i;
      }
    }

    const activeIdx = selectedIdx !== -1 ? selectedIdx : firstEnabledIdx;

    for (let i = 0; i < this._childElements.length; i++) {
      this._childElements[i].tabIndex = i === activeIdx ? 0 : -1;
    }
  }

  // -- Arrow Nav ----------------------------------------------------------

  private _setupArrowNav(): void {
    this._arrowNav?.destroy();

    const enabledElements = this._childElements.filter((el, i) => {
      const item = this._options.items[i];
      return !item?.isDisabled && !this._options.isDisabled && !this._hiddenValues.has(item.value);
    });

    if (enabledElements.length === 0) {
      this._arrowNav = null;
      return;
    }

    const { isMultiSelect } = this._options;

    this._arrowNav = createArrowNav({
      items: enabledElements,
      orientation: 'horizontal',
      wrap: true,
      onNavigate: (item: HTMLElement, _index: number) => {
        for (const el of this._childElements) {
          el.tabIndex = -1;
        }
        (item as HTMLButtonElement).tabIndex = 0;
        (item as HTMLButtonElement).focus();

        if (!isMultiSelect) {
          const val = item.getAttribute('data-value');
          if (val) this._selectSingle(val);
        }
      },
      onSelect: (item: HTMLElement) => {
        const val = item.getAttribute('data-value');
        if (!val) return;
        if (isMultiSelect) {
          this._toggleMulti(val);
        } else {
          this._selectSingle(val);
        }
      },
    });
  }

  // -- Overflow -----------------------------------------------------------

  private _mountOverflowTrigger(buttonSize: 'sm' | 'md'): void {
    const el = this._element;
    if (!el) return;

    this._overflowTriggerEl = document.createElement('button');
    el.appendChild(this._overflowTriggerEl);
    this._overflowTriggerEl.className = 'arvo-btn-grp__overflow';
    this._overflowTriggerEl.style.display = 'none';

    this._overflowTrigger = ArvoIconButton.initialize(this._overflowTriggerEl, {
      icon: 'ellipsis-v',
      tooltip: 'More actions',
      variant: 'tertiary',
      size: buttonSize,
      isDisabled: this._options.isDisabled,
    } as ArvoIconButtonOptions);

    // Hybrid options surface: spread `overflowMenuProps` first so flat /
    // parent-computed values win on overlap.
    this._overflowMenu = ArvoActionMenu.initialize(this._overflowTriggerEl, {
      ...(this._options.overflowMenuProps ?? undefined),
      items: this._buildOverflowMenuItems(),
      placement: 'bottom-end',
      closeOnSelect: true,
      isDisabled: this._options.isDisabled || this._options.isLoading,
      onSelect: (item: MenuItemData) => {
        if (item.isDisabled) return;
        if (this._options.isMultiSelect) {
          this._toggleMulti(item.id);
        } else {
          this._selectSingle(item.id);
        }
      },
    });
  }

  private _buildOverflowMenuItems(): MenuItemData[] {
    return this._options.items
      .filter((item) => this._hiddenValues.has(item.value))
      .map((item) => ({
        id: item.value,
        label: item.label ?? item.value,
        icon: item.icon,
        isDisabled: item.isDisabled,
        active: this._isItemActive(item.value),
      }));
  }

  private _updateOverflowMenuItems(): void {
    this._overflowMenu?.updateItems(this._buildOverflowMenuItems());
  }

  private _setupOverflowManager(): void {
    if (!this._element || !this._options.hasOverflow) return;

    this._overflowMgr?.destroy();

    this._overflowMgr = createOverflowManager({
      container: this._element,
      // Detect overflow against the PARENT element's width so the
      // button-group root itself can stay `inline-flex` (content-sized)
      // and the trigger sits flush with the last visible segment -- no
      // whitespace inside the group when there's room for the full
      // toolbar, and seamless growth/shrink as the parent resizes.
      // Falls back to the root when the component is detached.
      boundary: this._element.parentElement ?? this._element,
      getItems: () => {
        const out: { id: string; el: HTMLElement }[] = [];
        for (let i = 0; i < this._options.items.length; i++) {
          const itemEl = this._childElements[i];
          if (itemEl) out.push({ id: this._options.items[i].value, el: itemEl });
        }
        return out;
      },
      getTriggerWidth: () => this._overflowTriggerEl?.offsetWidth ?? 0,
      getPromotedId: () =>
        !this._options.isMultiSelect && typeof this._options.value === 'string'
          ? this._options.value
          : null,
      onChange: (hidden) => {
        this._hiddenValues = hidden;

        // Toggle visibility of the trigger -- the manager doesn't own it,
        // so we hide it when nothing's hidden.
        if (this._overflowTriggerEl) {
          const hasHidden = hidden.size > 0;
          this._overflowTriggerEl.style.display = hasHidden ? '' : 'none';
          if (hasHidden) {
            this._overflowTriggerEl.removeAttribute('aria-hidden');
          } else {
            this._overflowTriggerEl.setAttribute('aria-hidden', 'true');
          }
        }

        // Sync hidden items' tabindex so keyboard nav skips them.
        for (let i = 0; i < this._options.items.length; i++) {
          if (this._hiddenValues.has(this._options.items[i].value)) {
            const itemEl = this._childElements[i];
            if (itemEl) itemEl.tabIndex = -1;
          }
        }

        this._syncRovingTabindex();
        this._setupArrowNav();
        this._updateOverflowMenuItems();

        // Re-sync the sliding indicator: when overflow visibility shifts
        // (parent resized, items entering or leaving the flow) the active
        // button's offsetLeft moves but its width doesn't, so the
        // ResizeObserver attached to it never fires. Recompute here so the
        // indicator tracks the active segment to its new position.
        this._updateIndicator();
      },
    });
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: true, detail })
    );
  }

  // -- Public API ---------------------------------------------------------

  value(): string | string[] | null;
  value(newValue: string | string[] | null): void;
  value(newValue?: string | string[] | null): string | string[] | null | void {
    if (newValue === undefined) return this._options.value;

    if (!this._element) return;

    const previousValue = this._options.value;
    this._options.value = newValue;
    this._syncActiveStates();
    this._syncRovingTabindex();
    this._updateIndicator();

    this._overflowMgr?.refresh();
    this._updateOverflowMenuItems();

    const detail: ButtonGroupChangeDetail = {
      value: newValue,
      previousValue,
    };
    this._dispatchEvent('btn-grp:change', detail);
    this._options.onChange?.(detail);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;

    if (!this._element) return;
    this._options.isDisabled = state;
    this._element.classList.toggle('is-disabled', state);

    for (const btn of this._childButtons) {
      btn.disabled(state);
    }
    this._overflowTrigger?.disabled(state);
    this._overflowMenu?.disabled(state);
  }

  setVariant(variant: string): void {
    if (!(ArvoButtonGroup.VARIANTS as readonly string[]).includes(variant)) return;

    const el = this._element;
    if (!el) return;

    ArvoButtonGroup.VARIANTS.forEach(v => el.classList.remove(`arvo-btn-grp--${v}`));
    el.classList.add(`arvo-btn-grp--${variant}`);
    this._options.variant = variant as RequiredGroupOptions['variant'];
  }

  setLoading(isLoading: boolean): void {
    if (!this._element) return;
    this._options.isLoading = isLoading;
    this._element.classList.toggle('loading', isLoading);

    if (isLoading) {
      this._element.setAttribute('aria-busy', 'true');
    } else {
      this._element.removeAttribute('aria-busy');
    }

    for (let i = 0; i < this._childButtons.length; i++) {
      const item = this._options.items[i];
      if (item?.isExcluded) continue;
      this._childButtons[i].setLoading(isLoading);
    }

    this._overflowTrigger?.setLoading(isLoading);
    this._overflowMenu?.setLoading(isLoading);
  }

  setItems(items: ButtonGroupItem[]): void {
    if (!this._element) return;

    this._element.removeEventListener('keydown', this._boundHandleKeydown);
    this._element.removeEventListener('click', this._boundHandleClick);

    this._options.items = items;
    this._options.value = this._options.isMultiSelect ? [] : null;
    this._destroyChildren();
    this._destroyOverflow();
    this._render();
    this._bindEvents();
  }

  focus(): void {
    const selectedIdx = this._childElements.findIndex(el => el.tabIndex === 0);
    if (selectedIdx !== -1) {
      this._childElements[selectedIdx].focus();
    }
  }

  destroy(): void {
    // Invalidate any in-flight `document.fonts.ready` measurement so
    // it short-circuits on the token check instead of touching a
    // detached DOM.
    this._labelMeasureToken++;

    this._arrowNav?.destroy();
    this._arrowNav = null;

    this._overflowMgr?.destroy();
    this._overflowMgr = null;

    this._indicatorResizeObs?.disconnect();
    this._indicatorResizeObs = null;
    this._indicatorEl?.remove();
    this._indicatorEl = null;

    this._destroyOverflow();
    this._destroyChildren();

    if (this._element) {
      this._element.removeEventListener('keydown', this._boundHandleKeydown);
      this._element.removeEventListener('click', this._boundHandleClick);

      this._element.textContent = '';
      this._element.removeAttribute('role');
      this._element.removeAttribute('aria-orientation');
      this._element.removeAttribute('aria-label');
      this._element.removeAttribute('aria-busy');
      this._element.className = '';
    }

    this._element = null;
  }

  private _destroyChildren(): void {
    for (const btn of this._childButtons) {
      btn.destroy();
    }
    this._childButtons = [];
    this._childElements = [];
  }

  private _destroyOverflow(): void {
    if (this._overflowMenu) {
      this._overflowMenu.destroy();
      this._overflowMenu = null;
    }
    if (this._overflowTrigger) {
      this._overflowTrigger.destroy();
      this._overflowTrigger = null;
    }
    if (this._overflowTriggerEl) {
      this._overflowTriggerEl.remove();
      this._overflowTriggerEl = null;
    }
    this._hiddenValues = new Set();
  }
}
