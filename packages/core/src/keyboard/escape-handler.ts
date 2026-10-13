export interface EscapeHandler {
  attach: (element: HTMLElement) => void;
  detach: () => void;
}

export function createEscapeHandler(callback: () => void): EscapeHandler {
  let _element: HTMLElement | null = null;

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      callback();
    }
  }

  return {
    attach(element: HTMLElement): void {
      if (_element) {
        _element.removeEventListener('keydown', handleKeyDown);
      }
      _element = element;
      _element.addEventListener('keydown', handleKeyDown);
    },

    detach(): void {
      if (_element) {
        _element.removeEventListener('keydown', handleKeyDown);
        _element = null;
      }
    },
  };
}
