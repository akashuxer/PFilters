import { ArvoStatus, type ArvoStatusConfig } from '../Status/Status';
import { ArvoBadge } from '../Badge/Badge';
import { ArvoIconButton } from '../IconButton/IconButton';
import { ArvoMessageAlert } from '../MessageAlert/MessageAlert';

// ---------------------------------------------------------------------------
// Public types (mirror the React twin)
// ---------------------------------------------------------------------------

export type ArvoChipVariant = 'general' | 'filter' | 'input';
export type ArvoChipSize = 'sm' | 'md' | 'lg';
export type ArvoChipAppearance = 'primary' | 'outline' | 'utility';
export type ArvoChipColorMode = 'default' | 'semantic' | 'custom';
export type ArvoChipSemanticType = 'none' | 'negative' | 'positive' | 'info' | 'warning' | 'block';
export type ArvoChipCustomColor = 'purple' | 'pink' | 'glacier' | 'amber' | 'greenish' | 'bluish';

/** DOM-friendly bag injected by a reorderable ArvoChipList onto the drag handle. */
export type ArvoChipDragHandleProps = Record<string, string | number | ((event: Event) => void)>;

export interface ArvoChipOptions {
  variant?: ArvoChipVariant;
  size?: ArvoChipSize;
  appearance?: ArvoChipAppearance;
  colorMode?: ArvoChipColorMode;
  semanticType?: ArvoChipSemanticType;
  customColor?: ArvoChipCustomColor;
  label?: string;
  title?: string | null;
  icon?: string | null;
  /** Avatar slot: an <img> src string or a ready-made element. Ignored in semantic color mode. */
  avatar?: string | HTMLElement | null;
  status?: ArvoStatusConfig | null;
  counter?: number | null;
  isSelected?: boolean;
  defaultSelected?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  isWarning?: boolean;
  isExcluded?: boolean;
  isLoading?: boolean;
  maxWidth?: string | null;
  onSelectedChange?: (selected: boolean) => void;
  onPress?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string | null;
  /**
   * Render the `__grip` drag handle as part of the chip surface, independent
   * of any `dragHandleProps` injection. Use when the chip participates in an
   * externally-owned dnd surface that does not inject a bag. The rendered
   * handle is a static drag-cursor ArvoIconButton with no dnd wiring; the
   * consumer is responsible for the actual drag pipeline. When
   * `dragHandleProps` is ALSO provided, the bag wins. Honored in every color
   * mode. Suppressed when `isDisabled` / `isReadOnly` / `isLoading`.
   */
  hasDrag?: boolean;
  dragHandleProps?: ArvoChipDragHandleProps | null;
}

interface ResolvedOptions {
  variant: ArvoChipVariant;
  size: ArvoChipSize;
  appearance: ArvoChipAppearance;
  colorMode: ArvoChipColorMode;
  semanticType: ArvoChipSemanticType;
  customColor: ArvoChipCustomColor;
  label: string;
  title: string | null;
  icon: string | null;
  avatar: string | HTMLElement | null;
  status: ArvoStatusConfig | null;
  counter: number | null;
  isSelected: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  isInvalid: boolean;
  isWarning: boolean;
  isExcluded: boolean;
  isLoading: boolean;
  maxWidth: string | null;
  dismissLabel: string | null;
  hasDrag: boolean;
  dragHandleProps: ArvoChipDragHandleProps | null;
  onSelectedChange: ((selected: boolean) => void) | null;
  onPress: (() => void) | null;
  onDismiss: (() => void) | null;
}

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const VALID_VARIANTS: readonly ArvoChipVariant[] = ['general', 'filter', 'input'];
const VALID_SIZES: readonly ArvoChipSize[] = ['sm', 'md', 'lg'];
const VALID_APPEARANCES: readonly ArvoChipAppearance[] = ['primary', 'outline', 'utility'];
const VALID_COLOR_MODES: readonly ArvoChipColorMode[] = ['default', 'semantic', 'custom'];
const VALID_SEMANTIC_TYPES: readonly ArvoChipSemanticType[] = ['none', 'negative', 'positive', 'info', 'warning', 'block'];
const VALID_CUSTOM_COLORS: readonly ArvoChipCustomColor[] = ['purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish'];

const SEMANTIC_COLOR_CLASSES = ['negative', 'positive', 'info', 'warning', 'block'];

const DEFAULTS: ResolvedOptions = {
  variant: 'general',
  size: 'md',
  appearance: 'primary',
  colorMode: 'default',
  semanticType: 'none',
  customColor: 'purple',
  label: '',
  title: null,
  icon: null,
  avatar: null,
  status: null,
  counter: null,
  isSelected: false,
  isDisabled: false,
  isReadOnly: false,
  isInvalid: false,
  isWarning: false,
  isExcluded: false,
  isLoading: false,
  maxWidth: null,
  dismissLabel: null,
  hasDrag: false,
  dragHandleProps: null,
  onSelectedChange: null,
  onPress: null,
  onDismiss: null,
};

function pick<T>(value: T | undefined, valid: readonly T[], fallback: T): T {
  return value !== undefined && valid.includes(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoChip {
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _gripBtnEl: HTMLButtonElement | null = null;
  private _gripInstance: ArvoIconButton | null = null;
  private _icoEl: HTMLElement | null = null;
  private _avatarEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _lblEl: HTMLElement | null = null;
  private _counterSpan: HTMLElement | null = null;
  private _counterInstance: ArvoBadge | null = null;
  private _alertEl: HTMLElement | null = null;
  private _alertInstance: ArvoMessageAlert | null = null;
  private _excludeEl: HTMLElement | null = null;
  private _statusEl: HTMLElement | null = null;
  private _statusInstance: ArvoStatus | null = null;
  private _dismissSpan: HTMLElement | null = null;
  private _dismissBtnEl: HTMLButtonElement | null = null;
  private _dismissInstance: ArvoIconButton | null = null;
  private _dismissOnClick: ((e: Event) => void) | null = null;
  private _boundClick: ((e: Event) => void) | null = null;
  private _boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private _destroyed = false;
  private _isRemoving = false;

  static initialize(element: HTMLElement, options?: ArvoChipOptions): ArvoChip {
    return new ArvoChip(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoChipOptions) {
    this.el = element;
    this._opts = {
      ...DEFAULTS,
      variant: pick(options?.variant, VALID_VARIANTS, DEFAULTS.variant),
      size: pick(options?.size, VALID_SIZES, DEFAULTS.size),
      appearance: pick(options?.appearance, VALID_APPEARANCES, DEFAULTS.appearance),
      colorMode: pick(options?.colorMode, VALID_COLOR_MODES, DEFAULTS.colorMode),
      semanticType: pick(options?.semanticType, VALID_SEMANTIC_TYPES, DEFAULTS.semanticType),
      customColor: pick(options?.customColor, VALID_CUSTOM_COLORS, DEFAULTS.customColor),
      label: options?.label ?? DEFAULTS.label,
      title: options?.title ?? DEFAULTS.title,
      icon: options?.icon ?? DEFAULTS.icon,
      avatar: options?.avatar ?? DEFAULTS.avatar,
      status: options?.status ?? DEFAULTS.status,
      counter: typeof options?.counter === 'number' ? options.counter : DEFAULTS.counter,
      isSelected: options?.isSelected ?? options?.defaultSelected ?? DEFAULTS.isSelected,
      isDisabled: options?.isDisabled ?? DEFAULTS.isDisabled,
      isReadOnly: options?.isReadOnly ?? DEFAULTS.isReadOnly,
      isInvalid: options?.isInvalid ?? DEFAULTS.isInvalid,
      isWarning: options?.isWarning ?? DEFAULTS.isWarning,
      isExcluded: options?.isExcluded ?? DEFAULTS.isExcluded,
      isLoading: options?.isLoading ?? DEFAULTS.isLoading,
      maxWidth: options?.maxWidth ?? DEFAULTS.maxWidth,
      dismissLabel: options?.dismissLabel ?? DEFAULTS.dismissLabel,
      hasDrag: options?.hasDrag ?? DEFAULTS.hasDrag,
      dragHandleProps: options?.dragHandleProps ?? DEFAULTS.dragHandleProps,
      onSelectedChange: options?.onSelectedChange ?? null,
      onPress: options?.onPress ?? null,
      onDismiss: options?.onDismiss ?? null,
    };
    this._render();
    this._bindEvents();
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  private get _isFilter(): boolean { return this._opts.variant === 'filter'; }
  private get _isDismissibleInput(): boolean {
    const o = this._opts;
    return (
      o.variant === 'input' &&
      !!o.onDismiss &&
      !o.isDisabled &&
      !o.isReadOnly &&
      !o.isLoading
    );
  }
  /**
   * Input chips with onDismiss are themselves the focusable surface (single-
   * focus chip model -- Delete/Backspace remove). They count as interactive
   * for role/tabindex/click-routing purposes even though the click on the
   * chip body is a no-op (only the inner __dismiss span fires onDismiss).
   */
  private get _isInteractive(): boolean {
    return (
      this._isFilter ||
      (this._opts.variant === 'general' && !!this._opts.onPress) ||
      this._isDismissibleInput
    );
  }
  private get _isSemantic(): boolean { return this._opts.colorMode === 'semantic'; }
  private get _showInvalid(): boolean { return this._opts.isInvalid && !this._isSemantic; }
  private get _showWarning(): boolean {
    return this._opts.isWarning && !this._isSemantic && !this._showInvalid;
  }
  private get _showExcluded(): boolean { return this._opts.isExcluded && !this._isSemantic; }
  /**
   * Grip is rendered when EITHER ChipList injects dragHandleProps OR the
   * standalone chip sets hasDrag=true, in every color mode -- including
   * semantic, so reorderable semantic chip lists keep their handles.
   * Disabled / read-only / loading chips suppress the grip.
   */
  private get _showGrip(): boolean {
    const o = this._opts;
    return (!!o.dragHandleProps || o.hasDrag) && !o.isDisabled && !o.isReadOnly && !o.isLoading;
  }
  private get _showAvatar(): boolean { return !!this._opts.avatar && !this._isSemantic; }
  private get _showStatus(): boolean { return !!this._opts.status && !this._isSemantic; }
  private get _effectiveAppearance(): ArvoChipAppearance {
    return this._opts.colorMode === 'custom' ? 'utility' : this._opts.appearance;
  }
  private get _showDismiss(): boolean {
    // Equivalent to _isDismissibleInput today: only input chips with onDismiss
    // render the visual __dismiss span, and only when not disabled/read-only/
    // loading.
    return this._isDismissibleInput;
  }

  private _resolveColorClass(): string {
    const { colorMode, semanticType, customColor } = this._opts;
    if (colorMode === 'semantic' && semanticType !== 'none') return `arvo-chip--${semanticType}`;
    if (colorMode === 'custom' || this._effectiveAppearance === 'utility') return `arvo-chip--${customColor}`;
    return '';
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private _render(): void {
    this.el.textContent = '';
    this.el.className = this._buildRootClasses();
    this._applyRootAttributes();
    if (this._opts.maxWidth) {
      this.el.style.setProperty('--arvo-chip-max-width', this._opts.maxWidth);
    }
    this._renderContent();
  }

  private _buildRootClasses(): string {
    const o = this._opts;
    const parts = [
      'arvo-chip',
      `arvo-chip--${o.variant}`,
      `arvo-chip--${o.size}`,
      `arvo-chip--${this._effectiveAppearance}`,
      this._resolveColorClass(),
    ];
    if (this._isFilter && o.isSelected) parts.push('active');
    if (o.isDisabled) parts.push('is-disabled');
    if (o.isReadOnly) parts.push('is-readonly');
    if (this._showInvalid) parts.push('is-invalid');
    if (this._showWarning) parts.push('is-warning');
    if (this._showExcluded) parts.push('is-excluded');
    if (o.isLoading) parts.push('loading');
    return parts.filter(Boolean).join(' ');
  }

  private _applyRootAttributes(): void {
    const o = this._opts;
    const isButton = this.el.tagName === 'BUTTON';

    if (isButton) {
      this.el.setAttribute('type', 'button');
      (this.el as HTMLButtonElement).disabled = o.isDisabled;
    } else if (this._isInteractive) {
      this.el.setAttribute('role', 'button');
      if (!o.isDisabled) this.el.setAttribute('tabindex', '0');
    } else if (o.variant === 'input') {
      // Non-dismissible input chip wrapping content: announce as a group.
      this.el.setAttribute('role', 'group');
    }

    if (this._isFilter) {
      this.el.setAttribute('aria-pressed', String(o.isSelected));
    }

    // Single-focus chip model: an input chip with onDismiss is itself the
    // focus target. The aria-label surfaces the Delete/Backspace removal
    // hint so SR users learn how to remove it. Consumers can override later
    // by writing aria-label directly on the host element.
    if (this._isDismissibleInput && !this.el.hasAttribute('aria-label')) {
      this.el.setAttribute(
        'aria-label',
        `${o.label}. Press Delete or Backspace to remove.`,
      );
    }

    this._toggleAttr('aria-disabled', o.isDisabled && !isButton);
    this._toggleAttr('aria-readonly', o.isReadOnly);
    this._toggleAttr('aria-invalid', this._showInvalid);
    this._toggleAttr('aria-busy', o.isLoading);
  }

  private _toggleAttr(name: string, on: boolean): void {
    if (on) this.el.setAttribute(name, 'true');
    else this.el.removeAttribute(name);
  }

  private _renderContent(): void {
    const o = this._opts;

    // Drag handle -- an ArvoIconButton rendered when EITHER a reorderable
    // ArvoChipList injects dragHandleProps OR the standalone chip sets
    // hasDrag=true. Either path is allowed in every color mode (default /
    // semantic / custom).
    if (this._showGrip) {
      this._gripBtnEl = document.createElement('button');
      const gripLabel =
        (o.dragHandleProps &&
          typeof o.dragHandleProps['aria-label'] === 'string' &&
          (o.dragHandleProps['aria-label'] as string)) ||
        'Drag to reorder';
      this._gripInstance = ArvoIconButton.initialize(this._gripBtnEl, {
        icon: 'drag-handle',
        variant: 'tertiary',
        size: 'xs',
        tooltip: gripLabel,
        isDisabled: o.isDisabled,
      });
      this._gripBtnEl.classList.add('arvo-chip__grip');
      // The bag (when present) wins -- spread its role/aria-label/tabindex/
      // handlers onto the same button. Bare hasDrag=true renders a static
      // drag-cursor handle with no dnd wiring.
      if (o.dragHandleProps) {
        this._applyDragHandleProps(this._gripBtnEl, o.dragHandleProps);
      }
      this.el.appendChild(this._gripBtnEl);
    }

    if (o.icon) {
      this._icoEl = document.createElement('i');
      this._icoEl.className = `arvo-chip__ico o9con o9con-${o.icon}`;
      this._icoEl.setAttribute('aria-hidden', 'true');
      this.el.appendChild(this._icoEl);
    }

    if (this._showAvatar && o.avatar) {
      this._avatarEl = document.createElement('span');
      this._avatarEl.className = 'arvo-chip__avatar';
      if (typeof o.avatar === 'string') {
        const img = document.createElement('img');
        img.src = o.avatar;
        img.alt = '';
        this._avatarEl.appendChild(img);
      } else {
        this._avatarEl.appendChild(o.avatar);
      }
      this.el.appendChild(this._avatarEl);
    }

    if (o.title) {
      this._titleEl = document.createElement('span');
      this._titleEl.className = 'arvo-chip__title';
      this._titleEl.textContent = o.title;
      this.el.appendChild(this._titleEl);
    }

    this._lblEl = document.createElement('span');
    this._lblEl.className = 'arvo-chip__lbl';
    this._lblEl.textContent = o.label;
    this.el.appendChild(this._lblEl);

    if (typeof o.counter === 'number') {
      this._counterSpan = document.createElement('span');
      this._counterSpan.className = 'arvo-chip__counter';
      const counterHost = document.createElement('span');
      // Counter color-mode follows the chip's own color-mode so the inner
      // ArvoBadge reads naturally against the chip surface. ArvoBadge already
      // remaps semantic 'block' -> s-negative-strong, so we pass the chip's
      // semanticType straight through. Custom mode forwards customColor so
      // Badge resolves to s-util-{color}-dark. The chip-side .active SCSS
      // overrides --arvo-bdg-bg-strong / --arvo-bdg-text-color to flip the
      // counter to a light pill on the dark selected surface.
      const counterColorMode: 'custom' | 'semantic' =
        o.colorMode === 'custom' ? 'custom' : 'semantic';
      const counterSemanticType =
        o.colorMode === 'semantic' && o.semanticType !== 'none'
          ? o.semanticType
          : 'neutral';
      this._counterInstance = ArvoBadge.initialize(counterHost, {
        variant: 'counter',
        appearance: 'filled',
        colorMode: counterColorMode,
        semanticType: counterSemanticType,
        customColor: o.customColor,
        size: 'sm',
        count: o.counter,
        hideWhenZero: false,
        hasBadgeIcon: false,
      });
      this._counterSpan.appendChild(counterHost);
      this.el.appendChild(this._counterSpan);
    }

    // Inline ArvoMessageAlert (icon-only) communicates the invalid / warning state.
    if (this._showInvalid || this._showWarning) {
      this._alertEl = document.createElement('div');
      this._alertInstance = ArvoMessageAlert.initialize(this._alertEl, {
        isInline: true,
        type: this._showInvalid ? 'negative' : 'warning',
      });
      this._alertEl.classList.add('arvo-chip__alert');
      this.el.appendChild(this._alertEl);
    }

    // Trailing excluded indicator glyph.
    if (this._showExcluded) {
      this._excludeEl = document.createElement('i');
      this._excludeEl.className = 'arvo-chip__exclude o9con o9con-exclude';
      this._excludeEl.setAttribute('aria-hidden', 'true');
      this.el.appendChild(this._excludeEl);
    }

    if (this._showDismiss) {
      // Single-focus chip model: the dismiss is a non-interactive visual span
      // (no role, no tabindex, aria-hidden) -- the chip itself is the focus
      // target and the removal hint lives in the chip's aria-label. This
      // matches the React twin and avoids axe's `nested-interactive` rule.
      this._dismissSpan = document.createElement('span');
      this._dismissSpan.className = 'arvo-chip__dismiss';
      this._dismissSpan.setAttribute('aria-hidden', 'true');

      const dismissIcon = document.createElement('i');
      dismissIcon.className = 'arvo-chip__dismiss-icon o9con o9con-close';
      dismissIcon.setAttribute('aria-hidden', 'true');
      this._dismissSpan.appendChild(dismissIcon);

      this._dismissOnClick = (event: Event) => {
        event.stopPropagation();
        this._beginRemove(event);
      };
      this._dismissSpan.addEventListener('click', this._dismissOnClick);

      this.el.appendChild(this._dismissSpan);
    }

    // Status corner overlay (NOT inline). Rendered as a direct child so the
    // absolute ArvoStatus offsets anchor to the chip box.
    if (this._showStatus && o.status) {
      this._statusEl = document.createElement('span');
      this._statusInstance = ArvoStatus.initialize(this._statusEl, {
        ...o.status,
        size: o.size === 'lg' ? 'md' : 'sm',
        placement: o.status.placement ?? 'top-right',
      });
      this._statusEl.classList.add('arvo-chip__status');
      this.el.appendChild(this._statusEl);
    }
  }

  private _applyDragHandleProps(el: HTMLElement, bag: ArvoChipDragHandleProps): void {
    Object.entries(bag).forEach(([key, value]) => {
      if (typeof value === 'function') {
        const evt = key.startsWith('on') ? key.slice(2).toLowerCase() : key.toLowerCase();
        el.addEventListener(evt, value as EventListener);
      } else {
        el.setAttribute(key, String(value));
      }
    });
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  private _bindEvents(): void {
    this._boundClick = (e: Event) => this._handleClick(e);
    this.el.addEventListener('click', this._boundClick);

    // Keydown handler is needed both for span-hosted interactive chips
    // (Enter/Space activation) AND for dismissible input chips
    // (Delete/Backspace removal), regardless of whether the host is a button.
    if (
      (this._isInteractive && this.el.tagName !== 'BUTTON') ||
      this._isDismissibleInput
    ) {
      this._boundKeydown = (e: KeyboardEvent) => this._handleKeydown(e);
      this.el.addEventListener('keydown', this._boundKeydown as EventListener);
    }
  }

  private _handleClick(e: Event): void {
    const o = this._opts;
    if (o.isDisabled || o.isReadOnly || o.isLoading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (this._isFilter) {
      this.selected(!o.isSelected);
      o.onSelectedChange?.(o.isSelected);
      this._emit('chip:select', { isSelected: o.isSelected });
    } else if (o.variant === 'general' && o.onPress) {
      o.onPress();
      this._emit('chip:press', { originalEvent: e });
    }
    // Input chips intentionally do nothing on a click of the chip body --
    // removal goes through the inner __dismiss span (mouse/touch) or the
    // chip root's Delete/Backspace keydown.
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (
      this._isDismissibleInput &&
      (e.key === 'Delete' || e.key === 'Backspace')
    ) {
      // Only handle when the chip root itself is the event target so we don't
      // steal Backspace from a nested editable.
      if (e.target === e.currentTarget) {
        e.preventDefault();
        e.stopPropagation();
        this._beginRemove(e);
      }
      return;
    }

    if (this._isInteractive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this._handleClick(e);
    }
  }

  /**
   * Drive the chip remove leave animation. Adds `.is-removing` to the chip
   * root, waits for the max-width transition to finish (or the safety
   * timeout fires), then calls `onDismiss` and emits `chip:dismiss`.
   *
   * In environments without CSS transitions (jsdom, prefers-reduced-motion)
   * the safety timeout (500ms past the longest leg of
   * `$arvo-motion-chip-remove`) ensures the consumer still receives the
   * dismissal callback.
   */
  private _beginRemove(originalEvent: Event): void {
    if (this._isRemoving) return;
    this._isRemoving = true;
    this.el.classList.add('is-removing');

    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      this.el.removeEventListener('transitionend', onEnd);
      if (timer !== null) window.clearTimeout(timer);
      this._opts.onDismiss?.();
      this._emit('chip:dismiss', { originalEvent });
    };
    const onEnd = (event: Event): void => {
      const te = event as TransitionEvent;
      if (te.target !== this.el) return;
      if (te.propertyName !== 'max-width') return;
      finish();
    };
    this.el.addEventListener('transitionend', onEnd);
    const timer = window.setTimeout(finish, 500);
  }

  private _emit(name: string, detail: Record<string, unknown>): void {
    this.el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  setLabel(text: string): void {
    this._opts.label = text;
    if (this._lblEl) this._lblEl.textContent = text;
    // Keep the keyboard-removal hint on the chip root in sync with the
    // current label so SR users hear the right name when focus lands.
    if (this._isDismissibleInput) {
      this.el.setAttribute(
        'aria-label',
        `${text}. Press Delete or Backspace to remove.`,
      );
    }
  }

  setTitle(text: string | null): void {
    this._opts.title = text;
    if (text) {
      if (!this._titleEl) {
        this._titleEl = document.createElement('span');
        this._titleEl.className = 'arvo-chip__title';
        if (this._lblEl) this.el.insertBefore(this._titleEl, this._lblEl);
      }
      this._titleEl.textContent = text;
    } else if (this._titleEl) {
      this._titleEl.remove();
      this._titleEl = null;
    }
  }

  setIcon(iconName: string | null): void {
    this._opts.icon = iconName;
    if (iconName) {
      if (!this._icoEl) {
        this._icoEl = document.createElement('i');
        this._icoEl.setAttribute('aria-hidden', 'true');
        const anchor = this._gripBtnEl ? this._gripBtnEl.nextSibling : this.el.firstChild;
        this.el.insertBefore(this._icoEl, anchor);
      }
      this._icoEl.className = `arvo-chip__ico o9con o9con-${iconName}`;
    } else if (this._icoEl) {
      this._icoEl.remove();
      this._icoEl = null;
    }
  }

  setVariant(variant: ArvoChipVariant): void {
    if (!VALID_VARIANTS.includes(variant)) return;
    this._opts.variant = variant;
    this._rebuild();
  }

  setSize(size: ArvoChipSize): void {
    if (!VALID_SIZES.includes(size)) return;
    VALID_SIZES.forEach(s => this.el.classList.remove(`arvo-chip--${s}`));
    this.el.classList.add(`arvo-chip--${size}`);
    this._opts.size = size;
    if (this._statusInstance) this._statusInstance.setSize(this._opts.status?.size ?? 'sm');
  }

  setAppearance(appearance: ArvoChipAppearance): void {
    if (!VALID_APPEARANCES.includes(appearance)) return;
    this._opts.appearance = appearance;
    this._rebuild();
  }

  setColorMode(mode: ArvoChipColorMode): void {
    if (!VALID_COLOR_MODES.includes(mode)) return;
    this._opts.colorMode = mode;
    this._rebuild();
  }

  setSemanticType(type: ArvoChipSemanticType): void {
    if (!VALID_SEMANTIC_TYPES.includes(type)) return;
    this._opts.semanticType = type;
    this._applyColorClass();
  }

  setCustomColor(color: ArvoChipCustomColor): void {
    if (!VALID_CUSTOM_COLORS.includes(color)) return;
    this._opts.customColor = color;
    this._applyColorClass();
  }

  private _applyColorClass(): void {
    [...SEMANTIC_COLOR_CLASSES, ...VALID_CUSTOM_COLORS].forEach(c => this.el.classList.remove(`arvo-chip--${c}`));
    const cls = this._resolveColorClass();
    if (cls) this.el.classList.add(cls);
  }

  setCounter(value: number | null): void {
    this._opts.counter = value;
    if (typeof value === 'number') {
      if (this._counterInstance) {
        this._counterInstance.count(value);
      } else {
        this._counterSpan = document.createElement('span');
        this._counterSpan.className = 'arvo-chip__counter';
        const host = document.createElement('span');
        this._counterInstance = ArvoBadge.initialize(host, {
          variant: 'counter', appearance: 'filled', colorMode: 'semantic',
          semanticType: 'neutral', size: 'sm', count: value, hideWhenZero: false,
        });
        this._counterSpan.appendChild(host);
        const anchor = this._alertEl ?? this._excludeEl ?? this._dismissSpan ?? this._statusEl;
        this.el.insertBefore(this._counterSpan, anchor);
      }
    } else {
      this._counterInstance?.destroy();
      this._counterInstance = null;
      this._counterSpan?.remove();
      this._counterSpan = null;
    }
  }

  setStatus(config: ArvoStatusConfig | false): void {
    if (config === false) {
      this._opts.status = null;
    } else {
      this._opts.status = config;
    }
    this._rebuild();
  }

  setMaxWidth(value: string | null): void {
    this._opts.maxWidth = value;
    if (value) this.el.style.setProperty('--arvo-chip-max-width', value);
    else this.el.style.removeProperty('--arvo-chip-max-width');
  }

  selected(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isSelected;
    if (!this._isFilter) return;
    this._opts.isSelected = state;
    this.el.classList.toggle('active', state);
    this.el.setAttribute('aria-pressed', String(state));
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    this._opts.isDisabled = state;
    this.el.classList.toggle('is-disabled', state);
    if (this.el.tagName === 'BUTTON') {
      (this.el as HTMLButtonElement).disabled = state;
    } else {
      this._toggleAttr('aria-disabled', state);
      if (this._isInteractive) {
        if (state) this.el.removeAttribute('tabindex');
        else this.el.setAttribute('tabindex', '0');
      }
    }
    this._gripInstance?.disabled(state);
    this._refreshDismiss();
  }

  readOnly(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isReadOnly;
    this._opts.isReadOnly = state;
    this.el.classList.toggle('is-readonly', state);
    this._toggleAttr('aria-readonly', state);
    this._refreshDismiss();
  }

  invalid(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isInvalid;
    this._opts.isInvalid = state;
    this._rebuild();
  }

  warning(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isWarning;
    this._opts.isWarning = state;
    this._rebuild();
  }

  excluded(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isExcluded;
    this._opts.isExcluded = state;
    this._rebuild();
  }

  setLoading(loading: boolean): void {
    this._opts.isLoading = loading;
    this.el.classList.toggle('loading', loading);
    this._toggleAttr('aria-busy', loading);
    this._refreshDismiss();
    this._emit('chip:loading', { isLoading: loading });
  }

  focus(): void {
    if (!this._opts.isLoading) this.el.focus();
  }

  private _refreshDismiss(): void {
    const shouldShow = this._showDismiss;
    if (shouldShow && !this._dismissSpan) {
      this._dismissSpan = document.createElement('span');
      this._dismissSpan.className = 'arvo-chip__dismiss';
      this._dismissSpan.setAttribute('aria-hidden', 'true');

      const dismissIcon = document.createElement('i');
      dismissIcon.className = 'arvo-chip__dismiss-icon o9con o9con-close';
      dismissIcon.setAttribute('aria-hidden', 'true');
      this._dismissSpan.appendChild(dismissIcon);

      this._dismissOnClick = (event: Event) => {
        event.stopPropagation();
        this._opts.onDismiss?.();
        this._emit('chip:dismiss', { originalEvent: event });
      };
      this._dismissSpan.addEventListener('click', this._dismissOnClick);

      const anchor = this._statusEl;
      this.el.insertBefore(this._dismissSpan, anchor);
    } else if (!shouldShow && this._dismissSpan) {
      if (this._dismissOnClick) {
        this._dismissSpan.removeEventListener('click', this._dismissOnClick);
      }
      this._dismissOnClick = null;
      this._dismissInstance?.destroy();
      this._dismissInstance = null;
      this._dismissBtnEl = null;
      this._dismissSpan.remove();
      this._dismissSpan = null;
    }
  }

  private _rebuild(): void {
    this._teardownInner();
    this.el.removeAttribute('role');
    this.el.removeAttribute('tabindex');
    this.el.removeAttribute('aria-pressed');
    this._render();
    this._unbindEvents();
    this._bindEvents();
  }

  private _teardownInner(): void {
    this._gripInstance?.destroy();
    this._gripInstance = null;
    this._counterInstance?.destroy();
    this._counterInstance = null;
    this._alertInstance?.destroy();
    this._alertInstance = null;
    this._statusInstance?.destroy();
    this._statusInstance = null;
    this._dismissInstance?.destroy();
    this._dismissInstance = null;
    if (this._dismissSpan && this._dismissOnClick) {
      this._dismissSpan.removeEventListener('click', this._dismissOnClick);
    }
    this._dismissOnClick = null;
    this._gripBtnEl = null;
    this._icoEl = null;
    this._avatarEl = null;
    this._titleEl = null;
    this._lblEl = null;
    this._counterSpan = null;
    this._alertEl = null;
    this._excludeEl = null;
    this._statusEl = null;
    this._dismissSpan = null;
    this._dismissBtnEl = null;
  }

  private _unbindEvents(): void {
    if (this._boundClick) this.el.removeEventListener('click', this._boundClick);
    if (this._boundKeydown) this.el.removeEventListener('keydown', this._boundKeydown as EventListener);
    this._boundClick = null;
    this._boundKeydown = null;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._unbindEvents();
    this._teardownInner();
    this.el.textContent = '';
    this.el.className = '';
    this.el.removeAttribute('role');
    this.el.removeAttribute('tabindex');
    this.el.removeAttribute('aria-pressed');
    this.el.removeAttribute('aria-disabled');
    this.el.removeAttribute('aria-readonly');
    this.el.removeAttribute('aria-invalid');
    this.el.removeAttribute('aria-busy');
    this.el.style.removeProperty('--arvo-chip-max-width');
  }
}
