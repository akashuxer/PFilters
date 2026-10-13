import type { ListGroup, ListItemBase } from '@arvo/core';
import {
  ArvoOptionListV2,
  type ArvoOptionListV2ChangeDetail,
  type OptionListItemAction,
  type OptionListItemData,
} from '../OptionListV2/OptionListV2';

export interface SelectOptionDataV2 extends ListItemBase {
  value: unknown;
  actions?: OptionListItemAction[];
}

export interface ArvoSelectV2Options {
  items: SelectOptionDataV2[] | ListGroup<SelectOptionDataV2>[];
  value?: unknown;
  defaultValue?: unknown;
  placeholder?: string;
  label?: string;
  icon?: string;
  size?: 'sm' | 'lg';
  surface?: 'filled' | 'base';
  isDisabled?: boolean;
  isLoading?: boolean;
  width?: string;
  isFullWidth?: boolean;
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'auto';
  maxHeight?: string;
  closeOnSelect?: boolean;
  onChange?: (item: SelectOptionDataV2 | null, index: number) => boolean | void;
  onOpenChange?: (isOpen: boolean) => void;
}

export class ArvoSelectV2 {
  private _element: HTMLElement;
  private _field: HTMLDivElement;
  private _display: HTMLSpanElement;
  private _list: ArvoOptionListV2;
  private _items: SelectOptionDataV2[];
  private _value: unknown = null;
  private _options: ArvoSelectV2Options;

  static initialize(element: HTMLElement, options: ArvoSelectV2Options): ArvoSelectV2 {
    return new ArvoSelectV2(element, options);
  }

  constructor(element: HTMLElement, options: ArvoSelectV2Options) {
    this._element = element;
    this._options = options;
    this._items = this._flatten(options.items);
    this._value = options.value !== undefined ? options.value : options.defaultValue ?? null;
    element.classList.add(
      'arvo-sel',
      `arvo-sel--${options.size ?? 'lg'}`,
      `arvo-sel--surface-${options.surface ?? 'filled'}`,
    );

    if (options.label) {
      const label = document.createElement('label');
      label.className = 'arvo-sel__label';
      label.textContent = options.label;
      element.appendChild(label);
    }

    this._field = document.createElement('div');
    this._field.className = 'arvo-sel__field';
    this._field.setAttribute('role', 'combobox');
    this._field.setAttribute('tabindex', options.isDisabled ? '-1' : '0');
    if (options.label) this._field.setAttribute('aria-label', options.label);
    if (options.isDisabled) this._field.setAttribute('aria-disabled', 'true');
    if (options.isFullWidth) element.classList.add('arvo-sel--full-width');
    if (options.width) this._field.style.width = options.width;

    this._display = document.createElement('span');
    this._display.className = 'arvo-sel__input';
    if (!this._value) this._display.className = 'arvo-sel__placeholder';
    if (options.icon) {
      const icon = document.createElement('i');
      icon.className = `arvo-sel__ico o9con o9con-${options.icon}`;
      icon.setAttribute('aria-hidden', 'true');
      this._field.appendChild(icon);
    }
    this._field.appendChild(this._display);
    const border = document.createElement('div');
    border.className = 'arvo-sel__border';
    this._field.appendChild(border);
    const chevron = document.createElement('span');
    chevron.className = 'arvo-sel__chevron o9con o9con-angle-down';
    chevron.setAttribute('aria-hidden', 'true');
    this._field.appendChild(chevron);
    element.appendChild(this._field);

    this._list = ArvoOptionListV2.initialize(this._field, {
      items: options.items as OptionListItemData[] | ListGroup<OptionListItemData>[],
      value: this._value,
      isDisabled: options.isDisabled,
      isLoading: options.isLoading,
      placement: options.placement === 'auto' ? 'bottom-start' : options.placement,
      width: 'anchor',
      maxHeight: options.maxHeight,
      closeOnSelect: options.closeOnSelect ?? true,
      onChange: (detail) => this._handleChange(detail),
      onOpenChange: (open) => options.onOpenChange?.(open),
    });
    this._syncDisplay();
  }

  get el(): HTMLElement { return this._element; }

  private _flatten(items: SelectOptionDataV2[] | ListGroup<SelectOptionDataV2>[]): SelectOptionDataV2[] {
    if (!items.length) return [];
    if ('items' in items[0]) return (items as ListGroup<SelectOptionDataV2>[]).flatMap((group) => group.items);
    return items as SelectOptionDataV2[];
  }

  private _handleChange(detail: ArvoOptionListV2ChangeDetail): void {
    this._value = detail.value;
    this._syncDisplay();
    const selected = detail.option as SelectOptionDataV2 | null;
    const index = selected ? this._items.findIndex((item) => item.value === selected.value) : -1;
    if (selected) this._options.onChange?.(selected, index);
  }

  private _syncDisplay(): void {
    const selected = this._items.find((item) => item.value === this._value);
    this._display.textContent = selected?.label ?? this._options.placeholder ?? '';
    this._display.className = selected ? 'arvo-sel__input' : 'arvo-sel__placeholder';
  }

  open(): void { this._list.open(); }
  close(): void { this._list.close(); }
  toggle(): void { this._list.toggle(); }
  value(next?: unknown): unknown {
    if (arguments.length === 0) return this._value;
    this._value = next ?? null;
    this._list.value(this._value);
    this._syncDisplay();
    return this._value;
  }
  destroy(): void { this._list.destroy(); this._element.textContent = ''; }
}
