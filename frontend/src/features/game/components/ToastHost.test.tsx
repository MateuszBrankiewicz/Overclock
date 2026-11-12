import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConnectionStatusBadge } from './ConnectionStatusPill';
import { ToastList } from './ToastHost';

describe('ToastHost / ConnectionStatusPill', () => {
  it('renders an accessible live region with toast messages', () => {
    const html = renderToString(
      React.createElement(ToastList, {
        toasts: [{ id: 1, kind: 'error', message: 'Something broke' }],
        onDismiss: () => undefined,
      })
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Something broke');
  });

  it('renders pill only when not connected', () => {
    expect(renderToString(React.createElement(ConnectionStatusBadge, { status: 'Connected' }))).toBe('');
    expect(renderToString(React.createElement(ConnectionStatusBadge, { status: 'Reconnecting' }))).toContain('connection-pill');
  });
});
