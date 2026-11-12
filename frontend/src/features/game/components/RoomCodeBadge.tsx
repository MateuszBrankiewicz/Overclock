import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { InviteButton } from './InviteButton';

export interface RoomCodeBadgeProps {
  roomCode: string;
  /** Shows the single "Invite" button (Web Share API, or copy link as a fallback). */
  showInviteLink?: boolean;
  className?: string;
}

export const RoomCodeBadge: React.FC<RoomCodeBadgeProps> = ({
  roomCode,
  showInviteLink = true,
  className = '',
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 font-mono ${className}`}>
      <div className="flex items-center bg-zinc-900 border border-emerald-500/50 rounded px-2.5 py-1 shadow-sm">
        <span className="text-[11px] text-zinc-400 mr-2 font-bold">{t.common.room}:</span>
        <span
          className="select-text font-black text-emerald-300 tracking-wider text-sm cursor-text selection:bg-emerald-500 selection:text-black"
          title={t.common.room}
        >
          {roomCode}
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          void copyCode();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-emerald-600 hover:text-black text-emerald-400 border border-zinc-700 hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer"
        title={t.common.copyCode}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-emerald-300">{t.common.copied}</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>{t.common.copyCode}</span>
          </>
        )}
      </button>

      {showInviteLink && <InviteButton roomCode={roomCode} />}
    </div>
  );
};
