// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { ArvoProgress } from './Progress';

afterEach(() => { document.body.innerHTML = ''; });

describe('ArvoProgress', () => {
  it('clamps values and renders untrusted labels as text', () => {
    const host = document.createElement('div');
    document.body.append(host);
    ArvoProgress.initialize(host, { value: 150, label: '<img src=x>', max: 100 });
    expect(host.getAttribute('aria-valuenow')).toBe('100');
    expect(host.querySelector('img')).toBeNull();
    expect(host.textContent).toContain('<img src=x>');
  });

  it('removes value semantics while indeterminate', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const progress = ArvoProgress.initialize(host, { value: 50 });
    progress.setIndeterminate(true);
    expect(host.hasAttribute('aria-valuenow')).toBe(false);
    expect(host.getAttribute('aria-busy')).toBe('true');
  });
});
