import { describe, expect, it, vi } from 'vitest';
import { ArvoImage } from './Image';

describe('ArvoImage', () => {
  it('renders an informative image with intrinsic metadata', () => {
    const host = document.createElement('div');
    new ArvoImage(host, {
      src: 'https://example.com/a.jpg',
      alt: 'Supply site',
      width: 1200,
      height: 675,
      aspectRatio: '16/9',
    });

    const img = host.querySelector('img') as HTMLImageElement;
    expect(host.classList.contains('arvo-img')).toBe(true);
    expect(img.src).toBe('https://example.com/a.jpg');
    expect(img.alt).toBe('Supply site');
    expect(img.width).toBe(1200);
    expect(img.height).toBe(675);
    expect(host.style.getPropertyValue('--arvo-img-ratio')).toBe('16/9');
  });

  it('renders picture sources before the fallback img', () => {
    const host = document.createElement('div');
    new ArvoImage(host, {
      src: 'https://example.com/fallback.jpg',
      alt: 'Responsive campaign',
      sources: [{ media: '(min-width: 800px)', srcSet: 'https://example.com/wide.webp', type: 'image/webp' }],
      srcSet: 'https://example.com/small.jpg 640w, https://example.com/large.jpg 1200w',
      sizes: '100vw',
    });

    const source = host.querySelector('source') as HTMLSourceElement;
    const img = host.querySelector('img') as HTMLImageElement;
    expect(source.media).toBe('(min-width: 800px)');
    expect(source.srcset).toBe('https://example.com/wide.webp');
    expect(source.type).toBe('image/webp');
    expect(img.srcset).toContain('https://example.com/small.jpg');
    expect(img.sizes).toBe('100vw');
  });

  it('enforces decorative semantics', () => {
    const host = document.createElement('div');
    new ArvoImage(host, {
      src: 'https://example.com/a.jpg',
      alt: 'Ignored',
      isDecorative: true,
    });

    const img = host.querySelector('img') as HTMLImageElement;
    expect(img.alt).toBe('');
    expect(img.getAttribute('role')).toBe('presentation');
  });

  it('resolves empty state when src is missing', () => {
    const host = document.createElement('div');
    const inst = new ArvoImage(host, { aspectRatio: '16/9' });

    expect(inst.state()).toBe('empty');
    expect(host.querySelector('.arvo-img__state')?.textContent).toContain('No image available');
  });

  it('transitions to ready on image load', () => {
    const host = document.createElement('div');
    const onLoad = vi.fn();
    const inst = new ArvoImage(host, { src: 'https://example.com/a.jpg', alt: 'A', onLoad });
    const img = host.querySelector('img') as HTMLImageElement;

    img.dispatchEvent(new Event('load'));

    expect(inst.state()).toBe('ready');
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.arvo-img__state')).toBeNull();
  });

  it('emits preview intent only when previewable and ready', () => {
    const host = document.createElement('div');
    const onPreviewOpen = vi.fn();
    const inst = new ArvoImage(host, {
      src: 'https://example.com/a.jpg',
      alt: 'A',
      hasPreview: true,
      onPreviewOpen,
    });
    const eventSpy = vi.fn();
    host.addEventListener('img:preview-open', eventSpy);

    inst.openPreview();
    expect(onPreviewOpen).not.toHaveBeenCalled();

    host.querySelector('img')?.dispatchEvent(new Event('load'));
    inst.openPreview();

    expect(onPreviewOpen).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });
});
