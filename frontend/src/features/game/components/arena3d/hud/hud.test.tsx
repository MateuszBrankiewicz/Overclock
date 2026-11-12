import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { becameMyTurn } from '../../../hooks/useYourTurnBanner';
import { getCharacterById } from '../../../utils/characterCatalog';
import { ActionStrip } from './ActionStrip';
import { TimerBar } from './TimerBar';
import { ActiveTurnLabel, YourTurnBannerView } from './TurnStatusHud';
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

  it('names the acting opponent', () => {
    const html = renderToString(<ActiveTurnLabel isMyTurn={false} activePlayerNickname="Volt" />);
    expect(html).toContain('Volt');
    expect(renderToString(<ActiveTurnLabel isMyTurn activePlayerNickname="Volt" />)).toBe('');
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
});
