// Internal shared empty-state primitive. Mirrors React ArvoEmptyState 1:1.
// Not re-exported as a public, hand-instantiated component -- application code
// reaches Empty State via the `emptyConfig` slot on overlay components
// (action-menu, popover, hybrid-popover, listbox, drawer, side-panel, etc.).
// The class is exported for the wiring layer + advanced standalone use.

import { ArvoButton } from '../Button/Button';
import { ArvoLink } from '../Link/Link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmptyStateIllustration = 'no-results' | 'no-data' | string;
export type EmptyStateSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type EmptyStateOrientation = 'vertical' | 'horizontal';

export const KNOWN_ILLUSTRATIONS: Record<'no-results' | 'no-data', string> = {
  'no-results': 'o9illus-no-results-found',
  'no-data': 'o9illus-no-filters-found',
};

export interface EmptyStateButtonAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'danger';
  icon?: string;
  isDisabled?: boolean;
}

export interface EmptyStateLinkAction {
  label: string;
  href: string;
  onClick?: (event: Event) => void;
  icon?: string;
  isExternal?: boolean;
}

export interface ArvoEmptyStateOptions {
  size?: EmptyStateSize;
  orientation?: EmptyStateOrientation;
  illustration?: EmptyStateIllustration;
  title?: string;
  message?: string;
  primaryAction?: EmptyStateButtonAction;
  secondaryAction?: EmptyStateButtonAction;
  link?: EmptyStateLinkAction;
  id?: string;
  className?: string;
  isAnimated?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCK = 'arvo-empty';
const DEFAULTS = {
  size: 'md' as EmptyStateSize,
  orientation: 'vertical' as EmptyStateOrientation,
  illustration: 'no-results' as EmptyStateIllustration,
  title: '',
  message: 'Adjust your filter search query.',
  isAnimated: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveIllustrationClass(illustration: EmptyStateIllustration): string {
  if (illustration === 'no-results' || illustration === 'no-data') {
    return KNOWN_ILLUSTRATIONS[illustration];
  }
  if (illustration.startsWith('o9illus-')) {
    return illustration;
  }
  return `o9illus-${illustration}`;
}

function buildClasses(opts: ArvoEmptyStateOptions): string {
  const size = opts.size ?? DEFAULTS.size;
  const orientation = opts.orientation ?? DEFAULTS.orientation;
  const isAnimated = opts.isAnimated ?? DEFAULTS.isAnimated;
  return [
    BLOCK,
    `${BLOCK}--${size}`,
    `${BLOCK}--${orientation}`,
    !isAnimated && `${BLOCK}--no-anim`,
    opts.className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArvoEmptyState {
  public readonly el: HTMLDivElement;

  private _primaryBtn: ArvoButton | null = null;
  private _secondaryBtn: ArvoButton | null = null;
  private _link: ArvoLink | null = null;
  private _destroyed = false;

  static create(options: ArvoEmptyStateOptions = {}): ArvoEmptyState {
    return new ArvoEmptyState(null, options);
  }

  static initialize(
    element: HTMLElement | null,
    options: ArvoEmptyStateOptions = {},
  ): ArvoEmptyState {
    return new ArvoEmptyState(element, options);
  }

  constructor(element: HTMLElement | null, options: ArvoEmptyStateOptions = {}) {
    const root =
      element instanceof HTMLDivElement
        ? element
        : document.createElement('div');
    this.el = root;
    this._render(options);
  }

  private _render(options: ArvoEmptyStateOptions): void {
    const root = this.el;

    const illustration = options.illustration ?? DEFAULTS.illustration;
    const title = options.title ?? DEFAULTS.title;
    const message = options.message ?? DEFAULTS.message;

    root.className = buildClasses(options);
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    if (options.id) root.id = options.id;

    const figure = document.createElement('div');
    figure.className = `${BLOCK}__figure`;

    const illus = document.createElement('span');
    illus.className = `${BLOCK}__illus o9illus ${resolveIllustrationClass(illustration)}`;
    illus.setAttribute('aria-hidden', 'true');
    figure.appendChild(illus);

    const body = document.createElement('div');
    body.className = `${BLOCK}__body`;

    if (title || message) {
      const msg = document.createElement('div');
      msg.className = `${BLOCK}__msg`;
      if (title) {
        const titleEl = document.createElement('span');
        titleEl.className = `${BLOCK}__title`;
        titleEl.textContent = title;
        msg.appendChild(titleEl);
      }
      if (message) {
        const msgEl = document.createElement('span');
        msgEl.className = `${BLOCK}__message`;
        msgEl.textContent = message;
        msg.appendChild(msgEl);
      }
      body.appendChild(msg);
    }

    const hasButtons = !!(options.primaryAction || options.secondaryAction);
    const hasActions = hasButtons || !!options.link;

    if (hasActions) {
      const actions = document.createElement('div');
      actions.className = `${BLOCK}__actions`;

      if (hasButtons) {
        const row = document.createElement('div');
        row.className = `${BLOCK}__action-row`;

        if (options.secondaryAction) {
          const btnEl = document.createElement('button') as HTMLButtonElement;
          row.appendChild(btnEl);
          this._secondaryBtn = ArvoButton.initialize(btnEl, {
            label: options.secondaryAction.label,
            icon: options.secondaryAction.icon,
            variant: options.secondaryAction.variant ?? 'outline',
            size: 'sm',
            isDisabled: options.secondaryAction.isDisabled,
            onClick: options.secondaryAction.onClick,
          });
        }
        if (options.primaryAction) {
          const btnEl = document.createElement('button') as HTMLButtonElement;
          row.appendChild(btnEl);
          this._primaryBtn = ArvoButton.initialize(btnEl, {
            label: options.primaryAction.label,
            icon: options.primaryAction.icon,
            variant: options.primaryAction.variant ?? 'primary',
            size: 'sm',
            isDisabled: options.primaryAction.isDisabled,
            onClick: options.primaryAction.onClick,
          });
        }
        actions.appendChild(row);
      }

      if (options.link) {
        const linkWrap = document.createElement('span');
        linkWrap.className = `${BLOCK}__link`;
        const aEl = document.createElement('a') as HTMLAnchorElement;
        linkWrap.appendChild(aEl);
        this._link = ArvoLink.initialize(aEl, {
          label: options.link.label,
          href: options.link.href,
          icon: options.link.icon ?? 'add-attachment',
          isExternal: options.link.isExternal,
          size: 'sm',
          onClick: options.link.onClick,
        });
        actions.appendChild(linkWrap);
      }

      body.appendChild(actions);
    }

    figure.appendChild(body);
    root.replaceChildren(figure);
  }

  /** Re-render the figure with new options. Inner Arvo* instances are
   * recreated to keep the implementation simple; consumers update infrequently. */
  update(options: ArvoEmptyStateOptions): void {
    if (this._destroyed) return;
    this._teardownInner();
    this._render(options);
  }

  private _teardownInner(): void {
    this._primaryBtn?.destroy();
    this._primaryBtn = null;
    this._secondaryBtn?.destroy();
    this._secondaryBtn = null;
    this._link?.destroy();
    this._link = null;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._teardownInner();
  }
}
