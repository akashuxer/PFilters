import { filterItems, filterGroups, type ListItemBase, type ListGroup } from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import {
  ArvoChipList,
  type ArvoChipListOptions,
  type ArvoChipListItem,
} from '../ChipList/ChipList';
import { ArvoOptionList, type ArvoOptionListOptions } from '../OptionList/OptionList';
import { ArvoIconButton } from '../IconButton/IconButton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MultiSelectOverflowMode = 'expandable' | 'single-line' | 'wrap';

/** Inner ArvoChipList overflow mode (mirrors ArvoChipListOptions['overflowMode']). */
type ArvoChipListOverflowMode = 'none' | 'wrap' | 'single-line' | 'max-rows';

export interface MultiSelectOptionData extends ListItemBase {
  value: unknown;
}

/**
 * Scoped escape-hatch bag for inner `ArvoChipList` config the field does not
 * curate as a flat option. Mirrors React `MultiSelectChipListProps` exactly --
 * the drift reviewer enforces key-set parity.
 */
export type MultiSelectChipListProps = Pick<
  ArvoChipListOptions,
  'overflowLabel' | 'overflowAriaLabel' | 'isReorderable' | 'onReorder'
>;

/**
 * Scoped escape-hatch bag for inner `ArvoOptionList` config the field does not
 * curate as a flat option. Mirrors React `MultiSelectOptionListProps` exactly --
 * the drift reviewer enforces key-set parity.
 */
export type MultiSelectOptionListProps = Pick<
  ArvoOptionListOptions,
  'emptyConfig' | 'variant' | 'isCreatable' | 'onCreate'
>;

export interface ArvoMultiSelectOptions {
  /** Options as a flat array or grouped array. Required. */
  items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[];
  /** Controlled/initial selected value set. Update after init via value(). */
  value?: unknown[];
  /** Uncontrolled initial value set. Used only when value is omitted. */
  defaultValue?: unknown[];
  /** Controlled filter text. Update after init via inputValue(). */
  inputValue?: string;
  /** Placeholder text shown in the input when there are no selected chips. */
  placeholder?: string;
  /** Label text rendered above the field via ArvoFormLabel. */
  label?: string;
  /**
   * Optional contextual-help icon attached to the field label. When provided,
   * embeds an `ArvoContextHelp` at `size: 'sm'` (14px) absolutely positioned
   * to the right of the label. Has no effect when `label` is omitted.
   */
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  /** Prevents all interaction. Propagates to the inner chips and dropdown. */
  isDisabled?: boolean;
  /** Marks the field as required. */
  isRequired?: boolean;
  /** Shows error/invalid styling (negative bottom border). */
  isInvalid?: boolean;
  /** Error message shown when isInvalid is true. */
  errorMsg?: string;
  /** How validation error feedback is presented. */
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  /** Shows a clear-all button when the value set is non-empty and interactive. */
  isClearable?: boolean;
  /** Shows the Pattern C loading state (spinner replaces chevron, panel blocked). */
  isLoading?: boolean;
  /** Read-only: chips visible but not removable, no typing, panel does not open. */
  isReadOnly?: boolean;
  /** CSS width value (e.g. '200px', '50%'). Sets --arvo-form-input-width. */
  width?: string;
  /** Shorthand for width='100%'. Takes precedence over width. */
  isFullWidth?: boolean;
  /**
   * Visual fill of the token field. `'filled'` (default) renders the tinted
   * field background. `'base'` swaps to the host surface color so the field
   * reads as a flat extension of its parent (toolbars, side panels, table
   * cells, inline-edit rows). Only the at-rest field background changes;
   * hover, focus, disabled, readonly, error, text, border, and icon colors
   * are identical across both surfaces.
   */
  surface?: 'filled' | 'base';
  /** How selected chips overflow inside the field. */
  overflowMode?: MultiSelectOverflowMode;
  /** Maximum chip rows in collapsed state (overflowMode='expandable'). */
  maxRows?: number;
  /** Maximum chip rows when expanded before scrolling. */
  expandedMaxRows?: number;
  /** Controlled chip-overflow expanded state. Drive after init via expanded(). */
  isExpanded?: boolean;
  /** Uncontrolled initial expanded state. */
  defaultExpanded?: boolean;
  /** Visual appearance applied to the selected-value ArvoChips. */
  chipAppearance?: 'primary' | 'outline' | 'utility';
  /** Optional cap on the number of selected values. null = unlimited. */
  maxSelections?: number;
  /** Preferred placement of the dropdown relative to the field. */
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  /** Maximum height of the dropdown panel (CSS length). */
  maxHeight?: string;
  /** When true and items are grouped, renders dividers between groups. */
  hasGroupDividers?: boolean;
  /** Custom filter function: (item, query) => boolean. */
  filterFn?: (item: MultiSelectOptionData, query: string) => boolean;
  /** Whether selecting an option closes the panel. Defaults to false. */
  closeOnSelect?: boolean;
  /** Initial open state. Drive after init via open()/close()/toggle(). */
  isOpen?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Called when the selected value set changes. */
  onChange?: (
    value: unknown[],
    item: MultiSelectOptionData | null,
    isSelected: boolean,
  ) => void;
  /** Called on each keystroke in the filter input. */
  onInputChange?: (value: string) => void;
  /** Called when a single chip is dismissed (fires in addition to onChange). */
  onRemove?: (value: unknown, item: MultiSelectOptionData) => void;
  /** Called when all values are cleared via the clear-all button. */
  onClear?: (detail: { previousValue: unknown[] }) => void;
  /** Called before the panel opens. Return false to cancel. */
  onOpen?: () => boolean | void;
  /** Called before the panel closes. Return false to cancel. */
  onClose?: () => boolean | void;
  /** Called after the open state changes. */
  onOpenChange?: (open: boolean) => void;
  /** Called after the chip-overflow expanded state changes. */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Scoped escape-hatch bag for inner `ArvoChipList` options the field does
   * not curate flat. Spread first so the field's flat / computed options always
   * win on overlap.
   */
  chipListProps?: MultiSelectChipListProps;
  /**
   * Scoped escape-hatch bag for inner `ArvoOptionList` options the field does
   * not curate flat. Spread first so the field's flat / computed options always
   * win on overlap.
   */
  optionListProps?: MultiSelectOptionListProps;
}

type RequiredMultiSelectOptions = Required<
  Omit<
    ArvoMultiSelectOptions,
    | 'onChange'
    | 'onInputChange'
    | 'onRemove'
    | 'onClear'
    | 'onOpen'
    | 'onClose'
    | 'onOpenChange'
    | 'onExpandedChange'
    | 'maxHeight'
    | 'errorMsg'
    | 'width'
    | 'filterFn'
    | 'chipListProps'
    | 'optionListProps'
    | 'maxSelections'
    | 'contextHelp'
    // Init-only seeds (controlled state & defaults).
    | 'value'
    | 'defaultValue'
    | 'inputValue'
    | 'isOpen'
    | 'defaultOpen'
    | 'isExpanded'
    | 'defaultExpanded'
  >
> & {
  width: string | null;
  maxHeight: string | null;
  errorMsg: string | null;
  maxSelections: number | null;
  filterFn: ((item: MultiSelectOptionData, query: string) => boolean) | null;
  chipListProps: MultiSelectChipListProps | null;
  optionListProps: MultiSelectOptionListProps | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  onChange: ((value: unknown[], item: MultiSelectOptionData | null, isSelected: boolean) => void) | null;
  onInputChange: ((value: string) => void) | null;
  onRemove: ((value: unknown, item: MultiSelectOptionData) => void) | null;
  onClear: ((detail: { previousValue: unknown[] }) => void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onOpenChange: ((open: boolean) => void) | null;
  onExpandedChange: ((expanded: boolean) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function isGrouped(
  items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[],
): items is ListGroup<MultiSelectOptionData>[] {
  return items.length > 0 && 'items' in items[0];
}

function flattenItems(
  items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[],
): MultiSelectOptionData[] {
  if (isGrouped(items)) {
    const result: MultiSelectOptionData[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as MultiSelectOptionData[];
}

/** Filter flat or grouped items by the query (custom filterFn or default substring). */
function applyFilter(
  items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[],
  query: string,
  filterFn?: ((item: MultiSelectOptionData, query: string) => boolean) | null,
): MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[] {
  if (!query) return items;
  if (filterFn) {
    if (isGrouped(items)) {
      const result: ListGroup<MultiSelectOptionData>[] = [];
      for (const group of items) {
        const filtered = group.items.filter((item) => filterFn(item, query));
        if (filtered.length > 0) result.push({ ...group, items: filtered });
      }
      return result;
    }
    return (items as MultiSelectOptionData[]).filter((item) => filterFn(item, query));
  }
  if (isGrouped(items)) return filterGroups(items, { query });
  return filterItems(items as MultiSelectOptionData[], { query });
}

/** Map unselected options to disabled when the maxSelections cap is reached. */
function applyMaxSelections(
  items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[],
  selected: unknown[],
): MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[] {
  const cap = (arr: MultiSelectOptionData[]) =>
    arr.map((it) => (selected.includes(it.value) ? it : { ...it, isDisabled: true }));
  if (isGrouped(items)) return items.map((g) => ({ ...g, items: cap(g.items) }));
  return cap(items as MultiSelectOptionData[]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoMultiSelect {
  private _element: HTMLElement | null;
  private _options: RequiredMultiSelectOptions;

  // DOM
  private _fieldEl: HTMLElement | null = null;
  private _valueEl: HTMLElement | null = null;
  private _chipsEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearEl: HTMLElement | null = null;
  private _sepEl: HTMLElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _borderEl: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _alertEl: HTMLElement | null = null;

  /**
   * Captured ref to the persistent ArvoDisclosureButton DOM element owned
   * by the inner ArvoChipList. Lets MultiSelect include the disclosure in
   * the active-descendant walk and programmatically activate it
   * (Enter/Space on the disclosure-as-active-descendant). Read freshly
   * after each chip-list rebuild.
   */
  private _overflowBtnEl: HTMLElement | null = null;

  // Inner composed components
  private _chipList: ArvoChipList | null = null;
  private _optionList: ArvoOptionList | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _chevronBtn: ArvoIconButton | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;

  // State
  private _isOpen = false;
  private _isDisabled = false;
  private _isLoading = false;
  private _isReadonly = false;
  private _value: unknown[] = [];
  private _inputText = '';
  private _isExpanded = false;
  private _id: string;

  // Active-descendant chip focus. `-1` = no chip is "focused"; arrow keys mutate
  // this to walk the visible chips while real DOM focus stays on the input.
  private _activeChipIndex = -1;

  // Bound handlers
  private _boundHandleFieldClick: (e: Event) => void;
  private _boundHandleFieldMouseDown: (e: Event) => void;
  private _boundHandleInputKeyDown: (e: KeyboardEvent) => void;
  private _boundHandleInputInput: (e: Event) => void;
  private _boundHandleInputFocus: (e: FocusEvent) => void;
  private _boundHandleInputBlur: (e: FocusEvent) => void;
  private _boundChipListDismiss: (e: Event) => void;

  static readonly DEFAULTS: RequiredMultiSelectOptions = {
    items: [],
    placeholder: '',
    label: '',
    contextHelp: null,
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
    errorMsg: null,
    errorDisplay: 'inline',
    isClearable: true,
    isLoading: false,
    isReadOnly: false,
    width: null,
    isFullWidth: false,
    surface: 'filled',
    overflowMode: 'expandable',
    maxRows: 3,
    expandedMaxRows: 5,
    chipAppearance: 'outline',
    maxSelections: null,
    placement: 'bottom-start',
    maxHeight: null,
    hasGroupDividers: true,
    filterFn: null,
    closeOnSelect: false,
    chipListProps: null,
    optionListProps: null,
    onChange: null,
    onInputChange: null,
    onRemove: null,
    onClear: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
    onExpandedChange: null,
  };

  static initialize(element: HTMLElement, options: ArvoMultiSelectOptions): ArvoMultiSelect {
    return new ArvoMultiSelect(element, options);
  }

  constructor(element: HTMLElement, options: ArvoMultiSelectOptions) {
    this._element = element;
    this._id = `arvo-multi-sel-${++_idCounter}`;

    this._options = {
      ...ArvoMultiSelect.DEFAULTS,
      ...options,
      items: options.items ?? [],
      width: options.width ?? null,
      maxHeight: options.maxHeight ?? null,
      errorMsg: options.errorMsg ?? null,
      maxSelections: options.maxSelections ?? null,
      filterFn: options.filterFn ?? null,
      chipListProps: options.chipListProps ?? null,
      optionListProps: options.optionListProps ?? null,
      contextHelp: options.contextHelp ?? null,
      onChange: options.onChange ?? null,
      onInputChange: options.onInputChange ?? null,
      onRemove: options.onRemove ?? null,
      onClear: options.onClear ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onOpenChange: options.onOpenChange ?? null,
      onExpandedChange: options.onExpandedChange ?? null,
    };

    this._isDisabled = this._options.isDisabled;
    this._isLoading = this._options.isLoading === true;
    this._isReadonly = this._options.isReadOnly;

    // Controlled value wins; otherwise fall back to uncontrolled defaultValue.
    this._value =
      options.value !== undefined ? options.value : (options.defaultValue ?? []);
    this._inputText =
      options.inputValue !== undefined ? options.inputValue : '';
    this._isExpanded =
      options.isExpanded !== undefined ? options.isExpanded : (options.defaultExpanded ?? false);

    this._boundHandleFieldClick = this._handleFieldClick.bind(this);
    this._boundHandleFieldMouseDown = this._handleFieldMouseDown.bind(this);
    this._boundHandleInputKeyDown = this._handleInputKeyDown.bind(this);
    this._boundHandleInputInput = this._handleInputInput.bind(this);
    this._boundHandleInputFocus = this._handleInputFocus.bind(this);
    this._boundHandleInputBlur = this._handleInputBlur.bind(this);
    this._boundChipListDismiss = (e: Event) => this._handleChipListDismiss(e);

    this._buildRoot();
    this._applyStyleVars();
    this._applyRootClasses();
    this._applyWidthStyle();
    this._setupOptionList();
    this._renderChips();
    this._refreshOptionListItems();

    // Initial open state. Controlled `isOpen` wins over `defaultOpen`.
    const initialOpen =
      options.isOpen !== undefined ? options.isOpen : (options.defaultOpen ?? false);
    if (initialOpen) this._doOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Root DOM Build
  // ---------------------------------------------------------------------------

  private _buildRoot(): void {
    const el = this._element!;

    // Label (ArvoFormLabel)
    if (this._options.label) {
      const lbl = ArvoFormLabel.initialize(null, {
        text: this._options.label,
        for: `${this._id}-input`,
        isRequired: this._options.isRequired,
        contextHelp: this._options.contextHelp,
      }).el as HTMLElement;
      lbl.id = `${this._id}-lbl`;
      lbl.classList.add('arvo-multi-sel__lbl');
      el.appendChild(lbl);
      this._labelEl = lbl;
    }

    // Field (role="combobox")
    this._fieldEl = document.createElement('div');
    this._fieldEl.id = `${this._id}-field`;
    this._fieldEl.className = 'arvo-multi-sel__field';
    this._fieldEl.setAttribute('role', 'combobox');
    this._fieldEl.setAttribute('aria-haspopup', 'listbox');
    this._fieldEl.setAttribute('aria-expanded', 'false');
    this._fieldEl.setAttribute('aria-autocomplete', 'list');
    if (this._options.isRequired) this._fieldEl.setAttribute('aria-required', 'true');
    if (this._options.isInvalid) this._fieldEl.setAttribute('aria-invalid', 'true');
    if (this._isDisabled) this._fieldEl.setAttribute('aria-disabled', 'true');
    if (this._isLoading) this._fieldEl.setAttribute('aria-busy', 'true');
    if (this._labelEl) {
      this._fieldEl.setAttribute('aria-labelledby', `${this._id}-lbl`);
    } else {
      // Fallback accessible name -- mirrors the React twin and keeps the
      // combobox trigger nameable without a visible label.
      this._fieldEl.setAttribute(
        'aria-label',
        this._options.placeholder || 'Select',
      );
    }
    this._fieldEl.addEventListener('click', this._boundHandleFieldClick);
    // Capture-phase mousedown that preserves input focus across clicks on
    // non-input children (chip body, chip dismiss, chip-list overflow
    // disclosure, action buttons). Without this, the browser would move
    // focus to the click target on mousedown -- the input blurs (clearing
    // typed text) and the active-descendant chip highlight is torn down.
    this._fieldEl.addEventListener('mousedown', this._boundHandleFieldMouseDown);
    // The inner ArvoChipList (when mounted on hasValue) re-emits chip:dismiss
    // as a bubbling chip-list:dismiss event, caught here so MultiSelect owns
    // value removal.
    this._fieldEl.addEventListener('chip-list:dismiss', this._boundChipListDismiss);

    // __value wrapper -- flex container that holds the chip-list (when
    // hasValue) and the native filter input. The chip-list shrinks to its
    // intrinsic content width (max-width: 100% in SCSS so it never overflows
    // __value); the input reserves a 6ch minimum and grows to fill the
    // remaining row. When the chip-list and input together can't fit on a
    // single row, the input wraps to row 2.
    this._valueEl = document.createElement('div');
    this._valueEl.className = 'arvo-multi-sel__value';
    this._fieldEl.appendChild(this._valueEl);

    // Filter text input -- sibling of the chip-list inside __value (NOT a
    // descendant of the chip-list). Always mounted; carries the single tab
    // stop. Appended to __value here so the input is always at the end of
    // the value flex flow; _renderChips() inserts the chip-list before this
    // input when there is at least one selected value.
    this._inputEl = document.createElement('input');
    this._inputEl.id = `${this._id}-input`;
    this._inputEl.type = 'text';
    this._inputEl.className = 'arvo-multi-sel__input';
    this._inputEl.placeholder = this._options.placeholder;
    this._inputEl.value = this._inputText;
    this._inputEl.autocomplete = 'off';
    this._inputEl.disabled = this._isDisabled;
    this._inputEl.readOnly = this._isReadonly || this._isLoading;
    this._inputEl.setAttribute('aria-autocomplete', 'list');
    if (this._labelEl) {
      this._inputEl.setAttribute('aria-labelledby', `${this._id}-lbl`);
    } else {
      this._inputEl.setAttribute(
        'aria-label',
        this._options.placeholder || 'Select',
      );
    }
    if (this._options.isRequired) this._inputEl.setAttribute('aria-required', 'true');
    if (this._options.isInvalid) this._inputEl.setAttribute('aria-invalid', 'true');
    if (this._isLoading) this._inputEl.setAttribute('aria-busy', 'true');
    this._inputEl.addEventListener('keydown', this._boundHandleInputKeyDown);
    this._inputEl.addEventListener('input', this._boundHandleInputInput);
    this._inputEl.addEventListener('focus', this._boundHandleInputFocus);
    this._inputEl.addEventListener('blur', this._boundHandleInputBlur);
    this._valueEl.appendChild(this._inputEl);

    // Error tooltip icon (ArvoMessageAlert isInline, errorDisplay='tooltip')
    if (this._options.errorDisplay === 'tooltip') {
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: this._options.errorMsg ?? null,
      });
      this._errIcoEl = this._errMsgAlert.el;
      this._errIcoEl.classList.add('arvo-multi-sel__err-ico');
      this._fieldEl.appendChild(this._errIcoEl);
    }

    // Actions cluster (clear + separator + chevron)
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-multi-sel__actions';

    // Clear-all button (ArvoIconButton). Rendered only when clearable; CSS gates
    // visibility on .has-value + interactive state. The separator pairs with it.
    if (this._options.isClearable) {
      this._clearEl = document.createElement('button');
      this._clearBtn = ArvoIconButton.initialize(this._clearEl as HTMLButtonElement, {
        variant: 'tertiary',
        size: 'xs',
        icon: 'close',
        tooltip: 'Clear all',
        isDisabled: this._isDisabled,
        onClick: (e: Event) => {
          e.stopPropagation();
          this._handleClearAll();
        },
      });
      this._clearEl.classList.add('arvo-multi-sel__clear');
      this._clearEl.setAttribute('tabindex', '-1');
      this._actionsEl.appendChild(this._clearEl);

      this._sepEl = document.createElement('span');
      this._sepEl.className = 'arvo-multi-sel__sep';
      this._sepEl.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(this._sepEl);
    }

    // Chevron toggle (ArvoIconButton, angle-down). Always rendered.
    this._icoEl = document.createElement('button');
    this._chevronBtn = ArvoIconButton.initialize(this._icoEl as HTMLButtonElement, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'angle-down',
      tooltip: 'Toggle options',
      isDisabled: this._isDisabled,
      onClick: (e: Event) => this._handleChevronClick(e),
    });
    this._icoEl.classList.add('arvo-multi-sel__ico');
    this._icoEl.setAttribute('tabindex', '-1');
    this._actionsEl.appendChild(this._icoEl);

    this._fieldEl.appendChild(this._actionsEl);

    // Animated bottom border
    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-multi-sel__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    // Inline error alert (errorDisplay='inline')
    if (
      this._options.isInvalid &&
      this._options.errorMsg &&
      this._options.errorDisplay === 'inline'
    ) {
      this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        message: this._options.errorMsg,
        id: `${this._id}-err`,
      });
      this._alertEl = this._inlineAlert.el;
      this._fieldEl.setAttribute('aria-describedby', `${this._id}-err`);
      el.appendChild(this._alertEl);
    }
  }

  // ---------------------------------------------------------------------------
  // Composed OptionList
  // ---------------------------------------------------------------------------

  private _setupOptionList(): void {
    if (!this._fieldEl || !this._inputEl) return;
    // Hybrid options: spread bag first so the field's flat/computed props win.
    const listOptions: ArvoOptionListOptions = {
      ...(this._options.optionListProps ?? undefined),
      items: this._processedItems(),
      isMultiple: true,
      value: this._value,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      isDisabled: this._isDisabled,
      ariaLabel: this._options.label || undefined,
      closeOnSelect: this._options.closeOnSelect,
      bindTrigger: false,
      // Bounded option navigation (no cycling) per the multi-select keyboard model.
      wrapNavigation: false,
      // The field (__field) is the positioning/ARIA anchor, but the editable
      // __input is the focus target, so aria-activedescendant lands on the input.
      activeDescendantElement: this._inputEl,
      onChange: (detail) => this._handleOptionChange(detail),
      onOpenChange: (open) => this._handleListOpenChange(open),
    };
    this._optionList = ArvoOptionList.initialize(this._fieldEl, listOptions);
  }

  // ---------------------------------------------------------------------------
  // Selection / filtering / overflow helpers
  // ---------------------------------------------------------------------------

  private _interactive(): boolean {
    return !this._isDisabled && !this._isLoading && !this._isReadonly;
  }

  private _dispatch(
    name: string,
    detail: Record<string, unknown>,
    cancelable: boolean,
  ): CustomEvent {
    const ev = new CustomEvent(name, { bubbles: true, cancelable, detail });
    this._element?.dispatchEvent(ev);
    return ev;
  }

  private _optionByValue(): Map<unknown, MultiSelectOptionData> {
    const map = new Map<unknown, MultiSelectOptionData>();
    for (const it of flattenItems(this._options.items)) map.set(it.value, it);
    return map;
  }

  /** Filtered (by input text) + maxSelections-capped items passed to ArvoOptionList. */
  private _processedItems():
    | MultiSelectOptionData[]
    | ListGroup<MultiSelectOptionData>[] {
    const filtered = applyFilter(
      this._options.items,
      this._inputText,
      this._options.filterFn,
    );
    const cap = this._options.maxSelections;
    const atCap = typeof cap === 'number' && this._value.length >= cap;
    return atCap ? applyMaxSelections(filtered, this._value) : filtered;
  }

  private _expandedActive(): boolean {
    // `'single-line'` is a STRICT mode: chips never expand back into view.
    // Only `'expandable'` participates in the expand/collapse contract.
    return this._options.overflowMode === 'expandable' && this._isExpanded;
  }

  private _chipListOverflowMode(): ArvoChipListOverflowMode {
    // The chip-list owns the collapse/expand pivot internally via its
    // `isExpanded` controlled prop. The multi-select just maps its public
    // overflow modes onto the chip-list's overflowMode values -- it does
    // not pivot externally to 'wrap' when expanded (that would suppress
    // the chip-list's persistent __overflow disclosure).
    if (this._options.overflowMode === 'expandable') return 'max-rows';
    if (this._options.overflowMode === 'single-line') return 'single-line';
    return 'wrap';
  }

  private _applyStyleVars(): void {
    if (!this._element) return;
    this._element.style.setProperty(
      '--arvo-multi-sel-max-rows',
      String(this._options.maxRows),
    );
    this._element.style.setProperty(
      '--arvo-multi-sel-expanded-max-rows',
      String(this._options.expandedMaxRows),
    );
  }

  // ---------------------------------------------------------------------------
  // Chip rendering (inner ArvoChipList)
  // ---------------------------------------------------------------------------

  private _buildChipItems(): ArvoChipListItem[] {
    const byVal = this._optionByValue();
    return this._value.map((v) => {
      const opt = byVal.get(v) ?? null;
      const label = opt?.label ?? String(v);
      return {
        key: String(v),
        label,
        variant: 'input',
        icon: opt?.icon,
        avatar: opt?.avatar,
        dismissLabel: `Remove ${label}`,
      } as ArvoChipListItem;
    });
  }

  private _renderChips(): void {
    if (!this._valueEl || !this._inputEl) return;
    const items = this._buildChipItems();

    // Keep the input placeholder visible only when no chips are selected.
    this._inputEl.placeholder =
      items.length > 0 ? '' : this._options.placeholder;

    // Chip-list is mounted only when there is at least one chip. With zero
    // chips the input takes the value row alone and renders its native
    // placeholder. This mirrors the React twin's conditional rendering.
    if (items.length === 0) {
      if (this._chipList) {
        this._chipList.destroy();
        this._chipList = null;
      }
      if (this._chipsEl) {
        this._chipsEl.remove();
        this._chipsEl = null;
      }
      this._overflowBtnEl = null;
      // Sanitize the active chip index.
      this._activeChipIndex = -1;
      this._syncActiveChipHighlight();
      return;
    }

    const mode = this._chipListOverflowMode();
    const expanded = this._expandedActive();
    // `'single-line'` is a STRICT mode: the chip-list renders its
    // overflow indicator as a non-interactive "+N more" label (no
    // chevron, no click) and chips cannot expand back into view.
    const isStaticOverflow = this._options.overflowMode === 'single-line';

    if (!this._chipList || !this._chipsEl) {
      // First-time mount: create the chip-list host as the FIRST child of
      // __value (before the input).
      this._chipsEl = document.createElement('div');
      this._valueEl.insertBefore(this._chipsEl, this._inputEl);
      this._chipList = ArvoChipList.initialize(this._chipsEl, {
        ...(this._options.chipListProps ?? undefined),
        variant: 'input',
        appearance: this._options.chipAppearance,
        overflowMode: mode,
        maxRows: this._options.maxRows,
        isDisabled: this._isDisabled,
        isReadOnly: this._isReadonly,
        isLoading: this._isLoading,
        // The multi-select drives the persistent __overflow disclosure
        // via the chip-list's expansion props. When `overflowMode` is
        // 'single-line' the disclosure becomes a static, non-interactive
        // indicator and the expansion contract is suppressed.
        isWithinField: true,
        isStaticOverflow,
        isExpanded: expanded,
        onExpandedChange: (next: boolean) => this._setExpanded(next),
        expandedLabel: () => 'Show less',
        ariaLabel: this._options.label
          ? `${this._options.label} selected options`
          : 'Selected options',
        items,
      });
      // ArvoChipList.initialize() overwrites className; add the multi-sel
      // marker class AFTER so __chips CSS rules apply to the chip-list root.
      this._chipsEl.classList.add('arvo-multi-sel__chips');
    } else {
      // Subsequent rebuild: update items + state in place. The chip-list
      // owns the disclosure across rebuilds, so no re-mount is needed.
      this._chipList.readOnly(this._isReadonly);
      this._chipList.expanded(expanded);
      this._chipList.setItems(items);
      this._chipsEl.classList.add('arvo-multi-sel__chips');
    }
    this._assignChipIds();
    this._captureOverflowBtn();
    // Chip set just changed; sanitize the active chip index. Allow the
    // disclosure to be the last slot (chip count + 1).
    if (this._activeChipIndex >= this._getCursorSlotCount()) {
      this._activeChipIndex = -1;
    }
    this._syncActiveChipHighlight();
  }

  /**
   * Assign a stable id to each rendered chip element so the input can point
   * `aria-activedescendant` at it when the user walks chips via arrow keys.
   * The chip-list's __overflow disclosure also gets an id so the cursor can
   * land on it.
   */
  private _assignChipIds(): void {
    if (!this._chipsEl) return;
    const chipEls = this._chipsEl.querySelectorAll<HTMLElement>(
      ':scope > .arvo-chip',
    );
    chipEls.forEach((el, i) => {
      el.id = `${this._id}-chip-${i}`;
    });
    const overflow = this._chipsEl.querySelector<HTMLElement>(
      ':scope > .arvo-chip-list__overflow',
    );
    if (overflow) overflow.id = `${this._id}-disclosure`;
  }

  /**
   * Capture the disclosure DOM element for the active-descendant walk.
   * Strict single-line mode renders the disclosure as a non-interactive
   * `<span>` (`.arvo-chip-list__overflow--static`); skip it so the
   * active-descendant cursor walks chips only.
   */
  private _captureOverflowBtn(): void {
    if (!this._chipsEl) {
      this._overflowBtnEl = null;
      return;
    }
    if (this._options.overflowMode === 'single-line') {
      this._overflowBtnEl = null;
      return;
    }
    this._overflowBtnEl = this._chipsEl.querySelector<HTMLElement>(
      ':scope > .arvo-chip-list__overflow',
    );
  }

  // ---------------------------------------------------------------------------
  // Active-descendant chip focus
  // ---------------------------------------------------------------------------

  /** Visible chip elements, in render order, excluding hidden overflow chips. */
  private _getVisibleChipEls(): HTMLElement[] {
    if (!this._chipsEl) return [];
    return Array.from(
      this._chipsEl.querySelectorAll<HTMLElement>(':scope > .arvo-chip'),
    ).filter((el) => el.style.visibility !== 'hidden');
  }

  /**
   * Number of slots the active-descendant cursor can walk through: visible
   * chips + the persistent __overflow disclosure (when one is rendered).
   * Mirrors the React twin's `getCursorSlotCount`.
   */
  private _getCursorSlotCount(): number {
    const chipCount = this._getVisibleChipEls().length;
    const hasDisclosure = !!this._overflowBtnEl;
    return chipCount + (hasDisclosure ? 1 : 0);
  }

  /** True if the active descendant is currently the disclosure slot. */
  private _activeIsDisclosure(): boolean {
    const chipCount = this._getVisibleChipEls().length;
    const hasDisclosure = !!this._overflowBtnEl;
    return hasDisclosure && this._activeChipIndex === chipCount;
  }

  private _setActiveChip(index: number): void {
    const slotCount = this._getCursorSlotCount();
    if (index < 0 || index >= slotCount) {
      this._activeChipIndex = -1;
    } else {
      this._activeChipIndex = index;
    }
    this._syncActiveChipHighlight();
  }

  private _clearActiveChip(): void {
    if (this._activeChipIndex === -1) return;
    this._activeChipIndex = -1;
    this._syncActiveChipHighlight();
  }

  /** Mirror the active chip/disclosure index onto the DOM. */
  private _syncActiveChipHighlight(): void {
    if (!this._inputEl) return;
    if (this._chipsEl) {
      const els = Array.from(
        this._chipsEl.querySelectorAll<HTMLElement>(':scope > .arvo-chip'),
      );
      for (const el of els) el.classList.remove('highlighted');
    }
    this._overflowBtnEl?.classList.remove('highlighted');
    const visible = this._getVisibleChipEls();
    const hasDisclosure = !!this._overflowBtnEl;
    const totalSlots = visible.length + (hasDisclosure ? 1 : 0);
    if (this._activeChipIndex < 0 || this._activeChipIndex >= totalSlots) {
      if (!this._isOpen) this._inputEl.removeAttribute('aria-activedescendant');
      return;
    }
    const activeEl =
      this._activeChipIndex < visible.length
        ? visible[this._activeChipIndex]
        : this._overflowBtnEl;
    activeEl?.classList.add('highlighted');
    if (!this._isOpen && activeEl?.id) {
      this._inputEl.setAttribute('aria-activedescendant', activeEl.id);
    } else if (!this._isOpen) {
      this._inputEl.removeAttribute('aria-activedescendant');
    }
  }

  // ---------------------------------------------------------------------------
  // Value mutations (shared by user interaction + imperative API)
  // ---------------------------------------------------------------------------

  /** Re-sync the chips, dropdown selection, dropdown items, and root classes. */
  private _afterValueChange(): void {
    this._renderChips();
    this._optionList?.value(this._value);
    // Re-derive the dropdown (maxSelections disabling depends on the count).
    if (this._options.maxSelections != null) this._refreshOptionListItems();
    this._applyRootClasses();
  }

  private _refreshOptionListItems(): void {
    this._optionList?.setItems(this._processedItems());
    this._optionList?.value(this._value);
  }

  private _setExpanded(next: boolean): void {
    this._isExpanded = next;
    this._renderChips();
    this._applyRootClasses();
    this._options.onExpandedChange?.(next);
    this._dispatch('multi-sel:expand', { expanded: next }, false);
  }

  private _handleRemove(val: unknown, item: MultiSelectOptionData | null): void {
    if (!this._interactive()) return;
    const ev = this._dispatch('multi-sel:remove', { value: val, item }, true);
    if (ev.defaultPrevented) return; // preventDefault() keeps the chip
    const next = this._value.filter((v) => v !== val);
    this._value = next;
    this._afterValueChange();
    if (item) this._options.onRemove?.(val, item);
    this._options.onChange?.(next, item, false);
    this._dispatch('multi-sel:change', { value: next, item, isSelected: false }, true);
  }

  private _handleClearAll(): void {
    if (!this._interactive()) return;
    if (this._value.length === 0 && this._inputText === '') return;
    const previousValue = [...this._value];
    this._value = [];
    this._inputText = '';
    if (this._inputEl) this._inputEl.value = '';
    this._afterValueChange();
    this._refreshOptionListItems();
    this._options.onClear?.({ previousValue });
    this._dispatch('multi-sel:clear', { previousValue }, false);
    this._options.onChange?.([], null, false);
    this._dispatch('multi-sel:change', { value: [], item: null, isSelected: false }, true);
    this._inputEl?.focus();
  }

  private _handleChipListDismiss(e: Event): void {
    const detail = (e as CustomEvent).detail as { key?: string | number };
    const key = detail?.key;
    if (key == null) return;
    const val = this._value.find((v) => String(v) === String(key));
    if (val === undefined) return;
    this._handleRemove(val, this._optionByValue().get(val) ?? null);
  }

  private _handleChevronClick(e: Event): void {
    e.stopPropagation();
    if (!this._interactive()) return;
    if (this._isOpen) this.close();
    else {
      this.open();
      this._inputEl?.focus();
    }
  }

  private _setInputText(text: string): void {
    this._inputText = text;
    if (this._inputEl) this._inputEl.value = text;
    this._options.onInputChange?.(text);
    this._dispatch('multi-sel:input', { value: text }, false);
    this._refreshOptionListItems();
  }

  // ---------------------------------------------------------------------------
  // CSS Classes
  // ---------------------------------------------------------------------------

  private _applyRootClasses(): void {
    const el = this._element;
    if (!el) return;

    el.classList.add('arvo-multi-sel', `arvo-multi-sel--surface-${this._options.surface}`);
    el.classList.toggle(`arvo-multi-sel--${this._options.overflowMode}`, true);
    el.classList.toggle('arvo-multi-sel--full-width', this._options.isFullWidth);
    el.classList.toggle('arvo-multi-sel--clearable', this._options.isClearable);
    el.classList.toggle('loading', this._isLoading);
    el.classList.toggle('is-disabled', this._isDisabled);
    el.classList.toggle('is-readonly', this._isReadonly);
    el.classList.toggle('has-error', this._options.isInvalid);
    el.classList.toggle(
      'error-tooltip',
      this._options.isInvalid && this._options.errorDisplay === 'tooltip',
    );
    el.classList.toggle('open', this._isOpen);
    el.classList.toggle('has-value', this._value.length > 0);
    el.classList.toggle('arvo-multi-sel--expanded', this._expandedActive());
  }

  // ---------------------------------------------------------------------------
  // Width Style
  // ---------------------------------------------------------------------------

  private _applyWidthStyle(): void {
    if (!this._element) return;
    const effectiveWidth = this._options.isFullWidth ? '100%' : this._options.width;
    if (effectiveWidth) {
      this._element.style.setProperty('--arvo-form-input-width', effectiveWidth);
    } else {
      this._element.style.removeProperty('--arvo-form-input-width');
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Capture-phase mousedown on __field. Preserves input focus during clicks
   * on non-input controls (chip-list overflow disclosure, chip dismiss
   * spans, clear/chevron action buttons, chip bodies). Without this,
   * browsers move focus to the click target on mousedown -- the input
   * would blur (clearing typed text) and any active-descendant chip
   * highlight would be torn down. The actual click handler still runs on
   * the target; we only suppress the focus shift.
   */
  private _handleFieldMouseDown(e: Event): void {
    if (!this._interactive()) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Mousedown on the input itself: let the browser focus it normally.
    if (target === this._inputEl) return;
    if (target.tagName === 'INPUT') return;
    // For every other target inside __field (actions, chip bodies, chip
    // dismiss spans, chip-list overflow disclosure, the field background),
    // prevent the default focus shift so the input keeps focus.
    e.preventDefault();
  }

  private _handleFieldClick(e: Event): void {
    if (!this._interactive()) return;
    const target = e.target as HTMLElement;
    // Skip the actions cluster (clear / chevron) -- those buttons own
    // their own click semantics and stopPropagation defensively.
    if (target.closest?.('.arvo-multi-sel__actions')) return;
    // Skip the chip-list overflow disclosure -- the chip-list stops
    // propagation already; this is the defensive backstop. Restore input
    // focus so the next keypress flows through the right target.
    if (target.closest?.('.arvo-chip-list__overflow')) {
      this._inputEl?.focus();
      return;
    }
    // Skip chip dismiss -- the chip stops propagation on its own click.
    if (target.closest?.('.arvo-chip__dismiss')) return;
    // Click on a chip BODY (not the dismiss) focuses the input but does
    // NOT open the panel. The chip already conveys the value; opening the
    // panel on a chip click is noisy. Matches the React twin.
    if (target.closest?.('.arvo-chip')) {
      this._clearActiveChip();
      this._inputEl?.focus();
      return;
    }
    this._clearActiveChip();
    this._inputEl?.focus();
    if (!this._isOpen) this.open();
  }

  private _handleInputKeyDown(e: KeyboardEvent): void {
    if (this._isDisabled || this._isLoading || this._isReadonly) return;
    // This listener runs on the input (deeper element) so stopPropagation()
    // pre-empts the ArvoOptionList keydown bound on the field where needed.
    const hasText = this._inputText.length > 0;
    const chipActive = this._activeChipIndex >= 0;
    const slotCount = this._getCursorSlotCount();
    const disclosureActive = this._activeIsDisclosure();

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        // Down arrow always opens the list AND clears any active descendant
        // so option highlight + aria-activedescendant move into the dropdown.
        this._clearActiveChip();
        if (!this._isOpen) {
          e.preventDefault();
          this.open();
        }
        break;
      case 'ArrowLeft': {
        // Only intercept when the caret is at the start of the input and
        // there are slots to walk. Otherwise let the input handle caret motion.
        if (
          !chipActive &&
          (this._inputEl!.selectionStart !== 0 ||
            this._inputEl!.selectionEnd !== 0)
        ) {
          break;
        }
        if (slotCount === 0) break;
        e.preventDefault();
        e.stopPropagation();
        if (!chipActive) {
          // Land on the last slot (disclosure if present, else last chip).
          this._setActiveChip(slotCount - 1);
        } else {
          this._setActiveChip(Math.max(0, this._activeChipIndex - 1));
        }
        break;
      }
      case 'ArrowRight': {
        if (!chipActive) break;
        e.preventDefault();
        e.stopPropagation();
        const next = this._activeChipIndex + 1;
        if (next >= slotCount) {
          this._clearActiveChip();
        } else {
          this._setActiveChip(next);
        }
        break;
      }
      case 'Home': {
        if (!chipActive) break;
        if (slotCount === 0) break;
        e.preventDefault();
        e.stopPropagation();
        this._setActiveChip(0);
        break;
      }
      case 'End': {
        if (!chipActive) break;
        e.preventDefault();
        e.stopPropagation();
        this._clearActiveChip();
        break;
      }
      case 'Enter': {
        // Enter on the disclosure-as-active-descendant toggles expanded.
        if (disclosureActive) {
          e.preventDefault();
          e.stopPropagation();
          this._overflowBtnEl?.click();
        }
        break;
      }
      case ' ':
        if (disclosureActive) {
          e.preventDefault();
          e.stopPropagation();
          this._overflowBtnEl?.click();
        } else if (hasText) {
          // Insert a space; do not let the list toggle the highlighted option.
          e.stopPropagation();
        } else {
          e.preventDefault();
          if (!this._isOpen) this.open();
        }
        break;
      case 'Backspace':
        if (disclosureActive) {
          // Disclosure cannot be removed -- ignore.
          e.preventDefault();
          e.stopPropagation();
        } else if (chipActive) {
          e.preventDefault();
          e.stopPropagation();
          this._removeActiveChip();
        } else if (!hasText && this._value.length > 0) {
          e.stopPropagation();
          const last = this._value[this._value.length - 1];
          this._handleRemove(last, this._optionByValue().get(last) ?? null);
        }
        break;
      case 'Delete':
        if (disclosureActive) {
          e.preventDefault();
          e.stopPropagation();
        } else if (chipActive) {
          e.preventDefault();
          e.stopPropagation();
          this._removeActiveChip();
        }
        break;
      case 'Escape':
        if (this._isOpen) {
          // The OverlaySurface engine closes the panel via its own handler.
          this._clearActiveChip();
        } else if (chipActive) {
          e.preventDefault();
          e.stopPropagation();
          this._clearActiveChip();
        } else if (hasText) {
          e.preventDefault();
          e.stopPropagation();
          this._setInputText('');
        }
        break;
      case 'Tab':
        if (this._isOpen) this.close();
        this._clearActiveChip();
        break;
    }
  }

  /** Remove the chip currently highlighted by the active-descendant cursor. */
  private _removeActiveChip(): void {
    // Disclosure cannot be removed -- guard above only handles chip slots.
    if (this._activeIsDisclosure()) return;
    const els = this._getVisibleChipEls();
    if (this._activeChipIndex < 0 || this._activeChipIndex >= els.length) return;
    const targetEl = els[this._activeChipIndex];
    const id = targetEl.id;
    // Chip ids are `${this._id}-chip-${i}` where i is the index in the full
    // chip set (including overflow-hidden chips). Pull the underlying value
    // out of the live value array by that index.
    const chipIndex = parseInt(id.replace(`${this._id}-chip-`, ''), 10);
    if (Number.isNaN(chipIndex)) return;
    const val = this._value[chipIndex];
    if (val === undefined) return;
    const prevActive = this._activeChipIndex;
    this._handleRemove(val, this._optionByValue().get(val) ?? null);
    // After removal: keep the highlight on the same visual slot (next chip);
    // fall back to the previous slot, then clear.
    const after = this._getVisibleChipEls();
    if (after.length === 0) {
      this._clearActiveChip();
    } else if (prevActive < after.length) {
      this._setActiveChip(prevActive);
    } else {
      this._setActiveChip(after.length - 1);
    }
  }

  private _handleInputInput(e: Event): void {
    if (!this._interactive()) return;
    const target = e.target as HTMLInputElement;
    this._inputText = target.value;
    // Typing always returns the active-descendant cursor to the input.
    this._clearActiveChip();
    this._options.onInputChange?.(this._inputText);
    this._dispatch('multi-sel:input', { value: this._inputText }, false);
    // Typing opens the panel (mirrors ArvoCombobox); an empty input does not.
    if (!this._isOpen && this._inputText.length > 0) this.open();
    this._refreshOptionListItems();
  }

  private _handleInputFocus(_e: FocusEvent): void {
    // Pointer focus: ensure any stale chip highlight clears so the input is
    // the active descendant target.
    this._clearActiveChip();
  }

  private _handleInputBlur(e: FocusEvent): void {
    // When focus leaves the entire multi-select root (not just hopping to the
    // chevron / clear), discard any unmatched typed text so the next session
    // starts clean and the dropdown shows the full option list. The dropdown
    // panel itself never steals focus (OverlaySurface focus mode 'none' +
    // mousedown.preventDefault on options).
    const nextTarget = e.relatedTarget as Node | null;
    if (nextTarget && this._element?.contains(nextTarget)) return;
    if (this._inputText.length > 0) {
      this._setInputText('');
    }
    this._clearActiveChip();
  }

  // ---------------------------------------------------------------------------
  // Selection (driven by the composed ArvoOptionList)
  // ---------------------------------------------------------------------------

  private _handleOptionChange(detail: {
    value: unknown | unknown[];
    option: MultiSelectOptionData;
    isSelected: boolean;
  }): void {
    const arr = Array.isArray(detail.value) ? [...detail.value] : [];
    this._value = arr;
    this._afterValueChange();
    this._options.onChange?.(arr, detail.option, detail.isSelected);
    this._dispatch(
      'multi-sel:change',
      { value: arr, item: detail.option, isSelected: detail.isSelected },
      true,
    );
  }

  // OptionList reports hub-driven dismissal (outside click / Escape) here.
  // Picker-silent contract (architecture/20-OVERLAY-MIGRATION-NOTES.md):
  // engine-driven dismissal is unconditional -- no `multi-sel:close` event,
  // no `onClose` veto. Only programmatic `close()` and field-driven toggle
  // paths route through `_doClose()`. Combobox is the reference
  // implementation. Unconditionally flipping local state here keeps us in
  // sync with the engine even if a veto path would otherwise leave
  // `_isOpen` stale.
  private _handleListOpenChange(open: boolean): void {
    if (!open && this._isOpen) {
      this._isOpen = false;
      this._element?.classList.remove('open');
      this._fieldEl?.setAttribute('aria-expanded', 'false');
      this._options.onOpenChange?.(false);
      // After close: re-apply chip aria-activedescendant if any chip remains
      // highlighted (rare but possible if user reopens with a chip selected).
      this._syncActiveChipHighlight();
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    this._doOpen(false);
  }

  private _doOpen(silent: boolean): void {
    if (this._isOpen || this._isDisabled || this._isLoading || this._isReadonly) return;
    if (!silent && this._options.onOpen?.() === false) return;

    if (!silent) {
      const event = new CustomEvent('multi-sel:open', {
        bubbles: true,
        cancelable: true,
      });
      if (!this._element?.dispatchEvent(event)) return;
    }

    this._isOpen = true;
    this._element?.classList.add('open');
    this._fieldEl?.setAttribute('aria-expanded', 'true');
    this._optionList?.open();

    if (!silent) this._options.onOpenChange?.(true);
  }

  close(): void {
    if (!this._isOpen) return;
    this._doClose();
  }

  private _doClose(): boolean {
    if (this._options.onClose?.() === false) return false;

    const event = new CustomEvent('multi-sel:close', {
      bubbles: true,
      cancelable: true,
    });
    if (!this._element?.dispatchEvent(event)) return false;

    this._isOpen = false;
    this._element?.classList.remove('open');
    this._fieldEl?.setAttribute('aria-expanded', 'false');
    this._optionList?.close();
    this._options.onOpenChange?.(false);
    return true;
  }

  toggle(force?: boolean): void {
    const shouldOpen = force !== undefined ? force : !this._isOpen;
    if (shouldOpen) this.open();
    else this.close();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  value(newValue?: unknown[]): unknown[] | void {
    if (newValue === undefined) return [...this._value];
    this._value = [...newValue];
    this._afterValueChange();
    this._refreshOptionListItems();
    this._dispatch(
      'multi-sel:change',
      { value: [...this._value], item: null, isSelected: false },
      true,
    );
  }

  add(val: unknown): void {
    if (this._value.includes(val)) return;
    const cap = this._options.maxSelections;
    if (typeof cap === 'number' && this._value.length >= cap) return;
    const item = this._optionByValue().get(val) ?? null;
    const next = [...this._value, val];
    this._value = next;
    this._afterValueChange();
    this._options.onChange?.(next, item, true);
    this._dispatch('multi-sel:change', { value: next, item, isSelected: true }, true);
  }

  remove(val: unknown): void {
    if (!this._value.includes(val)) return;
    const item = this._optionByValue().get(val) ?? null;
    const next = this._value.filter((v) => v !== val);
    this._value = next;
    this._afterValueChange();
    if (item) this._options.onRemove?.(val, item);
    this._dispatch('multi-sel:remove', { value: val, item }, true);
    this._options.onChange?.(next, item, false);
    this._dispatch('multi-sel:change', { value: next, item, isSelected: false }, true);
  }

  inputValue(text?: string): string | void {
    if (text === undefined) return this._inputText;
    this._inputText = text;
    if (this._inputEl) this._inputEl.value = text;
    this._refreshOptionListItems();
  }

  clear(): void {
    const previousValue = [...this._value];
    if (previousValue.length === 0 && this._inputText === '') return;
    this._value = [];
    this._inputText = '';
    if (this._inputEl) this._inputEl.value = '';
    this._afterValueChange();
    this._refreshOptionListItems();
    this._options.onClear?.({ previousValue });
    this._dispatch('multi-sel:clear', { previousValue }, false);
    this._options.onChange?.([], null, false);
    this._dispatch('multi-sel:change', { value: [], item: null, isSelected: false }, true);
  }

  expanded(state?: boolean): boolean | void {
    if (state === undefined) return this._isExpanded;
    this._setExpanded(state);
  }

  updateItems(items: MultiSelectOptionData[] | ListGroup<MultiSelectOptionData>[]): void {
    this._options.items = items;
    this._renderChips();
    this._refreshOptionListItems();
    this._applyRootClasses();
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._isDisabled;

    this._isDisabled = state;
    this._options.isDisabled = state;

    if (state) {
      this._fieldEl?.setAttribute('aria-disabled', 'true');
      if (this._isOpen) this.close();
    } else {
      this._fieldEl?.removeAttribute('aria-disabled');
    }

    if (this._inputEl) this._inputEl.disabled = state;
    this._clearBtn?.disabled(state);
    this._chevronBtn?.disabled(state);
    this._chipList?.disabled(state);
    this._optionList?.disabled(state);
    this._applyRootClasses();
  }

  setError(message: string | false): void {
    const useTooltipError = this._options.errorDisplay === 'tooltip';
    const useInlineAlert = this._options.errorDisplay === 'inline';

    if (message === false) {
      this._options.isInvalid = false;
      this._options.errorMsg = null;
      this._element?.classList.remove('has-error', 'error-tooltip');
      this._fieldEl?.removeAttribute('aria-invalid');
      this._fieldEl?.removeAttribute('aria-describedby');

      if (this._alertEl) {
        this._inlineAlert?.destroy();
        this._inlineAlert = null;
        this._alertEl.remove();
        this._alertEl = null;
      }
      if (this._errMsgAlert) {
        this._errMsgAlert.message(null);
      }
    } else {
      this._options.isInvalid = true;
      this._options.errorMsg = message;
      this._element?.classList.add('has-error');
      this._element?.classList.toggle('error-tooltip', useTooltipError);
      this._fieldEl?.setAttribute('aria-invalid', 'true');

      if (useTooltipError && this._errMsgAlert) {
        this._errMsgAlert.message(message);
      } else if (useInlineAlert) {
        if (this._alertEl) {
          this._inlineAlert?.message(message);
        } else {
          this._inlineAlert = ArvoMessageAlert.initialize(
            document.createElement('div'),
            { type: 'negative', message, id: `${this._id}-err` },
          );
          this._alertEl = this._inlineAlert.el;
          this._element?.appendChild(this._alertEl);
        }
        this._fieldEl?.setAttribute('aria-describedby', `${this._id}-err`);
      }
    }
  }

  setLoading(isLoading: boolean): void {
    this._isLoading = isLoading;
    this._options.isLoading = isLoading;
    this._element?.classList.toggle('loading', isLoading);
    if (this._inputEl) this._inputEl.readOnly = this._isReadonly || isLoading;
    if (isLoading) {
      this._fieldEl?.setAttribute('aria-busy', 'true');
      this._inputEl?.setAttribute('aria-busy', 'true');
      if (this._isOpen) this.close();
    } else {
      this._fieldEl?.removeAttribute('aria-busy');
      this._inputEl?.removeAttribute('aria-busy');
    }
  }

  width(cssValue?: string): string | void {
    if (cssValue === undefined) return this._options.width ?? '';
    this._options.width = cssValue || null;
    this._applyWidthStyle();
  }

  focus(): void {
    this._inputEl?.focus();
  }

  destroy(): void {
    this._optionList?.destroy();
    this._optionList = null;

    this._chipList?.destroy();
    this._chipList = null;

    this._clearBtn?.destroy();
    this._clearBtn = null;

    this._chevronBtn?.destroy();
    this._chevronBtn = null;

    this._inlineAlert?.destroy();
    this._inlineAlert = null;

    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;

    this._overflowBtnEl = null;

    this._fieldEl?.removeEventListener('click', this._boundHandleFieldClick);
    this._fieldEl?.removeEventListener('mousedown', this._boundHandleFieldMouseDown);
    this._fieldEl?.removeEventListener('chip-list:dismiss', this._boundChipListDismiss);
    this._inputEl?.removeEventListener('keydown', this._boundHandleInputKeyDown);
    this._inputEl?.removeEventListener('input', this._boundHandleInputInput);
    this._inputEl?.removeEventListener('focus', this._boundHandleInputFocus);
    this._inputEl?.removeEventListener('blur', this._boundHandleInputBlur);

    if (this._element) {
      this._element.textContent = '';
      this._element.className = '';
      this._element.style.removeProperty('--arvo-form-input-width');
    }

    this._isOpen = false;
    this._element = null;
    this._fieldEl = null;
    this._valueEl = null;
    this._chipsEl = null;
    this._inputEl = null;
    this._actionsEl = null;
    this._clearEl = null;
    this._sepEl = null;
    this._icoEl = null;
    this._errIcoEl = null;
    this._borderEl = null;
    this._labelEl = null;
    this._alertEl = null;
  }
}
