import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RoomCodeBadge } from './RoomCodeBadge';

describe('RoomCodeBadge Component', () => {
  it('renders room code clearly with select-text style', () => {
    const html = renderToString(
      React.createElement(RoomCodeBadge, {
        roomCode: 'CYBER-7X9',
      })
    );

    expect(html).toContain('CYBER-7X9');
    expect(html).toContain('select-text');
    expect(html).toContain('Kopiuj kod');
    expect(html).toContain('Kopiuj link do pokoju');
  });

  it('can hide invite link button when configured', () => {
    const html = renderToString(
      React.createElement(RoomCodeBadge, {
        roomCode: 'ROOM-123',
        showInviteLink: false,
      })
    );

    expect(html).toContain('ROOM-123');
    expect(html).toContain('Kopiuj kod');
    expect(html).not.toContain('Kopiuj link do pokoju');
  });
});
