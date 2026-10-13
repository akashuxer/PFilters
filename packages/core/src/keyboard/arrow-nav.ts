export interface ArrowNavOptions {
  items: HTMLElement[];
  orientation: 'horizontal' | 'vertical';
  wrap: boolean;
  onNavigate: (item: HTMLElement, index: number) => void;
  onSelect?: (item: HTMLElement, index: number) => void;
  onEscape?: () => void;
  skipDisabled?: (index: number) => boolean;
  typeAhead?: {
    getLabel: (index: number) => string;
    debounceMs?: number;
  };
}

export interface ArrowNav {
  handleKeyDown: (event: KeyboardEvent) => void;
  destroy: () => void;
  setItems: (items: HTMLElement[]) => void;
  /**
   * Imperatively set the current focused index. Useful for syncing the state
   * machine when focus moves outside of arrow-key navigation (e.g., a row's
   * onFocus handler in React, or a programmatic focus call).
   */
  setIndex: (index: number) => void;
}

const TYPE_AHEAD_DEFAULT_MS = 300;

function isPrintableChar(key: string): boolean {
  return key.length === 1 && key !== ' ';
}

export function createArrowNav(options: ArrowNavOptions): ArrowNav {
  let _items = options.items;
  let _currentIndex = 0;
  let _destroyed = false;

  let _typeBuffer = '';
  let _typeTimer: ReturnType<typeof setTimeout> | undefined;

  function isForwardKey(key: string): boolean {
    if (options.orientation === 'vertical') return key === 'ArrowDown';
    return key === 'ArrowRight';
  }

  function isBackwardKey(key: string): boolean {
    if (options.orientation === 'vertical') return key === 'ArrowUp';
    return key === 'ArrowLeft';
  }

  function isDisabled(index: number): boolean {
    return options.skipDisabled ? options.skipDisabled(index) : false;
  }

  /**
   * Starting from `start`, step by `delta` (+1 or -1) looking for a
   * non-disabled index. Honors wrapping. Returns -1 if every item is disabled.
   */
  function findNextEnabled(start: number, delta: number): number {
    const len = _items.length;
    let idx = start;
    for (let i = 0; i < len; i++) {
      if (!isDisabled(idx)) return idx;
      const next = idx + delta;
      if (next >= len) {
        idx = options.wrap ? 0 : len - 1;
        if (!options.wrap) return -1;
      } else if (next < 0) {
        idx = options.wrap ? len - 1 : 0;
        if (!options.wrap) return -1;
      } else {
        idx = next;
      }
    }
    return -1;
  }

  function navigateTo(index: number): void {
    if (index >= 0 && index !== _currentIndex) {
      _currentIndex = index;
      options.onNavigate(_items[_currentIndex], _currentIndex);
    }
  }

  function handleTypeAhead(key: string): void {
    if (!options.typeAhead) return;

    const { getLabel, debounceMs = TYPE_AHEAD_DEFAULT_MS } = options.typeAhead;

    _typeBuffer += key.toLowerCase();

    if (_typeTimer !== undefined) clearTimeout(_typeTimer);
    _typeTimer = setTimeout(() => { _typeBuffer = ''; }, debounceMs);

    const len = _items.length;
    for (let i = 1; i <= len; i++) {
      const idx = (options.wrap || _currentIndex + i < len)
        ? (_currentIndex + i) % len
        : _currentIndex + i;
      if (idx >= len) break;
      if (isDisabled(idx)) continue;
      if (getLabel(idx).toLowerCase().startsWith(_typeBuffer)) {
        navigateTo(idx);
        return;
      }
    }

    // Also check current index (buffer may still match current item)
    if (!isDisabled(_currentIndex) && getLabel(_currentIndex).toLowerCase().startsWith(_typeBuffer)) {
      return;
    }
  }

  function syncCurrentIndex(): void {
    const focused = document.activeElement;
    if (!focused) return;
    const idx = _items.indexOf(focused as HTMLElement);
    if (idx !== -1) _currentIndex = idx;
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (_destroyed || _items.length === 0) return;

    syncCurrentIndex();

    if (isForwardKey(event.key)) {
      event.preventDefault();
      let next = _currentIndex + 1;
      if (next >= _items.length) {
        next = options.wrap ? 0 : _items.length - 1;
      }
      if (next !== _currentIndex) {
        next = findNextEnabled(next, 1);
        navigateTo(next);
      }
      return;
    }

    if (isBackwardKey(event.key)) {
      event.preventDefault();
      let next = _currentIndex - 1;
      if (next < 0) {
        next = options.wrap ? _items.length - 1 : 0;
      }
      if (next !== _currentIndex) {
        next = findNextEnabled(next, -1);
        navigateTo(next);
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const target = findNextEnabled(0, 1);
      navigateTo(target);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const target = findNextEnabled(_items.length - 1, -1);
      navigateTo(target);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (options.onSelect) {
        event.preventDefault();
        options.onSelect(_items[_currentIndex], _currentIndex);
      }
      return;
    }

    if (event.key === 'Escape') {
      if (options.onEscape) {
        event.preventDefault();
        options.onEscape();
      }
      return;
    }

    if (options.typeAhead && isPrintableChar(event.key)) {
      event.preventDefault();
      handleTypeAhead(event.key);
    }
  }

  return {
    handleKeyDown,
    destroy(): void {
      _destroyed = true;
      _items = [];
      if (_typeTimer !== undefined) {
        clearTimeout(_typeTimer);
        _typeTimer = undefined;
      }
    },
    setItems(items: HTMLElement[]): void {
      _items = items;
      if (_currentIndex >= _items.length) {
        _currentIndex = Math.max(0, _items.length - 1);
      }
    },
    setIndex(index: number): void {
      if (index >= 0 && index < _items.length) {
        _currentIndex = index;
      }
    },
  };
}
