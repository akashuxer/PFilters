// ArvoAvatar -- vanilla JS twin of the React component.
//
// Decorates the host element in place. Renders the variant-specific inner
// DOM (img / text / icon), applies BEM modifier classes, wires up the image
// fallback chain when applicable, and attaches click/keyboard listeners
// when interactive.
//
// Parity contract: prop/option key set, BEM classes emitted, event names,
// and method signatures MUST match `@arvo/react` ArvoAvatar.

import { resolveInitials } from '@arvo/core';

// ---------------------------------------------------------------------------
// Public types (mirror the React props)
// ---------------------------------------------------------------------------

export type ArvoAvatarVariant =
  | 'image'
  | 'initials'
  | 'icon'
  | 'logo'
  | 'o9logo'
  | 'novai';

export type ArvoAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ArvoAvatarAppearance = 'filled' | 'outline' | 'primary';

export type ArvoAvatarColorMode = 'default' | 'semantic' | 'custom';

export type ArvoAvatarSemanticType =
  | 'positive'
  | 'negative'
  | 'warning'
  | 'info';

export type ArvoAvatarCustomColor =
  | 'purple'
  | 'pink'
  | 'glacier'
  | 'amber'
  | 'greenish'
  | 'bluish';

export interface ArvoAvatarOptions {
  variant?: ArvoAvatarVariant;
  size?: ArvoAvatarSize;
  /**
   * Surface chrome. See ArvoAvatarProps.appearance for the per-variant
   * rules. novai supports 'outline' (rest, default) and 'filled' (active).
   */
  appearance?: ArvoAvatarAppearance;
  colorMode?: ArvoAvatarColorMode;
  semanticType?: ArvoAvatarSemanticType;
  customColor?: ArvoAvatarCustomColor;
  name?: string;
  email?: string;
  src?: string;
  alt?: string;
  icon?: string;
  /**
   * Brand asset name for variant='logo' (e.g. "GitHub"). When set, the logo
   * variant renders an SVG sourced from `${logoBaseUrl}/light/{logo}.svg`
   * (and `/dark/{logo}.svg` when the user-agent prefers a dark color
   * scheme) instead of an o9con glyph.
   */
  logo?: string;
  /** URL prefix used to resolve `logo`. Defaults to `'/logos'`. */
  logoBaseUrl?: string;
  tooltip?: string;
  isInteractive?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (event: Event) => void;
  id?: string;
}

interface ResolvedOptions {
  variant: ArvoAvatarVariant;
  size: ArvoAvatarSize;
  appearance: ArvoAvatarAppearance;
  colorMode: ArvoAvatarColorMode;
  semanticType: ArvoAvatarSemanticType;
  customColor: ArvoAvatarCustomColor;
  name: string | null;
  email: string | null;
  src: string | null;
  alt: string | null;
  icon: string | null;
  logo: string | null;
  logoBaseUrl: string;
  tooltip: string | null;
  isInteractive: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  href: string | null;
  target: string | null;
  rel: string | null;
  onClick: ((event: Event) => void) | null;
  id: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_VARIANTS: readonly ArvoAvatarVariant[] = [
  'image', 'initials', 'icon', 'logo', 'o9logo', 'novai',
];
const VALID_SIZES: readonly ArvoAvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
const VALID_APPEARANCES: readonly ArvoAvatarAppearance[] = ['filled', 'outline', 'primary'];
const VALID_COLOR_MODES: readonly ArvoAvatarColorMode[] = ['default', 'semantic', 'custom'];
const VALID_SEMANTIC_TYPES: readonly ArvoAvatarSemanticType[] = [
  'positive', 'negative', 'warning', 'info',
];
const VALID_CUSTOM_COLORS: readonly ArvoAvatarCustomColor[] = [
  'purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish',
];

const DEFAULT_ICON = 'user';
const O9LOGO_ICON = 'o9-logo';
const NOVAI_ICON = 'genai';
const DEFAULT_LOGO_BASE_URL = '/logos';

const DEFAULTS: ResolvedOptions = {
  variant: 'icon',
  size: 'md',
  appearance: 'filled',
  colorMode: 'default',
  semanticType: 'positive',
  customColor: 'purple',
  name: null,
  email: null,
  src: null,
  alt: null,
  icon: null,
  logo: null,
  logoBaseUrl: DEFAULT_LOGO_BASE_URL,
  tooltip: null,
  isInteractive: false,
  isDisabled: false,
  isLoading: false,
  href: null,
  target: null,
  rel: null,
  onClick: null,
  id: null,
};

function autoTooltip(opts: {
  variant: ArvoAvatarVariant;
  name: string | null;
  alt: string | null;
  logo: string | null;
}): string {
  switch (opts.variant) {
    case 'o9logo':
      return 'o9 Platform';
    case 'novai':
      return 'Nova AI assistant';
    case 'image':
      return opts.alt || opts.name || 'User avatar';
    case 'initials':
      return opts.name || 'User';
    case 'logo':
      return opts.name || opts.logo || 'Logo';
    case 'icon':
    default:
      return opts.name || 'User';
  }
}

/** Default appearance differs per variant: novai = outline, everything else = filled. */
function defaultAppearance(variant: ArvoAvatarVariant): ArvoAvatarAppearance {
  return variant === 'novai' ? 'outline' : 'filled';
}

function pickEnum<T extends string>(
  value: T | undefined,
  valid: readonly T[],
  fallback: T,
): T {
  return value !== undefined && valid.includes(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoAvatar {
  /** The host element passed to initialize. Decorated in place. */
  readonly el: HTMLElement;

  private _opts: ResolvedOptions;
  private _imgEl: HTMLImageElement | null = null;
  private _innerEl: HTMLElement | null = null;
  private _imageFailed = false;
  private _destroyed = false;

  private _onClickBound: ((event: Event) => void) | null = null;
  private _onKeyDownBound: ((event: KeyboardEvent) => void) | null = null;
  private _onImageErrorBound: ((event: Event) => void) | null = null;
  private _onImageLoadBound: ((event: Event) => void) | null = null;

  static readonly VARIANTS = VALID_VARIANTS;
  static readonly SIZES = VALID_SIZES;
  static readonly APPEARANCES = VALID_APPEARANCES;
  static readonly COLOR_MODES = VALID_COLOR_MODES;
  static readonly SEMANTIC_TYPES = VALID_SEMANTIC_TYPES;
  static readonly CUSTOM_COLORS = VALID_CUSTOM_COLORS;

  static initialize(
    element: HTMLElement | null,
    options?: ArvoAvatarOptions,
  ): ArvoAvatar {
    const host = element ?? document.createElement('span');
    return new ArvoAvatar(host, options);
  }

  constructor(element: HTMLElement, options?: ArvoAvatarOptions) {
    this.el = element;
    this._opts = this._normalize(options);
    this._render();
    this._bindHandlers();
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  private _normalize(options: ArvoAvatarOptions | undefined): ResolvedOptions {
    const o = options ?? {};
    const variant = pickEnum(o.variant, VALID_VARIANTS, DEFAULTS.variant);
    let appearance = pickEnum(
      o.appearance,
      VALID_APPEARANCES,
      defaultAppearance(variant),
    );
    // Logo does not support filled.
    if (variant === 'logo' && appearance === 'filled') appearance = 'outline';
    // novai supports only outline (rest) + filled (active). primary -> outline.
    if (variant === 'novai' && appearance === 'primary') appearance = 'outline';

    return {
      variant,
      size: pickEnum(o.size, VALID_SIZES, DEFAULTS.size),
      appearance,
      colorMode: pickEnum(o.colorMode, VALID_COLOR_MODES, DEFAULTS.colorMode),
      semanticType: pickEnum(
        o.semanticType,
        VALID_SEMANTIC_TYPES,
        DEFAULTS.semanticType,
      ),
      customColor: pickEnum(o.customColor, VALID_CUSTOM_COLORS, DEFAULTS.customColor),
      name: o.name ?? null,
      email: o.email ?? null,
      src: o.src ?? null,
      alt: o.alt ?? null,
      icon: o.icon ?? null,
      logo: o.logo ?? null,
      logoBaseUrl: o.logoBaseUrl ?? DEFAULT_LOGO_BASE_URL,
      tooltip: o.tooltip ?? null,
      isInteractive: o.isInteractive ?? DEFAULTS.isInteractive,
      isDisabled: o.isDisabled ?? DEFAULTS.isDisabled,
      isLoading: o.isLoading ?? DEFAULTS.isLoading,
      href: o.href ?? null,
      target: o.target ?? null,
      rel: o.rel ?? null,
      onClick: o.onClick ?? null,
      id: o.id ?? null,
    };
  }

  private _isSvgLogo(): boolean {
    return this._opts.variant === 'logo' && Boolean(this._opts.logo);
  }

  private _render(): void {
    this._teardownImageListeners();
    this.el.textContent = '';
    this._imgEl = null;
    this._innerEl = null;

    if (this._opts.id) this.el.id = this._opts.id;

    // Determine effective variant (image fallback).
    const effectiveVariant = this._effectiveVariant();
    const isSvgLogo = this._isSvgLogo();

    // Inner content.
    if (effectiveVariant === 'image') {
      const img = document.createElement('img');
      img.className = 'arvo-avt__img';
      if (this._opts.src) img.src = this._opts.src;
      img.alt = '';
      this._imgEl = img;
      this.el.appendChild(img);
    } else if (effectiveVariant === 'initials') {
      const text = document.createElement('span');
      text.className = 'arvo-avt__text';
      text.setAttribute('aria-hidden', 'true');
      text.textContent = this._resolvedInitials();
      this._innerEl = text;
      this.el.appendChild(text);
    } else if (isSvgLogo) {
      const logoEl = document.createElement('span');
      logoEl.className = 'arvo-avt__logo';
      logoEl.setAttribute('aria-hidden', 'true');
      this._innerEl = logoEl;
      this.el.appendChild(logoEl);
    } else {
      const i = document.createElement('i');
      i.className = `arvo-avt__ico o9con o9con-${this._resolvedIcon(effectiveVariant)}`;
      i.setAttribute('aria-hidden', 'true');
      this._innerEl = i;
      this.el.appendChild(i);
    }

    this._applyClasses();
    this._applyAttributes();
    this._applyLogoStyle();
  }

  private _applyLogoStyle(): void {
    if (this._isSvgLogo() && this._opts.logo) {
      const base = this._opts.logoBaseUrl || DEFAULT_LOGO_BASE_URL;
      this.el.style.setProperty(
        '--arvo-avt-logo-url-light',
        `url('${base}/light/${this._opts.logo}.svg')`,
      );
      this.el.style.setProperty(
        '--arvo-avt-logo-url-dark',
        `url('${base}/dark/${this._opts.logo}.svg')`,
      );
    } else {
      this.el.style.removeProperty('--arvo-avt-logo-url-light');
      this.el.style.removeProperty('--arvo-avt-logo-url-dark');
    }
  }

  private _bindHandlers(): void {
    // Image error/load listeners (set per render in _render(), but the bound
    // refs live here for the life of the instance).
    if (this._imgEl) {
      this._onImageErrorBound = this._handleImageError.bind(this);
      this._onImageLoadBound = this._handleImageLoad.bind(this);
      this._imgEl.addEventListener('error', this._onImageErrorBound);
      this._imgEl.addEventListener('load', this._onImageLoadBound);
    }

    // Interactive click + keyboard listeners. Attach unconditionally so we
    // can suppress events when disabled/loading without depending on the
    // host element type. The handlers themselves no-op when not interactive.
    this._onClickBound = this._handleClick.bind(this);
    this._onKeyDownBound = this._handleKeyDown.bind(this);
    this.el.addEventListener('click', this._onClickBound);
    this.el.addEventListener('keydown', this._onKeyDownBound);
  }

  private _teardownImageListeners(): void {
    if (this._imgEl) {
      if (this._onImageErrorBound) {
        this._imgEl.removeEventListener('error', this._onImageErrorBound);
      }
      if (this._onImageLoadBound) {
        this._imgEl.removeEventListener('load', this._onImageLoadBound);
      }
    }
    this._onImageErrorBound = null;
    this._onImageLoadBound = null;
  }

  // -------------------------------------------------------------------------
  // Resolution helpers
  // -------------------------------------------------------------------------

  private _effectiveVariant(): ArvoAvatarVariant {
    const { variant, src } = this._opts;
    if (variant === 'image' && (!src || this._imageFailed)) {
      return this._resolvedInitials() ? 'initials' : 'icon';
    }
    return variant;
  }

  private _resolvedInitials(): string {
    return resolveInitials({
      name: this._opts.name ?? undefined,
      email: this._opts.email ?? undefined,
      maxChars: this._opts.size === 'xs' ? 1 : 2,
    });
  }

  private _resolvedIcon(effectiveVariant: ArvoAvatarVariant): string {
    if (effectiveVariant === 'o9logo') return O9LOGO_ICON;
    if (effectiveVariant === 'novai') return NOVAI_ICON;
    if (effectiveVariant === 'logo') return this._opts.icon || DEFAULT_ICON;
    return this._opts.icon || DEFAULT_ICON;
  }

  private _isEffectivelyInteractive(): boolean {
    return (
      this._opts.isInteractive ||
      Boolean(this._opts.href) ||
      typeof this._opts.onClick === 'function'
    );
  }

  // -------------------------------------------------------------------------
  // Class + attribute application
  // -------------------------------------------------------------------------

  private _applyClasses(): void {
    const {
      size, appearance, colorMode, semanticType, customColor, isLoading, variant,
    } = this._opts;
    const effectiveVariant = this._effectiveVariant();
    const effectiveAppearance: ArvoAvatarAppearance =
      colorMode === 'semantic' ? 'filled' : appearance;
    const themingApplies =
      effectiveVariant === 'icon' ||
      effectiveVariant === 'initials' ||
      effectiveVariant === 'logo';
    // novai participates in the appearance cascade too (outline vs filled).
    const emitAppearanceClass = themingApplies || variant === 'novai';
    const isInteractive = this._isEffectivelyInteractive();
    const isSvgLogo = this._isSvgLogo();

    // Preserve consumer classes that are not Avatar-managed.
    const existing = Array.from(this.el.classList).filter(
      c => !c.startsWith('arvo-avt') && c !== 'interactive' && c !== 'loading',
    );

    const classes = [
      ...existing,
      'arvo-avt',
      `arvo-avt--${effectiveVariant}`,
      `arvo-avt--${size}`,
    ];

    if (emitAppearanceClass) {
      classes.push(`arvo-avt--${effectiveAppearance}`);
    }
    if ((effectiveVariant === 'icon' || effectiveVariant === 'initials') && colorMode !== 'default') {
      classes.push(`arvo-avt--${colorMode}`);
    }
    if ((effectiveVariant === 'icon' || effectiveVariant === 'initials') && colorMode === 'semantic') {
      classes.push(`arvo-avt--${semanticType}`);
    }
    if ((effectiveVariant === 'icon' || effectiveVariant === 'initials') && colorMode === 'custom') {
      classes.push(`arvo-avt--${customColor}`);
    }

    if (isSvgLogo) classes.push('arvo-avt--svg');
    if (isInteractive) classes.push('interactive');
    if (isLoading) classes.push('loading');

    this.el.className = classes.join(' ');
  }

  private _applyAttributes(): void {
    const effectiveVariant = this._effectiveVariant();
    const { isDisabled, isLoading, tooltip, name, alt, logo, href, target, rel } =
      this._opts;
    const isInteractive = this._isEffectivelyInteractive();

    const resolvedTooltip = tooltip ?? autoTooltip({
      variant: effectiveVariant,
      name,
      alt,
      logo,
    });

    this.el.setAttribute('aria-label', resolvedTooltip);
    this.el.setAttribute('title', resolvedTooltip);

    // role="img" for non-interactive surfaces (we do not change the tagName,
    // so the consumer's chosen host stays; the role attribute helps assistive
    // tech announce the avatar as an image).
    if (!isInteractive && !(this.el instanceof HTMLButtonElement) && !(this.el instanceof HTMLAnchorElement)) {
      this.el.setAttribute('role', 'img');
    } else {
      this.el.removeAttribute('role');
    }

    if (isDisabled) {
      this.el.setAttribute('aria-disabled', 'true');
      this.el.setAttribute('tabindex', '-1');
      // For native buttons, set the disabled attribute too.
      if (this.el instanceof HTMLButtonElement) this.el.disabled = true;
    } else {
      this.el.removeAttribute('aria-disabled');
      this.el.removeAttribute('tabindex');
      if (this.el instanceof HTMLButtonElement) this.el.disabled = false;
    }

    if (isLoading) this.el.setAttribute('aria-busy', 'true');
    else this.el.removeAttribute('aria-busy');

    // Anchor passthroughs. Only mutate when the element is actually an <a>.
    if (this.el instanceof HTMLAnchorElement) {
      if (href && !isDisabled) this.el.href = href;
      else this.el.removeAttribute('href');

      if (target && !isDisabled) {
        this.el.target = target;
        const effectiveRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : null);
        if (effectiveRel) this.el.rel = effectiveRel;
        else this.el.removeAttribute('rel');
      } else {
        this.el.removeAttribute('target');
        this.el.removeAttribute('rel');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private _handleClick(event: Event): void {
    if (!this._isEffectivelyInteractive()) return;
    if (this._opts.isDisabled || this._opts.isLoading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this._opts.onClick?.(event);
    this.el.dispatchEvent(new CustomEvent('avt:click', { bubbles: true }));
  }

  private _handleKeyDown(event: KeyboardEvent): void {
    if (!this._isEffectivelyInteractive()) return;
    if (this._opts.isDisabled || this._opts.isLoading) return;
    // For native <button>/<a> Enter is handled natively; we add Space for
    // anchor and span-shaped interactive surfaces, and Enter for span.
    if (this.el instanceof HTMLButtonElement) {
      // Native handling -- no synthetic click.
      return;
    }
    const isAnchor = this.el instanceof HTMLAnchorElement;
    if (event.key === 'Enter' && !isAnchor) {
      event.preventDefault();
      this.el.click();
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.el.click();
    }
  }

  private _handleImageError(): void {
    this._imageFailed = true;
    const src = this._opts.src ?? '';
    this.el.dispatchEvent(
      new CustomEvent('avt:image-error', { bubbles: true, detail: { src } }),
    );
    // Swap inner DOM to the fallback variant.
    const fallback: 'initials' | 'icon' = this._resolvedInitials() ? 'initials' : 'icon';
    this._render();
    this._bindHandlers();
    this.el.dispatchEvent(
      new CustomEvent('avt:image-fallback', {
        bubbles: true,
        detail: { src, fallback },
      }),
    );
  }

  private _handleImageLoad(): void {
    const src = this._opts.src ?? '';
    this.el.dispatchEvent(
      new CustomEvent('avt:image-load', { bubbles: true, detail: { src } }),
    );
  }

  // -------------------------------------------------------------------------
  // Public API (mirrors React props as method setters)
  // -------------------------------------------------------------------------

  setVariant(variant: ArvoAvatarVariant): void {
    if (!VALID_VARIANTS.includes(variant)) return;
    const prevVariant = this._opts.variant;
    this._opts.variant = variant;
    // Re-apply per-variant appearance defaults / clamps. The bare appearance
    // remains the consumer's chosen value when valid for the new variant.
    if (variant === 'logo' && this._opts.appearance === 'filled') {
      this._opts.appearance = 'outline';
    }
    if (variant === 'novai' && this._opts.appearance === 'primary') {
      this._opts.appearance = 'outline';
    }
    // If the appearance was never explicitly set (still equal to the prev
    // variant's default), update to the new variant's default.
    if (this._opts.appearance === defaultAppearance(prevVariant)) {
      this._opts.appearance = defaultAppearance(variant);
    }
    this._imageFailed = false;
    this._render();
    this._bindHandlers();
  }

  setSize(size: ArvoAvatarSize): void {
    if (!VALID_SIZES.includes(size)) return;
    this._opts.size = size;
    // Rerender so initials respect the xs single-char rule.
    this._render();
    this._bindHandlers();
  }

  setAppearance(appearance: ArvoAvatarAppearance): void {
    if (!VALID_APPEARANCES.includes(appearance)) return;
    if (this._opts.variant === 'logo' && appearance === 'filled') {
      this._opts.appearance = 'outline';
    } else if (this._opts.variant === 'novai' && appearance === 'primary') {
      this._opts.appearance = 'outline';
    } else {
      this._opts.appearance = appearance;
    }
    this._applyClasses();
  }

  setColorMode(mode: ArvoAvatarColorMode): void {
    if (!VALID_COLOR_MODES.includes(mode)) return;
    this._opts.colorMode = mode;
    this._applyClasses();
  }

  setSemanticType(type: ArvoAvatarSemanticType): void {
    if (!VALID_SEMANTIC_TYPES.includes(type)) return;
    this._opts.semanticType = type;
    this._applyClasses();
  }

  setCustomColor(color: ArvoAvatarCustomColor): void {
    if (!VALID_CUSTOM_COLORS.includes(color)) return;
    this._opts.customColor = color;
    this._applyClasses();
  }

  setName(name: string): void {
    this._opts.name = name;
    // Initials + accessible label both depend on name.
    this._render();
    this._bindHandlers();
  }

  setSrc(src: string | null): void {
    this._opts.src = src;
    this._imageFailed = false;
    this._render();
    this._bindHandlers();
  }

  setIcon(icon: string): void {
    this._opts.icon = icon;
    const effectiveVariant = this._effectiveVariant();
    if (
      this._innerEl &&
      (effectiveVariant === 'icon' || effectiveVariant === 'logo') &&
      !this._isSvgLogo()
    ) {
      this._innerEl.className = `arvo-avt__ico o9con o9con-${this._resolvedIcon(effectiveVariant)}`;
    }
  }

  /** Switch the brand asset rendered by variant='logo'. Pass null to clear
   *  and fall back to the o9con `icon` glyph. */
  setLogo(logo: string | null): void {
    this._opts.logo = logo;
    // Switching in/out of SVG mode changes the inner DOM element kind.
    this._render();
    this._bindHandlers();
  }

  setLogoBaseUrl(baseUrl: string): void {
    this._opts.logoBaseUrl = baseUrl || DEFAULT_LOGO_BASE_URL;
    this._applyLogoStyle();
  }

  setTooltip(tooltip: string | null): void {
    this._opts.tooltip = tooltip;
    this._applyAttributes();
  }

  /** Dual-purpose getter/setter for the disabled state. */
  disabled(): boolean;
  disabled(state: boolean): void;
  disabled(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isDisabled;
    this._opts.isDisabled = !!state;
    this._applyAttributes();
    this._applyClasses();
  }

  /** Dual-purpose getter/setter for the loading state. */
  loading(): boolean;
  loading(state: boolean): void;
  loading(state?: boolean): boolean | void {
    if (state === undefined) return this._opts.isLoading;
    this._opts.isLoading = !!state;
    this._applyClasses();
    this._applyAttributes();
  }

  /** Read-only accessors mirroring the React props for testing. */
  variant(): ArvoAvatarVariant { return this._opts.variant; }
  size(): ArvoAvatarSize { return this._opts.size; }
  appearance(): ArvoAvatarAppearance { return this._opts.appearance; }
  colorMode(): ArvoAvatarColorMode { return this._opts.colorMode; }
  semanticType(): ArvoAvatarSemanticType { return this._opts.semanticType; }
  customColor(): ArvoAvatarCustomColor { return this._opts.customColor; }

  /** Tear down inner DOM + listeners + decorations. The host element is preserved. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._teardownImageListeners();
    if (this._onClickBound) {
      this.el.removeEventListener('click', this._onClickBound);
    }
    if (this._onKeyDownBound) {
      this.el.removeEventListener('keydown', this._onKeyDownBound);
    }
    this._onClickBound = null;
    this._onKeyDownBound = null;
    this.el.textContent = '';
    this.el.removeAttribute('class');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('aria-disabled');
    this.el.removeAttribute('aria-busy');
    this.el.removeAttribute('tabindex');
    this.el.removeAttribute('title');
    if (this.el instanceof HTMLButtonElement) this.el.disabled = false;
  }
}
