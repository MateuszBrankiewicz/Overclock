import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AudioMuteButton } from './AudioMuteButton';

describe('AudioMuteButton (ADR 0014)', () => {
  it('renders with unmuted state by default', () => {
    const html = renderToString(React.createElement(AudioMuteButton, { muted: false }));

    expect(html).toContain('data-testid="audio-mute-button"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('reflects muted state when toggled', () => {
    const html = renderToString(React.createElement(AudioMuteButton, { muted: true }));

    expect(html).toContain('aria-pressed="true"');
  });
});
