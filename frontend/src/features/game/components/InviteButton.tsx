import { Share2 } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';
import { useUiStore } from '../stores/useUiStore';
import { buildInviteUrl } from '../utils/invite';
import { shareInvite } from '../utils/shareInvite';

export interface InviteButtonProps {
  roomCode: string;
  className?: string;
}

export const InviteButton: React.FC<InviteButtonProps> = ({ roomCode, className = '' }) => {
  const { t } = useI18n();

  const onInvite = async () => {
    const url = buildInviteUrl(window.location.href, roomCode);
    const outcome = await shareInvite({
      title: t.home.inviteShareTitle,
      text: t.home.inviteShareText,
      url,
    });
    const { pushToast } = useUiStore.getState();
    if (outcome === 'copied') pushToast({ kind: 'success', message: t.home.inviteCopied });
    if (outcome === 'failed') pushToast({ kind: 'error', message: t.home.inviteFailed });
  };

  return (
    <button
      type="button"
      onClick={() => {
        void onInvite();
      }}
      className={`flex items-center gap-1.5 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-500 text-black border border-cyan-400 rounded text-xs font-bold transition-colors cursor-pointer ${className}`}
      title={t.home.invite}
    >
      <Share2 className="w-3.5 h-3.5" />
      <span>{t.home.invite}</span>
    </button>
  );
};
