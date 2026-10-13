import { createArrowNav, filterItems, filterGroups } from '@arvo/core';
import type { ArrowNav, ListItemBase, ListGroup } from '@arvo/core';
import type { TitleTruncationHandle } from '@arvo/utils';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoSearch } from '../Search/Search';
import type { MenuSearchProp, MenuSearchConfig } from '../../types/menu-search';
import { normalizeSearch } from '../../types/menu-search';
import {
  isGroupedOptions,
  flattenOptions,
  renderOptionListBody,
} from '../../internal/option-list-render';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListboxOptionData extends ListItemBase {
  value: unknown;
}

export interface ArvoListboxOptions {
  items: ListboxOptionData[] | ListGroup<ListboxOptionData>[];
  value?: unknown | unknown[];
  /**
   * Uncontrolled initial selection. Only consulted when `value` is omitted.
   * For `isMultiple: true`, pass an array; for single-select, pass the
   * option value. Mirrors the React `defaultValue` prop.
   */
  defaultValue?: unknown | unknown[];
  label?: string;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isMultiple?: boolean;
  /** Enable search with defaults (`true`) or pass a config object. */
  search?: MenuSearchProp;
  isLoading?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  emptyMessage?: string;
  hasGroupDividers?: boolean;
  onChange?: (detail: { value: unknown; option: ListboxOptionData; isSelected: boolean }) => void;
  onHighlight?: (detail: { value: unknown; option: ListboxOptionData }) => void;
  onFilter?: (detail: { query: string; matchCount: number }) => void;
}

type RequiredListboxOptions = Required<
  Omit<ArvoListboxOptions, 'onChange' | 'onHighlight' | 'onFilter' | 'value' | 'search' | 'defaultValue' | 'contextHelp'>
> & {
  search: MenuSearchProp | undefined;
  value: unknown | unknown[] | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  onChange: ((detail: { value: unknown; option: ListboxOptionData; isSelected: boolean }) => void) | null;
  onHighlight: ((detail: { value: unknown; option: ListboxOptionData }) => void) | null;
  onFilter: ((detail: { query: string; matchCount: number }) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

const isGrouped = isGroupedOptions<ListboxOptionData>;
const flattenItems = flattenOptions<ListboxOptionData>;

const SKELETON_WIDTHS = [60, 67, 74, 81, 58];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoListbox {
  private _element: HTMLElement | null;
  private _options: RequiredListboxOptions;
  private _id: string;

  // DOM references
  private _listEl: HTMLDivElement | null = null;
  private _searchEl: HTMLDivElement | null = null;
  private _searchInstance: ArvoSearch | null = null;
  private _skeletonEl: HTMLDivElement | null = null;
  private _emptyEl: HTMLDivElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;

  private _searchCfg: MenuSearchConfig | null = null;

  // State
  private _selection: Set<unknown>;
  private _highlightedIndex = -1;
  private _flatOptions: ListboxOptionData[] = [];
  private _query = '';
  private _arrowNav: ArrowNav | null = null;
  private _optionEls: HTMLElement[] = [];
  private _truncationHandles: TitleTruncationHandle[] = [];

  static readonly DEFAULTS: RequiredListboxOptions = {
    items: [],
    value: null,
    label: '',
    contextHelp: null,
    isMultiple: false,
    search: undefined,
    isLoading: false,
    isDisabled: false,
    isRequired: false,
    emptyMessage: 'No options',
    hasGroupDividers: true,
    onChange: null,
    onHighlight: null,
    onFilter: null,
  };

  static initialize(element: HTMLElement, options: ArvoListboxOptions): ArvoListbox {
    return new ArvoListbox(element, options);
  }

  constructor(element: HTMLElement, options: ArvoListboxOptions) {
    this._element = element;
    this._id = `arvo-listbox-${++_idCounter}`;

    // Seed uncontrolled selection from `defaultValue` when `value` is omitted.
    const initialValue =
      options.value !== undefined
        ? (options.value ?? null)
        : (options.defaultValue !== undefined ? (options.defaultValue ?? null) : null);

    this._options = {
      ...ArvoListbox.DEFAULTS,
      ...options,
      value: initialValue,
      onChange: options.onChange ?? null,
      onHighlight: options.onHighlight ?? null,
      onFilter: options.onFilter ?? null,
    };


    this._searchCfg = normalizeSearch(
      this._options.search,
      { shortcut: '/' },
    );

    this._selection = this._initSelection(this._options.value);
    this._render();
    this._buildOptions();
    this._setupKeyboard();
  }

  // ---------------------------------------------------------------------------
  // Selection initialization
  // ---------------------------------------------------------------------------

  private _initSelection(value: unknown): Set<unknown> {
    if (value == null) return new Set();
    if (this._options.isMultiple && Array.isArray(value)) return new Set(value);
    return new Set([value]);
  }

  private _isSelected(optionValue: unknown): boolean {
    return this._selection.has(optionValue);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private _render(): void {
    const el = this._element;
    if (!el) return;

    this._applyClasses();

    // Label -- atomic ArvoFormLabel (defaults to 12px sm, matching React).
    if (this._options.label) {
      this._labelEl = ArvoFormLabel.initialize(null, {
        text: this._options.label,
        for: this._id,
        isRequired: this._options.isRequired,
        contextHelp: this._options.contextHelp,
      }).el as HTMLLabelElement;
      this._labelEl.id = `${this._id}-lbl`;
      this._labelEl.classList.add('arvo-listbox__lbl');
      el.appendChild(this._labelEl);
    }

    // Search (ArvoSearch component)
    if (this._searchCfg) {
      this._searchEl = document.createElement('div') as HTMLDivElement;
      const classes = ['arvo-listbox__search'];
      if (this._searchCfg.className) classes.push(this._searchCfg.className);
      this._searchEl.className = classes.join(' ');

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
        isDisabled: this._options.isDisabled,
        'aria-label': 'Filter options',
        onSearch: (value: string) => {
          this._handleFilterSearch(value);
        },
        onClear: () => {
          this._handleFilterClear();
        },
      });

      this._searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
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
            e.preventDefault();
            if (
              this._highlightedIndex >= 0 &&
              this._highlightedIndex < this._flatOptions.length
            ) {
              const item = this._flatOptions[this._highlightedIndex];
              if (!item.isDisabled) this._selectOption(item);
            }
            break;
        }
      });

      el.appendChild(this._searchEl);
    }

    // List container
    this._listEl = document.createElement('div');
    this._listEl.id = this._id;
    this._listEl.className = 'arvo-listbox__list';
    this._listEl.setAttribute('role', 'listbox');
    this._listEl.setAttribute('tabindex', this._options.isDisabled ? '-1' : '0');

    if (this._options.isMultiple) {
      this._listEl.setAttribute('aria-multiselectable', 'true');
    }
    if (this._labelEl) {
      this._listEl.setAttribute('aria-labelledby', `${this._id}-lbl`);
    }
    if (this._options.isLoading) {
      this._listEl.setAttribute('aria-busy', 'true');
    }
    if (this._options.isDisabled) {
      this._listEl.setAttribute('aria-disabled', 'true');
    }
    if (this._options.isRequired) {
      this._listEl.setAttribute('aria-required', 'true');
    }

    // Event delegation for clicks only. Hover on a listbox option must NOT
    // shift the highlighted/active index -- listbox is the inline, always-open
    // variant; hover-to-activate is reserved for overlay lists (select,
    // dropdown menu, action menu, combobox). Hover styling is purely visual
    // via the .arvo-listbox__opt:hover CSS rule.
    this._listEl.addEventListener('click', this._handleListClick);

    el.appendChild(this._listEl);
  }

  private _applyClasses(): void {
    const el = this._element;
    if (!el) return;

    el.className = [
      'arvo-listbox',
      this._options.isMultiple && 'arvo-listbox--multiple',
      this._searchCfg && 'arvo-listbox--searchable',
      this._options.isLoading && 'loading',
      this._options.isDisabled && 'is-disabled',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ---------------------------------------------------------------------------
  // Options rendering
  // ---------------------------------------------------------------------------

  private _buildOptions(): void {
    if (!this._listEl) return;

    // Remove previous option elements (keep list el structure clean)
    this._clearListContent();

    const filtered = this._getFilteredItems();
    this._flatOptions = flattenItems(filtered);
    this._optionEls = [];

    if (this._options.isLoading) {
      this._renderSkeleton();
      return;
    }

    if (this._flatOptions.length === 0) {
      this._renderEmpty();
      return;
    }

    this._emptyEl = null;
    this._skeletonEl = null;

    // Option rows are built by the shared renderer
    // (internal/option-list-render) so the inline Listbox and the floating
    // OptionList emit identical option DOM.
    // Tear down previous-render truncation handles before the renderer
    // wipes the list DOM, so their internal ResizeObservers don't leak
    // to detached nodes.
    for (const handle of this._truncationHandles) handle.destroy();
    this._truncationHandles = [];

    this._optionEls = renderOptionListBody<ListboxOptionData>(this._listEl, {
      block: 'arvo-listbox',
      filteredItems: filtered,
      groupIdPrefix: `${this._id}-grp`,
      hasGroupDividers: this._options.hasGroupDividers,
      optionId: (i) => `${this._id}-opt-${i}`,
      isSelected: (v) => this._isSelected(v),
      highlightedIndex: this._highlightedIndex,
      onTruncationHandle: (h) => this._truncationHandles.push(h),
    });

    // Set initial highlight
    const firstEnabled = this._flatOptions.findIndex(item => !item.isDisabled);
    if (firstEnabled >= 0) {
      this._highlightOption(firstEnabled, false);
    }

    this._arrowNav?.setItems(this._optionEls);
  }

  private _renderSkeleton(): void {
    this._skeletonEl = document.createElement('div');
    this._skeletonEl.className = 'arvo-listbox__skeleton';

    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'arvo-listbox__skeleton-row';

      const icon = document.createElement('div');
      icon.className = 'arvo-listbox__skeleton-icon';
      row.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'arvo-listbox__skeleton-text';
      text.style.width = `${SKELETON_WIDTHS[i]}%`;
      row.appendChild(text);

      this._skeletonEl.appendChild(row);
    }

    this._listEl!.appendChild(this._skeletonEl);
  }

  private _renderEmpty(): void {
    this._emptyEl = document.createElement('div');
    this._emptyEl.className = 'arvo-listbox__empty';
    this._emptyEl.setAttribute('role', 'status');
    this._emptyEl.textContent = this._options.emptyMessage;
    this._listEl!.appendChild(this._emptyEl);
  }

  private _clearListContent(): void {
    if (!this._listEl) return;
    this._listEl.textContent = '';
    this._optionEls = [];
    this._flatOptions = [];
    this._skeletonEl = null;
    this._emptyEl = null;
  }

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  private _getFilteredItems(): ListboxOptionData[] | ListGroup<ListboxOptionData>[] {
    if (!this._searchCfg || !this._query) return this._options.items;

    if (isGrouped(this._options.items)) {
      return filterGroups(this._options.items, { query: this._query });
    }
    return filterItems(this._options.items as ListboxOptionData[], { query: this._query });
  }

  // ---------------------------------------------------------------------------
  // Keyboard Setup
  // ---------------------------------------------------------------------------

  private _setupKeyboard(): void {
    if (!this._listEl) return;

    this._arrowNav = createArrowNav({
      items: this._optionEls,
      orientation: 'vertical',
      wrap: true,
      onNavigate: (_item: HTMLElement, index: number) => {
        this._highlightOption(index);
      },
      onSelect: (_item: HTMLElement, index: number) => {
        this._selectOption(this._flatOptions[index]);
      },
      skipDisabled: (index: number) => {
        return this._flatOptions[index]?.isDisabled === true;
      },
      typeAhead: {
        getLabel: (index: number) => this._flatOptions[index]?.label ?? '',
      },
    });

    this._listEl.addEventListener('keydown', this._handleKeyDown);
  }

  // ---------------------------------------------------------------------------
  // Event Handlers (arrow functions for stable `this`)
  // ---------------------------------------------------------------------------

  private _handleKeyDown = (e: KeyboardEvent): void => {
    if (this._options.isDisabled || this._options.isLoading) return;
    this._arrowNav?.handleKeyDown(e);
  };

  private _handleFilterSearch(value: string): void {
    this._query = value;
    this._highlightedIndex = -1;
    this._buildOptions();

    const matchCount = this._flatOptions.length;

    if (this._query) {
      const detail = { query: this._query, matchCount };
      this._searchCfg?.onFilter?.(this._query, matchCount);
      this._options.onFilter?.(detail);
      this._element?.dispatchEvent(
        new CustomEvent('listbox:filter', {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      );
    }

    this._updateSearchCounter();
  }

  private _handleFilterClear(): void {
    this._query = '';
    this._highlightedIndex = -1;
    this._buildOptions();
    this._searchCfg?.onClear?.();
    this._updateSearchCounter();
  }

  private _updateSearchCounter(): void {
    if (!this._searchCfg?.counter || !this._searchInstance) return;
    if (this._query) {
      const total = flattenItems(this._options.items).length;
      this._searchInstance.counter(this._flatOptions.length, total);
    } else {
      this._searchInstance.counter();
    }
  }

  private _handleListClick = (e: Event): void => {
    if (this._options.isDisabled || this._options.isLoading) return;

    const target = (e.target as HTMLElement).closest('.arvo-listbox__opt') as HTMLElement | null;
    if (!target) return;

    const indexStr = target.getAttribute('data-index');
    if (indexStr == null) return;

    const index = parseInt(indexStr, 10);
    const item = this._flatOptions[index];
    if (!item || item.isDisabled) return;

    this._highlightOption(index, false);
    this._selectOption(item);
  };

  // _handleListMouseOver intentionally removed -- hovering a listbox option
  // does not promote it to the keyboard-active item. Use the dropdown / action
  // menu hover pattern for that behavior.

  // ---------------------------------------------------------------------------
  // Highlight Logic
  // ---------------------------------------------------------------------------

  private _highlightOption(index: number, scroll = true): void {
    // Remove previous highlight
    if (this._highlightedIndex >= 0 && this._highlightedIndex < this._optionEls.length) {
      this._optionEls[this._highlightedIndex].classList.remove('highlighted');
    }

    this._highlightedIndex = index;

    if (index >= 0 && index < this._optionEls.length) {
      const el = this._optionEls[index];
      el.classList.add('highlighted');

      const optId = `${this._id}-opt-${index}`;
      this._listEl?.setAttribute('aria-activedescendant', optId);
      const searchInput = this._searchEl?.querySelector('input');
      searchInput?.setAttribute('aria-activedescendant', optId);

      if (scroll) {
        el.scrollIntoView({ block: 'nearest' });
      }

      // Fire highlight event and callback
      const option = this._flatOptions[index];
      if (option) {
        const detail = { value: option.value, option };

        this._options.onHighlight?.(detail);
        this._element?.dispatchEvent(
          new CustomEvent('listbox:highlight', {
            bubbles: true,
            cancelable: true,
            detail,
          }),
        );
      }
    } else {
      this._listEl?.removeAttribute('aria-activedescendant');
      const searchInput = this._searchEl?.querySelector('input');
      searchInput?.removeAttribute('aria-activedescendant');
    }
  }

  // ---------------------------------------------------------------------------
  // Selection Logic
  // ---------------------------------------------------------------------------

  private _selectOption(option: ListboxOptionData): void {
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
      // Update aria-selected on all visible options
      this._updateAriaSelected();
    } else {
      // Clear previous, set new
      this._selection.clear();
      this._selection.add(option.value);
      isSelected = true;
      this._updateAriaSelected();
    }

    const detail = {
      value: option.value,
      option,
      isSelected,
    };

    this._element?.dispatchEvent(
      new CustomEvent('listbox:change', {
        bubbles: true,
        cancelable: true,
        detail,
      }),
    );

    this._options.onChange?.(detail);
  }

  private _updateAriaSelected(): void {
    for (let i = 0; i < this._optionEls.length; i++) {
      const item = this._flatOptions[i];
      if (item) {
        const isSelected = this._isSelected(item.value);
        this._optionEls[i].setAttribute('aria-selected', String(isSelected));
        this._optionEls[i].classList.toggle('active', isSelected);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  value(newValue?: unknown | unknown[]): unknown | unknown[] | null | void {
    if (newValue === undefined) {
      if (this._options.isMultiple) {
        return Array.from(this._selection);
      }
      const vals = Array.from(this._selection);
      return vals.length > 0 ? vals[0] : null;
    }

    this._selection = this._initSelection(newValue);
    this._options.value = newValue;
    this._updateAriaSelected();
  }

  updateItems(items: ListboxOptionData[] | ListGroup<ListboxOptionData>[]): void {
    this._options.items = items;
    this._query = '';
    this._searchInstance?.clear();
    this._highlightedIndex = -1;
    this._buildOptions();
  }

  highlightOption(optValue: unknown): void {
    const index = this._flatOptions.findIndex(item => item.value === optValue);
    if (index >= 0) {
      this._highlightOption(index);
    }
  }

  getHighlightedOption(): { value: unknown; label: string } | null {
    if (
      this._highlightedIndex >= 0 &&
      this._highlightedIndex < this._flatOptions.length
    ) {
      const opt = this._flatOptions[this._highlightedIndex];
      return { value: opt.value, label: opt.label };
    }
    return null;
  }

  clear(): void {
    this._selection.clear();
    this._updateAriaSelected();
  }

  filter(query: string): void {
    this._query = query;
    this._searchInstance?.value(query);
    this._highlightedIndex = -1;
    this._buildOptions();

    if (query) {
      const detail = { query, matchCount: this._flatOptions.length };
      this._options.onFilter?.(detail);
      this._element?.dispatchEvent(
        new CustomEvent('listbox:filter', {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      );
    }
  }

  clearFilter(): void {
    this.filter('');
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;

    this._options.isDisabled = state;
    this._element?.classList.toggle('is-disabled', state);

    if (this._listEl) {
      this._listEl.setAttribute('tabindex', state ? '-1' : '0');
      if (state) {
        this._listEl.setAttribute('aria-disabled', 'true');
      } else {
        this._listEl.removeAttribute('aria-disabled');
      }
    }

    this._searchInstance?.disabled(state);
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;
    this._element?.classList.toggle('loading', isLoading);

    if (this._listEl) {
      if (isLoading) {
        this._listEl.setAttribute('aria-busy', 'true');
      } else {
        this._listEl.removeAttribute('aria-busy');
      }
    }

    this._buildOptions();
  }

  scrollToOption(optValue: unknown): void {
    const index = this._flatOptions.findIndex(item => item.value === optValue);
    if (index >= 0 && index < this._optionEls.length) {
      this._optionEls[index].scrollIntoView({ block: 'nearest' });
    }
  }

  destroy(): void {
    this._listEl?.removeEventListener('keydown', this._handleKeyDown);
    this._listEl?.removeEventListener('click', this._handleListClick);
    this._searchInstance?.destroy();
    this._searchInstance = null;

    this._arrowNav?.destroy();
    this._arrowNav = null;

    if (this._element) {
      this._element.textContent = '';
      this._element.className = '';
    }

    for (const handle of this._truncationHandles) handle.destroy();
    this._truncationHandles = [];

    this._element = null;
    this._listEl = null;
    this._searchEl = null;
    this._skeletonEl = null;
    this._emptyEl = null;
    this._labelEl = null;
    this._optionEls = [];
    this._flatOptions = [];
  }
}
