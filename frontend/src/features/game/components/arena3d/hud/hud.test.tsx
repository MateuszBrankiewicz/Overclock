import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { computeCountdown } from '../../../hooks/useCountdown';
import { becameMyTurn } from '../../../hooks/useYourTurnBanner';
import { getCharacterById } from '../../../utils/characterCatalog';
import { ActionStrip } from './ActionStrip';
import { SpectatorHud } from './SpectatorHud';
import { TimerBar } from './TimerBar';
import { YourTurnBannerView } from './TurnStatusHud';
import { TurnUrgencyCountdownView } from './TurnUrgencyCountdown';
import { createExploitPickerController } from './useExploitPicker';

describe('TimerBar', () => {
  it('turns red and pulses in the last 5 seconds', () => {
    const html = renderToString(
      <TimerBar
        label="T"
        countdown={{ secondsLeft: 4, fraction: 0.3, isCritical: true, isActive: true }}
      />
    );
    expect(html).toContain('data-critical="true"');
    expect(html).toContain('animate-pulse');
    expect(html).toContain('bg-red-500');
  });

  it('stays calm above 5 seconds and hides when idle', () => {
    const calm = renderToString(
      <TimerBar
        label="T"
        countdown={{ secondsLeft: 12, fraction: 0.8, isCritical: false, isActive: true }}
      />
    );
    expect(calm).toContain('data-critical="false"');
    expect(calm).not.toContain('bg-red-500');
    const idle = renderToString(
      <TimerBar
        label="T"
        countdown={{ secondsLeft: 0, fraction: 0, isCritical: false, isActive: false }}
      />
    );
    expect(idle).toBe('');
  });
});

describe('turn status HUD', () => {
  it('detects only the false -> true transition of my turn', () => {
    expect(becameMyTurn(false, true)).toBe(true);
    expect(becameMyTurn(true, true)).toBe(false);
    expect(becameMyTurn(true, false)).toBe(false);
  });

  it('renders the banner only while visible', () => {
    expect(renderToString(<YourTurnBannerView visible />)).toContain('your-turn-banner');
    expect(renderToString(<YourTurnBannerView visible={false} />)).not.toContain(
      'your-turn-banner'
    );
  });
});

describe('EMP Flare protocol picker flow (ADR 0009)', () => {
  function setup() {
    let open = false;
    const onActivate = vi.fn();
    const controller = createExploitPickerController(
      onActivate,
      () => open,
      (v) => {
        open = v;
      }
    );
    return { controller, onActivate, isOpen: () => open };
  }

  it('opens the picker for EmpFlare and activates only after a pick', () => {
    const { controller, onActivate, isOpen } = setup();
    controller.request('EmpFlare');
    expect(isOpen()).toBe(true);
    expect(onActivate).not.toHaveBeenCalled();
    controller.pick('Beta');
    expect(onActivate).toHaveBeenCalledWith('EmpFlare', 'Beta');
    expect(isOpen()).toBe(false);
  });

  it('can be cancelled without activating', () => {
    const { controller, onActivate, isOpen } = setup();
    controller.request('EmpFlare');
    controller.close();
    expect(isOpen()).toBe(false);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('activates other exploits directly', () => {
    const { controller, onActivate, isOpen } = setup();
    controller.request('GroundWire');
    expect(onActivate).toHaveBeenCalledWith('GroundWire');
    expect(isOpen()).toBe(false);
  });

  it('shows Alpha/Beta/Gamma in the strip when the picker is open', () => {
    const html = renderToString(
      <ActionStrip
        canTrace={false}
        canTransmit={false}
        canUseChip
        exploit={{ type: 'EmpFlare', isBurned: false }}
        riskLevel={1}
        myCharacter={getCharacterById('ghost')}
        selectedCount={0}
        currentTargetProtocol="Alpha"
        picker={{ isOpen: true, request: () => {}, pick: () => {}, close: () => {} }}
        onCallTrace={() => {}}
        onPlayCards={() => {}}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('ALPHA');
    expect(html).toContain('BETA');
    expect(html).toContain('GAMMA');
  });
});

describe('turn urgency countdown', () => {
  const base = { secondsLeft: 3, fraction: 0.2, isCritical: true, isActive: true };

  it('shows the big countdown in the last seconds of a turn', () => {
    const html = renderToString(<TurnUrgencyCountdownView countdown={base} isMyTurn />);
    expect(html).toContain('turn-urgency-countdown');
    expect(html).toContain('>3<');
  });

  it('stays hidden before the critical window', () => {
    const html = renderToString(
      <TurnUrgencyCountdownView countdown={{ ...base, secondsLeft: 9, isCritical: false }} isMyTurn />
    );
    expect(html).toBe('');
  });

  it('computes countdown state from authoritative server deadline and renders critical urgency', () => {
    const nowMs = 1_000_000;
    const serverDeadlineMs = nowMs + 4_200; // 4.2s remaining from server
    const countdown = computeCountdown(serverDeadlineMs, nowMs, 15);
    expect(countdown.isCritical).toBe(true);
    expect(countdown.secondsLeft).toBe(5);

    const html = renderToString(<TurnUrgencyCountdownView countdown={countdown} isMyTurn />);
    expect(html).toContain('turn-urgency-countdown');
    expect(html).toContain('>5<');
  });
});

describe('SpectatorHud', () => {
  const livingOpponents = [
    { playerId: 'p1', nickname: 'GhostOperator', status: 'Active' as const, isReady: true, handCount: 3 },
    { playerId: 'p2', nickname: 'VoltRunner', status: 'Active' as const, isReady: true, handCount: 2 },
  ];

  it('renders spectator badge and overview option', () => {
    const html = renderToString(
      <SpectatorHud
        livingOpponents={livingOpponents}
        currentTargetId={null}
        cameraFocus="overview"
        onSelectTarget={() => {}}
        onSelectFocus={() => {}}
      />
    );
    expect(html).toContain('spectator-hud');
    expect(html).toContain('OBSERWUJESZ');
    expect(html).toContain('Widok ogólny');
  });

  it('renders active target nickname when focused on an opponent', () => {
    const html = renderToString(
      <SpectatorHud
        livingOpponents={livingOpponents}
        currentTargetId="p1"
        cameraFocus="opponents"
        onSelectTarget={() => {}}
        onSelectFocus={() => {}}
      />
    );
    expect(html).toContain('GhostOperator');
  });
});
