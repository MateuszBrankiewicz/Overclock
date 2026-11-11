import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OperatingTable } from './OperatingTable';

describe('OperatingTable Component (TASK-2.6 & Phase 2 Integration)', () => {
  it('is exported as a React functional component', () => {
    expect(OperatingTable).toBeDefined();
    expect(typeof OperatingTable).toBe('function');
  });

  it('renders hardware terminal deck setup when not connected to a room', () => {
    const html = renderToString(React.createElement(OperatingTable));
    expect(html).toContain('HARDWARE TERMINAL // DECK SETUP');
    expect(html).toContain('INITIALIZE TABLE');
    expect(html).toContain('CONNECT TO TABLE');
  });
});
