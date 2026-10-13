export type ArvoStatTrend = 'up' | 'down' | 'neutral';
export type ArvoStatSize = 'sm' | 'md' | 'lg';
export type ArvoStatState = 'default' | 'positive' | 'negative' | 'warning';

export interface ArvoStatOptions {
  label?: string;
  value?: string;
  unit?: string;
  trend?: ArvoStatTrend;
  trendValue?: string;
  helper?: string;
  icon?: string;
  progress?: number;
  progressLabel?: string;
  info?: string;
  size?: ArvoStatSize;
  state?: ArvoStatState;
  isLoading?: boolean;
  onAction?: (() => void) | null;
}

const TRENDS: readonly ArvoStatTrend[] = ['up', 'down', 'neutral'];
const SIZES: readonly ArvoStatSize[] = ['sm', 'md', 'lg'];
const STATES: readonly ArvoStatState[] = ['default', 'positive', 'negative', 'warning'];

export class ArvoStat {
  readonly el: HTMLElement;
  private _options: ArvoStatOptions;

  static initialize(element: HTMLElement | null, options?: ArvoStatOptions): ArvoStat {
    return new ArvoStat(element ?? document.createElement('article'), options);
  }

  constructor(element: HTMLElement, options: ArvoStatOptions = {}) {
    this.el = element;
    this._options = { label: 'Metric', value: '—', size: 'md', state: 'default', isLoading: false, ...options };
    this._render();
  }

  setValue(value: string): void { this._options.value = value; this._render(); }
  setLoading(isLoading: boolean): void { this._options.isLoading = isLoading; this._render(); }
  setTrend(trend: ArvoStatTrend | null, trendValue?: string): void { this._options.trend = trend ?? undefined; this._options.trendValue = trendValue; this._render(); }
  destroy(): void { this.el.replaceChildren(); this.el.removeAttribute('class'); this.el.removeAttribute('role'); this.el.removeAttribute('tabindex'); }

  private _render(): void {
    const options = this._options;
    const size = SIZES.includes(options.size ?? 'md') ? options.size : 'md';
    const state = STATES.includes(options.state ?? 'default') ? options.state : 'default';
    const trend = TRENDS.includes(options.trend ?? 'neutral') ? options.trend : undefined;
    const interactive = typeof options.onAction === 'function' && !options.info;
    const rootClass = ['arvo-stat', `arvo-stat--${size}`, state !== 'default' ? `arvo-stat--${state}` : '', options.isLoading ? 'is-loading' : ''].filter(Boolean).join(' ');
    this.el.className = rootClass;
    this.el.replaceChildren();
    if (interactive) {
      this.el.setAttribute('role', 'button');
      this.el.tabIndex = 0;
      this.el.onclick = () => options.onAction?.();
      this.el.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); options.onAction?.(); } };
    } else {
      this.el.removeAttribute('role');
      this.el.removeAttribute('tabindex');
      this.el.onclick = null;
      this.el.onkeydown = null;
    }
    const header = document.createElement('div'); header.className = 'arvo-stat__header';
    const label = document.createElement('span'); label.className = 'arvo-stat__label'; label.textContent = options.label ?? 'Metric'; header.append(label);
    if (options.info) { const info = document.createElement('button'); info.type = 'button'; info.className = 'arvo-stat__info'; info.setAttribute('aria-label', `More information about ${options.label ?? 'metric'}`); info.title = options.info; info.textContent = 'i'; info.addEventListener('click', (event) => event.stopPropagation()); header.append(info); }
    if (options.icon) { const icon = document.createElement('i'); icon.className = `arvo-stat__icon o9con o9con-${options.icon}`; icon.setAttribute('aria-hidden', 'true'); header.append(icon); }
    const valueRow = document.createElement('div'); valueRow.className = 'arvo-stat__value-row'; const value = document.createElement('strong'); value.className = 'arvo-stat__value'; value.textContent = options.isLoading ? '' : options.value ?? '—'; value.setAttribute('aria-label', options.isLoading ? 'Loading' : options.value ?? 'Metric value'); valueRow.append(value);
    if (options.unit) { const unit = document.createElement('span'); unit.className = 'arvo-stat__unit'; unit.textContent = options.unit; valueRow.append(unit); }
    if (trend && options.trendValue) { const indicator = document.createElement('span'); indicator.className = `arvo-stat__indicator arvo-stat__indicator--${trend}`; indicator.textContent = `${trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} ${options.trendValue}`; indicator.setAttribute('aria-label', `${trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'Unchanged'} ${options.trendValue}`); valueRow.append(indicator); }
    this.el.append(header, valueRow);
    if (options.helper) { const helper = document.createElement('p'); helper.className = 'arvo-stat__helper'; helper.textContent = options.helper; this.el.append(helper); }
    if (options.progress !== undefined) { const progress = document.createElement('div'); progress.className = 'arvo-stat__progress'; const track = document.createElement('span'); track.className = 'arvo-stat__progress-track'; const fill = document.createElement('span'); fill.className = 'arvo-stat__progress-fill'; fill.style.width = `${Math.max(0, Math.min(100, options.progress))}%`; track.append(fill); const progressLabel = document.createElement('span'); progressLabel.className = 'arvo-stat__progress-label'; progressLabel.textContent = options.progressLabel ?? `${options.progress}%`; progress.append(track, progressLabel); this.el.append(progress); }
  }
}
