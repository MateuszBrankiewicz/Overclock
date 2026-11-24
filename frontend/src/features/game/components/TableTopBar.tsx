import { HelpCircle } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { useGameSession } from '../session/useGameSession';
import { useGameStore } from '../stores/useGameStore';
import { useUiStore } from '../stores/useUiStore';
import { AudioMuteButton } from './AudioMuteButton';
import { ConnectionStatusPill } from './ConnectionStatusPill';
import { GfxQualityButton } from './GfxQualityButton';
import { LeaveTableButton } from './LeaveTableButton';
import { RoomCodeBadge } from './RoomCodeBadge';
import { StreamerSettings } from './StreamerSettings';
import { VoiceToggleButton } from './VoiceToggleButton';

export interface TableTopBarProps {
  roomCode: string;
}

export const TableTopBar: React.FC<TableTopBarProps> = ({ roomCode }) => {
  const session = useGameSession();
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const openRules = useUiStore((s) => s.openRules);
  const roomState = useGameStore((s) => s.roomState);

  return (
    <div className="relative flex items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
      <RoomCodeBadge roomCode={roomCode} showInviteLink={roomState !== 'Lobby'} />
      <ConnectionStatusPill />
      {/* Desktop action icons */}
      <div className="hidden sm:flex items-center gap-2">
        <AudioMuteButton />
        <VoiceToggleButton />
        <GfxQualityButton />
        <StreamerSettings />
        <button
          type="button"
          onClick={openRules}
          className="p-1 text-zinc-400 hover:text-emerald-300 cursor-pointer"
          title={t.common.gameRules}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <LeaveTableButton onLeave={() => void session.leaveRoom()} />
      </div>
      {/* Mobile overflow button */}
      <button
        type="button"
        data-testid="top-bar-overflow-btn"
        onClick={() => setIsMobileMenuOpen((open) => !open)}
        className="sm:hidden p-1 text-zinc-300 hover:text-white transition-colors cursor-pointer text-base leading-none font-bold"
        aria-label="More options"
      >
        ⋯
      </button>
      {/* Mobile popover dropdown */}
      {isMobileMenuOpen && (
        <div
          data-testid="top-bar-mobile-menu"
          className="absolute top-full mt-2 left-0 z-50 flex items-center gap-2 bg-black/95 backdrop-blur-lg border border-zinc-700 p-2 rounded-xl shadow-2xl sm:hidden"
        >
          <AudioMuteButton />
          <VoiceToggleButton />
          <GfxQualityButton />
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              openRules();
            }}
            className="p-1 text-zinc-400 hover:text-emerald-300 cursor-pointer"
            title={t.common.gameRules}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <LeaveTableButton onLeave={() => void session.leaveRoom()} />
        </div>
      )}
    </div>
  );
};
