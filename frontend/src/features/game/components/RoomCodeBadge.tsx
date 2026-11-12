import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';

export interface RoomCodeBadgeProps {
  roomCode: string;
  showInviteLink?: boolean;
  className?: string;
}

export const RoomCodeBadge: React.FC<RoomCodeBadgeProps> = ({
  roomCode,
  showInviteLink = true,
  className = '',
}) => {
  const { t } = useI18n();
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  const getInviteUrl = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      return url.toString();
    }
    return `?room=${roomCode}`;
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
        onClick={() => { void copyToClipboard(roomCode, 'code'); }}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-emerald-600 hover:text-black text-emerald-400 border border-zinc-700 hover:border-emerald-500 rounded text-xs font-bold transition-colors cursor-pointer"
        title={t.common.copyCode}
      >
        {copiedType === 'code' ? (
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

      {showInviteLink && (
        <button
          type="button"
          onClick={() => { void copyToClipboard(getInviteUrl(), 'link'); }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-cyan-600 hover:text-black text-cyan-400 border border-zinc-700 hover:border-cyan-500 rounded text-xs font-bold transition-colors cursor-pointer"
          title={t.common.copyLink}
        >
          {copiedType === 'link' ? (
            <>
              <Check className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-cyan-300">{t.common.copied}</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-3.5 h-3.5" />
              <span>{t.common.copyLink}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
