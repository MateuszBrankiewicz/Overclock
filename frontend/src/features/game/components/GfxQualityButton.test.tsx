import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GfxQualityButton } from './GfxQualityButton';

describe('GfxQualityButton (GFX-01)', () => {
  it('renders high quality state with aria-pressed=true', () => {
    const html = renderToString(React.createElement(GfxQualityButton, { quality: 'high' }));
    expect(html).toContain('data-testid="gfx-quality-button"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('FX');
  });

  it('renders low quality state with aria-pressed=false', () => {
    const html = renderToString(React.createElement(GfxQualityButton, { quality: 'low' }));
    expect(html).toContain('data-testid="gfx-quality-button"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('NO-FX');
  });
});
