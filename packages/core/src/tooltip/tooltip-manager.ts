import { computePosition } from '../position';
import { overlayHub } from '../overlay';
import { enter, exit, prefersReducedMotion } from '../animation';
import { formatShortcutDisplay } from '../keyboard/shortcut';
import type {
  TooltipManager,
  TooltipManagerConfig,
  TooltipManagerDeps,
  TooltipPlacement,
  TooltipShowOptions,
} from './types';
import type { OverlayHub } from '../overlay';

const DEFAULT_CONFIG: TooltipManagerConfig = {
  enabled: true,
  hoverDelay: 500,
  hideDelay: 0,
  gap: 4,
  defaultPlacement: 'bottom-center',
};

const VALID_TOOLTIP_PLACEMENTS: ReadonlySet<TooltipPlacement> = new Set<TooltipPlacement>([
  'top-start', 'top-center', 'top-end',
  'bottom-start', 'bottom-center', 'bottom-end',
  'left-start', 'left-center', 'left-end',
  'right-start', 'right-center', 'right-end',
]);

function normalizePlacement(
  requested: TooltipPlacement | undefined,
  fallback: TooltipPlacement,
): TooltipPlacement {
  if (requested && VALID_TOOLTIP_PLACEMENTS.has(requested)) return requested;
  return fallback;
}

const TIP_ID = 'arvo-tip';
const OVERLAY_ID = 'arvo-tooltip-overlay';
const FADE_DURATION = 120;

let _uid = 0;
function nextId(): string {
  return `${TIP_ID}-${++_uid}`;
}

export function createTooltipManager(deps?: TooltipManagerDeps): TooltipManager {
  let _config: TooltipManagerConfig = { ...DEFAULT_CONFIG };
  const _hub: OverlayHub = deps?.hub ?? overlayHub;

  let _el: HTMLElement | null = null;
  let _txtEl: HTMLElement | null = null;
  let _shortcutEl: HTMLElement | null = null;
  const _tipId = nextId();

  let _visible = false;
  let _currentAnchor: HTMLElement | null = null;
  let _showTimer: ReturnType<typeof setTimeout> | null = null;
  let _hideTimer: ReturnType<typeof setTimeout> | null = null;
  let _escHandler: ((e: KeyboardEvent) => void) | null = null;
  let _animating = false;
  let _abortHide = false;

  function ensureElement(): HTMLElement {
    if (_el) return _el;

    _el = document.createElement('div');
    _el.className = 'arvo-tip';
    _el.setAttribute('role', 'tooltip');
    _el.id = _tipId;
    _el.style.position = 'absolute';
    // pointer-events / user-select are controlled by SCSS (`.arvo-tip` is
    // `pointer-events: none`). Setting them inline here would prevent the
    // tooltip from being click-through.
    _el.style.display = 'none';

    _txtEl = document.createElement('span');
    _txtEl.className = 'arvo-tip__txt';
    _el.appendChild(_txtEl);

    _shortcutEl = document.createElement('span');
    _shortcutEl.className = 'arvo-tip__shortcut';
    _shortcutEl.style.display = 'none';
    _el.appendChild(_shortcutEl);

    const container = _hub.getContainer();
    container.appendChild(_el);

    return _el;
  }

  function clearTimers(): void {
    if (_showTimer != null) {
      clearTimeout(_showTimer);
      _showTimer = null;
    }
    if (_hideTimer != null) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
  }

  function scheduleHide(): void {
    if (_hideTimer != null) return;
    _hideTimer = setTimeout(() => {
      _hideTimer = null;
      doHide();
    }, _config.hideDelay);
  }

  function attachEscListener(): void {
    if (_escHandler) return;
    _escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && _visible) {
        doHide();
        if (document.activeElement && document.activeElement !== document.body) {
          try {
            if (document.activeElement.matches(':focus-visible')) {
              (document.activeElement as HTMLElement).blur();
            }
          } catch { /* :focus-visible may throw in rare edge cases */ }
        }
      }
    };
    document.addEventListener('keydown', _escHandler, true);
  }

  function detachEscListener(): void {
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler, true);
      _escHandler = null;
    }
  }

  function updateContent(content: string, shortcut?: string): void {
    if (_txtEl) _txtEl.textContent = content;
    if (_shortcutEl) {
      // Shortcut strings are normalized to the active OS's display form
      // (`Ctrl P` on Windows / Linux, `\u2318 P` on macOS) so consumer
      // code never has to branch on platform. See
      // `packages/core/src/keyboard/shortcut.ts` for the formatter.
      const display = shortcut ? formatShortcutDisplay(shortcut) : '';
      if (display) {
        _shortcutEl.textContent = display;
        _shortcutEl.style.display = '';
      } else {
        _shortcutEl.textContent = '';
        _shortcutEl.style.display = 'none';
      }
    }
  }

  function positionTooltip(anchor: HTMLElement, el: HTMLElement, options: TooltipShowOptions): void {
    // Sanitize the requested placement against the tooltip placement set.
    // Consumers may pass a bare side ('top' / 'bottom' / 'left' / 'right')
    // through untyped code paths; that would crash `computePosition` since
    // its raw-position switch only handles named -start / -center / -end
    // variants. Silently fall back to the manager default so a mis-typed
    // preset degrades to the default tooltip side instead of a
    // TypeError at hover time.
    const placement = normalizePlacement(options.placement, _config.defaultPlacement);
    const result = computePosition(anchor, el, {
      placement,
      gap: _config.gap,
      // Tooltips intentionally cascade to adjacent (perpendicular) sides
      // when neither the requested side nor its opposite fits. Documented
      // in `descriptors/tooltip.json`. ArvoRichTooltip mirrors this.
      flip: 'any',
    });
    // Use the standalone `translate` CSS property so `transform` is free
    // for the SCSS popup animation. Also write `data-arvo-side` so the
    // enter/exit transform can be direction-aware.
    el.style.translate = `${Math.round(result.x)}px ${Math.round(result.y)}px`;
    el.style.top = '0';
    el.style.left = '0';
    el.setAttribute(
      'data-arvo-side',
      result.placement.startsWith('top')
        ? 'top'
        : result.placement.startsWith('left')
          ? 'left'
          : result.placement.startsWith('right')
            ? 'right'
            : 'bottom',
    );
  }

  async function doShow(options: TooltipShowOptions): Promise<void> {
    // Already visible for the same anchor -- update content without re-animating.
    if (_visible && _currentAnchor === options.anchor) {
      updateContent(options.content, options.shortcut);
      return;
    }

    // Cancel any in-progress hide animation so the new show takes priority.
    if (_animating) {
      _abortHide = true;
      _animating = false;
      if (_el) {
        _el.style.display = '';
        _el.style.opacity = '';
      }
    }

    const el = ensureElement();

    // If showing for a different anchor, hide previous immediately
    if (_visible && _currentAnchor && _currentAnchor !== options.anchor) {
      removeAriaFromAnchor(_currentAnchor);
    }

    updateContent(options.content, options.shortcut);

    // Make visible but transparent for measurement
    el.style.display = '';
    el.style.opacity = '0';

    positionTooltip(options.anchor, el, options);

    // Set ARIA on anchor, unless the caller asked to suppress it (truncation
    // tooltips: the full label is already in the anchor's accessible name).
    if (!options.suppressAria) {
      setAriaOnAnchor(options.anchor);
    }
    _currentAnchor = options.anchor;
    _visible = true;

    // Register with overlay hub
    if (!_hub.isOpen(OVERLAY_ID)) {
      _hub.open({
        id: OVERLAY_ID,
        type: 'tooltip',
        element: el,
        triggerElement: options.anchor,
        priority: 0,
        config: { autoCloseOnOutsideClick: false },
      });
    }

    attachEscListener();

    // Animate in
    el.style.opacity = '';
    if (!prefersReducedMotion()) {
      _animating = true;
      await enter({ element: el, type: 'fade', duration: FADE_DURATION });
      _animating = false;
    }
  }

  async function doHide(): Promise<void> {
    clearTimers();
    if (!_visible || !_el) return;

    if (_currentAnchor) {
      removeAriaFromAnchor(_currentAnchor);
    }

    _visible = false;

    if (!prefersReducedMotion() && !_animating) {
      _animating = true;
      _abortHide = false;
      await exit({ element: _el, type: 'fade', duration: FADE_DURATION });
      // A concurrent doShow() may have cancelled this hide
      if (_abortHide) {
        _abortHide = false;
        return;
      }
      _animating = false;
    }

    if (_el) _el.style.display = 'none';
    _currentAnchor = null;

    if (_hub.isOpen(OVERLAY_ID)) {
      _hub.close(OVERLAY_ID);
    }

    detachEscListener();
  }

  function setAriaOnAnchor(anchor: HTMLElement): void {
    const existing = anchor.getAttribute('aria-describedby');
    if (existing) {
      if (!existing.split(/\s+/).includes(_tipId)) {
        anchor.setAttribute('aria-describedby', `${existing} ${_tipId}`);
      }
    } else {
      anchor.setAttribute('aria-describedby', _tipId);
    }
  }

  function removeAriaFromAnchor(anchor: HTMLElement): void {
    const existing = anchor.getAttribute('aria-describedby');
    if (!existing) return;
    const ids = existing.split(/\s+/).filter((id) => id !== _tipId);
    if (ids.length > 0) {
      anchor.setAttribute('aria-describedby', ids.join(' '));
    } else {
      anchor.removeAttribute('aria-describedby');
    }
  }

  const manager: TooltipManager = {
    configure(config: Partial<TooltipManagerConfig>): void {
      _config = { ..._config, ...config };
    },

    getConfig(): TooltipManagerConfig {
      return { ..._config };
    },

    show(options: TooltipShowOptions): void {
      if (!_config.enabled) return;

      clearTimers();

      const delay = options.trigger === 'focus' ? 0 : _config.hoverDelay;

      if (delay <= 0) {
        doShow(options);
      } else {
        _showTimer = setTimeout(() => {
          _showTimer = null;
          doShow(options);
        }, delay);
      }
    },

    hide(immediate = false): void {
      // Cancel any pending show
      if (_showTimer != null) {
        clearTimeout(_showTimer);
        _showTimer = null;
      }

      if (immediate) {
        clearTimers();
        doHide();
      } else {
        scheduleHide();
      }
    },

    isVisible(): boolean {
      return _visible;
    },

    getElement(): HTMLElement | null {
      return _el;
    },

    destroy(): void {
      clearTimers();
      detachEscListener();

      if (_currentAnchor) {
        removeAriaFromAnchor(_currentAnchor);
      }

      if (_hub.isOpen(OVERLAY_ID)) {
        _hub.close(OVERLAY_ID);
      }

      if (_el) {
        _el.remove();
        _el = null;
        _txtEl = null;
        _shortcutEl = null;
      }

      _visible = false;
      _currentAnchor = null;
      _animating = false;
    },
  };

  return manager;
}

export const tooltipManager: TooltipManager = createTooltipManager();
