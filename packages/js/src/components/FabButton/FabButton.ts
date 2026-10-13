import { ArvoButton } from '../Button/Button';
import { ArvoIconButton, type IconButtonTooltipOption } from '../IconButton/IconButton';

export type FabButtonVariant = 'primary' | 'secondary';

export interface ArvoFabButtonOptions {
  variant?: FabButtonVariant;
  icon?: string;
  label?: string | null;
  isDisabled?: boolean;
  isLoading?: boolean;
  zIndex?: number | null;
  /**
   * Optional tooltip text or config. Forwarded to the inner `ArvoIconButton`
   * (icon-only mode); ignored in with-label mode. Accepts a plain string or
   * a config object (`{ content, placement?, shortcut? }`).
   */
  tooltip?: IconButtonTooltipOption;
  onClick?: (event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
}

type ResolvedOptions = {
  variant: FabButtonVariant;
  icon: string;
  label: string | null;
  isDisabled: boolean;
  isLoading: boolean;
  zIndex: number | null;
  tooltip: IconButtonTooltipOption | null;
  onClick: ((event: Event) => void) | null;
  onFocus: ((event: FocusEvent) => void) | null;
  onBlur: ((event: FocusEvent) => void) | null;
};

const VALID_VARIANTS: readonly FabButtonVariant[] = ['primary', 'secondary'];

export class ArvoFabButton {
  private _container: HTMLElement | null;
  private _wrapperEl: HTMLDivElement | null = null;
  private _buttonEl: HTMLButtonElement | null = null;
  private _innerButton: ArvoButton | ArvoIconButton | null = null;
  private _options: ResolvedOptions;

  static readonly VARIANTS = VALID_VARIANTS;

  static readonly DEFAULTS: ResolvedOptions = {
    variant: 'primary',
    icon: 'plus',
    label: null,
    isDisabled: false,
    isLoading: false,
    zIndex: null,
    tooltip: null,
    onClick: null,
    onFocus: null,
    onBlur: null,
  };

  static initialize(element: HTMLElement, options?: ArvoFabButtonOptions): ArvoFabButton {
    return new ArvoFabButton(element, options);
  }

  constructor(element: HTMLElement, options?: ArvoFabButtonOptions) {
    this._container = element;

    const variant = options?.variant && VALID_VARIANTS.includes(options.variant)
      ? options.variant
      : ArvoFabButton.DEFAULTS.variant;

    this._options = {
      ...ArvoFabButton.DEFAULTS,
      ...options,
      variant,
      icon: options?.icon ?? ArvoFabButton.DEFAULTS.icon,
      label: options?.label ?? ArvoFabButton.DEFAULTS.label,
      tooltip: options?.tooltip ?? null,
      onClick: options?.onClick ?? null,
      onFocus: options?.onFocus ?? null,
      onBlur: options?.onBlur ?? null,
      zIndex: options?.zIndex ?? null,
    };


    this._render();
  }

  private _render(): void {
    if (!this._container) return;

    this._wrapperEl = document.createElement('div');
    this._applyWrapperClasses();
    this._applyZIndex();

    this._buttonEl = document.createElement('button');
    this._wrapperEl.appendChild(this._buttonEl);
    this._createInnerButton();

    this._container.appendChild(this._wrapperEl);
  }

  private _applyWrapperClasses(): void {
    if (!this._wrapperEl) return;

    // Empty string label routes to icon-only mode, matching React's
    // `!!label` behavior.
    const isWithLabel = !!this._options.label;
    this._wrapperEl.className = [
      'arvo-fab-btn',
      `arvo-fab-btn--${this._options.variant}`,
      isWithLabel ? 'arvo-fab-btn--with-label' : 'arvo-fab-btn--icon-only',
      this._options.isDisabled ? 'is-disabled' : '',
      this._options.isLoading ? 'loading' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private _applyZIndex(): void {
    if (!this._wrapperEl) return;

    if (this._options.zIndex !== null) {
      this._wrapperEl.style.zIndex = String(this._options.zIndex);
    } else {
      this._wrapperEl.style.removeProperty('z-index');
    }
  }

  private _createInnerButton(): void {
    if (!this._buttonEl) return;

    if (this._options.label) {
      // Label-bearing FAB: ArvoButton has no `tooltip` prop per the design
      // system tooltip standard. Consumers wrap with ArvoTooltip externally
      // when the with-label FAB needs a supplementary tooltip. Empty-string
      // label routes through the icon-only branch below to mirror the React
      // twin.
      this._innerButton = new ArvoButton(this._buttonEl, {
        variant: this._options.variant,
        size: 'md',
        icon: this._options.icon,
        label: this._options.label,
        isDisabled: this._options.isDisabled,
        isLoading: this._options.isLoading,
        onClick: this._options.onClick ?? undefined,
      });
    } else {
      this._innerButton = new ArvoIconButton(this._buttonEl, {
        variant: this._options.variant,
        size: 'lg',
        icon: this._options.icon,
        tooltip: this._options.tooltip ?? '',
        isDisabled: this._options.isDisabled,
        isLoading: this._options.isLoading,
        onClick: this._options.onClick ?? undefined,
      });
    }

    if (this._options.onFocus) {
      this._buttonEl.addEventListener('focus', this._options.onFocus as EventListener);
    }
    if (this._options.onBlur) {
      this._buttonEl.addEventListener('blur', this._options.onBlur as EventListener);
    }
  }

  private _destroyInnerButton(): void {
    if (this._buttonEl && this._options.onFocus) {
      this._buttonEl.removeEventListener('focus', this._options.onFocus as EventListener);
    }
    if (this._buttonEl && this._options.onBlur) {
      this._buttonEl.removeEventListener('blur', this._options.onBlur as EventListener);
    }

    this._innerButton?.destroy();
    this._innerButton = null;
  }

  setVariant(variant: string): void {
    if (!VALID_VARIANTS.includes(variant as FabButtonVariant)) return;

    this._options.variant = variant as FabButtonVariant;
    this._applyWrapperClasses();

    if (this._innerButton) {
      this._innerButton.setVariant(variant);
    }

    this._dispatchEvent('fab-btn:variant', { variant });
  }

  setIcon(iconName: string): void {
    this._options.icon = iconName;

    if (this._innerButton) {
      this._innerButton.setIcon(iconName);
    }
  }

  setLabel(label: string | null): void {
    // Match `_applyWrapperClasses`/`_createInnerButton`: empty string routes
    // to icon-only mode.
    const wasWithLabel = !!this._options.label;
    const isWithLabel = !!label;
    this._options.label = label;

    if (wasWithLabel !== isWithLabel) {
      this._destroyInnerButton();
      this._buttonEl?.remove();
      this._buttonEl = document.createElement('button');
      this._wrapperEl?.appendChild(this._buttonEl);

      this._createInnerButton();
      this._applyWrapperClasses();
    } else if (isWithLabel && this._innerButton instanceof ArvoButton) {
      this._innerButton.setLabel(label!);
    }
  }

  setZIndex(zIndex: number | null): void {
    this._options.zIndex = zIndex;
    this._applyZIndex();
  }

  disabled(state?: boolean): boolean | void {
    if (state === undefined) {
      return this._options.isDisabled;
    }

    this._options.isDisabled = state;
    this._applyWrapperClasses();

    if (this._innerButton) {
      this._innerButton.disabled(state);
    }
  }

  setLoading(isLoading: boolean): void {
    this._options.isLoading = isLoading;
    this._applyWrapperClasses();

    if (this._innerButton) {
      this._innerButton.setLoading(isLoading);
    }

    if (this._wrapperEl) {
      if (isLoading) {
        this._wrapperEl.setAttribute('aria-busy', 'true');
      } else {
        this._wrapperEl.removeAttribute('aria-busy');
      }
    }
  }

  focus(): void {
    if (this._buttonEl && !this._options.isLoading) {
      this._buttonEl.focus();
    }
  }

  destroy(): void {
    this._destroyInnerButton();

    this._buttonEl?.remove();
    this._buttonEl = null;

    this._wrapperEl?.remove();
    this._wrapperEl = null;

    this._container = null;
  }

  private _dispatchEvent(name: string, detail: Record<string, unknown>): void {
    this._wrapperEl?.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail,
    }));
  }
}
