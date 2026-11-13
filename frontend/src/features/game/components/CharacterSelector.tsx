import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CharacterId } from '../utils/characterCatalog';
import { CHARACTER_CATALOG, getCharacterText } from '../utils/characterCatalog';
import { RigAvatarSvg } from './RigAvatarSvg';

export interface CharacterSelectorProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  compact?: boolean;
  takenByCharacterId?: Record<string, string>;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedId,
  onSelect,
  compact = false,
  takenByCharacterId,
}) => {
  const { language, t } = useI18n();

  return (
    <div data-testid="character-selector" className="space-y-2.5 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-extrabold tracking-wider text-zinc-200 uppercase">
          {t.home.characterPickerTitle}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
          {t.home.avatarReady}
        </span>
      </div>

      <div className={clsx('grid gap-2.5', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
        {CHARACTER_CATALOG.map((char) => {
          const isSelected = char.id === selectedId;
          const takenByNickname = takenByCharacterId?.[char.id];
          const isTaken = Boolean(takenByNickname) && !isSelected;
          const { role, bio, perk } = getCharacterText(char, language);

          return (
            <button
              key={char.id}
              type="button"
              data-testid={`select-character-${char.id}`}
              aria-pressed={isSelected}
              disabled={isTaken}
              aria-disabled={isTaken}
              onClick={() => {
                if (!isTaken) onSelect(char.id);
              }}
              className={clsx(
                'text-left rounded-xl border p-2.5 transition-all flex gap-3 relative overflow-hidden min-w-0',
                compact ? 'flex-col items-center gap-2' : 'items-start',
                isTaken
                  ? 'bg-zinc-950/40 border-zinc-900 opacity-50 cursor-not-allowed'
                  : isSelected
                    ? clsx('bg-zinc-900/95 ring-1 ring-white/20 cursor-pointer', char.borderGlowClass)
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-600 opacity-80 hover:opacity-100 cursor-pointer'
              )}
            >
              <RigAvatarSvg profile={char} isSelected={isSelected} />

              <div className={clsx('min-w-0 space-y-1', compact ? 'w-full' : 'flex-1')}>
                <div className={clsx('flex items-center justify-between gap-1', compact && 'flex-wrap')}>
                  <span className="font-black text-xs text-white tracking-wider truncate">
                    {char.codename}
                  </span>
                  {isSelected ? (
                    <span
                      className={clsx(
                        'text-[9px] font-black px-1.5 py-0.2 rounded border uppercase shrink-0',
                        char.accentBadgeClass
                      )}
                    >
                      {t.home.characterActive}
                    </span>
                  ) : isTaken ? (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.2 rounded border border-zinc-700 bg-zinc-900 text-zinc-400 uppercase shrink-0 truncate max-w-[110px]"
                      title={takenByNickname}
                    >
                      {t.home.characterTaken}: {takenByNickname}
                    </span>
                  ) : null}
                </div>

                <div className="text-[10px] font-bold truncate" style={{ color: char.primaryColor }}>
                  {role}
                </div>

                {!compact && (
                  <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">{bio}</p>
                )}

                <div className="text-[9px] text-zinc-300 bg-black/70 px-1.5 py-0.5 rounded border border-zinc-800 truncate">
                  {perk}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
