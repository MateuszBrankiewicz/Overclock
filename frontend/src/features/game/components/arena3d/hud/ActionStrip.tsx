import clsx from 'clsx';
import { Radio, Send, ShieldAlert, Zap } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { HudButton, HudPanel } from '../../../../../shared/ui';
import type { CardProtocol, ExploitModule } from '../../../schemas/gameEvents';
import type { CharacterProfile } from '../../../utils/characterCatalog';
import { ProtocolPickerPopover } from './ProtocolPickerPopover';
import type { ExploitPicker } from './useExploitPicker';

export interface ActionStripProps {
  canTrace: boolean;
  /** Every rival emptied their hand — TRACE is the only legal move. */
  mustCallTrace?: boolean;
  canTransmit: boolean;
  canUseChip: boolean;
  exploit: ExploitModule | null;
  riskLevel: number;
  myCharacter: CharacterProfile;
  selectedCount: number;
  currentTargetProtocol: CardProtocol | null;
  picker: ExploitPicker;
  onCallTrace: () => void;
  onPlayCards: () => void;
  /** Show `[T]` / `[E]` / `[↵]` key hints (fine-pointer devices only). */
  showKeyHints?: boolean;
}

const KeyHint: React.FC<{ k: string }> = ({ k }) => (
  <span
    data-testid="key-hint"
    className="ml-1.5 opacity-70 font-mono text-[11px] sm:text-xs"
  >{`[${k}]`}</span>
);

/** Locked bottom-edge tactical visor action strip. */
export const ActionStrip: React.FC<ActionStripProps> = ({
  canTrace,
  mustCallTrace = false,
  canTransmit,
  canUseChip,
  exploit,
  riskLevel,
  myCharacter,
  selectedCount,
  currentTargetProtocol,
  picker,
  onCallTrace,
  onPlayCards,
  showKeyHints = false,
}) => {
  const { t } = useI18n();

  return (
    <div
      data-testid="action-strip"
      className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2.5 right-2.5 sm:left-3 sm:right-3 z-30 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-1.5 sm:gap-2 max-w-4xl mx-auto pointer-events-none"
    >
      <HudPanel
        tone="default"
        cornerBrackets
        className="order-1 sm:order-2 self-center relative pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs max-w-full"
      >
        <span
          className={clsx(
            'font-black px-1.5 py-0.5 rounded border',
            myCharacter.accentBadgeClass
          )}
        >
          {`[${myCharacter.codename}]`}
        </span>
        <span
          className={clsx(
            'flex items-center gap-1 font-bold',
            riskLevel >= 4 ? 'text-red-400' : 'text-amber-400'
          )}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>{riskLevel}/6</span>
        </span>
        {exploit && !exploit.isBurned && (
          <HudButton
            variant="accent"
            size="sm"
            disabled={!canUseChip}
            onClick={() => canUseChip && picker.request(exploit.type)}
            pulse={canUseChip}
          >
            <Radio className="w-3 h-3 shrink-0" />
            <span>
              {t.hud.chipLabel}: {exploit.type}
            </span>
            {showKeyHints && <KeyHint k="E" />}
          </HudButton>
        )}
        {mustCallTrace && (
          <span data-testid="must-call-trace" className="font-bold text-red-400">
            {t.table.mustCallTrace}
          </span>
        )}
        {picker.isOpen && canUseChip && (
          <ProtocolPickerPopover
            currentProtocol={currentTargetProtocol}
            onPick={picker.pick}
            onCancel={picker.close}
          />
        )}
      </HudPanel>

      <div className="order-2 sm:contents grid grid-cols-2 gap-1.5">
        <HudButton
          variant="danger"
          size="lg"
          disabled={!canTrace}
          onClick={onCallTrace}
          pulse={mustCallTrace && canTrace}
          className={clsx(
            'sm:order-1 pointer-events-auto w-full sm:w-auto min-w-0 min-h-[42px] sm:min-h-[48px] px-2.5 py-1.5 sm:px-6 sm:py-2.5 text-[11px] sm:text-sm tracking-tight sm:tracking-wider leading-tight',
            canTrace && 'shadow-[0_0_25px_rgba(239,68,68,0.75)]'
          )}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          <span className="truncate">{t.table.callTrace}</span>
          {showKeyHints && <KeyHint k="T" />}
        </HudButton>

        <HudButton
          variant="primary"
          size="lg"
          disabled={!canTransmit}
          onClick={onPlayCards}
          active={canTransmit}
          className={clsx(
            'sm:order-3 pointer-events-auto w-full sm:w-auto min-w-0 min-h-[42px] sm:min-h-[48px] px-2.5 py-1.5 sm:px-6 sm:py-2.5 text-[11px] sm:text-sm tracking-tight sm:tracking-wider leading-tight',
            canTransmit && 'shadow-[0_0_25px_rgba(16,185,129,0.75)]'
          )}
        >
          <Send className="w-4 h-4 shrink-0 text-emerald-300" />
          <span className="truncate">
            {t.table.transmitCards}
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
          </span>
          {showKeyHints && <KeyHint k="↵" />}
        </HudButton>
      </div>
    </div>
  );
};
