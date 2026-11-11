import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CapacitorMeter } from './CapacitorMeter';

describe('CapacitorMeter Component (TASK-2.4)', () => {
  it('is exported as a React functional component', () => {
    expect(CapacitorMeter).toBeDefined();
    expect(typeof CapacitorMeter).toBe('function');
  });

  it('renders with accessible role, values, and label', () => {
    const html = renderToString(
      React.createElement(CapacitorMeter, {
        riskLevel: 3,
        label: 'BUS VOLTAGE',
      })
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemin="1"');
    expect(html).toContain('aria-valuemax="6"');
    expect(html).toContain('BUS VOLTAGE');
    expect(html).toContain('LVL 3/6');
    expect(html).toContain('50%');
  });

  it('clamps risk level below 1 and above 6', () => {
    const htmlMin = renderToString(React.createElement(CapacitorMeter, { riskLevel: 0 }));
    expect(htmlMin).toContain('aria-valuenow="1"');

    const htmlMax = renderToString(React.createElement(CapacitorMeter, { riskLevel: 10 }));
    expect(htmlMax).toContain('aria-valuenow="6"');
  });

  it('applies hot danger styling when isPendingDischarge is true', () => {
    const html = renderToString(
      React.createElement(CapacitorMeter, {
        riskLevel: 5,
        isPendingDischarge: true,
      })
    );

    expect(html).toContain('HOT');
    expect(html).toContain('border-cyber-red');
  });
});
