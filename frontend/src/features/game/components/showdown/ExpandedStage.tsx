import React from 'react';

import {
  ChamberRow,
  ShowdownCards,
  type ShowdownOperator,
  TumblingDie,
} from './showdownParts';
import {
  clampRisk,
  type ShowdownDischarge,
  type ShowdownStage,
  type ShowdownTrace,
} from './showdownTypes';

/** No WebGL: the cards, the chambers and the d6 have no 3D scene to live in, so show them here. */
export const ExpandedStage: React.FC<{
  stage: ShowdownStage;
  trace: ShowdownTrace | null;
  revealStartedAtMs: number | null;
  discharge: ShowdownDischarge | null;
  target: ShowdownOperator | null;
}> = ({ stage, trace, revealStartedAtMs, discharge, target }) => {
  const risk = clampRisk(discharge?.riskLevel ?? target?.riskLevel ?? 1);
  let body: React.ReactNode = null;
  if (
    (stage === 'scan' || stage === 'verdict') &&
    trace &&
    revealStartedAtMs !== null
  ) {
    body = (
      <ShowdownCards
        cards={trace.cards}
        declaredProtocol={trace.declaredProtocol}
        startedAtMs={revealStartedAtMs}
      />
    );
  } else if (stage === 'roll' && discharge) {
    body = <TumblingDie startedAtMs={discharge.startedAtMs} />;
  } else if (stage !== 'scan' && stage !== 'verdict') {
    body = (
      <ChamberRow
        risk={risk}
        roll={stage === 'strike' && discharge ? discharge.roll : null}
        charging={stage === 'charge'}
      />
    );
  }
  if (!body) return null;
  return (
    <div
      data-testid="showdown-expanded"
      className="rounded-xl border border-zinc-700/80 bg-zinc-950/85 px-3 py-2 backdrop-blur-md"
    >
      {body}
    </div>
  );
};
