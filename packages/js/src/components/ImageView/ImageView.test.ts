import { describe, expect, it } from 'vitest';
import { ArvoImageView } from './ImageView';

describe('ArvoImageView', () => {
  it('opens with a single image and renders the title', async () => {
    const view = ArvoImageView.initialize({
      items: [
        {
          src: 'https://example.com/a.jpg',
          alt: 'Supply image',
          title: 'Supply image',
        },
      ],
    });

    await view.open();

    const title = document.querySelector('.arvo-img-view__title');
    expect(document.querySelector('.arvo-img-view')).not.toBeNull();
    expect(title?.textContent).toBe('Supply image');

    view.destroy();
  });

  it('navigates across a collection and clamps zoom', () => {
    const view = ArvoImageView.initialize({
      items: [
        { src: 'https://example.com/a.jpg', alt: 'A' },
        { src: 'https://example.com/b.jpg', alt: 'B' },
      ],
      minZoom: 0.5,
      maxZoom: 2,
    });

    view.activeIndex(1);
    expect(view.activeIndex()).toBe(1);

    view.zoom(10);
    expect(view.zoom()).toBe(2);

    view.zoom(0.1);
    expect(view.zoom()).toBe(0.5);

    view.destroy();
  });
});
