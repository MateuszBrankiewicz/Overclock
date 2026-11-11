import clsx from 'clsx';
import React from 'react';

import type { CapacitorDischargedEvent } from '../schemas/gameEvents';

export interface VoltageTestSequenceProps {
  isVoltageTestActive: boolean;
  pendingPlayerId?: string | null;
  pendingPlayerNickname?: string | null;
  isLocalPlayerPending?: boolean;
  deadlineUtc?: string | null;
  lastDischargeOutcome?: CapacitorDischargedEvent | null;
  canUseGroundWire?: boolean;
  onDeployGroundWire?: () => void;
  onTriggerDischarge?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const VoltageTestSequence: React.FC<VoltageTestSequenceProps> = ({
  isVoltageTestActive,
  pendingPlayerNickname = 'UNKNOWN OPERATOR',
  isLocalPlayerPending = false,
  lastDischargeOutcome,
  canUseGroundWire = false,
  onDeployGroundWire,
  onTriggerDischarge,
  onDismiss,
  className,
}) => {
  if (!isVoltageTestActive && !lastDischargeOutcome) {
    return null;
  }

  const isResolved = Boolean(lastDischargeOutcome);
  const isOverloaded = isResolved && lastDischargeOutcome?.overloaded;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="High Voltage Capacitor Test"
      className={clsx(
        'relative flex flex-col font-mono select-none rounded-lg border-2 p-5 max-w-lg w-full',
        'bg-zinc-950/95 backdrop-blur-md shadow-2xl transition-all duration-300',
        isOverloaded
          ? 'border-cyber-red shadow-[0_0_35px_rgba(255,0,51,0.6)]'
          : isResolved
          ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
          : 'border-cyber-amber shadow-[0_0_25px_rgba(255,176,0,0.4)] animate-pulse',
        className
      )}
    >
      {/* High-Voltage Warning Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <div>
            <h3
              className={clsx(
                'text-sm font-bold tracking-wider uppercase',
                isOverloaded ? 'text-cyber-red' : isResolved ? 'text-emerald-400' : 'text-cyber-amber'
              )}
            >
              {isOverloaded
                ? 'CRITICAL VOLTAGE OVERLOAD'
                : isResolved
                ? 'DIELECTRIC DISCHARGE COMPLETE'
                : 'HIGH-VOLTAGE CAPACITOR TEST'}
            </h3>
            <span className="text-[10px] text-zinc-500">IEEE-488 DIELECTRIC MONITOR</span>
          </div>
        </div>

        {onDismiss && isResolved && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss sequence"
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded border border-zinc-700 bg-zinc-900"
          >
            DISMISS
          </button>
        )}
      </div>

      {/* Target operator info */}
      {!isResolved && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1">
            <span className="text-[11px] text-zinc-400">TARGET OPERATOR UNDER TEST:</span>
            <span className="text-base font-bold text-cyber-amber tracking-wide">
              {pendingPlayerNickname}
            </span>
            <span className="text-[10px] text-zinc-500">
              High voltage bus is armed. Capacitor discharge is impending.
            </span>
          </div>

          {/* Local player actions */}
          {isLocalPlayerPending ? (
            <div className="flex flex-col gap-2 mt-1">
              {canUseGroundWire && onDeployGroundWire && (
                <button
                  type="button"
                  onClick={onDeployGroundWire}
                  className="w-full py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider text-black bg-emerald-400 hover:bg-emerald-300 transition-all shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-300"
                >
                  ⚡ DEPLOY GROUND WIRE (-50% RISK)
                </button>
              )}

              {onTriggerDischarge && (
                <button
                  type="button"
                  onClick={onTriggerDischarge}
                  className="w-full py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider text-black bg-cyber-amber hover:bg-amber-400 transition-all shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-300"
                >
                  ⚡ TRIGGER DISCHARGE NOW (ROLL D6)
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-400">
              Waiting for operator decision or watchdog timeout...
            </div>
          )}
        </div>
      )}

      {/* Discharge Result Display */}
      {isResolved && lastDischargeOutcome && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">D6 ROLL RESULT</span>
              <span
                className={clsx(
                  'text-2xl font-bold tracking-tight',
                  isOverloaded ? 'text-cyber-red' : 'text-emerald-400'
                )}
              >
                {lastDischargeOutcome.roll}
              </span>
            </div>
            <div className="p-2.5 rounded bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block">TESTED RISK LEVEL</span>
              <span className="text-2xl font-bold text-zinc-200 tracking-tight">
                {`≤ ${lastDischargeOutcome.riskLevel}`}
              </span>
            </div>
          </div>

          <div
            className={clsx(
              'p-3 rounded border text-center font-bold text-xs tracking-wide',
              isOverloaded
                ? 'bg-red-950/40 border-cyber-red/80 text-cyber-red animate-pulse'
                : 'bg-emerald-950/40 border-emerald-500/80 text-emerald-400'
            )}
          >
            {isOverloaded ? (
              <div className="flex flex-col gap-0.5">
                <span>CRITICAL OVERLOAD: DIELECTRIC BREAKDOWN DETECTED!</span>
                <span className="text-[10px] font-normal text-red-300">
                  Target operator eliminated from the circuit.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <span>DIELECTRIC HELD: SYSTEM STABILIZED</span>
                <span className="text-[10px] font-normal text-emerald-300">
                  {`Risk level increased to ${lastDischargeOutcome.resultingRiskLevel}.`}
                </span>
              </div>
            )}
          </div>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="mt-1 w-full py-2 rounded text-xs font-bold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              ACKNOWLEDGE TELEMETRY
            </button>
          )}
        </div>
      )}
    </div>
  );
};
