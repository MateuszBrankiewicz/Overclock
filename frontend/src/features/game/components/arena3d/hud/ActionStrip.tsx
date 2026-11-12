import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import type { CardProtocol, ExploitModule } from '../../../schemas/gameEvents';
import type { CharacterProfile } from '../../../utils/characterCatalog';
import { ProtocolPickerPopover } from './ProtocolPickerPopover';
import type { ExploitPicker } from './useExploitPicker';

export interface ActionStripProps {
  canTrace: boolean;
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
  <span data-testid="key-hint" className="ml-1.5 opacity-70 font-mono text-[10px]">{`[${k}]`}</span>
);

/** Locked bottom-edge tactical visor action strip. */
export const ActionStrip: React.FC<ActionStripProps> = ({
  canTrace,
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
    <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between gap-2 max-w-4xl mx-auto pointer-events-none">
      <button
        type="button"
        disabled={!canTrace}
        onClick={onCallTrace}
        className={clsx(
          'pointer-events-auto px-3.5 sm:px-5 py-2.5 rounded-xl border font-extrabold text-xs transition-all',
          canTrace
            ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-black border-red-300 shadow-[0_0_25px_rgba(239,68,68,0.75)] cursor-pointer'
            : 'bg-zinc-950/85 border-zinc-800 text-zinc-500 opacity-50 pointer-events-none'
        )}
      >
        🚨 {t.table.callTrace}
        {showKeyHints && <KeyHint k="T" />}
      </button>

      <div className="relative pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-zinc-800 text-[10px] sm:text-xs">
        <span className={clsx('font-black px-1.5 py-0.5 rounded border', myCharacter.accentBadgeClass)}>
          {`[${myCharacter.codename}]`}
        </span>
        <span className={clsx('font-bold', riskLevel >= 4 ? 'text-red-400' : 'text-amber-400')}>
          ⚡ {riskLevel}/6
        </span>
        {exploit && !exploit.isBurned && (
          <button
            type="button"
            disabled={!canUseChip}
            onClick={() => canUseChip && picker.request(exploit.type)}
            className={clsx(
              'px-2 py-0.5 rounded border font-black uppercase transition-all',
              canUseChip
                ? 'bg-cyan-400 text-black border-cyan-200 animate-pulse cursor-pointer'
                : 'bg-zinc-900 border-cyan-900 text-cyan-400 opacity-60'
            )}
          >
            {t.hud.chipLabel}: {exploit.type}
            {showKeyHints && <KeyHint k="E" />}
          </button>
        )}
        {picker.isOpen && canUseChip && (
          <ProtocolPickerPopover
            currentProtocol={currentTargetProtocol}
            onPick={picker.pick}
            onCancel={picker.close}
          />
        )}
      </div>

      <button
        type="button"
        disabled={!canTransmit}
        onClick={onPlayCards}
        className={clsx(
          'pointer-events-auto px-4 sm:px-6 py-2.5 rounded-xl border font-extrabold text-xs transition-all',
          canTransmit
            ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black border-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.75)] cursor-pointer'
            : 'bg-zinc-950/85 border-zinc-800 text-zinc-500 opacity-50 pointer-events-none'
        )}
      >
        ▶ {t.table.transmitCards}
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
        {showKeyHints && <KeyHint k="↵" />}
      </button>
    </div>
  );
};
