import clsx from 'clsx';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import type { CharacterId, CharacterProfile } from '../utils/characterCatalog';
import { CHARACTER_CATALOG } from '../utils/characterCatalog';

export interface CharacterSelectorProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId) => void;
  compact?: boolean;
}

const RigAvatarSvg: React.FC<{ profile: CharacterProfile; isSelected: boolean }> = ({
  profile,
  isSelected,
}) => {
  return (
    <svg
      viewBox="0 0 80 80"
      className={clsx(
        'w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-lg border bg-black/90 p-1 transition-transform duration-300',
        isSelected ? 'scale-105 border-current' : 'border-zinc-800 opacity-85'
      )}
      style={{ color: profile.primaryColor }}
    >
      {/* Cyber Shoulders & Collar */}
      <path
        d="M10 74 L18 52 L30 48 L50 48 L62 52 L70 74 Z"
        fill={profile.armorColor}
        stroke={profile.primaryColor}
        strokeWidth="1.5"
      />
      {/* Head / Helmet Silhouette */}
      {profile.visorStyle === 'matrix' && (
        <>
          <polygon
            points="40,10 60,24 56,50 24,50 20,24"
            fill="#111827"
            stroke={profile.primaryColor}
            strokeWidth="1.6"
          />
          <rect x="25" y="27" width="30" height="9" rx="2" fill="#052e16" stroke={profile.primaryColor} strokeWidth="1.2" />
          <circle cx="33" cy="31.5" r="2.2" fill={profile.primaryColor} />
          <circle cx="47" cy="31.5" r="2.2" fill={profile.primaryColor} />
          <line x1="28" y1="42" x2="52" y2="42" stroke={profile.secondaryColor} strokeWidth="1.5" strokeDasharray="3 2" />
        </>
      )}
      {profile.visorStyle === 'tesla' && (
        <>
          <circle cx="16" cy="46" r="6" fill="none" stroke={profile.primaryColor} strokeWidth="1.8" strokeDasharray="3 2" />
          <circle cx="64" cy="46" r="6" fill="none" stroke={profile.primaryColor} strokeWidth="1.8" strokeDasharray="3 2" />
          <rect x="24" y="14" width="32" height="36" rx="8" fill="#1c1917" stroke={profile.primaryColor} strokeWidth="1.8" />
          <polygon points="40,22 46,32 41,32 44,42 34,30 39,30" fill={profile.secondaryColor} />
        </>
      )}
      {profile.visorStyle === 'dome' && (
        <>
          <path
            d="M24 34 C24 14, 56 14, 56 34 L54 50 L26 50 Z"
            fill="#083344"
            fillOpacity="0.65"
            stroke={profile.primaryColor}
            strokeWidth="1.6"
          />
          <polygon points="40,19 48,27 40,35 32,27" fill={profile.secondaryColor} />
          <rect x="28" y="39" width="24" height="5" rx="2" fill={profile.primaryColor} />
        </>
      )}
      {profile.visorStyle === 'crt' && (
        <>
          <rect x="20" y="14" width="40" height="34" rx="4" fill="#1f122b" stroke={profile.primaryColor} strokeWidth="1.8" />
          <rect x="24" y="18" width="32" height="24" rx="2" fill="#09090b" stroke={profile.secondaryColor} strokeWidth="1" />
          <polyline
            points="26,30 32,30 35,22 39,38 43,26 46,32 54,32"
            fill="none"
            stroke={profile.primaryColor}
            strokeWidth="1.8"
          />
        </>
      )}
    </svg>
  );
};

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedId,
  onSelect,
  compact = false,
}) => {
  const { language } = useI18n();

  return (
    <div data-testid="character-selector" className="space-y-2.5 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold tracking-wider text-zinc-200 uppercase">
          {language === 'pl' ? 'WYBIERZ POSTAĆ OPERATORA (CYBER-RIG 3D):' : 'SELECT 3D OPERATOR RIG:'}
        </span>
        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
          3D AVATAR READY
        </span>
      </div>

      <div className={clsx('grid gap-2.5', compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
        {CHARACTER_CATALOG.map((char) => {
          const isSelected = char.id === selectedId;
          const role = language === 'pl' ? char.rolePl : char.roleEn;
          const bio = language === 'pl' ? char.bioPl : char.bioEn;
          const perk = language === 'pl' ? char.perkLabelPl : char.perkLabelEn;

          return (
            <button
              key={char.id}
              type="button"
              data-testid={`select-character-${char.id}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(char.id)}
              className={clsx(
                'text-left rounded-xl border p-2.5 transition-all cursor-pointer flex items-start gap-3 relative overflow-hidden',
                isSelected
                  ? clsx('bg-zinc-900/95 ring-1 ring-white/20', char.borderGlowClass)
                  : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-600 opacity-80 hover:opacity-100'
              )}
            >
              <RigAvatarSvg profile={char} isSelected={isSelected} />

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-black text-xs text-white tracking-wider truncate">
                    {char.codename}
                  </span>
                  {isSelected && (
                    <span
                      className={clsx(
                        'text-[9px] font-black px-1.5 py-0.2 rounded border uppercase shrink-0',
                        char.accentBadgeClass
                      )}
                    >
                      {language === 'pl' ? 'WYBRANY' : 'ACTIVE'}
                    </span>
                  )}
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
