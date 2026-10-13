// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ArvoAvatar } from './Avatar';

function host(tag: 'span' | 'button' | 'a' = 'span'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

afterEach(() => { document.body.innerHTML = ''; });

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

describe('ArvoAvatar - initialize', () => {
  it('static initialize() returns an instance', () => {
    const avt = ArvoAvatar.initialize(host());
    expect(avt).toBeInstanceOf(ArvoAvatar);
  });

  it('initialize(null) creates a fresh span', () => {
    const avt = ArvoAvatar.initialize(null);
    expect(avt.el.tagName).toBe('SPAN');
  });

  it('decorates the host element with .arvo-avt', () => {
    const el = host();
    new ArvoAvatar(el);
    expect(el.classList.contains('arvo-avt')).toBe(true);
  });

  it('renders the default icon glyph (o9con-user) for the default variant', () => {
    const el = host();
    new ArvoAvatar(el);
    const ico = el.querySelector('.arvo-avt__ico');
    expect(ico).not.toBeNull();
    expect(ico?.classList.contains('o9con')).toBe(true);
    expect(ico?.classList.contains('o9con-user')).toBe(true);
    expect(ico?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets role="img" on a non-interactive span host', () => {
    const el = host();
    new ArvoAvatar(el);
    expect(el.getAttribute('role')).toBe('img');
  });

  it('does NOT set role="img" on a native <button> host', () => {
    const el = host('button');
    new ArvoAvatar(el, { isInteractive: true });
    expect(el.getAttribute('role')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

describe('ArvoAvatar - defaults', () => {
  it('defaults variant to icon', () => {
    const el = host();
    new ArvoAvatar(el);
    expect(el.classList.contains('arvo-avt--icon')).toBe(true);
  });

  it('defaults size to md', () => {
    const el = host();
    new ArvoAvatar(el);
    expect(el.classList.contains('arvo-avt--md')).toBe(true);
  });

  it('defaults appearance to filled (with arvo-avt--filled class for icon variant)', () => {
    const el = host();
    new ArvoAvatar(el);
    expect(el.classList.contains('arvo-avt--filled')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

describe('ArvoAvatar - variants', () => {
  it.each(['image', 'initials', 'icon', 'logo', 'o9logo', 'novai'] as const)(
    'applies arvo-avt--%s',
    (variant) => {
      const el = host();
      new ArvoAvatar(el, {
        variant,
        src: variant === 'image' ? 'https://example.com/a.jpg' : undefined,
        name: 'Jane Doe',
      });
      expect(el.classList.contains(`arvo-avt--${variant}`)).toBe(true);
    },
  );

  it('image variant renders <img class="arvo-avt__img">', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'image', src: 'https://example.com/a.jpg', name: 'Jane' });
    const img = el.querySelector('img.arvo-avt__img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('https://example.com/a.jpg');
  });

  it('initials variant renders derived initials inside __text', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'initials', name: 'Jane Doe' });
    expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('JD');
  });

  it('o9logo variant locks the icon glyph to o9-logo', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'o9logo', icon: 'something' });
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-o9-logo')).toBe(true);
  });

  it('novai variant locks the icon glyph to genai', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'novai', icon: 'something' });
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-genai')).toBe(true);
  });

  it('falls back to icon variant for an invalid variant value', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'unknown' as never });
    expect(el.classList.contains('arvo-avt--icon')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sizes + xs single-initial rule
// ---------------------------------------------------------------------------

describe('ArvoAvatar - sizes', () => {
  it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)('applies arvo-avt--%s', (size) => {
    const el = host();
    new ArvoAvatar(el, { size });
    expect(el.classList.contains(`arvo-avt--${size}`)).toBe(true);
  });

  it('xs renders only the first initial character', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'initials', size: 'xs', name: 'Jane Doe' });
    expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('J');
  });

  it('larger sizes render the full 2-character initials', () => {
    for (const size of ['sm', 'md', 'lg', 'xl'] as const) {
      const el = host();
      new ArvoAvatar(el, { variant: 'initials', size, name: 'Jane Doe' });
      expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('JD');
    }
  });
});

// ---------------------------------------------------------------------------
// Color modes
// ---------------------------------------------------------------------------

describe('ArvoAvatar - color modes', () => {
  it.each(['positive', 'negative', 'warning', 'info'] as const)(
    'semantic mode emits arvo-avt--semantic + arvo-avt--%s + forces filled',
    (semanticType) => {
      const el = host();
      new ArvoAvatar(el, {
        variant: 'icon',
        colorMode: 'semantic',
        semanticType,
        appearance: 'outline',
      });
      expect(el.classList.contains('arvo-avt--semantic')).toBe(true);
      expect(el.classList.contains(`arvo-avt--${semanticType}`)).toBe(true);
      expect(el.classList.contains('arvo-avt--filled')).toBe(true);
      expect(el.classList.contains('arvo-avt--outline')).toBe(false);
    },
  );

  it.each(['purple', 'pink', 'glacier', 'amber', 'greenish', 'bluish'] as const)(
    'custom mode emits arvo-avt--custom + arvo-avt--%s',
    (customColor) => {
      const el = host();
      new ArvoAvatar(el, {
        variant: 'icon',
        colorMode: 'custom',
        customColor,
        appearance: 'primary',
      });
      expect(el.classList.contains('arvo-avt--custom')).toBe(true);
      expect(el.classList.contains(`arvo-avt--${customColor}`)).toBe(true);
      expect(el.classList.contains('arvo-avt--primary')).toBe(true);
    },
  );

  it('color mode classes are NOT emitted for non-themeable variants (o9logo)', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'o9logo', colorMode: 'custom', customColor: 'purple' });
    expect(el.classList.contains('arvo-avt--custom')).toBe(false);
    expect(el.classList.contains('arvo-avt--purple')).toBe(false);
  });

  it('logo + filled is clamped to outline', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'logo', appearance: 'filled', icon: 'google' });
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
    expect(el.classList.contains('arvo-avt--filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Nova AI variant appearance + animations
// ---------------------------------------------------------------------------

describe('ArvoAvatar - novai variant', () => {
  it('defaults to appearance="outline" (rest state)', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'novai' });
    expect(el.classList.contains('arvo-avt--novai')).toBe(true);
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
    expect(el.classList.contains('arvo-avt--filled')).toBe(false);
  });

  it('honors appearance="filled" for the active state', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'novai', appearance: 'filled' });
    expect(el.classList.contains('arvo-avt--filled')).toBe(true);
    expect(el.classList.contains('arvo-avt--outline')).toBe(false);
  });

  it('clamps appearance="primary" to outline on novai', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'novai', appearance: 'primary' });
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
    expect(el.classList.contains('arvo-avt--primary')).toBe(false);
  });

  it('setAppearance clamps primary to outline on novai', () => {
    const el = host();
    const a = new ArvoAvatar(el, { variant: 'novai' });
    a.setAppearance('primary');
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
    expect(el.classList.contains('arvo-avt--primary')).toBe(false);
  });

  it('setVariant updates the appearance default when not explicitly set', () => {
    const el = host();
    const a = new ArvoAvatar(el, { variant: 'icon' });
    expect(el.classList.contains('arvo-avt--filled')).toBe(true);
    a.setVariant('novai');
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
    expect(el.classList.contains('arvo-avt--filled')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Logo variant - SVG asset mode
// ---------------------------------------------------------------------------

describe('ArvoAvatar - logo variant svg mode', () => {
  it('emits arvo-avt--svg and renders __logo when `logo` is set', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'logo', logo: 'GitHub' });
    expect(el.classList.contains('arvo-avt--svg')).toBe(true);
    expect(el.querySelector('.arvo-avt__logo')).not.toBeNull();
    expect(el.querySelector('.arvo-avt__ico')).toBeNull();
  });

  it('falls back to o9con __ico when `logo` is NOT set', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'logo', icon: 'slack' });
    expect(el.classList.contains('arvo-avt--svg')).toBe(false);
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-slack')).toBe(true);
    expect(el.querySelector('.arvo-avt__logo')).toBeNull();
  });

  it('injects --arvo-avt-logo-url-light and --dark inline using the default base URL', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'logo', logo: 'GitHub' });
    expect(el.style.getPropertyValue('--arvo-avt-logo-url-light')).toBe(
      "url('/logos/light/GitHub.svg')",
    );
    expect(el.style.getPropertyValue('--arvo-avt-logo-url-dark')).toBe(
      "url('/logos/dark/GitHub.svg')",
    );
  });

  it('honors a custom logoBaseUrl', () => {
    const el = host();
    new ArvoAvatar(el, {
      variant: 'logo',
      logo: 'Slack',
      logoBaseUrl: 'https://cdn.example.com/arvo-logos',
    });
    expect(el.style.getPropertyValue('--arvo-avt-logo-url-light')).toBe(
      "url('https://cdn.example.com/arvo-logos/light/Slack.svg')",
    );
  });

  it('setLogo(null) reverts to the o9con icon glyph', () => {
    const el = host();
    const a = new ArvoAvatar(el, { variant: 'logo', logo: 'GitHub' });
    expect(el.querySelector('.arvo-avt__logo')).not.toBeNull();
    a.setLogo(null);
    expect(el.querySelector('.arvo-avt__logo')).toBeNull();
    expect(el.querySelector('.arvo-avt__ico')).not.toBeNull();
    expect(el.classList.contains('arvo-avt--svg')).toBe(false);
    expect(el.style.getPropertyValue('--arvo-avt-logo-url-light')).toBe('');
  });

  it('setLogoBaseUrl refreshes the inline URLs', () => {
    const el = host();
    const a = new ArvoAvatar(el, { variant: 'logo', logo: 'GitHub' });
    a.setLogoBaseUrl('https://cdn.example.com');
    expect(el.style.getPropertyValue('--arvo-avt-logo-url-light')).toBe(
      "url('https://cdn.example.com/light/GitHub.svg')",
    );
  });

  it('uses the brand name in the auto-generated tooltip when no name is provided', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'logo', logo: 'Slack' });
    expect(el.getAttribute('aria-label')).toBe('Slack');
  });

  it('ignores `logo` on non-logo variants', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'icon', logo: 'GitHub', icon: 'briefcase' });
    expect(el.classList.contains('arvo-avt--svg')).toBe(false);
    expect(el.querySelector('.arvo-avt__logo')).toBeNull();
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-briefcase')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Image fallback chain
// ---------------------------------------------------------------------------

describe('ArvoAvatar - image fallback chain', () => {
  it('falls back to initials when the <img> errors and name resolves', () => {
    const el = host();
    new ArvoAvatar(el, {
      variant: 'image',
      src: 'https://example.com/missing.jpg',
      name: 'Jane Doe',
    });
    const img = el.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('JD');
    expect(el.classList.contains('arvo-avt--initials')).toBe(true);
  });

  it('falls back to icon when image errors and no name/email is available', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'image', src: 'https://example.com/missing.jpg' });
    const img = el.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-user')).toBe(true);
    expect(el.classList.contains('arvo-avt--icon')).toBe(true);
  });

  it('fires avt:image-error + avt:image-fallback when image errors', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'image', src: 'https://example.com/missing.jpg', name: 'Jane' });
    const onError = vi.fn();
    const onFallback = vi.fn();
    el.addEventListener('avt:image-error', onError);
    el.addEventListener('avt:image-fallback', onFallback);
    (el.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('error'));
    expect(onError).toHaveBeenCalledOnce();
    expect(onFallback).toHaveBeenCalledOnce();
    const detail = (onFallback.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.fallback).toBe('initials');
  });

  it('fires avt:image-load when the image loads', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'image', src: 'https://example.com/a.jpg', name: 'Jane' });
    const onLoad = vi.fn();
    el.addEventListener('avt:image-load', onLoad);
    (el.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('load'));
    expect(onLoad).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Interactive + events
// ---------------------------------------------------------------------------

describe('ArvoAvatar - interactive + events', () => {
  it('applies the .interactive class when isInteractive is true', () => {
    const el = host();
    new ArvoAvatar(el, { isInteractive: true });
    expect(el.classList.contains('interactive')).toBe(true);
  });

  it('implicitly enables interactive mode when onClick is provided', () => {
    const el = host();
    new ArvoAvatar(el, { onClick: () => {} });
    expect(el.classList.contains('interactive')).toBe(true);
  });

  it('implicitly enables interactive mode when href is provided', () => {
    const el = host('a');
    new ArvoAvatar(el, { href: '/profile/jane' });
    expect(el.classList.contains('interactive')).toBe(true);
    expect(el.getAttribute('href')).toBe('/profile/jane');
  });

  it('fires onClick + avt:click on click when interactive', () => {
    const el = host();
    const onClick = vi.fn();
    new ArvoAvatar(el, { isInteractive: true, onClick });
    const onCustom = vi.fn();
    el.addEventListener('avt:click', onCustom);
    el.click();
    expect(onClick).toHaveBeenCalledOnce();
    expect(onCustom).toHaveBeenCalledOnce();
  });

  it('suppresses onClick when disabled', () => {
    const el = host();
    const onClick = vi.fn();
    new ArvoAvatar(el, { isInteractive: true, isDisabled: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('suppresses onClick when loading', () => {
    const el = host();
    const onClick = vi.fn();
    new ArvoAvatar(el, { isInteractive: true, isLoading: true, onClick });
    el.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('Enter key triggers click on a span-shaped interactive avatar', () => {
    const el = host();
    const onClick = vi.fn();
    new ArvoAvatar(el, { isInteractive: true, onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('Space key triggers click on a span-shaped interactive avatar', () => {
    const el = host();
    const onClick = vi.fn();
    new ArvoAvatar(el, { isInteractive: true, onClick });
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Disabled / loading
// ---------------------------------------------------------------------------

describe('ArvoAvatar - disabled / loading', () => {
  it('disabled adds aria-disabled="true" + tabindex="-1"', () => {
    const el = host();
    new ArvoAvatar(el, { isInteractive: true, isDisabled: true });
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('disabled on a native <button> sets the disabled property', () => {
    const el = host('button') as HTMLButtonElement;
    new ArvoAvatar(el, { isInteractive: true, isDisabled: true });
    expect(el.disabled).toBe(true);
  });

  it('loading adds the .loading class and aria-busy="true"', () => {
    const el = host();
    new ArvoAvatar(el, { isLoading: true });
    expect(el.classList.contains('loading')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Tooltip / accessible label
// ---------------------------------------------------------------------------

describe('ArvoAvatar - tooltip + accessible label', () => {
  it('sets aria-label + title from tooltip', () => {
    const el = host();
    new ArvoAvatar(el, { tooltip: 'Jane Doe' });
    expect(el.getAttribute('aria-label')).toBe('Jane Doe');
    expect(el.getAttribute('title')).toBe('Jane Doe');
  });

  it('auto-generates label from name when tooltip is omitted', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'initials', name: 'Jane Doe' });
    expect(el.getAttribute('aria-label')).toBe('Jane Doe');
  });

  it('auto-generates "o9 Platform" for the o9logo variant', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'o9logo' });
    expect(el.getAttribute('aria-label')).toBe('o9 Platform');
  });

  it('auto-generates "Nova AI assistant" for the novai variant', () => {
    const el = host();
    new ArvoAvatar(el, { variant: 'novai' });
    expect(el.getAttribute('aria-label')).toBe('Nova AI assistant');
  });
});

// ---------------------------------------------------------------------------
// Method API (mirrors the React prop surface)
// ---------------------------------------------------------------------------

describe('ArvoAvatar - method API', () => {
  it('setVariant swaps the modifier class and re-renders inner DOM', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { variant: 'icon' });
    avt.setVariant('initials');
    expect(el.classList.contains('arvo-avt--initials')).toBe(true);
    expect(el.classList.contains('arvo-avt--icon')).toBe(false);
  });

  it('setSize swaps the modifier class', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    avt.setSize('xl');
    expect(el.classList.contains('arvo-avt--xl')).toBe(true);
  });

  it('setAppearance updates the appearance modifier', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    avt.setAppearance('outline');
    expect(el.classList.contains('arvo-avt--outline')).toBe(true);
  });

  it('setColorMode + setSemanticType apply the matching classes', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    avt.setColorMode('semantic');
    avt.setSemanticType('negative');
    expect(el.classList.contains('arvo-avt--semantic')).toBe(true);
    expect(el.classList.contains('arvo-avt--negative')).toBe(true);
  });

  it('setCustomColor applies the custom color class', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { colorMode: 'custom' });
    avt.setCustomColor('glacier');
    expect(el.classList.contains('arvo-avt--glacier')).toBe(true);
  });

  it('setName recomputes initials when on initials variant', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { variant: 'initials', name: 'Old Name' });
    expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('ON');
    avt.setName('Jane Doe');
    expect(el.querySelector('.arvo-avt__text')?.textContent).toBe('JD');
  });

  it('setIcon updates the icon glyph for icon variant', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { variant: 'icon' });
    avt.setIcon('briefcase');
    expect(el.querySelector('.arvo-avt__ico')?.classList.contains('o9con-briefcase')).toBe(true);
  });

  it('setTooltip updates aria-label + title', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    avt.setTooltip('My Avatar');
    expect(el.getAttribute('aria-label')).toBe('My Avatar');
    expect(el.getAttribute('title')).toBe('My Avatar');
  });

  it('disabled() dual-purpose getter/setter', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { isInteractive: true });
    expect(avt.disabled()).toBe(false);
    avt.disabled(true);
    expect(avt.disabled()).toBe(true);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    avt.disabled(false);
    expect(avt.disabled()).toBe(false);
  });

  it('loading() dual-purpose getter/setter', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    expect(avt.loading()).toBe(false);
    avt.loading(true);
    expect(avt.loading()).toBe(true);
    expect(el.classList.contains('loading')).toBe(true);
  });

  it('setSrc resets failure state and re-renders', () => {
    const el = host();
    const avt = new ArvoAvatar(el, {
      variant: 'image',
      src: 'https://example.com/missing.jpg',
      name: 'Jane Doe',
    });
    (el.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('error'));
    expect(el.classList.contains('arvo-avt--initials')).toBe(true);
    avt.setSrc('https://example.com/new.jpg');
    expect(el.classList.contains('arvo-avt--image')).toBe(true);
    expect(el.querySelector('img')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('ArvoAvatar - destroy', () => {
  it('removes inner DOM, classes, and ARIA attributes', () => {
    const el = host();
    const avt = new ArvoAvatar(el, { isInteractive: true });
    avt.destroy();
    expect(el.children.length).toBe(0);
    expect(el.className).toBe('');
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('removes click + keydown listeners', () => {
    const el = host();
    const onClick = vi.fn();
    const avt = new ArvoAvatar(el, { isInteractive: true, onClick });
    avt.destroy();
    el.click();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('destroy() is idempotent', () => {
    const el = host();
    const avt = new ArvoAvatar(el);
    avt.destroy();
    expect(() => avt.destroy()).not.toThrow();
  });
});
