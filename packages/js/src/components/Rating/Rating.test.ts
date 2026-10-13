// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArvoRating } from './Rating';

afterEach(() => { document.body.innerHTML = ''; });

describe('ArvoRating', () => {
  it('initializes with slider semantics and renders stars', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const rating = ArvoRating.initialize(host, { value: 3.5, step: 0.5, label: 'Product rating' });
    expect(rating.el.querySelectorAll('.arvo-rating__star')).toHaveLength(5);
    expect(rating.el.querySelector('.arvo-rating__control')?.getAttribute('role')).toBe('slider');
    expect(rating.el.querySelector('.arvo-rating__control')?.getAttribute('aria-valuenow')).toBe('3.5');
  });

  it('emits rating:change and supports keyboard updates', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onChange = vi.fn();
    const rating = ArvoRating.initialize(host, { value: 2, onChange });
    const event = vi.fn();
    host.addEventListener('rating:change', event);
    rating.el.querySelector<HTMLElement>('.arvo-rating__control')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(rating.value()).toBe(3);
    expect(onChange).toHaveBeenCalledWith(3);
    expect(event).toHaveBeenCalledTimes(1);
  });

  it('does not expose slider semantics when read-only', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    ArvoRating.initialize(host, { value: 4, isReadOnly: true });
    const control = host.querySelector('.arvo-rating__control');
    expect(control?.getAttribute('role')).toBe('img');
    expect(control?.getAttribute('tabindex')).toBe('-1');
    expect(control?.hasAttribute('aria-valuenow')).toBe(false);
  });
});
