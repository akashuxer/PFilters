export type ArvoProgressVariant = 'linear' | 'circular' | 'gauge';
export type ArvoProgressSize = 'sm' | 'md' | 'lg';
export type ArvoProgressStatus = 'normal' | 'success' | 'warning' | 'error';

export interface ArvoProgressOptions {
  variant?: ArvoProgressVariant;
  size?: ArvoProgressSize;
  value?: number;
  max?: number;
  min?: number;
  isIndeterminate?: boolean;
  status?: ArvoProgressStatus;
  label?: string | null;
  showValue?: boolean;
}

type Resolved = Required<Omit<ArvoProgressOptions, 'label'>> & { label: string | null };
const VARIANTS: readonly ArvoProgressVariant[] = ['linear', 'circular', 'gauge'];
const SIZES: readonly ArvoProgressSize[] = ['sm', 'md', 'lg'];
const STATUSES: readonly ArvoProgressStatus[] = ['normal', 'success', 'warning', 'error'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function div(className: string): HTMLDivElement { const element = document.createElement('div'); element.className = className; return element; }
function span(className: string, text: string): HTMLSpanElement { const element = document.createElement('span'); element.className = className; element.textContent = text; return element; }
function svgElement(name: 'svg' | 'circle' | 'path', className: string): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  element.setAttribute('class', className);
  return element;
}

export class ArvoProgress {
  readonly el: HTMLElement;
  private _opts: Resolved;

  static initialize(element: HTMLElement | null, options?: ArvoProgressOptions): ArvoProgress {
    return new ArvoProgress(element ?? document.createElement('div'), options);
  }

  constructor(element: HTMLElement, options: ArvoProgressOptions = {}) {
    this.el = element;
    const min = Number.isFinite(options.min) ? options.min! : 0;
    const max = Number.isFinite(options.max) && options.max! > min ? options.max! : min + 100;
    this._opts = {
      variant: VARIANTS.includes(options.variant as ArvoProgressVariant) ? options.variant as ArvoProgressVariant : 'linear',
      size: SIZES.includes(options.size as ArvoProgressSize) ? options.size as ArvoProgressSize : 'md',
      value: clamp(options.value ?? min, min, max), max, min,
      isIndeterminate: options.isIndeterminate ?? false,
      status: STATUSES.includes(options.status as ArvoProgressStatus) ? options.status as ArvoProgressStatus : 'normal',
      label: options.label ?? null, showValue: options.showValue ?? true,
    };
    this._render();
  }

  private _render(): void {
    const { variant, size, status, isIndeterminate, min, label, showValue } = this._opts;
    const max = Math.max(min + 1, this._opts.max);
    const current = clamp(this._opts.value, min, max);
    const percent = ((current - min) / (max - min)) * 100;
    const valueText = `${Math.round(percent)}%`;
    const accessibleLabel = label ?? 'Progress';

    this.el.className = ['arvo-progress', `arvo-progress--${variant}`, `arvo-progress--${size}`, `arvo-progress--${status}`, isIndeterminate ? 'is-indeterminate' : ''].filter(Boolean).join(' ');
    this.el.setAttribute('role', 'progressbar');
    this.el.setAttribute('aria-label', accessibleLabel);
    this.el.setAttribute('aria-valuetext', isIndeterminate ? `${accessibleLabel}, in progress` : `${accessibleLabel}, ${valueText}`);
    if (isIndeterminate) {
      ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach((name) => this.el.removeAttribute(name));
      this.el.setAttribute('aria-busy', 'true');
    } else {
      this.el.setAttribute('aria-valuemin', String(min));
      this.el.setAttribute('aria-valuemax', String(max));
      this.el.setAttribute('aria-valuenow', String(current));
      this.el.removeAttribute('aria-busy');
    }
    this.el.style.setProperty('--arvo-progress-value', `${percent}%`);
    this.el.replaceChildren(...(variant === 'linear' ? this._renderLinear(label, showValue, isIndeterminate ? 'In progress' : valueText) : this._renderRing(variant, label, showValue, isIndeterminate ? '...' : valueText)));
  }

  private _renderLinear(label: string | null, showValue: boolean, valueText: string): HTMLElement[] {
    const track = div('arvo-progress__track');
    track.append(div('arvo-progress__fill'));
    const meta = div('arvo-progress__meta');
    if (label) meta.append(span('arvo-progress__label', label));
    if (showValue) meta.append(span('arvo-progress__value', valueText));
    return [track, meta];
  }

  private _renderRing(variant: ArvoProgressVariant, label: string | null, showValue: boolean, valueText: string): HTMLElement[] {
    const ring = svgElement('svg', 'arvo-progress__ring') as SVGSVGElement;
    ring.setAttribute('viewBox', '0 0 100 100');
    ring.setAttribute('aria-hidden', 'true');
    const isGauge = variant === 'gauge';
    const track = svgElement(isGauge ? 'path' : 'circle', 'arvo-progress__ring-track');
    const fill = svgElement(isGauge ? 'path' : 'circle', 'arvo-progress__ring-fill');
    if (isGauge) {
      [track, fill].forEach((element) => { element.setAttribute('pathLength', '100'); element.setAttribute('d', 'M 15 75 A 42 42 0 0 1 85 75'); });
    } else {
      [track, fill].forEach((element) => { element.setAttribute('cx', '50'); element.setAttribute('cy', '50'); element.setAttribute('r', '42'); element.setAttribute('pathLength', '100'); });
    }
    ring.append(track, fill);
    const content = div('arvo-progress__content');
    if (showValue) content.append(span('arvo-progress__value', valueText));
    if (label) content.append(span('arvo-progress__label', label));
    return [ring as unknown as HTMLElement, content];
  }

  setValue(value: number): void { this._opts.value = clamp(value, this._opts.min, Math.max(this._opts.min + 1, this._opts.max)); this._render(); }
  setIndeterminate(value: boolean): void { this._opts.isIndeterminate = value; this._render(); }
  setStatus(status: ArvoProgressStatus): void { if (STATUSES.includes(status)) { this._opts.status = status; this._render(); } }
  setLabel(label: string | null): void { this._opts.label = label; this._render(); }
  value(): number { return this._opts.value; }
  destroy(): void { this.el.replaceChildren(); this.el.removeAttribute('class'); ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-busy'].forEach((name) => this.el.removeAttribute(name)); this.el.style.removeProperty('--arvo-progress-value'); }
}
