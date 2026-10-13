// Vanilla JS ArvoTimeDropdown.
//
// Internal scrollable time list with optional AM/PM tabs in 12-hour mode.
// Standalone -- consumed by ArvoTimePicker and ArvoDateTimePicker.
// Reusable from @arvo/js for advanced composition.
// Descriptor: descriptors/time-dropdown.json
//
// Behavioral parity with packages/react/src/components/TimeDropdown/TimeDropdown.tsx --
// same BEM classes, ARIA attributes, keyboard map, tooltip wiring, and event payloads.
//
// Hard constraints (DO NOT VIOLATE):
//   - 12h vs 24h mode is DERIVED from format + locale via shouldUse12Hour()
//     in @arvo/core. NEVER accept a use12Hour runtime prop.
//   - Options outside [minTime, maxTime] are HIDDEN, not disabled.
//   - Each __item carries a title attribute with the full localized time
//     string (hard user override for AT redundancy in dense lists).
//   - loadingPattern: null -- no loading state for this component.
//
// Events dispatched on the host element:
//   tdrop:change   -- { value: TimeObject } -- time option selected by user
//   tdrop:dismiss  -- {}                    -- Escape pressed

import {
  formatTime,
  getAmPmStrings,
  getUserLocale,
  shouldUse12Hour,
  createArrowNav,
} from '@arvo/core';
import type { ArrowNav, TimeObject } from '@arvo/core';
import { ArvoButtonGroup } from '../ButtonGroup/ButtonGroup';

// TimeObject is sourced from @arvo/core so the React + JS layers share a
// single canonical shape. Re-exported so consumers importing via the package
// barrel (`import { TimeObject } from '@arvo/js'`) continue to compile.
export type { TimeObject };

export interface ArvoTimeDropdownOptions {
  // -- Value ------------------------------------------------------------------
  /** Selected time. null means no selection. */
  value?: TimeObject | null;

  // -- Format / locale --------------------------------------------------------
  /**
   * .NET / Kendo time format string. Determines 12 vs 24-hour mode via
   * shouldUse12Hour({ format, locale }). Required -- drives rendering mode.
   */
  format: string;
  /**
   * BCP-47 locale. Used as fallback 12/24-hour determination when format is
   * ambiguous, and for localized AM/PM label strings.
   */
  locale?: string;

  // -- Options ----------------------------------------------------------------
  /** Minutes between generated time options. Default: 15. */
  interval?: number;
  /** Inclusive lower bound. Options before minTime are HIDDEN (not disabled). */
  minTime?: TimeObject | null;
  /** Inclusive upper bound. Options after maxTime are HIDDEN (not disabled). */
  maxTime?: TimeObject | null;

  // -- State ------------------------------------------------------------------
  /** When true, the whole component is non-interactive. */
  isDisabled?: boolean;

  // -- Callbacks --------------------------------------------------------------
  /** Called when the user selects a time option. */
  onChange?: (time: TimeObject) => void;
  /** Called when Escape is pressed. */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Internal types and helpers
// ---------------------------------------------------------------------------

type AmPm = 'am' | 'pm';

interface TimeOption {
  hours: number;
  minutes: number;
  /** Stable key, also used by the roving tabindex. */
  key: string;
  /** Visible label produced by formatTime(option, format). */
  label: string;
}

function totalMilliseconds(t: TimeObject): number {
  return (((t.hours * 60 + t.minutes) * 60 + (t.seconds ?? 0)) * 1000) +
    (t.milliseconds ?? 0);
}

function buildOptions(args: {
  interval: number;
  format: string;
  minTime: TimeObject | null;
  maxTime: TimeObject | null;
}): TimeOption[] {
  const step = Math.max(1, Math.floor(args.interval));
  const min = args.minTime ? totalMilliseconds(args.minTime) : 0;
  const max = args.maxTime
    ? totalMilliseconds(args.maxTime)
    : (((23 * 60 + 59) * 60 + 59) * 1000) + 999;
  const out: TimeOption[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    const time: TimeObject = { hours, minutes, seconds: 0, milliseconds: 0 };
    const candidate = totalMilliseconds(time);
    if (candidate < min || candidate > max) continue;
    out.push({
      hours,
      minutes,
      key: `${hours}:${minutes}`,
      label: formatTime(time, args.format),
    });
  }
  return out;
}

// Initial AM/PM is the half-day of `value`, otherwise the half-day of "now",
// otherwise AM. Caller is responsible for ignoring this in 24-hour mode.
function pickInitialAmPm(value: TimeObject | null): AmPm {
  if (value) return value.hours < 12 ? 'am' : 'pm';
  return new Date().getHours() < 12 ? 'am' : 'pm';
}

// Returns the key of the option that should hold the roving tabindex when the
// tab/list is first shown. Prefers an exact match on `value`, else the closest
// option to `value` or current wall-clock time.
function pickFocusKey(opts: TimeOption[], value: TimeObject | null): string | null {
  if (opts.length === 0) return null;
  if (value) {
    const target = totalMilliseconds(value);
    const exact = opts.find((o) => totalMilliseconds({
      hours: o.hours,
      minutes: o.minutes,
      seconds: 0,
      milliseconds: 0,
    }) === target);
    if (exact) return exact.key;
  }
  const now = new Date();
  const ref = value
    ? totalMilliseconds(value)
    : totalMilliseconds({
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        milliseconds: now.getMilliseconds(),
      });
  let best = opts[0];
  let bestDelta = Math.abs(totalMilliseconds({
    hours: best.hours,
    minutes: best.minutes,
    seconds: 0,
    milliseconds: 0,
  }) - ref);
  for (const o of opts) {
    const d = Math.abs(totalMilliseconds({
      hours: o.hours,
      minutes: o.minutes,
      seconds: 0,
      milliseconds: 0,
    }) - ref);
    if (d < bestDelta) {
      best = o;
      bestDelta = d;
    }
  }
  return best.key;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoTimeDropdown {
  private _element: HTMLElement | null;
  private _options: ArvoTimeDropdownOptions;

  // Derived state (recomputed in _rebuild)
  private _use12Hour = false;
  private _ampmLabels: { am: string; pm: string } = { am: 'AM', pm: 'PM' };
  private _allOptions: TimeOption[] = [];
  private _amOptions: TimeOption[] = [];
  private _pmOptions: TimeOption[] = [];
  private _visibleOptions: TimeOption[] = [];
  private _ampm: AmPm = 'am';
  private _focusedKey: string = '';

  // DOM references
  private _tabsEl: HTMLDivElement | null = null;
  private _ampmGroupHostEl: HTMLDivElement | null = null;
  private _ampmGroup: ArvoButtonGroup | null = null;
  private _listEl: HTMLUListElement | null = null;
  private _optionEls: HTMLLIElement[] = [];

  // Keyboard helper
  private _arrowNav: ArrowNav | null = null;

  // Idempotency guard for destroy()
  private _destroyed = false;

  static initialize(
    element: HTMLElement,
    options: ArvoTimeDropdownOptions,
  ): ArvoTimeDropdown {
    return new ArvoTimeDropdown(element, options);
  }

  constructor(element: HTMLElement, options: ArvoTimeDropdownOptions) {
    this._element = element;
    this._options = {
      value: null,
      interval: 15,
      minTime: null,
      maxTime: null,
      isDisabled: false,
      ...options,
    };

    this._ampm = pickInitialAmPm(this._options.value ?? null);
    this._rebuild();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  value(): TimeObject | null;
  value(v: TimeObject): void;
  value(v?: TimeObject): TimeObject | null | void {
    if (v === undefined) {
      return this._options.value ?? null;
    }
    // Setter must NOT emit tdrop:change (mirrors React: onChange fires only
    // on user interaction). Surgical DOM update preserves focus across calls.
    this._options.value = v;
    if (this._use12Hour) {
      const nextAmPm = pickInitialAmPm(v);
      const optionsForHalf = nextAmPm === 'am' ? this._amOptions : this._pmOptions;
      if (nextAmPm !== this._ampm && optionsForHalf.length > 0) {
        this._ampm = nextAmPm;
        this._refreshVisible();
        this._focusedKey = pickFocusKey(this._visibleOptions, v) ?? '';
        this._renderList();
        this._scrollFocusedIntoView();
        return;
      }
    }
    const next = pickFocusKey(this._visibleOptions, v);
    if (next != null && next !== this._focusedKey) {
      this._focusedKey = next;
      this._updateFocusedTabindex();
    }
    this._updateSelectionDOM();
  }

  formattedValue(): string {
    const v = this._options.value;
    if (!v) return '';
    return formatTime(v, this._options.format);
  }

  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return !!this._options.isDisabled;
    // No-op when the state is unchanged. Without this guard every value sync
    // from a composing parent (DateTimePicker / TimePicker calls disabled()
    // on each change) would needlessly tear down and re-render the AM/PM tab
    // strip.
    if (state === !!this._options.isDisabled) return;
    this._options.isDisabled = state;
    const el = this._element;
    if (!el) return;
    el.classList.toggle('is-disabled', state);
    if (state) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
    if (this._listEl) {
      if (state) this._listEl.setAttribute('aria-disabled', 'true');
      else this._listEl.removeAttribute('aria-disabled');
    }
    // Recreate the AM/PM button group so its group-level isDisabled reflects
    // the new dropdown state. setItems alone cannot change the group-level
    // disabled flag (only items), and calling group.disabled(state) would
    // override item-level disabled set from out-of-range half-days.
    this._renderTabs();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._arrowNav?.destroy();
    this._arrowNav = null;

    if (this._listEl) {
      this._listEl.removeEventListener('click', this._handleListClick);
      this._listEl.removeEventListener('keydown', this._handleListKeyDown);
    }
    this._ampmGroup?.destroy();
    this._ampmGroup = null;

    if (this._element) {
      this._element.textContent = '';
      this._element.removeAttribute('role');
      this._element.removeAttribute('aria-label');
      this._element.removeAttribute('aria-disabled');
      this._element.classList.remove(
        'arvo-tdrop',
        'arvo-tdrop--12hour',
        'arvo-tdrop--24hour',
        'is-disabled',
      );
    }

    this._element = null;
    this._listEl = null;
    this._tabsEl = null;
    this._ampmGroupHostEl = null;
    this._optionEls = [];
    this._allOptions = [];
    this._amOptions = [];
    this._pmOptions = [];
    this._visibleOptions = [];
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /**
   * Full rebuild: recompute derived state from options, rebuild tabs + list DOM.
   * Used on mount and when format/locale/interval/bounds/isDisabled change.
   */
  private _rebuild(): void {
    const el = this._element;
    if (!el) return;

    const { format, locale, interval = 15, minTime, maxTime, value } = this._options;

    this._use12Hour = shouldUse12Hour({ format, locale });
    const effLocale = getUserLocale(locale);
    this._ampmLabels = getAmPmStrings(effLocale);

    this._allOptions = buildOptions({
      interval,
      format,
      minTime: minTime ?? null,
      maxTime: maxTime ?? null,
    });
    this._amOptions = this._allOptions.filter((o) => o.hours < 12);
    this._pmOptions = this._allOptions.filter((o) => o.hours >= 12);

    this._refreshVisible();

    // Seed focused key once per rebuild based on current value/visible set.
    this._focusedKey = pickFocusKey(this._visibleOptions, value ?? null) ?? '';

    this._renderRoot();
    this._renderTabs();
    this._renderList();
    this._setupKeyboard();

    // Mirror React's mount-time scrollIntoView({ block: 'nearest' }).
    this._scrollFocusedIntoView();
  }

  private _refreshVisible(): void {
    if (this._use12Hour) {
      this._visibleOptions = this._ampm === 'am' ? this._amOptions : this._pmOptions;
    } else {
      this._visibleOptions = this._allOptions;
    }
  }

  private _renderRoot(): void {
    const el = this._element;
    if (!el) return;

    el.textContent = '';

    // Reset only the BEM classes the component owns so consumer-supplied
    // classes survive a rebuild.
    el.classList.remove(
      'arvo-tdrop',
      'arvo-tdrop--12hour',
      'arvo-tdrop--24hour',
      'is-disabled',
    );
    el.classList.add('arvo-tdrop');
    el.classList.add(this._use12Hour ? 'arvo-tdrop--12hour' : 'arvo-tdrop--24hour');
    if (this._options.isDisabled) el.classList.add('is-disabled');

    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Time options');
    if (this._options.isDisabled) el.setAttribute('aria-disabled', 'true');
    else el.removeAttribute('aria-disabled');
  }

  private _renderTabs(): void {
    this._ampmGroup?.destroy();
    this._ampmGroup = null;
    // Remove any previously rendered tab strip so re-renders (e.g. via
    // disabled()) never leave an orphan in the DOM or stack duplicate tab
    // containers below the option list.
    this._tabsEl?.remove();
    this._tabsEl = null;
    this._ampmGroupHostEl = null;

    if (!this._use12Hour || !this._element) return;

    const tabs = document.createElement('div');
    tabs.className = 'arvo-tdrop__tabs';
    // The tab strip always sits above the option list. When re-rendering
    // standalone (the list already exists), insert before the list so the
    // tabs stay pinned to the top instead of being appended at the bottom.
    if (this._listEl && this._listEl.parentNode === this._element) {
      this._element.insertBefore(tabs, this._listEl);
    } else {
      this._element.appendChild(tabs);
    }
    this._tabsEl = tabs;

    const host = document.createElement('div');
    tabs.appendChild(host);
    this._ampmGroupHostEl = host;

    this._ampmGroup = ArvoButtonGroup.initialize(host, {
      items: [
        {
          value: 'am',
          label: this._ampmLabels.am,
          isDisabled: this._amOptions.length === 0,
        },
        {
          value: 'pm',
          label: this._ampmLabels.pm,
          isDisabled: this._pmOptions.length === 0,
        },
      ],
      value: this._ampm,
      variant: 'primary',
      size: 'sm',
      isDisabled: !!this._options.isDisabled,
      ariaLabel: 'Select AM or PM',
      onChange: (detail) => {
        const next = detail.value as AmPm | null;
        if (next === 'am' || next === 'pm') this._switchTab(next);
      },
    });
  }

  private _updateTabsDisabledState(): void {
    if (!this._ampmGroup) return;
    // setItems rebuilds the inner ArvoButton instances with their merged
    // disabled state (group-level OR item-level). It also resets the group
    // value to null, so we restore the current AM/PM selection afterwards.
    // We intentionally do NOT call this._ampmGroup.disabled(false) because
    // that override is GROUP-WIDE and would clear item.isDisabled set above.
    this._ampmGroup.setItems([
      {
        value: 'am',
        label: this._ampmLabels.am,
        isDisabled: this._amOptions.length === 0,
      },
      {
        value: 'pm',
        label: this._ampmLabels.pm,
        isDisabled: this._pmOptions.length === 0,
      },
    ]);
    this._ampmGroup.value(this._ampm);
  }

  private _renderList(): void {
    const el = this._element;
    if (!el) return;

    // Tear down any previous list listeners before swapping the element.
    if (this._listEl) {
      this._listEl.removeEventListener('click', this._handleListClick);
      this._listEl.removeEventListener('keydown', this._handleListKeyDown);
      this._listEl.remove();
    }

    const list = document.createElement('ul');
    list.className = 'arvo-tdrop__list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    if (this._options.isDisabled) list.setAttribute('aria-disabled', 'true');

    this._optionEls = [];
    const value = this._options.value ?? null;

    for (const opt of this._visibleOptions) {
      const li = document.createElement('li');
      const active =
        value != null && value.hours === opt.hours && value.minutes === opt.minutes;
      const focused = opt.key === this._focusedKey;

      li.className = ['arvo-tdrop__item', active ? 'active' : '']
        .filter(Boolean)
        .join(' ');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(active));
      li.title = opt.label;
      li.tabIndex = focused ? 0 : -1;
      li.setAttribute('data-key', opt.key);

      const label = document.createElement('span');
      label.className = 'arvo-tdrop__label';
      label.textContent = opt.label;
      li.appendChild(label);

      list.appendChild(li);
      this._optionEls.push(li);
    }

    list.addEventListener('click', this._handleListClick);
    list.addEventListener('keydown', this._handleListKeyDown);

    this._listEl = list;
    el.appendChild(list);

    this._arrowNav?.setItems(this._optionEls);
    this._updateTabsDisabledState();
  }

  /** Surgical class/aria swap for the active item -- preserves DOM focus. */
  private _updateSelectionDOM(): void {
    const value = this._options.value ?? null;
    for (let i = 0; i < this._visibleOptions.length; i++) {
      const opt = this._visibleOptions[i];
      const el = this._optionEls[i];
      if (!el) continue;
      const active =
        value != null && value.hours === opt.hours && value.minutes === opt.minutes;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', String(active));
    }
  }

  /** Update tabindex on all visible option elements to match _focusedKey. */
  private _updateFocusedTabindex(): void {
    for (let i = 0; i < this._visibleOptions.length; i++) {
      const el = this._optionEls[i];
      if (!el) continue;
      el.tabIndex = this._visibleOptions[i].key === this._focusedKey ? 0 : -1;
    }
  }

  private _scrollFocusedIntoView(): void {
    const idx = this._visibleOptions.findIndex((o) => o.key === this._focusedKey);
    if (idx < 0) return;
    this._optionEls[idx]?.scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  private _setupKeyboard(): void {
    this._arrowNav?.destroy();
    this._arrowNav = createArrowNav({
      items: this._optionEls,
      orientation: 'vertical',
      wrap: false,
      onNavigate: (_item, index) => {
        const opt = this._visibleOptions[index];
        if (!opt) return;
        this._setFocusedKey(opt.key);
      },
      onSelect: (_item, index) => {
        const opt = this._visibleOptions[index];
        if (!opt) return;
        this._setFocusedKey(opt.key);
        this._emitChange(opt);
      },
    });
  }

  private _setFocusedKey(key: string): void {
    if (key === this._focusedKey) return;
    const prevIdx = this._visibleOptions.findIndex((o) => o.key === this._focusedKey);
    const nextIdx = this._visibleOptions.findIndex((o) => o.key === key);
    this._focusedKey = key;

    if (prevIdx >= 0 && this._optionEls[prevIdx]) {
      this._optionEls[prevIdx].tabIndex = -1;
    }
    if (nextIdx >= 0 && this._optionEls[nextIdx]) {
      const nextEl = this._optionEls[nextIdx];
      nextEl.tabIndex = 0;
      // Mirror React: only steal focus when focus is already inside the listbox.
      if (this._listEl && this._listEl.contains(document.activeElement)) {
        nextEl.focus();
      }
      nextEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers (arrow fields for stable add/removeEventListener identity)
  // ---------------------------------------------------------------------------

  private _handleListClick = (e: Event): void => {
    if (this._options.isDisabled) return;
    const target = (e.target as HTMLElement | null)?.closest(
      '.arvo-tdrop__item',
    ) as HTMLLIElement | null;
    if (!target) return;
    const key = target.getAttribute('data-key');
    if (!key) return;
    const opt = this._visibleOptions.find((o) => o.key === key);
    if (!opt) return;
    this._setFocusedKey(opt.key);
    this._emitChange(opt);
  };

  private _handleListKeyDown = (e: KeyboardEvent): void => {
    if (this._options.isDisabled) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this._emitDismiss();
      return;
    }
    // Delegate Arrow/Home/End/Enter/Space to the shared arrow-nav helper.
    // Note: 'Spacebar' is an IE/legacy key name -- handle it explicitly here
    // since arrow-nav only listens for ' '.
    if (e.key === 'Spacebar') {
      e.preventDefault();
      const idx = this._visibleOptions.findIndex((o) => o.key === this._focusedKey);
      if (idx >= 0) this._emitChange(this._visibleOptions[idx]);
      return;
    }
    this._arrowNav?.handleKeyDown(e);
  };

  // ---------------------------------------------------------------------------
  // Tab / selection mechanics (handled via ArvoButtonGroup's onChange callback)
  // ---------------------------------------------------------------------------

  private _switchTab(which: AmPm): void {
    if (!this._use12Hour || this._options.isDisabled) return;
    const halfDayEmpty =
      which === 'am' ? this._amOptions.length === 0 : this._pmOptions.length === 0;
    if (halfDayEmpty) return;
    if (this._ampm === which) return;

    this._ampm = which;
    this._refreshVisible();

    // If the previously focused key is gone from the new visible set, reseat.
    const stillPresent = this._visibleOptions.some((o) => o.key === this._focusedKey);
    if (!stillPresent) {
      const next = pickFocusKey(this._visibleOptions, this._options.value ?? null);
      this._focusedKey = next ?? '';
    }

    this._renderList();
    // Mirror React: do NOT move DOM focus on arrow-left/right tab switch.
    // Natural click focus on tab buttons is left to the browser.
    this._scrollFocusedIntoView();
  }

  // ---------------------------------------------------------------------------
  // Event dispatch
  // ---------------------------------------------------------------------------

  private _emitChange(opt: TimeOption): void {
    if (this._options.isDisabled) return;
    const value: TimeObject = {
      hours: opt.hours,
      minutes: opt.minutes,
      seconds: 0,
      milliseconds: 0,
    };
    this._options.value = value;
    // Surgical update: keeps the activeElement on the just-selected <li> so
    // subsequent arrow keys continue working without focus loss.
    this._updateSelectionDOM();
    this._options.onChange?.(value);
    this._element?.dispatchEvent(
      new CustomEvent('tdrop:change', { bubbles: true, detail: { value } }),
    );
  }

  private _emitDismiss(): void {
    this._options.onDismiss?.();
    this._element?.dispatchEvent(
      new CustomEvent('tdrop:dismiss', { bubbles: true, detail: {} }),
    );
  }
}

export default ArvoTimeDropdown;
