export interface BackdropOptions {
  opacity: number;
  closeOnClick: boolean;
  animated: boolean;
  container: HTMLElement;
}

export interface BackdropManager {
  show(options: BackdropOptions): HTMLElement;
  hide(): void;
  isVisible(): boolean;
  getElement(): HTMLElement | null;
}

export function createBackdropManager(): BackdropManager {
  let _el: HTMLElement | null = null;
  let _blockClick: ((e: Event) => void) | null = null;

  const manager: BackdropManager = {
    show(options: BackdropOptions): HTMLElement {
      if (_el) manager.hide();

      _el = document.createElement('div');
      _el.className = 'arvo-backdrop';
      _el.style.position = 'fixed';
      _el.style.top = '0';
      _el.style.left = '0';
      _el.style.width = '100%';
      _el.style.height = '100%';
      _el.style.backgroundColor = `rgba(0, 0, 0, ${options.opacity})`;

      if (options.animated) {
        _el.classList.add('arvo-backdrop--animated');
      }

      // When closeOnClick is false the backdrop swallows mousedown
      // so the hub's outside-click handler never fires.
      if (!options.closeOnClick) {
        _blockClick = (e: Event) => e.stopPropagation();
        _el.addEventListener('mousedown', _blockClick);
      }

      options.container.appendChild(_el);
      return _el;
    },

    hide(): void {
      if (!_el) return;
      if (_blockClick) {
        _el.removeEventListener('mousedown', _blockClick);
        _blockClick = null;
      }
      _el.remove();
      _el = null;
    },

    isVisible(): boolean {
      return _el !== null;
    },

    getElement(): HTMLElement | null {
      return _el;
    },
  };

  return manager;
}
