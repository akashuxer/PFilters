import {
  createOverlaySurface,
  createArrowNav,
  filterItems,
  filterGroups,
  type OverlaySurface,
  type ArrowNav,
  type ListItemBase,
  type ListGroup,
  type Placement,
} from '@arvo/core';
import type { TitleTruncationHandle } from '@arvo/utils';
import { ArvoSearch } from '../Search/Search';
import { ArvoIconButton, type ArvoIconButtonOptions } from '../IconButton/IconButton';
import {
  ArvoEmptyState,
  type ArvoEmptyStateOptions,
} from '../EmptyState/EmptyState';
import { ArvoCheckbox } from '../Checkbox/Checkbox';
import type { MenuSearchProp, MenuSearchConfig } from '../../types/menu-search';
import { normalizeSearch } from '../../types/menu-search';
import {
  flattenOptions,
  isGroupedOptions,
  renderOptionListBody,
} from '../../internal/option-list-render';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptionListItemData extends ListItemBase {
  value: unknown;
  /** Optional v2-only trailing actions. Actions do not select the row. */
  actions?: OptionListItemAction[];
}

export interface OptionListItemAction {
  id: string;
  icon: string;
  ariaLabel: string;
  isSelected?: boolean;
  onClick?: (item: OptionListItemData, event: Event, button: HTMLButtonElement) => void;
}

/**
 * Partial ArvoEmptyState configuration applied to the embedded empty-state
 * figure. Merged over the built-in defaults for the derived dataState
 * (`noData` / `noResults` / `noResults` + creatable). The figure always
 * renders at `size: 'sm'` and `orientation: 'vertical'`.
 */
export type OptionListEmptyConfig = Pick<
  ArvoEmptyStateOptions,
  'illustration' | 'title' | 'message' | 'secondaryAction'
>;

export interface ArvoOptionListV2ChangeDetail {
  value: unknown | unknown[];
  option: OptionListItemData | null;
  isSelected: boolean;
  action?: 'option' | 'select-all';
  affectedOptions?: OptionListItemData[];
}

export interface ArvoOptionListV2Options {
  items: OptionListItemData[] | ListGroup<OptionListItemData>[];
  /**
   * Visual layout for option rows. `standard` renders a 32px row with the
   * label (and optional leading icon). `rich` renders a 40px row with an
   * optional 24px avatar (or fallback icon) and a primary label stacked
   * over an optional secondary label. Defaults to `'standard'`.
   */
  variant?: 'standard' | 'rich';
  isMultiple?: boolean;
  /**
   * V2-only: render a batch control for the currently visible enabled rows.
   * Defaults to true in multiple-selection mode.
   */
  hasSelectAll?: boolean;
  /** V2-only: label for the batch control. Defaults to "Select all". */
  selectAllLabel?: string;
  /**
   * V2-only: maximum total selections. Select all respects the remaining
   * capacity instead of exceeding the field-level selection cap.
   */
  maxSelections?: number | null;
  value?: unknown | unknown[];
  defaultValue?: unknown | unknown[];
  search?: MenuSearchProp;
  hasGroupDividers?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  /**
   * When true and the active filter yields zero results, the noResults
   * empty state offers a `Create` action that fires `onCreate(query)` with
   * the current search value. Has no effect when there is no active query.
   */
  isCreatable?: boolean;
  /**
   * Override illustration, title, message, or secondaryAction on the
   * embedded ArvoEmptyState figure.
   */
  emptyConfig?: Partial<OptionListEmptyConfig>;
  /** Accessible name for the floating listbox. Defaults to "Options". */
  ariaLabel?: string;
  /**
   * Optional element to receive `aria-activedescendant` instead of the trigger.
   * Defaults to the trigger. Used by composed fields (e.g. MultiSelect) where
   * the trigger anchors positioning/ARIA but a nested editable input is the
   * focused element that must own `aria-activedescendant`. Mirrors React's
   * `activeDescendantRef`.
   */
  activeDescendantElement?: HTMLElement | null;
  /**
   * Optional element to receive the trigger-ARIA attributes
   * (`aria-haspopup`, `aria-controls`, `aria-expanded`) instead of the
   * trigger. Defaults to the trigger. Use when a composed field anchors
   * positioning + dismissal to a wrapper element but a nested element
   * (e.g. an editable `<input role="combobox">`) is the canonical ARIA
   * target per the WAI-ARIA pattern. `ArvoCombobox` is the canonical
   * consumer. Mirrors React's `triggerAriaRef`.
   */
  triggerAriaElement?: HTMLElement | null;
  placement?: Placement;
  width?: 'anchor' | number | string;
  maxHeight?: string;
  defaultOpen?: boolean;
  closeOnSelect?: boolean;
  /** Toggle the overlay when the trigger element is clicked. Default true. */
  bindTrigger?: boolean;
  /**
   * Whether ArrowDown past the last option (or ArrowUp past the first)
   * wraps to the other end. Defaults to true. Composed parents that
   * intentionally bound option navigation (e.g. ArvoMultiSelect) pass
   * false to clamp at the boundaries instead.
   */
  wrapNavigation?: boolean;
  onChange?: (detail: ArvoOptionListV2ChangeDetail) => void;
  /**
   * Called when the user activates the Create action in the noResults
   * empty state (only relevant when `isCreatable` is true and a search
   * query is active). Receives the current trimmed query value.
   */
  onCreate?: (value: string) => void;
  onOpenChange?: (isOpen: boolean) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
}

type RequiredOptionListOptions = Required<
  Omit<
    ArvoOptionListV2Options,
    | 'value'
    | 'defaultValue'
    | 'maxSelections'
    | 'search'
    | 'emptyConfig'
    | 'closeOnSelect'
    | 'onChange'
    | 'onCreate'
    | 'onOpenChange'
    | 'onOpen'
    | 'onClose'
  >
> & {
  value: unknown | unknown[] | null;
  maxSelections: number | null;
  search: MenuSearchProp | undefined;
  emptyConfig: Partial<OptionListEmptyConfig> | null;
  closeOnSelect: boolean | null;
  onChange: ArvoOptionListV2Options['onChange'] | null;
  onCreate: ArvoOptionListV2Options['onCreate'] | null;
  onOpenChange: ArvoOptionListV2Options['onOpenChange'] | null;
  onOpen: ArvoOptionListV2Options['onOpen'] | null;
  onClose: ArvoOptionListV2Options['onClose'] | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;
const isGrouped = isGroupedOptions<OptionListItemData>;
const flattenItems = flattenOptions<OptionListItemData>;
const SKELETON_WIDTHS = [60, 67, 74, 81, 58];
const SELECT_ALL_INDEX = -2;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoOptionListV2 {
  private _trigger: HTMLElement | null;
  private _options: RequiredOptionListOptions;
  private _id: string;

  private _panelEl: HTMLDivElement | null = null;
  private _scrollEl: HTMLDivElement | null = null;
  private _searchEl: HTMLDivElement | null = null;
  private _searchInstance: ArvoSearch | null = null;
  private _selectAllEl: HTMLDivElement | null = null;
  private _selectAllCheckboxHost: HTMLSpanElement | null = null;
  private _selectAllCheckbox: ArvoCheckbox | null = null;

  private _surface: OverlaySurface | null = null;
  private _arrowNav: ArrowNav | null = null;

  private _searchCfg: MenuSearchConfig | null = null;
  private _selection: Set<unknown>;
  private _flatOptions: OptionListItemData[] = [];
  private _optionEls: HTMLElement[] = [];
  private _highlightedIndex = -1;
  private _query = '';
  private _isOpen = false;
  private _emptyStateInstance: ArvoEmptyState | null = null;
  private _checkboxInstances: ArvoCheckbox[] = [];
  private _truncationHandles: TitleTruncationHandle[] = [];
  private _actionButtonInstances: ArvoIconButton[] = [];

  static readonly DEFAULTS: RequiredOptionListOptions = {
    items: [],
    variant: 'standard',
    isMultiple: false,
    hasSelectAll: true,
    selectAllLabel: 'Select all',
    maxSelections: null,
    value: null,
    search: undefined,
    hasGroupDividers: true,
    isDisabled: false,
    isLoading: false,
    isCreatable: false,
    emptyConfig: null,
    ariaLabel: 'Options',
    activeDescendantElement: null,
    triggerAriaElement: null,
    placement: 'bottom-start',
    width: 'anchor',
    maxHeight: '',
    defaultOpen: false,
    closeOnSelect: null,
    bindTrigger: true,
    wrapNavigation: true,
    onChange: null,
    onCreate: null,
    onOpenChange: null,
    onOpen: null,
    onClose: null,
  };

  static initialize(
    trigger: HTMLElement,
    options: ArvoOptionListV2Options,
  ): ArvoOptionListV2 {
    return new ArvoOptionListV2(trigger, options);
  }

  constructor(trigger: HTMLElement, options: ArvoOptionListV2Options) {
    this._trigger = trigger;
    this._id = `arvo-opt-list-${++_idCounter}`;

    const initialValue =
      options.value !== undefined
        ? (options.value ?? null)
        : options.defaultValue !== undefined
          ? (options.defaultValue ?? null)
          : null;

    this._options = {
      ...ArvoOptionListV2.DEFAULTS,
      ...options,
      value: initialValue,
      maxSelections: options.maxSelections ?? null,
      emptyConfig: options.emptyConfig ?? null,
      activeDescendantElement: options.activeDescendantElement ?? null,
      triggerAriaElement: options.triggerAriaElement ?? null,
      closeOnSelect: options.closeOnSelect ?? null,
      onChange: options.onChange ?? null,
      onCreate: options.onCreate ?? null,
      onOpenChange: options.onOpenChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
    };

    this._searchCfg = normalizeSearch(this._options.search, { shortcut: '/' });
    this._selection = this._initSelection(initialValue);

    this._render();
    this._setupSurface();
    this._setupKeyboard();
    this._buildOptions();
    this._bindTrigger();

    if (this._options.defaultOpen && !this._options.isDisabled) {
      this.open();
    }
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  private _initSelection(value: unknown): Set<unknown> {
    if (value == null) return new Set();
    if (this._options.isMultiple && Array.isArray(value)) return new Set(value);
    return new Set([value]);
  }

  private _isSelected(optionValue: unknown): boolean {
    return this._selection.has(optionValue);
  }

  private get _closeOnSelect(): boolean {
    return this._options.closeOnSelect ?? !this._options.isMultiple;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  private _render(): void {
    const panel = document.createElement('div');
    panel.id = this._id;
    panel.className = this._buildClasses();
    if (this._options.maxHeight) {
      panel.style.setProperty('--arvo-overlay-max-height', this._options.maxHeight);
    }

    if (this._searchCfg) {
      this._searchEl = document.createElement('div');
      this._searchEl.className = 'arvo-opt-list__search';
      const searchRoot = document.createElement('div');
      this._searchEl.appendChild(searchRoot);
      this._searchInstance = ArvoSearch.initialize(searchRoot, {
        variant: 'filter',
        placeholder: this._searchCfg.placeholder,
        searchMode: this._searchCfg.searchMode,
        minChars: this._searchCfg.minChars,
        isClearable: this._searchCfg.isClearable,
        shortcut: this._searchCfg.shortcut ?? null,
        errorMsg: this._searchCfg.errorMsg,
        errorDisplay: 'tooltip',
        'aria-label': 'Filter options',
        onSearch: (v: string) => this._handleFilterSearch(v),
        onClear: () => this._handleFilterClear(),
      });
      this._searchEl.addEventListener('keydown', this._handleSearchKeyDown);
      panel.appendChild(this._searchEl);
    }

    if (this._options.isMultiple && this._options.hasSelectAll) {
      this._selectAllEl = document.createElement('div');
      this._selectAllEl.className = 'arvo-opt-list__select-all';
      this._selectAllEl.addEventListener('mousedown', this._handleSelectAllMouseDown);
      this._selectAllEl.addEventListener('click', this._handleSelectAllClick);
      this._selectAllEl.addEventListener('keydown', this._handleSelectAllKeyDown);
      this._selectAllCheckboxHost = document.createElement('span');
      this._selectAllEl.appendChild(this._selectAllCheckboxHost);
      this._selectAllCheckbox = ArvoCheckbox.initialize(this._selectAllCheckboxHost, {
        size: 'lg',
        label: this._options.selectAllLabel,
        isDisabled: this._options.isDisabled || this._options.isLoading,
      });
      this._selectAllEl.id = `${this._id}-select-all`;
      this._selectAllEl.setAttribute('role', 'checkbox');
      this._selectAllEl.setAttribute('aria-label', this._options.selectAllLabel);
      this._selectAllEl
        .querySelector<HTMLInputElement>('input[type="checkbox"]')
        ?.setAttribute('tabindex', '-1');
      panel.appendChild(this._selectAllEl);
    }

    this._scrollEl = document.createElement('div');
    this._scrollEl.className = 'arvo-opt-list__scroll';
    this._scrollEl.id = `${this._id}-listbox`;
    this._scrollEl.setAttribute('role', 'listbox');
    this._scrollEl.setAttribute('aria-label', this._options.ariaLabel);
    if (this._options.isMultiple) {
      this._scrollEl.setAttribute('aria-multiselectable', 'true');
    }
    if (this._options.isLoading) {
      this._scrollEl.setAttribute('aria-busy', 'true');
    }
    this._scrollEl.addEventListener('click', this._handleListClick);
    this._scrollEl.addEventListener('mousedown', this._handleListMouseDown);
    this._scrollEl.addEventListener('mouseover', this._handleListMouseOver);
    panel.appendChild(this._scrollEl);

    document.body.appendChild(panel);
    this._panelEl = panel;
  }

  private _buildClasses(): string {
    return [
      'arvo-opt-list',
      this._options.variant === 'rich' && 'arvo-opt-list--rich',
      this._options.isMultiple && 'arvo-opt-list--multiple',
      this._searchCfg && 'arvo-opt-list--searchable',
      this._options.isLoading && 'loading',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private _setupSurface(): void {
    if (!this._panelEl || !this._trigger) return;
    this._surface = createOverlaySurface({
      id: this._id,
      surface: this._panelEl,
      type: 'dropdown',
      priority: 20,
      trigger: this._trigger,
      position: { placement: this._options.placement, gap: 4, width: this._options.width },
      focus: { mode: 'none' },
      closeOnOutside: true,
      transition: 'fade',
      triggerAria: {
        haspopup: 'listbox',
        controls: `${this._id}-listbox`,
        // Redirect haspopup / controls / expanded to a nested element when
        // the consumer provides one (e.g. ArvoCombobox sends the inner
        // <input role="combobox">). When null the engine falls back to the
        // trigger automatically.
        element: this._options.triggerAriaElement,
      },
      onClose: () => this._afterClose(),
    });
  }

  // -------------------------------------------------------------------------
  // Options
  // -------------------------------------------------------------------------

  private _getFiltered(): OptionListItemData[] | ListGroup<OptionListItemData>[] {
    if (!this._searchCfg || !this._query) return this._options.items;
    if (isGrouped(this._options.items)) {
      return filterGroups(this._options.items, { query: this._query });
    }
    return filterItems(this._options.items as OptionListItemData[], { query: this._query });
  }

  private _teardownTransientInstances(): void {
    this._emptyStateInstance?.destroy();
    this._emptyStateInstance = null;
    for (const cb of this._checkboxInstances) cb.destroy();
    this._checkboxInstances = [];
    for (const handle of this._truncationHandles) handle.destroy();
    this._truncationHandles = [];
    for (const instance of this._actionButtonInstances) instance.destroy();
    this._actionButtonInstances = [];
  }

  private _buildOptions(): void {
    if (!this._scrollEl) return;
    this._teardownTransientInstances();
    this._scrollEl.textContent = '';
    this._optionEls = [];

    const filtered = this._getFiltered();
    this._flatOptions = flattenItems(filtered);

    if (this._options.isLoading) {
      this._renderSkeleton();
      this._arrowNav?.setItems(this._navItems());
      this._syncSelectAllState();
      return;
    }

    if (this._flatOptions.length === 0) {
      this._renderEmptyState();
      this._arrowNav?.setItems(this._navItems());
      this._syncSelectAllState();
      return;
    }

    this._optionEls = renderOptionListBody<OptionListItemData>(this._scrollEl, {
      block: 'arvo-opt-list',
      filteredItems: filtered,
      groupIdPrefix: `${this._id}-grp`,
      hasGroupDividers: this._options.hasGroupDividers,
      optionId: (i) => `${this._id}-opt-${i}`,
      isSelected: (v) => this._isSelected(v),
      highlightedIndex: this._highlightedIndex,
      variant: this._options.variant,
      selectionMode: this._options.isMultiple ? 'multiple' : 'single',
      onCheckbox: (cb) => this._checkboxInstances.push(cb),
      onTruncationHandle: (h) => this._truncationHandles.push(h),
    });
    this._renderItemActions();

    this._arrowNav?.setItems(this._navItems());
    const firstEnabled = this._flatOptions.findIndex((o) => !o.isDisabled);
    if (firstEnabled >= 0) this._highlightOption(firstEnabled, false);
    this._syncSelectAllState();
  }

  private _renderItemActions(): void {
    // Row actions are intentionally single-select only. Multi-select owns its
    // row interaction through checkboxes and select-all, so stars/pins must
    // never appear in that list.
    if (this._options.isMultiple) return;
    for (let index = 0; index < this._flatOptions.length; index++) {
      const item = this._flatOptions[index];
      if (!item.actions?.length) continue;
      const row = this._optionEls[index];
      if (!row) continue;
      row.classList.add('arvo-opt-list__opt--has-actions');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      const actions = document.createElement('span');
      actions.className = 'arvo-opt-list__actions';
      actions.style.display = 'inline-flex';
      actions.style.alignItems = 'center';
      actions.style.marginInlineStart = 'auto';
      actions.addEventListener('mousedown', (event) => event.preventDefault());
      for (const action of item.actions) {
        const button = document.createElement('button');
        const buttonOptions: ArvoIconButtonOptions = {
          variant: 'tertiary',
          size: 'sm',
          icon: action.icon,
          tooltip: action.ariaLabel,
          isSelected: action.isSelected,
          onClick: (event) => {
            event.stopPropagation();
            action.onClick?.(item, event, button);
          },
        };
        const instance = ArvoIconButton.initialize(button, buttonOptions);
        this._actionButtonInstances.push(instance);
        actions.appendChild(button);
      }
      row.appendChild(actions);
    }
  }

  private _renderEmptyState(): void {
    if (!this._scrollEl) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'arvo-opt-list__empty';

    const trimmed = this._query.trim();
    const isFilterActive = !!this._searchCfg && !!trimmed;
    const totalCount = flattenItems(this._options.items).length;
    const hasAnyItems = totalCount > 0;

    let baseOpts: ArvoEmptyStateOptions;
    if (isFilterActive && this._options.isCreatable) {
      baseOpts = {
        size: 'sm',
        orientation: 'vertical',
        illustration: 'no-tasks',
        title: 'No results found',
        message: `Do you want to add new item "${trimmed}"`,
        secondaryAction: {
          label: 'Create',
          icon: 'plus',
          onClick: () => this._handleCreate(),
        },
      };
    } else if (isFilterActive) {
      baseOpts = {
        size: 'sm',
        orientation: 'vertical',
        illustration: 'no-results',
        title: 'No results found',
        message: 'Adjust your search query',
        secondaryAction: {
          label: 'Clear search',
          onClick: () => this._handleFilterClear(),
        },
      };
    } else if (!hasAnyItems) {
      baseOpts = {
        size: 'sm',
        orientation: 'vertical',
        illustration: 'help',
        title: 'No data available yet',
        message: 'There are no values to display',
      };
    } else {
      // Defensive fallback: filter inactive AND items present yet flat list
      // is empty (unexpected). Render the noData visuals.
      baseOpts = {
        size: 'sm',
        orientation: 'vertical',
        illustration: 'help',
        title: 'No data available yet',
        message: 'There are no values to display',
      };
    }

    const cfg = this._options.emptyConfig ?? {};
    const emptyOpts: ArvoEmptyStateOptions = {
      ...baseOpts,
      ...(cfg.illustration !== undefined ? { illustration: cfg.illustration } : {}),
      ...(cfg.title !== undefined ? { title: cfg.title } : {}),
      ...(cfg.message !== undefined ? { message: cfg.message } : {}),
      ...(cfg.secondaryAction !== undefined
        ? { secondaryAction: cfg.secondaryAction }
        : {}),
      // Force-reapply size + orientation in case emptyConfig spread above
      // overrode them via a wider type. The slot always renders compact.
      size: 'sm',
      orientation: 'vertical',
    };

    this._emptyStateInstance = ArvoEmptyState.create(emptyOpts);
    wrapper.appendChild(this._emptyStateInstance.el);
    this._scrollEl.appendChild(wrapper);
  }

  private _handleCreate(): void {
    const trimmed = this._query.trim();
    if (!this._options.isCreatable || !trimmed) return;
    const detail = { value: trimmed };
    this._options.onCreate?.(trimmed);
    this._dispatch('option-list:create', detail);
  }

  private _renderSkeleton(): void {
    if (!this._scrollEl) return;
    const wrap = document.createElement('div');
    wrap.className = 'arvo-opt-list__skeleton';
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'arvo-opt-list__skeleton-row';
      const icon = document.createElement('div');
      icon.className = 'arvo-opt-list__skeleton-icon';
      row.appendChild(icon);
      const text = document.createElement('div');
      text.className = 'arvo-opt-list__skeleton-text';
      text.style.width = `${SKELETON_WIDTHS[i]}%`;
      row.appendChild(text);
      wrap.appendChild(row);
    }
    this._scrollEl.appendChild(wrap);
  }

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  private _setupKeyboard(): void {
    // Only enable type-ahead when keystrokes target the trigger itself (e.g.
    // ArvoSelect's role="combobox" div). When `activeDescendantElement` is
    // set, the focused element is a separate editable input that owns the
    // user's typed text (e.g. ArvoMultiSelect's filter input); in that mode
    // type-ahead would `preventDefault()` every printable character before it
    // could reach the input. Mirrors ArvoCombobox._setupArrowNav.
    const hasExternalInput = !!this._options.activeDescendantElement;
    this._arrowNav = createArrowNav({
      items: this._navItems(),
      orientation: 'vertical',
      wrap: this._options.wrapNavigation,
      onNavigate: (_el, index) => this._highlightNavItem(index),
      onSelect: (_el, index) => this._selectNavItem(index),
      skipDisabled: (index) => this._isNavItemDisabled(index),
      ...(hasExternalInput
        ? {}
        : {
            typeAhead: {
              getLabel: (index) => this._navItemLabel(index),
            },
          }),
    });
  }

  private _handleTriggerKeyDown = (e: KeyboardEvent): void => {
    if (this._options.isDisabled || this._options.isLoading) return;
    if (!this._isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.open();
      }
      return;
    }
    this._arrowNav?.handleKeyDown(e);
  };

  private _handleSearchKeyDown = (e: KeyboardEvent): void => {
    if (this._options.isDisabled || this._options.isLoading) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End':
        e.preventDefault();
        this._arrowNav?.handleKeyDown(e);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._selectHighlightedItem();
        break;
    }
  };

  private _handleListClick = (e: Event): void => {
    if (this._options.isDisabled || this._options.isLoading) return;
    const target = (e.target as HTMLElement).closest('.arvo-opt-list__opt') as HTMLElement | null;
    if (!target) return;
    const indexStr = target.getAttribute('data-index');
    if (indexStr == null) return;
    const index = parseInt(indexStr, 10);
    const item = this._flatOptions[index];
    if (!item || item.isDisabled) return;
    this._highlightOption(index, false);
    this._selectOption(item);
  };

  private _handleListMouseDown = (e: Event): void => {
    // Keep focus on the trigger (activedescendant model).
    e.preventDefault();
  };

  private _handleListMouseOver = (e: Event): void => {
    const target = (e.target as HTMLElement).closest('.arvo-opt-list__opt') as HTMLElement | null;
    if (!target) return;
    const indexStr = target.getAttribute('data-index');
    if (indexStr == null) return;
    const index = parseInt(indexStr, 10);
    if (this._flatOptions[index] && !this._flatOptions[index].isDisabled) {
      this._highlightOption(index, false);
    }
  };

  private _handleSelectAllMouseDown = (e: Event): void => {
    // Keep focus on the trigger/input so the listbox activedescendant model
    // and MultiSelect keyboard handling stay unchanged.
    e.preventDefault();
  };

  private _handleSelectAllClick = (e: Event): void => {
    e.preventDefault();
    this._highlightOption(SELECT_ALL_INDEX, false);
    this._toggleVisibleSelection();
    this._restoreCompositeFocus();
  };

  private _handleSelectAllKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    this._highlightOption(SELECT_ALL_INDEX, false);
    this._toggleVisibleSelection();
    this._restoreCompositeFocus();
  };

  private _navItems(): HTMLElement[] {
    return this._selectAllEl ? [this._selectAllEl, ...this._optionEls] : this._optionEls;
  }

  private _optionIndexFromNavIndex(index: number): number {
    return this._selectAllEl ? index - 1 : index;
  }

  private _navIndexFromOptionIndex(index: number): number {
    return this._selectAllEl ? index + 1 : index;
  }

  private _isNavItemDisabled(index: number): boolean {
    if (this._selectAllEl && index === 0) {
      return this._selectAllEl.classList.contains('is-disabled');
    }
    return this._flatOptions[this._optionIndexFromNavIndex(index)]?.isDisabled === true;
  }

  private _navItemLabel(index: number): string {
    if (this._selectAllEl && index === 0) return this._options.selectAllLabel;
    return this._flatOptions[this._optionIndexFromNavIndex(index)]?.label ?? '';
  }

  private _highlightNavItem(index: number): void {
    if (this._selectAllEl && index === 0) {
      this._highlightOption(SELECT_ALL_INDEX);
      return;
    }
    this._highlightOption(this._optionIndexFromNavIndex(index));
  }

  private _selectNavItem(index: number): void {
    if (this._selectAllEl && index === 0) {
      this._highlightOption(SELECT_ALL_INDEX, false);
      this._toggleVisibleSelection();
      this._restoreCompositeFocus();
      return;
    }
    this._selectOption(this._flatOptions[this._optionIndexFromNavIndex(index)]);
  }

  private _selectHighlightedItem(): void {
    if (this._highlightedIndex === SELECT_ALL_INDEX) {
      this._toggleVisibleSelection();
      this._restoreCompositeFocus();
      return;
    }
    if (
      this._highlightedIndex >= 0 &&
      this._highlightedIndex < this._flatOptions.length
    ) {
      const item = this._flatOptions[this._highlightedIndex];
      if (!item.isDisabled) this._selectOption(item);
    }
  }

  private _highlightOption(index: number, scroll = true): void {
    this._selectAllEl?.classList.remove('highlighted');
    if (this._highlightedIndex >= 0 && this._highlightedIndex < this._optionEls.length) {
      this._optionEls[this._highlightedIndex].classList.remove('highlighted');
    }
    this._highlightedIndex = index;
    if (index === SELECT_ALL_INDEX && this._selectAllEl) {
      const optId = this._selectAllEl.id;
      this._selectAllEl.classList.add('highlighted');
      this._arrowNav?.setIndex(0);
      (this._options.activeDescendantElement ?? this._trigger)?.setAttribute(
        'aria-activedescendant',
        optId,
      );
      this._searchEl?.querySelector('input')?.setAttribute('aria-activedescendant', optId);
      if (scroll) this._selectAllEl.scrollIntoView({ block: 'nearest' });
      this._dispatch('option-list:highlight', {
        value: null,
        option: null,
        action: 'select-all',
      });
      return;
    }
    if (index >= 0 && index < this._optionEls.length) {
      const el = this._optionEls[index];
      el.classList.add('highlighted');
      this._arrowNav?.setIndex(this._navIndexFromOptionIndex(index));
      const optId = `${this._id}-opt-${index}`;
      (this._options.activeDescendantElement ?? this._trigger)?.setAttribute(
        'aria-activedescendant',
        optId,
      );
      this._searchEl?.querySelector('input')?.setAttribute('aria-activedescendant', optId);
      if (scroll) el.scrollIntoView({ block: 'nearest' });
      const option = this._flatOptions[index];
      if (option) {
        this._dispatch('option-list:highlight', { value: option.value, option });
      }
    } else {
      (this._options.activeDescendantElement ?? this._trigger)?.removeAttribute(
        'aria-activedescendant',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  private _selectOption(option: OptionListItemData | undefined): void {
    if (!option || option.isDisabled) return;
    let isSelected: boolean;
    if (this._options.isMultiple) {
      if (this._selection.has(option.value)) {
        this._selection.delete(option.value);
        isSelected = false;
      } else {
        this._selection.add(option.value);
        isSelected = true;
      }
      this._updateAriaSelected();
    } else {
      this._selection.clear();
      this._selection.add(option.value);
      isSelected = true;
      this._updateAriaSelected();
    }

    const value = this._options.isMultiple
      ? Array.from(this._selection)
      : option.value;
    const detail: ArvoOptionListV2ChangeDetail = { value, option, isSelected, action: 'option' };
    this._options.onChange?.(detail);
    this._dispatch('option-list:change', detail);

    if (this._closeOnSelect) this.close();
  }

  private _updateAriaSelected(): void {
    // The renderer (internal/option-list-render) suppresses `.active` on
    // multi-select rows so the leading checkbox is the sole selection
    // indicator. Mirror that rule here so post-click re-syncs do not
    // re-introduce the single-select left-border treatment.
    const isMulti = this._options.isMultiple;
    for (let i = 0; i < this._optionEls.length; i++) {
      const item = this._flatOptions[i];
      if (!item) continue;
      const selected = this._isSelected(item.value);
      const optEl = this._optionEls[i];
      optEl.setAttribute('aria-selected', String(selected));
      if (isMulti) {
        optEl.classList.remove('active');
        // Sync the embedded ArvoCheckbox visual + internal state so the
        // checkbox reflects the new selection. ArvoCheckbox.toggle(force)
        // no-ops when force === current state and silently early-returns
        // on disabled rows; the input fallback below guarantees the
        // visual stays in sync even for disabled rows reached via a
        // programmatic value() update.
        const cb = this._checkboxInstances[i];
        if (cb) {
          if (cb.disabled()) {
            const input = optEl.querySelector<HTMLInputElement>(
              'input[type="checkbox"]',
            );
            if (input) input.checked = selected;
          } else {
            cb.toggle(selected);
          }
        }
      } else {
        optEl.classList.toggle('active', selected);
      }
    }
    this._syncSelectAllState();
  }

  private _visibleEnabledOptions(): OptionListItemData[] {
    return this._flatOptions.filter((option) => option.isDisabled !== true);
  }

  private _selectAllState(): 'unchecked' | 'checked' | 'mixed' {
    const visible = this._visibleEnabledOptions();
    if (visible.length === 0) return 'unchecked';
    const selectedCount = visible.reduce(
      (count, option) => count + (this._selection.has(option.value) ? 1 : 0),
      0,
    );
    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === visible.length) return 'checked';
    return 'mixed';
  }

  private _syncSelectAllState(): void {
    if (!this._selectAllCheckbox || !this._selectAllEl) return;
    const state = this._selectAllState();
    const hasVisibleEnabled = this._visibleEnabledOptions().length > 0;
    const disabled = this._options.isDisabled || this._options.isLoading || !hasVisibleEnabled;
    this._selectAllEl.classList.toggle('is-disabled', disabled);
    this._selectAllEl.setAttribute('aria-disabled', String(disabled));
    this._selectAllEl.setAttribute(
      'aria-checked',
      state === 'mixed' ? 'mixed' : String(state === 'checked'),
    );
    this._selectAllCheckbox.disabled(false);
    this._selectAllCheckbox.toggle(state === 'checked');
    this._selectAllCheckbox.indeterminate(state === 'mixed');
    this._selectAllCheckbox.disabled(disabled);
  }

  private _restoreCompositeFocus(): void {
    const owner = this._options.activeDescendantElement ?? this._trigger;
    if (!owner || document.activeElement === owner) return;
    owner.focus({ preventScroll: true });
  }

  private _remainingSelectionCapacity(): number {
    const cap = this._options.maxSelections;
    if (typeof cap !== 'number') return Number.POSITIVE_INFINITY;
    return Math.max(0, cap - this._selection.size);
  }

  private _toggleVisibleSelection(): void {
    if (
      !this._options.isMultiple ||
      !this._options.hasSelectAll ||
      this._options.isDisabled ||
      this._options.isLoading
    ) {
      return;
    }

    const visible = this._visibleEnabledOptions();
    if (visible.length === 0) return;

    const keepSelectAllHighlighted = this._highlightedIndex === SELECT_ALL_INDEX;
    const state = this._selectAllState();
    const affectedOptions: OptionListItemData[] = [];
    let isSelected: boolean;

    if (state === 'checked') {
      for (const option of visible) {
        if (!this._selection.has(option.value)) continue;
        this._selection.delete(option.value);
        affectedOptions.push(option);
      }
      isSelected = false;
    } else {
      let remaining = this._remainingSelectionCapacity();
      for (const option of visible) {
        if (this._selection.has(option.value)) continue;
        if (remaining <= 0) break;
        this._selection.add(option.value);
        affectedOptions.push(option);
        remaining -= 1;
      }
      isSelected = true;
    }

    if (affectedOptions.length === 0) {
      this._syncSelectAllState();
      if (keepSelectAllHighlighted) this._highlightOption(SELECT_ALL_INDEX, false);
      return;
    }

    this._updateAriaSelected();
    if (keepSelectAllHighlighted) this._highlightOption(SELECT_ALL_INDEX, false);
    const value = Array.from(this._selection);
    const detail: ArvoOptionListV2ChangeDetail = {
      value,
      option: null,
      isSelected,
      action: 'select-all',
      affectedOptions,
    };
    this._options.onChange?.(detail);
    this._dispatch('option-list:change', detail);
  }

  // -------------------------------------------------------------------------
  // Filter
  // -------------------------------------------------------------------------

  private _handleFilterSearch(value: string): void {
    this._query = value;
    this._highlightedIndex = -1;
    this._buildOptions();
    if (this._query) {
      const detail = { query: this._query, matchCount: this._flatOptions.length };
      this._searchCfg?.onFilter?.(this._query, this._flatOptions.length);
      this._dispatch('option-list:filter', detail);
    }
    this._updateSearchCounter();
    this._surface?.reposition();
  }

  private _handleFilterClear(): void {
    this._query = '';
    this._highlightedIndex = -1;
    this._buildOptions();
    this._searchCfg?.onClear?.();
    this._updateSearchCounter();
    this._surface?.reposition();
  }

  private _updateSearchCounter(): void {
    if (!this._searchCfg?.counter || !this._searchInstance) return;
    if (this._query) {
      this._searchInstance.counter(this._flatOptions.length, flattenItems(this._options.items).length);
    } else {
      this._searchInstance.counter();
    }
  }

  // -------------------------------------------------------------------------
  // Trigger binding
  // -------------------------------------------------------------------------

  private _bindTrigger(): void {
    if (!this._trigger) return;
    this._trigger.addEventListener('keydown', this._handleTriggerKeyDown);
    if (this._options.bindTrigger) {
      this._trigger.addEventListener('click', this._handleTriggerClick);
    }
  }

  private _handleTriggerClick = (): void => {
    if (this._options.isDisabled || this._options.isLoading) return;
    this.toggle();
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  open(): void {
    if (this._isOpen || this._options.isDisabled) return;
    if (this._options.onOpen?.() === false) return;
    this._isOpen = true;
    void this._surface?.open();
    this._options.onOpenChange?.(true);
    this._dispatch('option-list:open');
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._options.onClose?.() === false) return;
    this._isOpen = false;
    void this._surface?.close();
    this._options.onOpenChange?.(false);
    this._dispatch('option-list:close');
  }

  private _afterClose(): void {
    // Engine-driven close (outside click / Escape). Sync internal state.
    if (this._isOpen) {
      this._isOpen = false;
      this._options.onOpenChange?.(false);
      this._dispatch('option-list:close');
    }
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  toggle(force?: boolean): void {
    const next = force ?? !this._isOpen;
    if (next) this.open();
    else this.close();
  }

  value(newValue?: unknown | unknown[]): unknown | unknown[] | null | void {
    if (newValue === undefined) {
      if (this._options.isMultiple) return Array.from(this._selection);
      const vals = Array.from(this._selection);
      return vals.length > 0 ? vals[0] : null;
    }
    this._selection = this._initSelection(newValue);
    this._options.value = newValue;
    this._updateAriaSelected();
  }

  setItems(items: OptionListItemData[] | ListGroup<OptionListItemData>[]): void {
    this._options.items = items;
    this._query = '';
    this._searchInstance?.clear();
    this._highlightedIndex = -1;
    this._buildOptions();
    this._surface?.reposition();
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;
    this._panelEl?.classList.toggle('loading', isLoading);
    if (isLoading) this._scrollEl?.setAttribute('aria-busy', 'true');
    else this._scrollEl?.removeAttribute('aria-busy');
    this._buildOptions();
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;
    this._options.isDisabled = state;
    if (state && this._isOpen) this.close();
    this._syncSelectAllState();
  }

  destroy(): void {
    this._teardownTransientInstances();
    this._surface?.destroy();
    this._surface = null;
    this._arrowNav?.destroy();
    this._arrowNav = null;
    this._searchInstance?.destroy();
    this._searchInstance = null;
    this._selectAllCheckbox?.destroy();
    this._selectAllCheckbox = null;

    if (this._trigger) {
      this._trigger.removeEventListener('keydown', this._handleTriggerKeyDown);
      this._trigger.removeEventListener('click', this._handleTriggerClick);
      (this._options.activeDescendantElement ?? this._trigger).removeAttribute(
        'aria-activedescendant',
      );
    }
    this._searchEl?.removeEventListener('keydown', this._handleSearchKeyDown);
    this._selectAllEl?.removeEventListener('mousedown', this._handleSelectAllMouseDown);
    this._selectAllEl?.removeEventListener('click', this._handleSelectAllClick);
    this._selectAllEl?.removeEventListener('keydown', this._handleSelectAllKeyDown);
    this._scrollEl?.removeEventListener('click', this._handleListClick);
    this._scrollEl?.removeEventListener('mousedown', this._handleListMouseDown);
    this._scrollEl?.removeEventListener('mouseover', this._handleListMouseOver);

    this._panelEl?.remove();
    this._panelEl = null;
    this._scrollEl = null;
    this._searchEl = null;
    this._selectAllEl = null;
    this._selectAllCheckboxHost = null;
    this._trigger = null;
    this._optionEls = [];
    this._flatOptions = [];
  }

  private _dispatch(name: string, detail: object = {}): void {
    this._trigger?.dispatchEvent(
      new CustomEvent(name, { bubbles: true, cancelable: true, detail }),
    );
  }
}
