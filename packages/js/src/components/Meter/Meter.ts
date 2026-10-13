export type ArvoMeterSize = 'sm' | 'md' | 'lg';
export type ArvoMeterTone = 'theme' | 'positive' | 'warning' | 'negative';
export type ArvoMeterOrientation = 'inline' | 'stacked';

export interface ArvoMeterOptions {
  value?: number;
  min?: number;
  max?: number;
  label?: string;
  size?: ArvoMeterSize;
  tone?: ArvoMeterTone;
  orientation?: ArvoMeterOrientation;
  showValue?: boolean;
  isIndeterminate?: boolean;
  formatValue?: (value: number, min: number, max: number) => string;
}

interface ResolvedOptions {
  value: number;
  min: number;
  max: number;
  label: string;
  size: ArvoMeterSize;
  tone: ArvoMeterTone;
  orientation: ArvoMeterOrientation;
  showValue: boolean;
  isIndeterminate: boolean;
  formatValue?: (value: number, min: number, max: number) => string;
}

const SIZES: readonly ArvoMeterSize[] = ['sm', 'md', 'lg'];
const TONES: readonly ArvoMeterTone[] = ['theme', 'positive', 'warning', 'negative'];
const ORIENTATIONS: readonly ArvoMeterOrientation[] = ['inline', 'stacked'];

function normalize(options: ArvoMeterOptions = {}): ResolvedOptions {
  const min = Number.isFinite(options.min) ? options.min! : 0;
  const max = Number.isFinite(options.max) && options.max! > min ? options.max! : min + 100;
  return {
    min,
    max,
    value: Number.isFinite(options.value) ? Math.min(max, Math.max(min, options.value!)) : min,
    label: options.label || 'Meter',
    size: SIZES.includes(options.size!) ? options.size! : 'md',
    tone: TONES.includes(options.tone!) ? options.tone! : 'theme',
    orientation: ORIENTATIONS.includes(options.orientation!) ? options.orientation! : 'stacked',
    showValue: options.showValue !== false,
    isIndeterminate: options.isIndeterminate === true,
    formatValue: options.formatValue,
  };
}

export class ArvoMeter {
  readonly el: HTMLElement;
  private _opts: ResolvedOptions;
  private _destroyed = false;

  static readonly SIZES = SIZES;
  static readonly TONES = TONES;
  static readonly ORIENTATIONS = ORIENTATIONS;

  static initialize(element: HTMLElement | null, options?: ArvoMeterOptions): ArvoMeter {
    return new ArvoMeter(element ?? document.createElement('div'), options);
  }

  constructor(element: HTMLElement, options?: ArvoMeterOptions) {
    this.el = element;
    this._opts = normalize(options);
    this._render();
  }

  private _render(): void {
    const { min, max, value, label, size, tone, orientation, showValue, isIndeterminate, formatValue } = this._opts;
    const percent = ((value - min) / (max - min)) * 100;
    const formatted = formatValue ? formatValue(value, min, max) : `${Math.round(percent)}%`;
    this.el.className = ['arvo-meter', `arvo-meter--${size}`, `arvo-meter--${tone}`, `arvo-meter--${orientation}`, isIndeterminate ? 'is-indeterminate' : ''].filter(Boolean).join(' ');
    this.el.setAttribute('role', 'meter');
    this.el.setAttribute('aria-label', label);
    this.el.setAttribute('aria-valuemin', String(min));
    this.el.setAttribute('aria-valuemax', String(max));
    if (isIndeterminate) {
      this.el.removeAttribute('aria-valuenow');
      this.el.removeAttribute('aria-valuetext');
      this.el.setAttribute('aria-busy', 'true');
    } else {
      this.el.setAttribute('aria-valuenow', String(value));
      this.el.setAttribute('aria-valuetext', formatted);
      this.el.removeAttribute('aria-busy');
    }
    this.el.innerHTML = `<div class="arvo-meter__header">${label ? `<span class="arvo-meter__label"></span>` : ''}${showValue && !isIndeterminate ? `<span class="arvo-meter__value"></span>` : ''}</div><div class="arvo-meter__track" aria-hidden="true"><span class="arvo-meter__fill"></span></div>`;
    const labelEl = this.el.querySelector<HTMLElement>('.arvo-meter__label');
    const valueEl = this.el.querySelector<HTMLElement>('.arvo-meter__value');
    const fillEl = this.el.querySelector<HTMLElement>('.arvo-meter__fill');
    if (labelEl) labelEl.textContent = label;
    if (valueEl) valueEl.textContent = formatted;
    if (fillEl) fillEl.style.width = `${percent}%`;
  }

  setValue(value: number): void { this._opts.value = Number.isFinite(value) ? Math.min(this._opts.max, Math.max(this._opts.min, value)) : this._opts.min; this._render(); }
  setIndeterminate(state: boolean): void { this._opts.isIndeterminate = state; this._render(); }
  setTone(tone: ArvoMeterTone): void { if (TONES.includes(tone)) { this._opts.tone = tone; this._render(); } }
  value(): number { return this._opts.value; }
  destroy(): void { if (this._destroyed) return; this._destroyed = true; this.el.textContent = ''; this.el.removeAttribute('class'); ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-busy'].forEach((name) => this.el.removeAttribute(name)); }
}
