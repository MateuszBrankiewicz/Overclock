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
      <HudButton
        variant="danger"
        size="lg"
        disabled={!canTrace}
        onClick={onCallTrace}
        className={clsx(
          'pointer-events-auto',
          canTrace && 'shadow-[0_0_25px_rgba(239,68,68,0.75)]'
        )}
      >
        <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
        <span>{t.table.callTrace}</span>
        {showKeyHints && <KeyHint k="T" />}
      </HudButton>

      <HudPanel
        tone="default"
        cornerBrackets
        className="relative pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-[11px] sm:text-xs"
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
        {picker.isOpen && canUseChip && (
          <ProtocolPickerPopover
            currentProtocol={currentTargetProtocol}
            onPick={picker.pick}
            onCancel={picker.close}
          />
        )}
      </HudPanel>

      <HudButton
        variant="primary"
        size="lg"
        disabled={!canTransmit}
        onClick={onPlayCards}
        active={canTransmit}
        className={clsx(
          'pointer-events-auto',
          canTransmit && 'shadow-[0_0_25px_rgba(16,185,129,0.75)]'
        )}
      >
        <Send className="w-4 h-4 shrink-0 text-emerald-300" />
        <span>
          {t.table.transmitCards}
          {selectedCount > 0 ? ` (${selectedCount})` : ''}
        </span>
        {showKeyHints && <KeyHint k="↵" />}
      </HudButton>
    </div>
  );
};
