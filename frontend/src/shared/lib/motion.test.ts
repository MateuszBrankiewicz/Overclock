import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hasFinePointer, prefersReducedMotion, useFinePointer, usePrefersReducedMotion } from './motion';

describe('motion utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('detects prefers-reduced-motion: reduce when matching', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    expect(prefersReducedMotion()).toBe(true);
    expect(hasFinePointer()).toBe(false);
  });

  it('detects pointer: fine when matching', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('pointer: fine'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    expect(prefersReducedMotion()).toBe(false);
    expect(hasFinePointer()).toBe(true);
  });

  it('returns false safely when matchMedia throws or window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(prefersReducedMotion()).toBe(false);
    expect(hasFinePointer()).toBe(false);
  });

  it('renders hooks in SSR without crashing and defaults to false', () => {
    function TestComponent() {
      const reduced = usePrefersReducedMotion();
      const fine = useFinePointer();
      return React.createElement('div', {
        'data-reduced': String(reduced),
        'data-fine': String(fine),
      });
    }

    const html = renderToString(React.createElement(TestComponent));
    expect(html).toContain('data-reduced="false"');
    expect(html).toContain('data-fine="false"');
  });
});
