import clsx from 'clsx';
import React from 'react';

import type { CharacterProfile } from '../utils/characterCatalog';

/** 2D portrait of an operator rig, tinted with the character's colours. */
export const RigAvatarSvg: React.FC<{
  profile: CharacterProfile;
  isSelected: boolean;
  /** Replaces the default size classes. */
  sizeClassName?: string;
}> = ({ profile, isSelected, sizeClassName = 'w-12 h-12 sm:w-14 sm:h-14' }) => {
  return (
    <svg
      viewBox="0 0 80 80"
      className={clsx(
        sizeClassName,
        'shrink-0 rounded-lg border bg-black/90 p-1 transition-transform duration-300',
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
