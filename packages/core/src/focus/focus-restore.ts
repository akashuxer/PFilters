export interface FocusState {
  readonly element: HTMLElement | null;
}

export function saveFocus(): FocusState {
  const active = document.activeElement;
  return {
    element: active instanceof HTMLElement ? active : null,
  };
}

export function restoreFocus(state: FocusState): void {
  if (state.element && typeof state.element.focus === 'function') {
    state.element.focus({ preventScroll: true });
  }
}
