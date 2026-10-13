import { ArvoFormLabel } from '../FormLabel/FormLabel';
import type { ArvoFormLabelContextHelpConfig } from '../FormLabel/FormLabel';
import { ArvoRadio, type ArvoRadioOptions } from '../Radio/Radio';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';

export interface RadioGroupItem {
  value: string;
  label: string;
  isChecked?: boolean;
  isDisabled?: boolean;
}

export interface ArvoRadioGroupOptions {
  name: string;
  label?: string | null;
  contextHelp?: ArvoFormLabelContextHelpConfig | null;
  orientation?: 'vertical' | 'horizontal';
  labelPosition?: 'top' | 'start';
  size?: 'sm' | 'lg';
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMsg?: string | null;
  isLoading?: boolean;
  value?: string | null;
  items?: RadioGroupItem[];
  onChange?: (detail: { value: string; previousValue: string | null }) => void;
}

type RequiredGroupOptions = Required<
  Omit<ArvoRadioGroupOptions, 'onChange' | 'label' | 'contextHelp' | 'errorMsg' | 'items' | 'value'>
> & {
  label: string | null;
  contextHelp: ArvoFormLabelContextHelpConfig | null;
  errorMsg: string | null;
  value: string | null;
  items: RadioGroupItem[];
  onChange: ((detail: { value: string; previousValue: string | null }) => void) | null;
};

let _idCounter = 0;

export class ArvoRadioGroup {
  private _element: HTMLElement | null;
  private _options: RequiredGroupOptions;

  private _labelEl: HTMLElement | null = null;
  private _bdyEl: HTMLDivElement | null = null;
  private _itemsEl: HTMLDivElement | null = null;
  private _inlineAlert: ArvoMessageAlert | null = null;
  private _inlineAlertEl: HTMLDivElement | null = null;
  private _childInstances: ArvoRadio[] = [];
  private _childItemEls: HTMLElement[] = [];

  private _labelId: string = '';
  private _errorId: string = '';

  private _boundHandleItemChange: (event: Event) => void;
  private _boundHandleKeydown: (event: Event) => void;

  static readonly SIZES = ['sm', 'lg'] as const;

  static readonly DEFAULTS: RequiredGroupOptions = {
    name: '',
    label: null,
    contextHelp: null,
    orientation: 'vertical',
    labelPosition: 'top',
    size: 'lg',
    isDisabled: false,
    isReadOnly: false,
    isRequired: false,
    isInvalid: false,
    errorMsg: null,
    isLoading: false,
    value: null,
    items: [],
    onChange: null,
  };

  static initialize(element: HTMLElement, options?: ArvoRadioGroupOptions): ArvoRadioGroup {
    return new ArvoRadioGroup(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoRadioGroupOptions) {
    this._element = element;

    const size =
      options?.size && (ArvoRadioGroup.SIZES as readonly string[]).includes(options.size)
        ? options.size
        : ArvoRadioGroup.DEFAULTS.size;

    this._options = {
      ...ArvoRadioGroup.DEFAULTS,
      ...options,
      size,
      label: options?.label ?? null,
      contextHelp: options?.contextHelp ?? null,
      errorMsg: options?.errorMsg ?? null,
      value: options?.value ?? null,
      items: options?.items ?? [],
      onChange: options?.onChange ?? null,
    };


    this._boundHandleItemChange = this._handleItemChange.bind(this);
    this._boundHandleKeydown = this._handleKeydown.bind(this);

    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';
    this._childInstances = [];
    this._childItemEls = [];

    const uid = ++_idCounter;
    this._labelId = `arvo-rb-grp-lbl-${uid}`;
    this._errorId = `arvo-rb-grp-err-${uid}`;

    const {
      name, label, orientation, labelPosition, size,
      isDisabled, isReadOnly: isReadonly, isRequired, isInvalid, errorMsg, isLoading, value, items,
    } = this._options;

    el.classList.add('arvo-rb-grp', `arvo-rb-grp--${size}`);
    if (orientation === 'horizontal') el.classList.add('arvo-rb-grp--horizontal');
    if (labelPosition === 'start') el.classList.add('arvo-rb-grp--label-start');
    if (isLoading) el.classList.add('loading');
    if (isDisabled) el.classList.add('is-disabled');
    if (isReadonly) el.classList.add('is-readonly');
    if (isInvalid) el.classList.add('has-error');

    el.setAttribute('role', 'radiogroup');
    if (isRequired) el.setAttribute('aria-required', 'true');
    if (isInvalid) el.setAttribute('aria-invalid', 'true');
    if (isLoading) el.setAttribute('aria-busy', 'true');

    if (label) {
      this._labelEl = ArvoFormLabel.initialize(null, {
        text: label,
        as: 'span',
        size,
        isRequired,
        isDisabled,
        isInvalid,
        contextHelp: this._options.contextHelp,
      }).el as HTMLSpanElement;
      this._labelEl.id = this._labelId;
      this._labelEl.classList.add('arvo-rb-grp__lbl');
      el.setAttribute('aria-labelledby', this._labelId);
      el.appendChild(this._labelEl);
    }

    this._bdyEl = document.createElement('div');
    this._bdyEl.className = 'arvo-rb-grp__bdy';

    this._itemsEl = document.createElement('div');
    this._itemsEl.className = 'arvo-rb-grp__items';
    if (isLoading) this._itemsEl.setAttribute('data-arvo-loading', 'true');

    for (const item of items) {
      const itemEl = document.createElement('div');
      this._itemsEl.appendChild(itemEl);
      const isChecked = value === item.value;
      const instance = ArvoRadio.initialize(itemEl, {
        label: item.label,
        value: item.value,
        name,
        isChecked: isChecked,
        isDisabled: item.isDisabled ?? isDisabled,
        isReadOnly: isReadonly,
        size,
        isLoading,
      } as ArvoRadioOptions);
      this._childInstances.push(instance);
      this._childItemEls.push(itemEl);
    }

    this._bdyEl.appendChild(this._itemsEl);

    if (isInvalid && errorMsg) {
      this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
        id: this._errorId,
        message: errorMsg,
        type: 'negative',
      });
      this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
      el.setAttribute('aria-describedby', this._errorId);
      this._bdyEl.appendChild(this._inlineAlertEl);
    }

    el.appendChild(this._bdyEl);

    this._syncRovingTabindex();
  }

  private _bindEvents(): void {
    if (!this._itemsEl) return;
    this._itemsEl.addEventListener('radio:change', this._boundHandleItemChange);
    this._itemsEl.addEventListener('keydown', this._boundHandleKeydown);
  }

  private _handleItemChange(event: Event): void {
    const customEvent = event as CustomEvent<{ value: string; name: string }>;
    const { value: newValue } = customEvent.detail;
    const previousValue = this._options.value;

    if (previousValue === newValue) return;

    this._options.value = newValue;

    for (let i = 0; i < this._childInstances.length; i++) {
      const inst = this._childInstances[i];
      if (inst.value() === newValue) {
        const inputEl = this._childItemEls[i]?.querySelector<HTMLInputElement>('input[type="radio"]');
        if (inputEl) inputEl.checked = true;
      } else {
        inst.deselect();
      }
    }

    this._syncRovingTabindex();

    const detail = { value: newValue, previousValue };
    this._dispatchEvent('rb-grp:change', detail);
    this._options.onChange?.(detail);
  }

  private _handleKeydown(event: Event): void {
    if (this._options.isDisabled || this._options.isLoading || this._options.isReadOnly) return;

    const ke = event as KeyboardEvent;
    const { key } = ke;

    const isNext = key === 'ArrowDown' || key === 'ArrowRight';
    const isPrev = key === 'ArrowUp' || key === 'ArrowLeft';
    if (!isNext && !isPrev) return;

    ke.preventDefault();
    ke.stopPropagation();

    const enabledInstances = this._childInstances.filter(inst => !inst.disabled());
    if (enabledInstances.length === 0) return;

    const focusedEl = document.activeElement;
    const currentIdx = enabledInstances.findIndex(inst => {
      const idx = this._childInstances.indexOf(inst);
      return this._childItemEls[idx]?.contains(focusedEl);
    });

    if (currentIdx === -1) return;

    const total = enabledInstances.length;
    const nextIdx = isNext
      ? (currentIdx + 1) % total
      : (currentIdx - 1 + total) % total;

    const targetInst = enabledInstances[nextIdx];
    const targetValue = targetInst.value();
    const previousValue = this._options.value;

    this._options.value = targetValue;

    for (let i = 0; i < this._childInstances.length; i++) {
      const inst = this._childInstances[i];
      const inputEl = this._childItemEls[i]?.querySelector<HTMLInputElement>('input[type="radio"]');
      if (!inputEl) continue;
      if (inst.value() === targetValue) {
        inputEl.checked = true;
        inputEl.tabIndex = 0;
        inputEl.focus();
      } else {
        inputEl.checked = false;
        inputEl.tabIndex = -1;
      }
    }

    if (previousValue !== targetValue) {
      const detail = { value: targetValue, previousValue };
      this._dispatchEvent('rb-grp:change', detail);
      this._options.onChange?.(detail);
    }
  }

  private _syncRovingTabindex(): void {
    // Read-only radio groups stay focusable for AT discovery but are removed
    // from the tab order entirely so the form's tab sequence skips over them.
    // (Disabled is enforced per-child by `setTabIndex(-1)` below, but
    // read-only has no visual disabled affordance, so the only signal that
    // the group is not currently interactive is its absence from tab order.)
    if (this._options.isReadOnly) {
      for (const inst of this._childInstances) {
        inst.setTabIndex(-1);
      }
      return;
    }

    const selectedValue = this._options.value;
    let foundSelected = false;
    let firstEnabledIdx = -1;

    for (let i = 0; i < this._childInstances.length; i++) {
      const inst = this._childInstances[i];

      if (!inst.disabled() && firstEnabledIdx === -1) {
        firstEnabledIdx = i;
      }

      if (inst.value() === selectedValue && selectedValue !== null) {
        inst.setTabIndex(0);
        foundSelected = true;
      } else {
        inst.setTabIndex(-1);
      }
    }

    if (!foundSelected && firstEnabledIdx !== -1) {
      this._childInstances[firstEnabledIdx].setTabIndex(0);
    }
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown>): void {
    this._element?.dispatchEvent(
      new CustomEvent(eventName, { bubbles: true, cancelable: true, detail })
    );
  }

  // -- Public API -------------------------------------------------------------

  value(): string | null;
  value(newValue: string): void;
  value(newValue?: string): string | null | void {
    if (newValue === undefined) return this._options.value;

    if (!this._element) return;
    if (this._options.isDisabled || this._options.isReadOnly) return;

    const previousValue = this._options.value;
    if (previousValue === newValue) return;

    this._options.value = newValue;

    for (let i = 0; i < this._childInstances.length; i++) {
      const inst = this._childInstances[i];
      const inputEl = this._childItemEls[i]?.querySelector<HTMLInputElement>('input[type="radio"]');
      if (!inputEl) continue;
      inputEl.checked = inst.value() === newValue;
    }

    this._syncRovingTabindex();

    const detail = { value: newValue, previousValue };
    this._dispatchEvent('rb-grp:change', detail);
    this._options.onChange?.(detail);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isDisabled;

    if (!this._element) return;
    this._options.isDisabled = state;
    this._element.classList.toggle('is-disabled', state);
    if (this._labelEl) this._labelEl.classList.toggle('is-disabled', state);
    for (const inst of this._childInstances) {
      inst.disabled(state);
    }
    this._syncRovingTabindex();
  }

  readonly(): boolean;
  readonly(state: boolean): void;
  readonly(state?: boolean): boolean | void {
    if (state === undefined) return this._options.isReadOnly;

    if (!this._element) return;
    this._options.isReadOnly = state;
    this._element.classList.toggle('is-readonly', state);
    for (const inst of this._childInstances) {
      inst.readonly(state);
    }
    this._syncRovingTabindex();
  }

  setError(msgOrFalse: string | false): void {
    if (!this._element) return;
    if (msgOrFalse !== false) {
      const msg = msgOrFalse || this._options.errorMsg || 'Error';
      this._options.isInvalid = true;
      this._options.errorMsg = msg;
      this._element.classList.add('has-error');
      this._element.setAttribute('aria-invalid', 'true');
      if (this._inlineAlert) {
        this._inlineAlert.type('negative');
        this._inlineAlert.message(msg);
      } else if (this._bdyEl) {
        this._inlineAlert = ArvoMessageAlert.initialize(document.createElement('div'), {
          id: this._errorId,
          message: msg,
          type: 'negative',
        });
        this._inlineAlertEl = this._inlineAlert.el as HTMLDivElement;
        this._element.setAttribute('aria-describedby', this._errorId);
        this._bdyEl.appendChild(this._inlineAlertEl);
      }
    } else {
      this._options.isInvalid = false;
      this._options.errorMsg = null;
      this._element.classList.remove('has-error');
      this._element.removeAttribute('aria-invalid');
      this._element.removeAttribute('aria-describedby');
      if (this._inlineAlert) {
        this._inlineAlert.destroy();
        this._inlineAlert = null;
      }
      if (this._inlineAlertEl) {
        this._inlineAlertEl.remove();
        this._inlineAlertEl = null;
      }
    }
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
    if (this._itemsEl) {
      if (isLoading) {
        this._itemsEl.setAttribute('data-arvo-loading', 'true');
      } else {
        this._itemsEl.removeAttribute('data-arvo-loading');
      }
    }
    for (const inst of this._childInstances) {
      inst.setLoading(isLoading);
    }
  }

  setLabel(label: string | null): void {
    if (!this._element) return;
    this._options.label = label;
    if (label) {
      if (this._labelEl) {
        for (const node of Array.from(this._labelEl.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) node.remove();
        }
        this._labelEl.insertAdjacentText('afterbegin', label);
      } else {
        const { size, isRequired, isDisabled, isInvalid, contextHelp } = this._options;
        this._labelEl = ArvoFormLabel.initialize(null, {
          text: label,
          as: 'span',
          size,
          isRequired,
          isDisabled,
          isInvalid,
          contextHelp,
        }).el as HTMLSpanElement;
        this._labelEl.id = this._labelId;
        this._labelEl.classList.add('arvo-rb-grp__lbl');
        this._element.setAttribute('aria-labelledby', this._labelId);
        this._element.insertBefore(this._labelEl, this._element.firstChild);
      }
    } else {
      this._labelEl?.remove();
      this._labelEl = null;
      this._element.removeAttribute('aria-labelledby');
    }
  }

  destroy(): void {
    if (this._itemsEl) {
      this._itemsEl.removeEventListener('radio:change', this._boundHandleItemChange);
      this._itemsEl.removeEventListener('keydown', this._boundHandleKeydown);
    }

    this._inlineAlert?.destroy();
    this._inlineAlert = null;

    for (const inst of this._childInstances) {
      inst.destroy();
    }
    this._childInstances = [];
    this._childItemEls = [];

    if (this._element) {
      this._element.textContent = '';
      this._element.removeAttribute('role');
      this._element.removeAttribute('aria-labelledby');
      this._element.removeAttribute('aria-required');
      this._element.removeAttribute('aria-invalid');
      this._element.removeAttribute('aria-describedby');
      this._element.removeAttribute('aria-busy');
      this._element.className = '';
    }

    this._element = null;
    this._labelEl = null;
    this._bdyEl = null;
    this._itemsEl = null;
    this._inlineAlertEl = null;
  }
}
