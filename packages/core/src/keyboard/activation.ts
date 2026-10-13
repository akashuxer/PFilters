export interface ActivationHandler {
  handleKeyDown: (event: KeyboardEvent) => void;
}

export function createActivationHandler(
  callback: (event: KeyboardEvent) => void,
): ActivationHandler {
  return {
    handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        callback(event);
      }
    },
  };
}
