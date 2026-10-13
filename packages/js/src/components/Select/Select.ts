import { connectTooltip, tooltipManager } from '@arvo/core';
import type { ListItemBase, ListGroup, TooltipConnector } from '@arvo/core';
import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';
import { ArvoOptionList } from '../OptionList/OptionList';
import type { ArvoOptionListOptions } from '../OptionList/OptionList';
import type { MenuSearchProp } from '../../types/menu-search';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectOptionData extends ListItemBase {
  value: unknown;
}

/**
 * Scoped escape-hatch bag for inner `ArvoOptionList` config the field does not
 * curate as a flat option. Mirrors React `SelectOptionListProps` exactly --
 * the drift reviewer enforces key-set parity.
 */
export type SelectOptionListProps = Pick<
  ArvoOptionListOptions,
  'emptyConfig' | 'variant' | 'isCreatable' | 'onCreate'
>;

export interface ArvoSelectOptions {
  items: SelectOptionData[] | ListGroup<SelectOptionData>[];
  /** Controlled/initial selected value. Update after init via value(). */
  value?: unknown;
  /** Uncontrolled initial value. Used only when value is omitted. */
  defaultValue?: unknown;
  placeholder?: string;
  /**
   * Optional leading icon name (without the `o9con-` prefix) rendered inside
   * the trigger before the value / placeholder display. 16px square;
   * recolored by parent state through the shared `form-input-affix` pattern.
   * The dropdown chevron is a separate slot (`__chevron`).
   */
  icon?: string;
  label?: string;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMsg?: string;
  errorDisplay?: 'inline' | 'tooltip' | 'none';
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  /** Enable search with defaults (`true`) or pass a config object. */
  search?: MenuSearchProp;
  isLoading?: boolean;
  isReadOnly?: boolean;
  width?: string;
  isFullWidth?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  maxHeight?: string;
  hasGroupDividers?: boolean;
  closeOnSelect?: boolean;
  /** Initial open state (parity with React's controlled isOpen). Drive after init via open()/close()/toggle(). */
  isOpen?: boolean;
  /** Uncontrolled initial open state. Used only when isOpen is omitted. */
  defaultOpen?: boolean;
  onChange?: (item: SelectOptionData | null, index: number) => boolean | void;
  onOpen?: () => boolean | void;
  onClose?: () => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Scoped escape-hatch bag for inner `ArvoOptionList` options the field does
   * not curate flat (e.g. `emptyConfig`, `variant`, `isCreatable`,
   * `onCreate`). Spread first so the field's flat / computed options always
   * win on overlap.
   */
  optionListProps?: SelectOptionListProps;
}

type RequiredSelectOptions = Required<
  Omit<
    ArvoSelectOptions,
    | 'onChange' | 'onOpen' | 'onClose' | 'onOpenChange' | 'maxHeight' | 'errorMsg' | 'search' | 'width' | 'optionListProps' | 'contextHelp' | 'icon'
    // Init-only seeds read from the raw options in the constructor.
    | 'defaultValue' | 'isOpen' | 'defaultOpen'
  >
> & {
  search: MenuSearchProp | undefined;
  width: string | null;
  maxHeight: string | null;
  errorMsg: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  optionListProps: SelectOptionListProps | null;
  icon: string | null;
  onChange: ((item: SelectOptionData | null, index: number) => boolean | void) | null;
  onOpen: (() => boolean | void) | null;
  onClose: (() => boolean | void) | null;
  onOpenChange: ((isOpen: boolean) => void) | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _idCounter = 0;

function isGrouped(
  items: SelectOptionData[] | ListGroup<SelectOptionData>[],
): items is ListGroup<SelectOptionData>[] {
  return items.length > 0 && 'items' in items[0];
}

function flattenItems(
  items: SelectOptionData[] | ListGroup<SelectOptionData>[],
): SelectOptionData[] {
  if (isGrouped(items)) {
    const result: SelectOptionData[] = [];
    for (const group of items) {
      for (const item of group.items) result.push(item);
    }
    return result;
  }
  return items as SelectOptionData[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ArvoSelect {
  private _element: HTMLElement | null;
  private _options: RequiredSelectOptions;

  // DOM
  private _fieldEl: HTMLElement | null = null;
  private _displayEl: HTMLSpanElement | null = null;
  private _icoEl: HTMLElement | null = null;
  private _errIcoEl: HTMLElement | null = null;
  private _errIcoConnector: TooltipConnector | null = null;
  private _chevronEl: HTMLElement | null = null;
  private _borderEl: HTMLElement | null = null;
  private _hiddenInputEl: HTMLInputElement | null = null;
  private _labelEl: HTMLLabelElement | null = null;
  private _alertEl: HTMLElement | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _errMsgAlert: ArvoMessageAlert | null = null;

  // Composed floating listbox overlay (owns positioning, dismissal, option
  // rendering, keyboard navigation, and search).
  private _optionList: ArvoOptionList | null = null;

  // State
  private _isOpen = false;
  private _isDisabled = false;
  private _isLoading = false;
  private _isReadonly = false;
  private _isSearchable = false;
  private _value: unknown = null;
  private _id: string;

  // Bound handlers
  private _boundHandleFieldClick: (e: Event) => void;
  private _boundHandleFieldKeyDown: (e: KeyboardEvent) => void;

  static readonly DEFAULTS: RequiredSelectOptions = {
    items: [],
    value: undefined as unknown,
    placeholder: '',
    icon: null,
    label: '',
    contextHelp: null,
    isDisabled: false,
    isRequired: false,
    isInvalid: false,
    errorMsg: null,
    errorDisplay: 'inline',
    size: 'lg',
    surface: 'filled',
    search: undefined,
    isLoading: false,
    isReadOnly: false,
    width: null,
    isFullWidth: false,
    placement: 'bottom-start',
    maxHeight: null,
    hasGroupDividers: true,
    closeOnSelect: true,
    optionListProps: null,
    onChange: null,
    onOpen: null,
    onClose: null,
    onOpenChange: null,
  };

  static initialize(element: HTMLElement, options: ArvoSelectOptions): ArvoSelect {
    return new ArvoSelect(element, options);
  }

  constructor(element: HTMLElement, options: ArvoSelectOptions) {
    this._element = element;
    this._id = `arvo-sel-${++_idCounter}`;

    this._options = {
      ...ArvoSelect.DEFAULTS,
      ...options,
      items: options.items ?? [],
      width: options.width ?? null,
      maxHeight: options.maxHeight ?? null,
      errorMsg: options.errorMsg ?? null,
      contextHelp: options.contextHelp ?? null,
      optionListProps: options.optionListProps ?? null,
      icon: options.icon ?? null,
      onChange: options.onChange ?? null,
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onOpenChange: options.onOpenChange ?? null,
    };

    this._isDisabled = this._options.isDisabled;
    this._isLoading = this._options.isLoading === true;
    this._isReadonly = this._options.isReadOnly;
    this._isSearchable = !!this._options.search;
    // Controlled `value` wins; otherwise fall back to the uncontrolled
    // `defaultValue` seed (mirrors React's useControllableState).
    this._value =
      options.value !== undefined ? options.value : options.defaultValue ?? null;

    this._boundHandleFieldClick = this._handleFieldClick.bind(this);
    this._boundHandleFieldKeyDown = this._handleFieldKeyDown.bind(this);

    this._buildRoot();
    this._applyRootClasses();
    this._applyWidthStyle();
    this._updateValueDisplay();
    this._setupOptionList();

    // Initial open state. Controlled `isOpen` wins over uncontrolled
    // `defaultOpen`. Opened silently (no onOpen/onOpenChange/sel:open) to
    // mirror React seeding open state via useState(defaultOpen).
    const initialOpen =
      options.isOpen !== undefined ? options.isOpen : options.defaultOpen ?? false;
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
        for: `${this._id}-field`,
        isRequired: this._options.isRequired,
        contextHelp: this._options.contextHelp,
      }).el as HTMLLabelElement;
      lbl.id = `${this._id}-lbl`;
      lbl.classList.add('arvo-sel__lbl');
      el.appendChild(lbl);
      this._labelEl = lbl;
    }

    // The field IS the role="combobox" trigger (focusable). The composed
    // ArvoOptionList anchors to it and writes aria-haspopup / aria-controls /
    // aria-expanded / aria-activedescendant onto it.
    this._fieldEl = document.createElement('div');
    this._fieldEl.id = `${this._id}-field`;
    this._fieldEl.className = 'arvo-sel__field';
    this._fieldEl.setAttribute('role', 'combobox');
    this._fieldEl.setAttribute('tabindex', this._isDisabled ? '-1' : '0');

    if (this._options.isRequired) {
      this._fieldEl.setAttribute('aria-required', 'true');
    }
    if (this._options.isInvalid) {
      this._fieldEl.setAttribute('aria-invalid', 'true');
    }
    if (this._isDisabled) {
      this._fieldEl.setAttribute('aria-disabled', 'true');
    }
    if (this._isLoading) {
      this._fieldEl.setAttribute('aria-busy', 'true');
    }
    if (this._labelEl) {
      this._fieldEl.setAttribute('aria-labelledby', `${this._id}-lbl`);
    } else {
      // Fallback accessible name when no visible label is rendered. Mirrors
      // the React twin (Select.tsx) so SR users hear an option name even
      // when consumers omit `label`.
      this._fieldEl.setAttribute(
        'aria-label',
        this._options.placeholder || 'Select',
      );
    }

    // Register the field handlers BEFORE constructing the OptionList so they
    // run before the OptionList's own trigger keydown (open-while-closed +
    // closed type-ahead are owned by the field, mirroring React).
    this._fieldEl.addEventListener('click', this._boundHandleFieldClick);
    this._fieldEl.addEventListener('keydown', this._boundHandleFieldKeyDown);

    // Leading icon (shared form-input-affix pattern), rendered as the first
    // flex child of __field when the `icon` option is set.
    if (this._options.icon) {
      this._icoEl = document.createElement('i');
      this._icoEl.className = `arvo-sel__ico o9con o9con-${this._options.icon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this._fieldEl.appendChild(this._icoEl);
    }

    // Value / placeholder display span (presentational).
    this._displayEl = document.createElement('span');
    this._displayEl.className = 'arvo-sel__input';
    this._fieldEl.appendChild(this._displayEl);

    if (this._options.errorDisplay === 'tooltip') {
      this._errMsgAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        type: 'negative',
        isInline: true,
        message: this._options.errorMsg ?? null,
      });
      this._errIcoEl = this._errMsgAlert.el;
      this._errIcoEl.classList.add('arvo-sel__err-ico');
      if (this._options.errorMsg) {
        this._errIcoConnector = connectTooltip(tooltipManager, {
          anchor: this._errIcoEl,
          content: this._options.errorMsg,
        });
      }
      this._fieldEl.appendChild(this._errIcoEl);
    }

    this._chevronEl = document.createElement('span');
    this._chevronEl.className = 'arvo-sel__chevron o9con o9con-angle-down';
    this._chevronEl.setAttribute('aria-hidden', 'true');
    this._fieldEl.appendChild(this._chevronEl);

    this._borderEl = document.createElement('div');
    this._borderEl.className = 'arvo-sel__border';
    this._fieldEl.appendChild(this._borderEl);

    el.appendChild(this._fieldEl);

    this._hiddenInputEl = document.createElement('input');
    this._hiddenInputEl.type = 'hidden';
    this._hiddenInputEl.name = el.getAttribute('data-name') ?? '';
    el.appendChild(this._hiddenInputEl);

    if (this._options.isInvalid && this._options.errorMsg && this._options.errorDisplay === 'inline') {
      this._alertEl = this._buildInlineAlert(this._options.errorMsg);
      if (this._alertEl) {
        this._fieldEl.setAttribute('aria-describedby', `${this._id}-err`);
        el.appendChild(this._alertEl);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Composed OptionList
  // ---------------------------------------------------------------------------

  private _setupOptionList(): void {
    if (!this._fieldEl) return;
    // Hybrid options surface: spread the optionListProps bag first so the
    // field's flat / parent-computed options always win on overlap.
    const listOptions: ArvoOptionListOptions = {
      ...(this._options.optionListProps ?? undefined),
      items: this._options.items,
      value: this._value,
      search: this._options.search,
      placement: this._options.placement,
      maxHeight: this._options.maxHeight ?? undefined,
      hasGroupDividers: this._options.hasGroupDividers,
      isDisabled: this._isDisabled,
      ariaLabel: this._options.label || undefined,
      // The field drives close-on-select so it can honor onChange returning
      // false; the inner list never auto-closes.
      closeOnSelect: false,
      // The field owns trigger click (toggle); the list only wires ARIA +
      // keyboard navigation onto it.
      bindTrigger: false,
      onChange: (detail) => this._handleOptionChange(detail),
      onOpenChange: (open) => this._handleListOpenChange(open),
    };
    this._optionList = ArvoOptionList.initialize(this._fieldEl, listOptions);
  }

  // ---------------------------------------------------------------------------
  // CSS Classes
  // ---------------------------------------------------------------------------

  private _applyRootClasses(): void {
    const el = this._element;
    if (!el) return;

    el.classList.add('arvo-sel', `arvo-sel--${this._options.size}`, `arvo-sel--surface-${this._options.surface}`);
    el.classList.toggle('arvo-sel--full-width', this._options.isFullWidth);
    el.classList.toggle('arvo-sel--filterable', this._isSearchable);
    el.classList.toggle('loading', this._isLoading);
    el.classList.toggle('is-disabled', this._isDisabled);
    el.classList.toggle('is-readonly', this._isReadonly);
    el.classList.toggle('has-error', this._options.isInvalid);
    el.classList.toggle('error-tooltip', this._options.isInvalid && this._options.errorDisplay === 'tooltip');
    el.classList.toggle('open', this._isOpen);
    el.classList.toggle('has-value', this._value != null);
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
  // Value Display
  // ---------------------------------------------------------------------------

  private _updateValueDisplay(): void {
    if (!this._displayEl) return;

    const selectedItem = this._getAllFlatItems().find((item) => item.value === this._value);

    if (selectedItem) {
      this._displayEl.className = 'arvo-sel__input';
      this._displayEl.textContent = selectedItem.label;
      this._element?.classList.add('has-value');
    } else if (this._options.placeholder) {
      this._displayEl.className = 'arvo-sel__placeholder';
      this._displayEl.textContent = this._options.placeholder;
      this._element?.classList.remove('has-value');
    } else {
      this._displayEl.className = 'arvo-sel__input';
      this._displayEl.textContent = '';
      this._element?.classList.remove('has-value');
    }

    if (this._hiddenInputEl) {
      this._hiddenInputEl.value = this._value != null ? String(this._value) : '';
    }
  }

  private _getAllFlatItems(): SelectOptionData[] {
    return flattenItems(this._options.items);
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private _handleFieldClick(): void {
    if (this._isDisabled || this._isLoading || this._isReadonly) return;
    this.toggle();
  }

  private _handleFieldKeyDown(e: KeyboardEvent): void {
    if (this._isDisabled || this._isLoading) return;
    // While open, the composed ArvoOptionList owns keyboard navigation; let its
    // (later-registered) trigger keydown handle it.
    if (this._isOpen) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // Prevent the OptionList's own trigger keydown from also opening.
      e.stopImmediatePropagation();
      this.open();
      return;
    }

    // Closed type-ahead: select the next option whose label starts with the
    // typed character, without opening the panel.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const allFlat = this._getAllFlatItems();
      const char = e.key.toLowerCase();
      const currentIdx =
        this._value != null
          ? allFlat.findIndex((item) => item.value === this._value)
          : -1;

      for (let i = 1; i <= allFlat.length; i++) {
        const idx = (currentIdx + i) % allFlat.length;
        const item = allFlat[idx];
        if (item && !item.isDisabled && item.label.toLowerCase().startsWith(char)) {
          this._value = item.value;
          this._optionList?.value(item.value);
          this._updateValueDisplay();
          this._applyRootClasses();
          this._options.onChange?.(item, idx);
          this._element?.dispatchEvent(
            new CustomEvent('sel:change', {
              bubbles: true,
              cancelable: true,
              detail: { item, index: idx },
            }),
          );
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Selection (driven by the composed ArvoOptionList)
  // ---------------------------------------------------------------------------

  private _handleOptionChange(detail: {
    value: unknown | unknown[];
    option: SelectOptionData;
    isSelected: boolean;
  }): void {
    this._value = detail.value;
    this._updateValueDisplay();
    this._applyRootClasses();

    const allFlat = this._getAllFlatItems();
    const index = allFlat.findIndex((i) => i.id === detail.option.id);
    const result = this._options.onChange?.(detail.option, index);

    this._element?.dispatchEvent(
      new CustomEvent('sel:change', {
        bubbles: true,
        cancelable: true,
        detail: { item: detail.option, index },
      }),
    );

    if (result !== false && this._options.closeOnSelect) {
      this.close();
    }
  }

  // OptionList reports hub-driven dismissal (outside click / Escape) here.
  // Picker-silent contract (architecture/20-OVERLAY-MIGRATION-NOTES.md):
  // engine-driven dismissal is unconditional -- no `sel:close` event, no
  // `onClose` veto. Only programmatic `close()` / field-driven toggle paths
  // route through `_doClose()` and honor those signals. Combobox is the
  // reference implementation.
  private _handleListOpenChange(open: boolean): void {
    if (open) {
      // OptionList opened itself; keep the field in sync (normally prevented by
      // the field keydown handler, but guard for completeness).
      if (!this._isOpen) {
        this._isOpen = true;
        this._element?.classList.add('open');
        this._options.onOpenChange?.(true);
      }
      return;
    }
    if (!this._isOpen) return;
    this._isOpen = false;
    this._element?.classList.remove('open');
    this._options.onOpenChange?.(false);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(): void {
    this._doOpen(false);
  }

  // `silent` skips the onOpen guard, the cancelable sel:open event, and the
  // onOpenChange callback. Used for the initial open seeded by isOpen /
  // defaultOpen so init mirrors React's non-firing useState(defaultOpen).
  private _doOpen(silent: boolean): void {
    if (this._isOpen || this._isDisabled || this._isLoading || this._isReadonly) return;
    if (!silent && this._options.onOpen?.() === false) return;

    if (!silent) {
      const event = new CustomEvent('sel:open', { bubbles: true, cancelable: true });
      if (!this._element?.dispatchEvent(event)) return;
    }

    this._isOpen = true;
    this._element?.classList.add('open');
    this._optionList?.open();

    if (!silent) this._options.onOpenChange?.(true);
  }

  close(): void {
    if (!this._isOpen) return;
    if (this._doClose()) {
      this._optionList?.close();
    }
  }

  // Runs the cancellable close gates (onClose + cancelable sel:close) and the
  // shared state/class/onOpenChange side effects. Returns false when vetoed.
  private _doClose(): boolean {
    if (this._options.onClose?.() === false) return false;

    const event = new CustomEvent('sel:close', { bubbles: true, cancelable: true });
    if (!this._element?.dispatchEvent(event)) return false;

    this._isOpen = false;
    this._element?.classList.remove('open');
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
    this._optionList?.value(newValue);
    this._updateValueDisplay();
    this._applyRootClasses();

    if (newValue == null) {
      this._element?.dispatchEvent(
        new CustomEvent('sel:change', {
          bubbles: true,
          cancelable: true,
          detail: { item: null, index: -1 },
        }),
      );
      return;
    }

    const allFlat = this._getAllFlatItems();
    const idx = allFlat.findIndex((item) => item.value === newValue);
    const item = idx >= 0 ? allFlat[idx] : null;

    if (item) {
      this._element?.dispatchEvent(
        new CustomEvent('sel:change', {
          bubbles: true,
          cancelable: true,
          detail: { item, index: idx },
        }),
      );
    }
  }

  updateItems(items: SelectOptionData[] | ListGroup<SelectOptionData>[]): void {
    this._options.items = items;
    this._optionList?.setItems(items);
    this._updateValueDisplay();
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._isDisabled;

    this._isDisabled = state;
    this._options.isDisabled = state;

    if (state) {
      this._fieldEl?.setAttribute('tabindex', '-1');
      this._fieldEl?.setAttribute('aria-disabled', 'true');
      if (this._isOpen) this.close();
    } else {
      this._fieldEl?.setAttribute('tabindex', '0');
      this._fieldEl?.removeAttribute('aria-disabled');
    }

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
      this._fieldEl?.setAttribute('aria-invalid', 'true');

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
        this._fieldEl?.setAttribute('aria-describedby', `${this._id}-err`);
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
      this._fieldEl?.setAttribute('aria-busy', 'true');
      if (this._isOpen) this.close();
    } else {
      this._fieldEl?.removeAttribute('aria-busy');
    }
  }

  width(cssValue?: string): string | void {
    if (cssValue === undefined) {
      return this._options.width ?? '';
    }
    this._options.width = cssValue || null;
    this._applyWidthStyle();
  }

  // Dual-purpose leading-icon getter/setter (form-input-affix pattern).
  // Pass nothing to read the current name; pass a string to swap; pass null
  // (or an empty string) to remove the slot entirely.
  icon(): string | null;
  icon(name: string | null): void;
  icon(name?: string | null): string | null | void {
    if (name === undefined) return this._options.icon;

    const next = name && name.length > 0 ? name : null;
    this._options.icon = next;

    if (next) {
      if (this._icoEl) {
        this._icoEl.className = `arvo-sel__ico o9con o9con-${next}`;
      } else if (this._fieldEl) {
        this._icoEl = document.createElement('i');
        this._icoEl.className = `arvo-sel__ico o9con o9con-${next}`;
        this._icoEl.setAttribute('aria-hidden', 'true');
        // Inject as the first child of __field so it leads the trigger
        // content (value display, error icon, chevron, border).
        this._fieldEl.insertBefore(this._icoEl, this._fieldEl.firstChild);
      }
    } else if (this._icoEl) {
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  focus(): void {
    this._fieldEl?.focus();
  }

  destroy(): void {
    // Tears down the surface, removes the panel, and restores the field ARIA.
    this._optionList?.destroy();
    this._optionList = null;

    this._fieldEl?.removeEventListener('click', this._boundHandleFieldClick);
    this._fieldEl?.removeEventListener('keydown', this._boundHandleFieldKeyDown);

    this._inlineAlert?.destroy();
    this._inlineAlert = null;
    this._errMsgAlert?.destroy();
    this._errMsgAlert = null;
    this._errIcoConnector?.destroy();
    this._errIcoConnector = null;

    if (this._element) {
      this._element.textContent = '';
      this._element.className = '';
      this._element.style.removeProperty('--arvo-form-input-width');
    }

    this._isOpen = false;
    this._element = null;
    this._fieldEl = null;
    this._displayEl = null;
    this._icoEl = null;
    this._errIcoEl = null;
    this._chevronEl = null;
    this._borderEl = null;
    this._hiddenInputEl = null;
    this._labelEl = null;
    this._alertEl = null;
  }
}
