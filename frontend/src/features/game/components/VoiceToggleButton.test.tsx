import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VoiceToggleButton } from './VoiceToggleButton';

describe('VoiceToggleButton (ADR 0016)', () => {
  it('renders with enabled voice state by default', () => {
    const html = renderToString(
      React.createElement(VoiceToggleButton, { voiceEnabled: true })
    );

    expect(html).toContain('data-testid="voice-toggle-button"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('reflects disabled voice state when toggled', () => {
    const html = renderToString(
      React.createElement(VoiceToggleButton, { voiceEnabled: false })
    );

    expect(html).toContain('data-testid="voice-toggle-button"');
    expect(html).toContain('aria-pressed="false"');
  });
});
