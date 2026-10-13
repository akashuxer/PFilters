export type ArvoRatingSize = 'sm' | 'md' | 'lg';
export type ArvoRatingVariant = 'default' | 'accent' | 'inverse';

export interface ArvoRatingOptions {
  value?: number; defaultValue?: number; max?: number; step?: 0.5 | 1; label?: string;
  size?: ArvoRatingSize; variant?: ArvoRatingVariant; showValue?: boolean; allowClear?: boolean;
  isDisabled?: boolean; isReadOnly?: boolean; isLoading?: boolean;
  onChange?: (value: number) => void; onHoverChange?: (value: number | null) => void;
}
const clamp = (value: number, max: number, step: number) => Math.round(Math.min(max, Math.max(0, value)) / step) * step;

export class ArvoRating {
  readonly el: HTMLElement;
  private _options: Required<Pick<ArvoRatingOptions, 'max' | 'step' | 'label' | 'size' | 'variant' | 'showValue' | 'allowClear' | 'isDisabled' | 'isReadOnly' | 'isLoading'>> & ArvoRatingOptions;
  private _value: number;
  private _hover: number | null = null;
  private _control!: HTMLElement;
  private _onKeyDown = (event: KeyboardEvent) => this._handleKeyDown(event);
  static initialize(element: HTMLElement | null, options: ArvoRatingOptions = {}): ArvoRating { return new ArvoRating(element ?? document.createElement('div'), options); }
  constructor(element: HTMLElement, options: ArvoRatingOptions = {}) {
    this.el = element;
    const max = Math.max(1, Math.round(options.max ?? 5));
    const step = options.step === 0.5 ? 0.5 : 1;
    this._options = { max, step, label: 'Rating', size: 'md', variant: 'default', showValue: false, allowClear: false, isDisabled: false, isReadOnly: false, isLoading: false, ...options };
    this._value = clamp(options.value ?? options.defaultValue ?? 0, max, step);
    this._render();
  }
  value(next?: number): number | void { if (next === undefined) return this._value; this._setValue(next); }
  disabled(next?: boolean): boolean | void { if (next === undefined) return Boolean(this._options.isDisabled); this._options.isDisabled = next; this._render(); }
  destroy(): void { this._control?.removeEventListener('keydown', this._onKeyDown); this.el.replaceChildren(); this.el.className = ''; }
  private _render(): void {
    this._control?.removeEventListener('keydown', this._onKeyDown);
    this.el.className = ['arvo-rating', `arvo-rating--${this._options.size}`, `arvo-rating--${this._options.variant}`, this._value > 0 ? 'is-active' : '', this._options.isDisabled ? 'is-disabled' : '', this._options.isReadOnly ? 'is-readonly' : '', this._options.isLoading ? 'is-loading' : ''].filter(Boolean).join(' ');
    this.el.replaceChildren(); this._control = document.createElement('div'); this._control.className = 'arvo-rating__control';
    this._control.setAttribute('aria-label', this._options.label); this._control.setAttribute('aria-valuemin', '0'); this._control.setAttribute('aria-valuemax', String(this._options.max)); this._control.setAttribute('aria-valuenow', String(this._value)); this._control.setAttribute('aria-valuetext', `${this._value} out of ${this._options.max}`);
    this._control.setAttribute('role', this._options.isReadOnly ? 'img' : 'slider');
    if (this._options.isLoading) this._control.setAttribute('aria-busy', 'true');
    else this._control.removeAttribute('aria-busy');
    if (!this._options.isReadOnly) { this._control.setAttribute('aria-disabled', String(this._options.isDisabled || this._options.isLoading)); this._control.removeAttribute('aria-readonly'); } else { this._control.removeAttribute('aria-valuemin'); this._control.removeAttribute('aria-valuemax'); this._control.removeAttribute('aria-valuenow'); this._control.setAttribute('aria-readonly', 'true'); }
    this._control.tabIndex = this._options.isDisabled || this._options.isReadOnly || this._options.isLoading ? -1 : 0; this._control.addEventListener('keydown', this._onKeyDown);
    for (let star = 1; star <= this._options.max; star += 1) {
      const node = document.createElement('span'); node.className = 'arvo-rating__star';
      const base = document.createElement('span'); base.className = 'arvo-rating__star-base'; base.setAttribute('aria-hidden', 'true'); base.textContent = '★';
      const fillNode = document.createElement('span'); fillNode.className = 'arvo-rating__star-fill'; fillNode.setAttribute('aria-hidden', 'true'); fillNode.textContent = '★';
      const fill = Math.max(0, Math.min(1, (this._hover ?? this._value) - star + 1));
      fillNode.style.width = `${fill * 100}%`;
      node.classList.toggle('is-active', fill > 0);
      node.classList.toggle('is-partial', fill > 0 && fill < 1);
      node.append(base, fillNode);
      node.addEventListener('pointermove', (event) => this._preview(star, event)); node.addEventListener('click', () => this._setValue(this._options.allowClear && this._value === (this._hover ?? this._value) ? 0 : (this._hover ?? this._value))); this._control.appendChild(node);
    }
    this._control.addEventListener('pointerleave', () => { this._hover = null; this._options.onHoverChange?.(null); this._render(); }); this.el.appendChild(this._control);
    if (this._options.showValue) { const value = document.createElement('span'); value.className = 'arvo-rating__value'; value.textContent = `${this._value}/${this._options.max}`; this.el.appendChild(value); }
  }
  private _preview(star: number, event: PointerEvent): void { if (this._options.isDisabled || this._options.isReadOnly || this._options.isLoading) return; const rect = (event.currentTarget as HTMLElement).getBoundingClientRect(); const next = this._options.step === 0.5 && event.clientX - rect.left < rect.width / 2 ? star - 0.5 : star; if (next === this._hover) return; this._hover = next; this._options.onHoverChange?.(this._hover); this._render(); }
  private _setValue(value: number): void { if (this._options.isDisabled || this._options.isReadOnly || this._options.isLoading) return; this._value = clamp(value, this._options.max, this._options.step); this._render(); this._options.onChange?.(this._value); this.el.dispatchEvent(new CustomEvent('rating:change', { bubbles: true, detail: { value: this._value } })); }
  private _handleKeyDown(event: KeyboardEvent): void { if (this._options.isDisabled || this._options.isReadOnly || this._options.isLoading) return; let next: number | null = null; if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = this._value + this._options.step; if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = this._value - this._options.step; if (event.key === 'Home') next = 0; if (event.key === 'End') next = this._options.max; if (event.key === ' ' && this._options.allowClear) next = 0; if (next !== null) { event.preventDefault(); this._setValue(next === this._value && this._options.allowClear ? 0 : next); } }
}
