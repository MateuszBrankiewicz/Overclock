import React from 'react';

import { useGameSession } from '../session/useGameSession';
import { useGameStore } from '../stores/useGameStore';
import type { OutcomePhase } from '../utils/outcomePhase';
import { BluffShowdown } from './showdown/BluffShowdown';
import type { ShowdownOperator } from './showdown/showdownParts';

export interface TableShowdownPanelProps {
  phase: OutcomePhase;
  targetId: string | null;
  canUseGroundWire: boolean;
  webGLSupported: boolean;
  toOperator: (id: string) => ShowdownOperator;
}

export const TableShowdownPanel: React.FC<TableShowdownPanelProps> = ({
  phase,
  targetId,
  canUseGroundWire,
  webGLSupported,
  toOperator,
}) => {
  const session = useGameSession();
  const traceReveal = useGameStore((s) => s.traceReveal);
  const showdownTrace = useGameStore((s) => s.showdownTrace);
  const dischargeDeadlineUtc = useGameStore((s) => s.dischargeDeadlineUtc);
  const finishTraceReveal = useGameStore((s) => s.finishTraceReveal);
  const dischargeCinematic = useGameStore((s) => s.dischargeCinematic);
  const clearDischargeCinematic = useGameStore((s) => s.clearDischargeCinematic);

  return (
    <BluffShowdown
      trace={
        showdownTrace
          ? {
              accuser: toOperator(showdownTrace.accuserPlayerId),
              accused: toOperator(showdownTrace.accusedPlayerId),
              declaredProtocol: showdownTrace.declaredProtocol,
              cards: showdownTrace.revealedCards,
              bluffDetected: showdownTrace.bluffDetected,
            }
          : null
      }
      revealStartedAtMs={traceReveal?.startedAtMs ?? null}
      discharge={
        dischargeCinematic
          ? {
              startedAtMs: dischargeCinematic.startedAtMs,
              roll: dischargeCinematic.event.roll,
              riskLevel: dischargeCinematic.event.riskLevel,
              overloaded: dischargeCinematic.event.overloaded,
              resultingRiskLevel: dischargeCinematic.event.resultingRiskLevel,
            }
          : null
      }
      target={targetId ? toOperator(targetId) : null}
      decision={
        phase === 'decision'
          ? {
              deadlineUtc: dischargeDeadlineUtc,
              canUseGroundWire,
              onDeployGroundWire: () => void session.activateExploit('GroundWire'),
              onTriggerDischarge: () => void session.triggerDischarge(),
            }
          : null
      }
      onSkip={
        traceReveal ? finishTraceReveal : dischargeCinematic ? clearDischargeCinematic : undefined
      }
      variant={webGLSupported ? 'bar' : 'expanded'}
    />
  );
};
