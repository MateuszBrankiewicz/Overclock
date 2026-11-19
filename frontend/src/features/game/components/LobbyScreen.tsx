import { Globe, HelpCircle, LogIn, PlusCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import heroUrl from '../../../assets/hero.png';
import { useI18n } from '../../../shared/i18n';
import { speakRobotVoice } from '../../../shared/lib/audio';
import { checkWebGLAvailable } from '../../../shared/lib/webgl';
import { HudButton, HudPanel } from '../../../shared/ui';
import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { useRulesModalStore } from '../stores/useRulesModalStore';
import { useUiStore } from '../stores/useUiStore';
import { type CharacterId, resolveSeatCharacter } from '../utils/characterCatalog';
import { readRoomParam } from '../utils/invite';
import { loadNickname, saveNickname } from '../utils/nickname';
import { LobbyShowcase3D } from './arena3d/LobbyShowcase3D';
import { AudioMuteButton } from './AudioMuteButton';
import { CharacterSelector } from './CharacterSelector';
import { GfxQualityButton } from './GfxQualityButton';
import { InviteNicknameModal } from './InviteNicknameModal';
import { VoiceToggleButton } from './VoiceToggleButton';

export interface LobbyScreenProps {
  initialJoinOpen?: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  initialJoinOpen = false,
}) => {
  const session = useGameSession();
  const { language, setLanguage, t } = useI18n();
  const openRules = useRulesModalStore((s) => s.open);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const setSelectedCharacter = useGameStore((s) => s.setSelectedCharacter);
  const inviteJoin = useUiStore((s) => s.inviteJoin);
  const setInviteJoin = useUiStore((s) => s.setInviteJoin);
  const isInviteJoining = inviteJoin?.status === 'joining';

  const [hasWebGL] = useState<boolean>(() => checkWebGLAvailable());
  const [nickname, setNickname] = useState(() => loadNickname());
  const initialRoomParam = useMemo(
    () =>
      typeof window === 'undefined'
        ? ''
        : readRoomParam(window.location.search, window.location.pathname),
    []
  );
  const [targetCode, setTargetCode] = useState(initialRoomParam);
  const [isJoinOpen, setIsJoinOpen] = useState(
    Boolean(initialRoomParam) || Boolean(initialJoinOpen)
  );

  const persistedNickname = (): string => {
    const finalNick = nickname.trim() || loadNickname();
    saveNickname(finalNick);
    return finalNick;
  };

  const handleSelectCharacter = (id: CharacterId) => {
    setSelectedCharacter(id);
    const profile = resolveSeatCharacter(id);
    speakRobotVoice(id, profile.codename);
  };

  const handleOperatorClick = () => {
    const profile = resolveSeatCharacter(selectedCharacterId);
    speakRobotVoice(selectedCharacterId, profile.codename);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    void session.createRoom(persistedNickname());
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetCode.trim()) {
      void session.joinRoom(targetCode.trim().toUpperCase(), persistedNickname());
    }
  };

  const handleInviteNickname = async (roomCode: string, chosenNickname: string) => {
    saveNickname(chosenNickname);
    setNickname(chosenNickname);
    setInviteJoin({ roomCode, status: 'joining' });
    try {
      await session.joinRoom(roomCode, chosenNickname);
    } finally {
      setInviteJoin(null);
    }
  };

  return (
    <div
      data-testid="lobby-screen"
      className="fixed inset-0 w-screen h-[100dvh] bg-black text-emerald-400 font-mono overflow-hidden select-none"
    >
      {/* Background 3D Showcase or WebGL Fallback */}
      {hasWebGL ? (
        <LobbyShowcase3D
          selectedCharacterId={selectedCharacterId}
          onOperatorClick={handleOperatorClick}
        />
      ) : (
        <div
          data-testid="lobby-fallback-bg"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-black/70" />
        </div>
      )}

      {/* Atmospheric CRT Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(4,4,6,0.75)_100%)]"
      />

      {/* Discreet Corner Bar: Rules, Language, Audio */}
      <header className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={openRules}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-black/80 hover:bg-zinc-800 text-emerald-300 border border-zinc-700/80 rounded text-[11px] sm:text-xs font-bold transition-colors cursor-pointer backdrop-blur-sm shadow-md"
          title={t.common.gameRules}
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">{t.common.gameRules}</span>
        </button>

        <div className="flex items-center bg-black/80 border border-zinc-700/80 rounded p-0.5 backdrop-blur-sm">
          <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1 mr-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => setLanguage('pl')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${
              language === 'pl' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PL
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer transition-colors ${
              language === 'en' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            EN
          </button>
        </div>

        <AudioMuteButton />
        <VoiceToggleButton />
        <GfxQualityButton />
      </header>

      {/* Main Form Panel — Left-docked on desktop, bottom/center on mobile (fits 360x740) */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end sm:justify-center items-center sm:items-start p-3 sm:p-8 pointer-events-none">
        <HudPanel
          tone="default"
          className="w-full max-w-sm sm:max-w-md p-4 sm:p-5 space-y-3.5 pointer-events-auto backdrop-blur-md shadow-[0_0_40px_rgba(0,0,0,0.85)] max-h-[92dvh] overflow-y-auto"
        >
          {/* Brand Header */}
          <div className="border-b border-zinc-800/80 pb-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-emerald-300">
              {t.lobby.title}
            </h1>
            <p className="text-[11px] text-zinc-400 tracking-wider truncate">
              {t.home.heroTagline}
            </p>
          </div>

          {/* Nickname Input */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-zinc-300" htmlFor="lobby-nickname">
              {t.home.nicknameLabel}
            </label>
            <input
              id="lobby-nickname"
              type="text"
              value={nickname}
              maxLength={24}
              placeholder={t.home.nicknamePlaceholder}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-black/90 border border-zinc-700/80 px-3 py-1.5 rounded text-emerald-300 focus:outline-none focus:border-emerald-500 font-bold text-xs"
            />
          </div>

          {/* Character Selector (Compact 4-grid) */}
          <div className="space-y-1">
            <CharacterSelector
              compact
              selectedId={selectedCharacterId}
              onSelect={handleSelectCharacter}
            />
          </div>

          {/* Dual Action CTAs: Create / Join */}
          <div className="lobby-cta space-y-2 pt-1 border-t border-zinc-800/80">
            <div className="grid grid-cols-2 gap-2">
              <HudButton
                type="button"
                variant="primary"
                size="md"
                onClick={handleCreateRoom}
                disabled={isInviteJoining}
                className="flex items-center justify-center gap-1.5 text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t.home.createCta}</span>
              </HudButton>

              <HudButton
                type="button"
                variant={isJoinOpen ? 'ghost' : 'primary'}
                size="md"
                onClick={() => setIsJoinOpen((prev) => !prev)}
                className="flex items-center justify-center gap-1.5 text-xs"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>{t.home.joinCta}</span>
              </HudButton>
            </div>

            {isInviteJoining && (
              <p role="status" className="text-[11px] font-bold text-cyan-300 animate-pulse">
                {t.home.inviteJoining(inviteJoin.roomCode)}
              </p>
            )}

            {/* Expandable Join Code Row */}
            {isJoinOpen && (
              <form
                className="pt-2 flex items-center gap-2"
                onSubmit={handleJoinSubmit}
              >
                <input
                  type="text"
                  value={targetCode}
                  onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                  placeholder={t.lobby.roomCodePlaceholder}
                  aria-label={t.lobby.roomCode}
                  className="flex-1 min-w-0 bg-black/90 border border-zinc-700/90 px-3 py-1.5 rounded text-cyan-300 uppercase focus:outline-none focus:border-cyan-500 font-mono text-xs font-bold"
                />
                <HudButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!targetCode.trim() || isInviteJoining}
                  className="shrink-0 text-xs"
                >
                  {t.home.joinCta}
                </HudButton>
              </form>
            )}
          </div>
        </HudPanel>
      </div>

      {inviteJoin?.status === 'needsNickname' && (
        <InviteNicknameModal
          roomCode={inviteJoin.roomCode}
          onSubmit={(chosenNickname) => {
            void handleInviteNickname(inviteJoin.roomCode, chosenNickname);
          }}
          onCancel={() => setInviteJoin(null)}
        />
      )}
    </div>
  );
};
