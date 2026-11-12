import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import type { RoomState } from '../../../schemas/gameEvents';
import { useGameStore } from '../../../stores/useGameStore';
import { TURN_DURATION_SECONDS } from '../../../utils/cinematicTiming';
import { TimerHud } from './TimerBar';

export interface PhaseTimersProps {
  roomState: RoomState | null;
}

/** Turn timer during TurnActive and discharge-decision timer during VoltageTest. */
export const PhaseTimers: React.FC<PhaseTimersProps> = ({ roomState }) => {
  const { t } = useI18n();
  const turnDeadlineUtc = useGameStore((s) => s.turnDeadlineUtc);
  const dischargeDeadlineUtc = useGameStore((s) => s.dischargeDeadlineUtc);

  if (roomState === 'TurnActive') {
    return (
      <TimerHud
        testId="turn-timer"
        label={t.hud.turnTimer}
        deadlineUtc={turnDeadlineUtc}
        fullSeconds={TURN_DURATION_SECONDS}
      />
    );
  }
  if (roomState === 'VoltageTest') {
    return (
      <TimerHud
        testId="discharge-timer"
        label={t.hud.dischargeTimer}
        deadlineUtc={dischargeDeadlineUtc}
      />
    );
  }
  return null;
};
