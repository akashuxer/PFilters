import {
  filterItems,
  filterGroups,
  connectTooltip,
  tooltipManager,
} from '@arvo/core';
import type { ListItemBase, ListGroup, TooltipConnector } from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import { ArvoOptionList } from '../OptionList/OptionList';
import type { ArvoOptionListOptions } from '../OptionList/OptionList';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboboxOptionData extends ListItemBase {
  value: unknown;
}

/**
 * Scoped escape-hatch bag for inner `ArvoOptionList` config the field does not
 * curate as a flat option. Mirrors React `ComboboxOptionListProps` exactly --
 * the drift reviewer enforces key-set parity.
 */
export type ComboboxOptionListProps = Pick<
  ArvoOptionListOptions,
  'emptyConfig' | 'variant' | 'isCreatable' | 'onCreate'
>;

export interface ArvoComboboxOptions {
  items: ComboboxOptionData[] | ListGroup<ComboboxOptionData>[];
  /** Controlled/initial selected value. Update after init via value(). */
  value?: unknown;
  /** Uncontrolled initial value. Used only when value is omitted. */
  defaultValue?: unknown;
  /** Controlled/initial filter text. Update after init via inputValue(). */
  inputValue?: string;
  placeholder?: string;
  /**
   * Optional leading icon name (without the `o9con-` prefix) rendered inside
   * `__field` before the prefix / input. 16px square; recolored by parent
   * state through the shared `form-input-affix` pattern. The chevron is a
   * separate slot (`__chevron`).
   */
  icon?: string;
  /**
   * Optional static text rendered inside `__field` at the leading edge after
   * `__ico` (e.g. `"https://"`, `"@"`, `"Filter:"`). Cosmetic only -- never
   * part of the typed filter text, never echoed in events. When set, a
   * vertical separator (`__prefix-sep`) is rendered between the prefix and
   * the input. `aria-hidden`; pointer clicks forward focus to the inner
   * input.
   */
  prefix?: string;
  /**
   * Optional tooltip text shown when hovering the prefix element. No
   * tooltip when null. Only effective when `prefix` is also set.
   */
  prefixTooltip?: string;
  label?: string;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMsg?: string;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  isClearable?: boolean;
  isLoading?: boolean;
  isReadOnly?: boolean;
  isFullWidth?: boolean;
  width?: string;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  maxHeight?: string;
  hasGroupDividers?: boolean;
  filterFn?: (item: ComboboxOptionData, query: string) => boolean;
  closeOnSelect?: boolean;
  /** Initial open state (parity with React's controlled isOpen). Drive after init via open()/close()/toggle(). */
  isOpen?: boolean;
  /** Uncontrolled initial open state. Used only when isOpen is omitted. */
  defaultOpen?: boolean;
  onChange?: (item: ComboboxOptionData, index: number) => boolean | void;
  onInputChange?: (value: string) => void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onClear?: (detail: { previousValue: unknown }) => void;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Scoped escape-hatch bag for inner `ArvoOptionList` options the field does
   * not curate flat (e.g. `emptyConfig`, `variant`, `isCreatable`,
   * `onCreate`). Spread first so the field's flat / computed options always
   * win on overlap.
   */
  optionListProps?: ComboboxOptionListProps;
}

type RequiredComboboxOptions = Required<
  Omit<
    ArvoComboboxOptions,
    | 'onChange'
    | 'onInputChange'
    | 'onOpen'
    | 'onClose'
    | 'onClear'
    | 'onOpenChange'
    | 'maxHeight'
    | 'errorMsg'
    | 'filterFn'
    | 'inputValue'
    | 'width'
    | 'optionListProps'
    | 'contextHelp'
    | 'icon'
    | 'prefix'
    | 'prefixTooltip'
    // Init-only seeds (controlled state + defaults).
    | 'value'
    | 'defaultValue'
    | 'isOpen'
    | 'defaultOpen'
  >
> & {
  maxHeight: string | null;
  errorMsg: string | null;
  inputValue: string | null;
  width: string | null;
  filterFn: ((item: ComboboxOptionData, query: string) => boolean) | null;
  optionListProps: ComboboxOptionListProps | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  icon: string | null;
  prefix: string | null;
  prefixTooltip: string | null;
  onChange: ((item: ComboboxOptionData, index: number) => boolean | void) | null;
  onInputChange: ((value: string) => void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onClear: ((detail: { previousValue: unknown }) => void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function isGrouped(
  items: ComboboxOptionData[] | ListGroup<ComboboxOptionData>[],
): items is ListGroup<ComboboxOptionData>[] {
  return items.length > 0 && 'items' in items[0];
}

function flattenItems(
  items: ComboboxOptionData[] | ListGroup<ComboboxOptionData>[],
): ComboboxOptionData[] {
  if (isGrouped(items)) {
    const result: ComboboxOptionData[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as ComboboxOptionData[];
}

function applyFilter(
  items: ComboboxOptionData[] | ListGroup<ComboboxOptionData>[],
  query: string,
  filterFn?: ((item: ComboboxOptionData, query: string) => boolean) | null,
): ComboboxOptionData[] | ListGroup<ComboboxOptionData>[] {
  if (!query) return items;
  if (filterFn) {
    if (isGrouped(items)) {
      const result: ListGroup<ComboboxOptionData>[] = [];
      for (const group of items) {
        const filtered = group.items.filter((item) => filterFn(item, query));
        if (filtered.length > 0) result.push({ ...group, items: filtered });
      }
      return result;
    }
    return (items as ComboboxOptionData[]).filter((item) => filterFn(item, query));
  }
  if (isGrouped(items)) return filterGroups(items, { query });
  return filterItems(items as ComboboxOptionData[], { query });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoCombobox {
  private _element: HTMLElement | null;
  private _options: RequiredComboboxOptions;

  // DOM
  private _fieldEl: HTMLElement | null = null;
  private _inputEl: HTMLInputElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _prefixEl: HTMLSpanElement | null = null;
  private _prefixSepEl: HTMLSpanElement | null = null;
  private _prefixConnector: TooltipConnector | null = null;
  private _actionsEl: HTMLElement | null = null;
  private _clearEl: HTMLElement | null = null;
  private _clearBtn: ArvoIconButton | null = null;
  private _sepEl: HTMLElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _chevronEl: HTMLElement | null = null;
  private _chevronBtn: ArvoIconButton | null = null;
  private _borderEl: HTMLElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _alertEl: HTMLElement | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;
  private _resizeObs: ResizeObserver | null = null;

  // Composed floating listbox overlay (owns positioning, dismissal, option
  // rendering, keyboard navigation).
  private _optionList: ArvoOptionList | null = null;

  // State
  private _isOpen = false;
  private _isDisabled = false;
  private _isLoading = false;
  private _isReadonly = false;
  private _value: unknown = null;
  private _inputText = '';
  private _id: string;

  // Bound handlers
  private _boundHandleInputInput: (e: Event) => void;
  private _boundHandleInputKeyDown: (e: KeyboardEvent) => void;
  private _boundHandleAffixMouseDown: (e: MouseEvent) => void;
  private _boundHandleFieldMouseDown: (e: MouseEvent) => void;

  static readonly DEFAULTS: RequiredComboboxOptions = {
    items: [],
    placeholder: '',
    icon: null,
    prefix: null,
    prefixTooltip: null,
    label: '',
    contextHelp: null,
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
    errorMsg: null,
    errorDisplay: 'inline',
    size: 'lg',
    surface: 'filled',
    isClearable: true,
    isLoading: false,
    isReadOnly: false,
    isFullWidth: false,
    width: null,
    placement: 'bottom-start',
    maxHeight: null,
    hasGroupDividers: true,
    filterFn: null,
    closeOnSelect: true,
    inputValue: null,
    optionListProps: null,
    onChange: null,
    onInputChange: null,
    onOpen: null,
    onClose: null,
    onClear: null,
    onOpenChange: null,
  };

  static initialize(element: HTMLElement, options: ArvoComboboxOptions): ArvoCombobox {
    return new ArvoCombobox(element, options);
  }

  constructor(element: HTMLElement, options: ArvoComboboxOptions) {
    this._element = element;
    this._id = `arvo-combobox-${++_idCounter}`;

    this._options = {
      ...ArvoCombobox.DEFAULTS,
      ...options,
      items: options.items ?? [],
      width: options.width ?? null,
      maxHeight: options.maxHeight ?? null,
      errorMsg: options.errorMsg ?? null,
      inputValue: options.inputValue ?? null,
      filterFn: options.filterFn ?? null,
      optionListProps: options.optionListProps ?? null,
      contextHelp: options.contextHelp ?? null,
      icon: options.icon ?? null,
      prefix: options.prefix ?? null,
      prefixTooltip: options.prefixTooltip ?? null,
      onChange: options.onChange ?? null,
      onInputChange: options.onInputChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onClear: options.onClear ?? null,
      onOpenChange: options.onOpenChange ?? null,
    };

    this._isDisabled = this._options.isDisabled;
    this._isLoading = this._options.isLoading === true;
    this._isReadonly = this._options.isReadOnly;

    // Controlled `value` wins; otherwise fall back to uncontrolled `defaultValue`.
    this._value =
      options.value !== undefined ? options.value : (options.defaultValue ?? null);

    // Resolve initial input text. Controlled `inputValue` wins; otherwise
    // mirror the selected option's label so the field shows the current
    // selection when nothing has been typed (matches React's initialInputText).
    if (options.inputValue !== undefined) {
      this._inputText = options.inputValue;
    } else if (this._value != null) {
      const allFlat = flattenItems(this._options.items);
      const found = allFlat.find((item) => item.value === this._value);
      this._inputText = found?.label ?? '';
    }

    this._boundHandleInputInput = this._handleInputInput.bind(this);
    this._boundHandleInputKeyDown = this._handleInputKeyDown.bind(this);
    this._boundHandleAffixMouseDown = this._handleAffixMouseDown.bind(this);
    this._boundHandleFieldMouseDown = this._handleFieldMouseDown.bind(this);

    this._buildRoot();
    this._applyRootClasses();
    this._applyWidthStyle();
    this._setupOptionList();
    this._setupResizeObserver();

    // Initial open state. Controlled `isOpen` wins over `defaultOpen`. Opened
    // silently (no onOpen/onOpenChange/combobox:open) to mirror React seeding
    // open state via useState(defaultOpen).
    const initialOpen =
      options.isOpen !== undefined ? options.isOpen : (options.defaultOpen ?? false);
    if (initialOpen) this._doOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Root DOM Build
  // ---------------------------------------------------------------------------

  private _buildRoot(): void {
    const el = this._element!;

    if (this._options.label) {
      const lbl = ArvoFormLabel.initialize(null, {
        text: this._options.label,
        for: `${this._id}-input`,
        isRequired: this._options.isRequired,
        contextHelp: this._options.contextHelp,
      }).el as HTMLLabelElement;
      lbl.id = `${this._id}-lbl`;
      lbl.classList.add('arvo-combobox__lbl');
      el.appendChild(lbl);
      this._labelEl = lbl;
    }

    this._fieldEl = document.createElement('div');
    this._fieldEl.className = 'arvo-combobox__field';
    this._fieldEl.addEventListener('mousedown', this._boundHandleFieldMouseDown);

    // Leading icon / prefix / separator -- inline flex children of __field
    // before __input. Shared `form-input-affix` pattern.
    if (this._options.icon) {
      this._icoEl = document.createElement('i');
      this._icoEl.className = `arvo-combobox__ico o9con o9con-${this._options.icon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._icoEl);
    }

    const hasPrefix =
      typeof this._options.prefix === 'string' && this._options.prefix.length > 0;
    if (hasPrefix) {
      this._prefixEl = document.createElement('span');
      this._prefixEl.className = 'arvo-combobox__prefix';
      this._prefixEl.setAttribute('aria-hidden', 'true');
      this._prefixEl.textContent = this._options.prefix as string;
      this._fieldEl.appendChild(this._prefixEl);

      this._prefixSepEl = document.createElement('span');
      this._prefixSepEl.className = 'arvo-combobox__prefix-sep';
      this._prefixSepEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._prefixSepEl);

      if (this._options.prefixTooltip) {
        this._prefixConnector = connectTooltip(tooltipManager, {
          anchor: this._prefixEl,
          content: this._options.prefixTooltip,
        });
      }
    }

    // Native text input -- role="combobox", the focused element AND the trigger
    // the composed ArvoOptionList anchors to (bindTrigger:false so the field's
    // input handler drives open-on-type; chevron click drives open-on-click).
    this._inputEl = document.createElement('input');
    this._inputEl.type = 'text';
    this._inputEl.id = `${this._id}-input`;
    this._inputEl.className = 'arvo-combobox__input';
    this._inputEl.setAttribute('role', 'combobox');
    this._inputEl.setAttribute('autocomplete', 'off');
    this._inputEl.setAttribute('aria-autocomplete', 'list');
    this._inputEl.value = this._inputText;

    if (this._options.placeholder) {
      this._inputEl.placeholder = this._options.placeholder;
    }
    if (this._isDisabled) {
      this._inputEl.disabled = true;
      this._inputEl.setAttribute('aria-disabled', 'true');
    }
    if (this._isReadonly) {
      this._inputEl.readOnly = true;
    }
    if (this._options.isRequired) {
      this._inputEl.setAttribute('aria-required', 'true');
    }
    if (this._options.isInvalid) {
      this._inputEl.setAttribute('aria-invalid', 'true');
    }
    if (this._isLoading) {
      this._inputEl.setAttribute('aria-busy', 'true');
    }
    if (this._labelEl) {
      this._inputEl.setAttribute('aria-labelledby', `${this._id}-lbl`);
    } else {
      // Fallback accessible name when no visible label is rendered. Mirrors
      // the React twin so SR users hear an accessible name.
      this._inputEl.setAttribute(
        'aria-label',
        this._options.placeholder || 'Combobox',
      );
    }

    this._inputEl.addEventListener('input', this._boundHandleInputInput);
    this._inputEl.addEventListener('keydown', this._boundHandleInputKeyDown);
    this._fieldEl.appendChild(this._inputEl);

    // Wire affix pointer-down forwarding now that the input exists. Each
    // affix forwards focus to the input via preventDefault + focus().
    if (this._icoEl) {
      this._icoEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._prefixEl) {
      this._prefixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
    }

    // Actions cluster (clear + sep + optional err-ico). Absolutely positioned
    // via form-input-actions-overlay; a ResizeObserver sets --arvo-combobox-pad-r.
    this._actionsEl = document.createElement('div');
    this._actionsEl.className = 'arvo-combobox__actions';

    if (this._options.isClearable) {
      this._clearEl = document.createElement('button');
      this._clearBtn = ArvoIconButton.initialize(this._clearEl as HTMLButtonElement, {
        variant: 'tertiary',
        size: 'xs',
        icon: 'close',
        tooltip: 'Clear',
        isDisabled: this._isDisabled,
        onClick: (e: Event) => {
          e.stopPropagation();
          this.clear();
        },
      });
      this._clearEl.classList.add('arvo-combobox__clear');
      this._clearEl.setAttribute('tabindex', '-1');
      this._actionsEl.appendChild(this._clearEl);

      this._sepEl = document.createElement('span');
      this._sepEl.className = 'arvo-combobox__sep';
      this._sepEl.setAttribute('aria-hidden', 'true');
      this._actionsEl.appendChild(this._sepEl);
    }

    if (this._options.errorDisplay === 'tooltip') {
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: this._options.errorMsg ?? null,
      });
      this._errIcoEl = this._errMsgAlert.el;
      this._errIcoEl.classList.add('arvo-combobox__err-ico');
      if (this._options.errorMsg) {
        this._errIcoConnector = connectTooltip(tooltipManager, {
          anchor: this._errIcoEl,
          content: this._options.errorMsg,
        });
      }
      this._actionsEl.appendChild(this._errIcoEl);
    }

    this._fieldEl.appendChild(this._actionsEl);

    // Chevron sibling of the actions cluster -- always visible while typing.
    this._chevronEl = document.createElement('button');
    this._chevronBtn = ArvoIconButton.initialize(this._chevronEl as HTMLButtonElement, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'angle-down',
      tooltip: 'Toggle menu',
      isDisabled: this._isDisabled,
      onClick: (e: Event) => this._handleChevronClick(e),
    });
    this._chevronEl.classList.add('arvo-combobox__chevron');
    this._chevronEl.setAttribute('tabindex', '-1');
    this._fieldEl.appendChild(this._chevronEl);

    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-combobox__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    if (
      this._options.isInvalid &&
      this._options.errorMsg &&
      this._options.errorDisplay === 'inline'
    ) {
      this._alertEl = this._buildInlineAlert(this._options.errorMsg);
      if (this._alertEl) {
        this._inputEl.setAttribute('aria-describedby', `${this._id}-err`);
        el.appendChild(this._alertEl);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Composed OptionList
  // ---------------------------------------------------------------------------

  private _setupOptionList(): void {
    if (!this._inputEl || !this._fieldEl) return;
    // Hybrid options surface: spread the optionListProps bag first so the
    // field's flat / parent-computed options always win on overlap.
    const listOptions: ArvoOptionListOptions = {
      ...(this._options.optionListProps ?? undefined),
      items: this._filteredItems(),
      value: this._value,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      isDisabled: this._isDisabled,
      ariaLabel: this._options.label || undefined,
      // The field drives close on select so it can honor onChange returning
      // false; the inner list never auto-closes.
      closeOnSelect: false,
      // The field owns trigger click (chevron toggles, typing opens); the
      // list only wires ARIA + keyboard navigation. The keydown listener
      // attaches to the field (the trigger element); input keystrokes
      // bubble up to it.
      bindTrigger: false,
      // ARIA stays on the inner <input role="combobox"> per the
      // descriptor's ARIA 1.2 combobox prescription. `triggerAriaElement`
      // redirects haspopup / controls / expanded; `activeDescendantElement`
      // does the same for aria-activedescendant.
      triggerAriaElement: this._inputEl,
      activeDescendantElement: this._inputEl,
      onChange: (detail) => this._handleOptionChange(detail),
      onOpenChange: (open) => this._handleListOpenChange(open),
    };
    // The FIELD is the engine's trigger: it owns positioning (panel width
    // matches the field, not the narrower input), outside-click dismissal
    // (chevron + clear + leading icon are siblings of the input but live
    // inside the field, so their clicks are correctly treated as "inside"
    // and never trip a close-then-reopen race against the chevron's toggle
    // handler), and the keydown listener target for the engine's open-state
    // navigation.
    this._optionList = ArvoOptionList.initialize(this._fieldEl, listOptions);
  }

  private _filteredItems():
    | ComboboxOptionData[]
    | ListGroup<ComboboxOptionData>[] {
    // When the input text exactly matches the selected option's label, the
    // user hasn't actively filtered -- they're just looking at the current
    // selection echoed in the field (the initial seed when `value` /
    // `defaultValue` is set, or the value just chosen from the panel). Show
    // every option so the user can pick another without first having to
    // clear the input. The moment the user edits the text so it no longer
    // matches the selected label, `_handleInputInput` clears the value and
    // filtering resumes normally.
    if (this._value != null) {
      const allFlat = flattenItems(this._options.items);
      const sel = allFlat.find((item) => item.value === this._value);
      if (sel && sel.label === this._inputText) {
        return this._options.items;
      }
    }
    return applyFilter(this._options.items, this._inputText, this._options.filterFn);
  }

  private _refreshOptionListItems(): void {
    this._optionList?.setItems(this._filteredItems());
    this._optionList?.value(this._value);
  }

  // ---------------------------------------------------------------------------
  // CSS Classes
  // ---------------------------------------------------------------------------

  private _applyRootClasses(): void {
    const el = this._element;
    if (!el) return;

    const hasValue = this._value != null || this._inputText.length > 0;
    const hasPrefix =
      typeof this._options.prefix === 'string' && this._options.prefix.length > 0;

    el.classList.add('arvo-combobox', `arvo-combobox--${this._options.size}`, `arvo-combobox--surface-${this._options.surface}`);
    el.classList.toggle('arvo-combobox--full-width', this._options.isFullWidth);
    el.classList.toggle('arvo-combobox--clearable', this._options.isClearable);
    el.classList.toggle('arvo-combobox--has-prefix', hasPrefix);
    el.classList.toggle('loading', this._isLoading);
    el.classList.toggle('is-disabled', this._isDisabled);
    el.classList.toggle('is-readonly', this._isReadonly);
    el.classList.toggle('has-error', this._options.isInvalid);
    el.classList.toggle(
      'error-tooltip',
      this._options.isInvalid && this._options.errorDisplay === 'tooltip',
    );
    el.classList.toggle('open', this._isOpen);
    el.classList.toggle('has-value', hasValue);
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
  // Actions-overlay right padding (ResizeObserver)
  // ---------------------------------------------------------------------------

  private _updatePadding(): void {
    if (!this._actionsEl || !this._fieldEl) return;
    const w = this._actionsEl.offsetWidth;
    const pad = w > 0 ? w + 4 : 0;
    this._fieldEl.style.setProperty('--arvo-combobox-pad-r', `${pad}px`);
  }

  private _setupResizeObserver(): void {
    this._updatePadding();
    if (typeof ResizeObserver === 'undefined' || !this._actionsEl) return;
    this._resizeObs = new ResizeObserver(() => this._updatePadding());
    this._resizeObs.observe(this._actionsEl);
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private _handleInputInput(): void {
    if (this._isDisabled || this._isLoading || this._isReadonly) return;
    const text = this._inputEl?.value ?? '';
    this._inputText = text;

    this._options.onInputChange?.(text);

    // Clear the selected value if the typed text no longer matches the
    // selected option's label (Combobox is single-select; typed text drives
    // filtering while the user is editing).
    if (this._value != null) {
      const allFlat = flattenItems(this._options.items);
      const sel = allFlat.find((item) => item.value === this._value);
      if (sel && sel.label !== text) this._value = null;
    }

    this._applyRootClasses();

    this._element?.dispatchEvent(
      new CustomEvent('combobox:input', {
        bubbles: true,
        detail: { value: text },
      }),
    );

    // Typing opens the panel; an empty input does not (mirrors React + MultiSelect).
    if (!this._isOpen && text.length > 0) this.open();
    this._refreshOptionListItems();
  }

  private _handleInputKeyDown(e: KeyboardEvent): void {
    if (this._isDisabled || this._isLoading || this._isReadonly) return;

    // Open-on-arrow when closed (the composed ArvoOptionList only wires
    // navigation handlers while open; the field owns the closed-state open).
    if (!this._isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.open();
      return;
    }

    // Escape when closed: clear typed text + selected value.
    if (e.key === 'Escape' && !this._isOpen) {
      if (this._inputText.length === 0 && this._value == null) return;
      e.preventDefault();
      this._inputText = '';
      this._value = null;
      if (this._inputEl) this._inputEl.value = '';
      this._applyRootClasses();
      this._refreshOptionListItems();
    }
  }

  private _handleChevronClick(e: Event): void {
    e.stopPropagation();
    if (this._isDisabled || this._isLoading || this._isReadonly) return;
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
      this._inputEl?.focus({ preventScroll: true });
    }
  }

  private _handleAffixMouseDown(event: MouseEvent): void {
    // Forward pointer focus to the inner <input> without selecting the
    // non-editable icon / prefix span. `_handleFieldMouseDown` already
    // preventDefaults this target on bubble, but we still need the
    // explicit focus call because the icon / prefix elements are not
    // focusable themselves.
    event.preventDefault();
    this._inputEl?.focus();
  }

  /**
   * Mousedown on the field. Preserves input focus during clicks on
   * non-input affordances (chevron, clear, actions cluster, leading
   * icon, prefix, the field background between them). Without this,
   * the browser moves focus to the click target on mousedown -- the
   * input would blur, the focus-within border styling would drop, and
   * any selection in the input would clear. The actual click handler
   * still runs on the target; we only suppress the focus shift.
   *
   * Required by the trigger-on-field overlay wiring: the chevron sits
   * inside the field (trigger boundary), so its click is correctly
   * treated as "inside" by the hub's outside-click dismissal, but we
   * still want pointer interactions across the field to feel like one
   * continuous interaction surface with the input as the focused
   * element.
   */
  private _handleFieldMouseDown(event: MouseEvent): void {
    if (this._isDisabled || this._isLoading || this._isReadonly) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Mousedown on the input itself: let the browser focus it normally.
    if (target === this._inputEl) return;
    if (target.tagName === 'INPUT') return;
    // For every other target inside the field, prevent the default
    // focus shift so the input keeps focus across the click.
    event.preventDefault();
  }

  // ---------------------------------------------------------------------------
  // Selection (driven by the composed ArvoOptionList)
  // ---------------------------------------------------------------------------

  private _handleOptionChange(detail: {
    value: unknown | unknown[];
    option: ComboboxOptionData;
    isSelected: boolean;
  }): void {
    const allFlat = flattenItems(this._options.items);
    const index = allFlat.findIndex((i) => i.id === detail.option.id);
    const result = this._options.onChange?.(detail.option, index);

    this._value = detail.value;
    this._inputText = detail.option.label;
    if (this._inputEl) this._inputEl.value = this._inputText;
    this._applyRootClasses();
    this._refreshOptionListItems();

    this._element?.dispatchEvent(
      new CustomEvent('combobox:change', {
        bubbles: true,
        cancelable: true,
        detail: { item: detail.option, index },
      }),
    );

    if (result !== false && this._options.closeOnSelect) {
      this.close();
    }
  }

  // Hub-driven dismissal (outside-click / Escape) reports here.
  private _handleListOpenChange(open: boolean): void {
    if (open) {
      // The inner list opened itself; keep the field in sync (rare; the field
      // is the source of truth for open, but guard for completeness).
      if (!this._isOpen) {
        this._isOpen = true;
        this._applyRootClasses();
        this._options.onOpenChange?.(true);
      }
      return;
    }
    if (!this._isOpen) return;
    // Engine-driven dismissal is unconditional, matching Select's contract:
    // only field-driven / programmatic / close-on-select closes honor
    // onClose. Sync state silently here.
    this._isOpen = false;
    this._applyRootClasses();
    this._options.onOpenChange?.(false);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    this._doOpen(false);
  }

  // `silent` skips the onOpen guard, the cancelable combobox:open event, and
  // the onOpenChange callback. Used for initial-open seeded by isOpen /
  // defaultOpen so init mirrors React's non-firing useState(defaultOpen).
  private _doOpen(silent: boolean): void {
    if (
      this._isOpen ||
      this._isDisabled ||
      this._isLoading ||
      this._isReadonly
    ) {
      return;
    }
    if (!silent && this._options.onOpen?.() === false) return;

    if (!silent) {
      const event = new CustomEvent('combobox:open', {
        bubbles: true,
        cancelable: true,
      });
      if (!this._element?.dispatchEvent(event)) return;
    }

    this._isOpen = true;
    this._applyRootClasses();
    this._optionList?.open();

    if (!silent) this._options.onOpenChange?.(true);
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._doClose()) {
      this._optionList?.close();
    }
  }

  // Runs the cancellable close gates (onClose + cancelable combobox:close) and
  // the shared state / class / onOpenChange side effects. Returns false when
  // vetoed.
  private _doClose(): boolean {
    if (this._options.onClose?.() === false) return false;

    const event = new CustomEvent('combobox:close', {
      bubbles: true,
      cancelable: true,
    });
    if (!this._element?.dispatchEvent(event)) return false;

    this._isOpen = false;
    this._applyRootClasses();
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

  value(newValue?: unknown): unknown | void {
    if (newValue === undefined) return this._value;

    this._value = newValue;

    const allFlat = flattenItems(this._options.items);
    const item = allFlat.find((i) => i.value === newValue);

    this._inputText = item?.label ?? '';
    if (this._inputEl) this._inputEl.value = this._inputText;
    this._applyRootClasses();
    this._refreshOptionListItems();

    if (item) {
      const idx = allFlat.indexOf(item);
      this._element?.dispatchEvent(
        new CustomEvent('combobox:change', {
          bubbles: true,
          cancelable: true,
          detail: { item, index: idx },
        }),
      );
    }
  }

  inputValue(text?: string): string | void {
    if (text === undefined) return this._inputText;

    this._inputText = text;
    if (this._inputEl) this._inputEl.value = text;
    this._applyRootClasses();
    this._refreshOptionListItems();
  }

  // ---------------------------------------------------------------------------
  // Affix slot getters/setters (form-input-affix pattern)
  // ---------------------------------------------------------------------------

  icon(): string | null;
  icon(name: string | null): void;
  icon(name?: string | null): string | null | void {
    if (name === undefined) return this._options.icon;

    const next = name && name.length > 0 ? name : null;
    this._options.icon = next;

    if (next) {
      if (this._icoEl) {
        this._icoEl.className = `arvo-combobox__ico o9con o9con-${next}`;
      } else if (this._fieldEl) {
        this._icoEl = document.createElement('i');
        this._icoEl.className = `arvo-combobox__ico o9con o9con-${next}`;
        this._icoEl.setAttribute('aria-hidden', 'true');
        this._icoEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._fieldEl.insertBefore(this._icoEl, this._fieldEl.firstChild);
      }
    } else if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  prefix(): string | null;
  prefix(value: string | null): void;
  prefix(value?: string | null): string | null | void {
    if (value === undefined) return this._options.prefix;

    const next = value && value.length > 0 ? value : null;
    this._options.prefix = next;

    if (next) {
      if (this._prefixEl) {
        this._prefixEl.textContent = next;
      } else if (this._fieldEl && this._inputEl) {
        const anchor = this._icoEl ? this._icoEl.nextSibling : this._fieldEl.firstChild;

        this._prefixEl = document.createElement('span');
        this._prefixEl.className = 'arvo-combobox__prefix';
        this._prefixEl.setAttribute('aria-hidden', 'true');
        this._prefixEl.textContent = next;
        this._prefixEl.addEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._fieldEl.insertBefore(this._prefixEl, anchor);

        this._prefixSepEl = document.createElement('span');
        this._prefixSepEl.className = 'arvo-combobox__prefix-sep';
        this._prefixSepEl.setAttribute('aria-hidden', 'true');
        this._fieldEl.insertBefore(this._prefixSepEl, anchor);
      }
      if (this._options.prefixTooltip && !this._prefixConnector && this._prefixEl) {
        this._prefixConnector = connectTooltip(tooltipManager, {
          anchor: this._prefixEl,
          content: this._options.prefixTooltip,
        });
      }
    } else {
      this._prefixConnector?.destroy();
      this._prefixConnector = null;
      if (this._prefixEl) {
        this._prefixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
        this._prefixEl.remove();
        this._prefixEl = null;
      }
      this._prefixSepEl?.remove();
      this._prefixSepEl = null;
    }
    this._applyRootClasses();
  }

  clear(): void {
    const previousValue = this._value;
    if (previousValue == null && this._inputText === '') return;

    this._value = null;
    this._inputText = '';
    if (this._inputEl) this._inputEl.value = '';
    this._applyRootClasses();
    this._refreshOptionListItems();

    this._options.onClear?.({ previousValue });

    this._element?.dispatchEvent(
      new CustomEvent('combobox:clear', {
        bubbles: true,
        cancelable: false,
        detail: { previousValue },
      }),
    );

    this._inputEl?.focus({ preventScroll: true });
  }

  updateItems(items: ComboboxOptionData[] | ListGroup<ComboboxOptionData>[]): void {
    this._options.items = items;
    this._refreshOptionListItems();

    // Update input text if value is set and not currently being edited.
    if (this._value != null && !this._isOpen) {
      const allFlat = flattenItems(items);
      const found = allFlat.find((item) => item.value === this._value);
      if (found) {
        this._inputText = found.label;
        if (this._inputEl) this._inputEl.value = this._inputText;
      }
    }
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._isDisabled;

    this._isDisabled = state;
    this._options.isDisabled = state;

    if (this._inputEl) {
      this._inputEl.disabled = state;
      if (state) {
        this._inputEl.setAttribute('aria-disabled', 'true');
        if (this._isOpen) this.close();
      } else {
        this._inputEl.removeAttribute('aria-disabled');
      }
    }

    this._clearBtn?.disabled(state);
    this._chevronBtn?.disabled(state);
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
      this._inputEl?.removeAttribute('aria-invalid');
      this._inputEl?.removeAttribute('aria-describedby');

      if (this._alertEl) {
        this._inlineAlert?.destroy();
        this._inlineAlert = null;
        this._alertEl.remove();
        this._alertEl = null;
      }
      if (this._errIcoEl) {
        this._errMsgAlert?.message(null);
        this._errIcoConnector?.destroy();
        this._errIcoConnector = null;
      }
    } else {
      this._options.isInvalid = true;
      this._options.errorMsg = message;
      this._element?.classList.add('has-error');
      this._element?.classList.toggle('error-tooltip', useTooltipError);
      this._inputEl?.setAttribute('aria-invalid', 'true');

      if (useTooltipError) {
        if (this._errIcoEl) {
          this._errMsgAlert?.message(message);
          if (this._errIcoConnector) {
            this._errIcoConnector.update({ content: message });
          } else {
            this._errIcoConnector = connectTooltip(tooltipManager, {
              anchor: this._errIcoEl,
              content: message,
            });
          }
        }
      } else if (useInlineAlert) {
        if (this._alertEl) {
          this._inlineAlert?.message(message);
        } else {
          this._alertEl = this._buildInlineAlert(message);
          if (this._alertEl) {
            this._element?.appendChild(this._alertEl);
          }
        }
        this._inputEl?.setAttribute(
          'aria-describedby',
          `${this._id}-err`,
        );
      }
    }
  }

  private _buildInlineAlert(message: string): HTMLElement | null {
    this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
      type: 'negative',
      message,
      id: `${this._id}-err`,
    });
    this._alertEl = this._inlineAlert.el;
    return this._alertEl;
  }

  setLoading(isLoading: boolean): void {
    this._isLoading = isLoading;
    this._options.isLoading = isLoading;

    this._element?.classList.toggle('loading', isLoading);

    if (isLoading) {
      this._inputEl?.setAttribute('aria-busy', 'true');
      if (this._isOpen) this.close();
    } else {
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

    this._inputEl?.removeEventListener('input', this._boundHandleInputInput);
    this._inputEl?.removeEventListener('keydown', this._boundHandleInputKeyDown);

    if (this._fieldEl) {
      this._fieldEl.removeEventListener('mousedown', this._boundHandleFieldMouseDown);
    }

    if (this._icoEl) {
      this._icoEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    if (this._prefixEl) {
      this._prefixEl.removeEventListener('mousedown', this._boundHandleAffixMouseDown);
    }
    this._prefixConnector?.destroy();
    this._prefixConnector = null;

    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;

    this._clearBtn?.destroy();
    this._clearBtn = null;

    this._chevronBtn?.destroy();
    this._chevronBtn = null;

    this._resizeObs?.disconnect();
    this._resizeObs = null;

    if (this._element) {
      this._element.textContent = '';
      this._element.className = '';
      this._element.style.removeProperty('--arvo-form-input-width');
    }

    this._isOpen = false;
    this._element = null;
    this._fieldEl = null;
    this._inputEl = null;
    this._icoEl = null;
    this._prefixEl = null;
    this._prefixSepEl = null;
    this._actionsEl = null;
    this._clearEl = null;
    this._sepEl = null;
    this._errIcoEl = null;
    this._chevronEl = null;
    this._borderEl = null;
    this._labelEl = null;
    this._alertEl = null;
  }
}
