import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HudBadge } from './HudBadge';
import { HudButton } from './HudButton';
import { HudPanel } from './HudPanel';

describe('HUD Primitives (GFX-04)', () => {
  describe('HudPanel', () => {
    it('renders with default tone and corner brackets', () => {
      const html = renderToString(
        React.createElement(HudPanel, { tone: 'accent' }, 'Panel Content')
      );
      expect(html).toContain('Panel Content');
      expect(html).toContain('border-emerald-500');
      expect(html).toContain('hud-panel');
    });

    it('can omit corner brackets', () => {
      const html = renderToString(
        React.createElement(HudPanel, { cornerBrackets: false }, 'Clean Panel')
      );
      expect(html).toContain('Clean Panel');
      expect(html).not.toContain('border-t border-l');
    });
  });

  describe('HudButton', () => {
    it('renders primary button with min-h-[48px] size lg', () => {
      const html = renderToString(
        React.createElement(
          HudButton,
          { variant: 'primary', size: 'lg' },
          'TRANSMIT'
        )
      );
      expect(html).toContain('TRANSMIT');
      expect(html).toContain('min-h-[48px]');
      expect(html).toContain('hud-button');
    });

    it('renders disabled state with appropriate classes and attribute', () => {
      const html = renderToString(
        React.createElement(
          HudButton,
          { variant: 'danger', disabled: true },
          'CALL TRACE'
        )
      );
      expect(html).toContain('disabled');
      expect(html).toContain('opacity-40');
      expect(html).toContain('cursor-not-allowed');
    });
  });

  describe('HudBadge', () => {
    it('renders with given variant and text', () => {
      const html = renderToString(
        React.createElement(HudBadge, { variant: 'danger' }, 'HIGH VOLTAGE')
      );
      expect(html).toContain('HIGH VOLTAGE');
      expect(html).toContain('border-red-500');
      expect(html).toContain('hud-badge');
    });
  });
});
