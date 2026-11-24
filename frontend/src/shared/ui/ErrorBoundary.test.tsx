import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders its children while nothing throws', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <span>scene</span>
      </ErrorBoundary>
    );
    expect(html).toBe('<span>scene</span>');
  });

  it('derives the error state that switches to the fallback', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });
});
