import { LogIn } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { HudButton } from '../../../shared/ui';

export interface InviteNicknameModalProps {
  roomCode: string;
  onSubmit: (nickname: string) => void;
  onCancel: () => void;
}

/** Asks a player who opened an invite link without a saved nickname to pick one before joining. */
export const InviteNicknameModal: React.FC<InviteNicknameModalProps> = ({
  roomCode,
  onSubmit,
  onCancel,
}) => {
  const { t } = useI18n();
  const [nickname, setNickname] = useState('');
  const trimmed = nickname.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-nickname-title"
      data-testid="invite-nickname-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-950 border-2 border-cyan-500/80 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.3)] p-5 space-y-4"
      >
        <div className="space-y-1">
          <h2
            id="invite-nickname-title"
            className="text-base font-extrabold text-cyan-300 tracking-wider"
          >
            {t.home.inviteNicknameTitle}
          </h2>
          <p className="text-xs text-zinc-400">{t.home.inviteNicknameHint(roomCode)}</p>
        </div>

        <input
          type="text"
          value={nickname}
          maxLength={24}
          autoFocus
          placeholder={t.home.nicknamePlaceholder}
          aria-label={t.home.nicknameLabel}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-black/90 border border-zinc-700/80 px-3 py-2 rounded text-emerald-300 focus:outline-none focus:border-cyan-500 font-bold text-sm"
        />

        <div className="flex justify-end gap-2">
          <HudButton type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
            {t.home.inviteCancel}
          </HudButton>
          <HudButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={!trimmed}
            className="flex items-center gap-1.5 text-xs"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>{t.home.joinCta}</span>
          </HudButton>
        </div>
      </form>
    </div>
  );
};
