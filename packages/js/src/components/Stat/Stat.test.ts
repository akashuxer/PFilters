// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArvoStat } from './Stat';

afterEach(() => { document.body.innerHTML = ''; });

describe('ArvoStat', () => {
  it('does not nest an information button inside an interactive stat', () => {
    const host = document.createElement('article');
    document.body.append(host);
    ArvoStat.initialize(host, { info: 'Monthly active users.', onAction: vi.fn() });
    expect(host.getAttribute('role')).not.toBe('button');
    expect(host.querySelector('.arvo-stat__info')).not.toBeNull();
  });

  it('cleans interactive semantics when rerendered without an action', () => {
    const host = document.createElement('article');
    document.body.append(host);
    const stat = ArvoStat.initialize(host, { onAction: vi.fn() });
    expect(host.getAttribute('role')).toBe('button');
    stat.setLoading(true);
    expect(host.getAttribute('role')).toBe('button');
  });
});
