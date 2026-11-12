import clsx from 'clsx';
import { HelpCircle, LogIn, PlusCircle } from 'lucide-react';
import React, { useState } from 'react';

import heroUrl from '../../../assets/hero.png';
import { useI18n } from '../../../shared/i18n';
import { useGameSession } from '../hooks/useDebugTerminal';
import { useGameStore } from '../stores/useGameStore';
import { useRulesModalStore } from '../stores/useRulesModalStore';
import { readRoomParam } from '../utils/invite';
import { loadNickname, saveNickname } from '../utils/nickname';
import { CharacterSelector } from './CharacterSelector';

const ERROR_PATTERN = /error|failed|violation|invalid|rejected/i;

export const LobbyScreen: React.FC = () => {
  const session = useGameSession();
  const { t } = useI18n();
  const openRules = useRulesModalStore((s) => s.open);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);
  const setSelectedCharacter = useGameStore((s) => s.setSelectedCharacter);

  const [nickname, setNickname] = useState(() => loadNickname());
  const [targetCode, setTargetCode] = useState(() =>
    typeof window === 'undefined' ? '' : readRoomParam(window.location.search)
  );

  const persistedNickname = (): string => {
    const finalNick = nickname.trim() || loadNickname();
    saveNickname(finalNick);
    return finalNick;
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-mono text-emerald-400 bg-zinc-950/95 border border-zinc-800 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)]">
      <div
        className="relative px-6 py-10 sm:py-14 text-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-zinc-950/70 to-zinc-950" />
        <div className="relative space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black tracking-[0.25em] text-emerald-300">
            {t.lobby.title}
          </h2>
          <p className="text-sm text-zinc-300">{t.home.heroTagline}</p>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-5 text-xs">
        {session.lastLog && (
          <div
            className={clsx(
              'p-2.5 rounded border',
              ERROR_PATTERN.test(session.lastLog)
                ? 'bg-red-950/60 border-red-800/80 text-red-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
            )}
          >
            {session.lastLog}
          </div>
        )}

        <form
          className="space-y-3 p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/15"
          onSubmit={(e) => {
            e.preventDefault();
            void session.createRoom(persistedNickname());
          }}
        >
          <label className="block text-zinc-300 font-bold" htmlFor="lobby-nickname">
            {t.home.nicknameLabel}
          </label>
          <input
            id="lobby-nickname"
            type="text"
            value={nickname}
            maxLength={24}
            placeholder={t.home.nicknamePlaceholder}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-black border border-zinc-700 px-3.5 py-2 rounded text-emerald-300 focus:outline-none focus:border-emerald-500 font-bold"
          />
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            {t.home.createCta}
          </button>
        </form>

        <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="font-bold text-zinc-300">{t.home.characterHeading}</p>
          <CharacterSelector selectedId={selectedCharacterId} onSelect={setSelectedCharacter} />
        </div>

        <form
          className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/10 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (targetCode) void session.joinRoom(targetCode, persistedNickname());
          }}
        >
          <p className="font-bold text-cyan-300 flex items-center gap-1.5">
            <LogIn className="w-4 h-4" />
            {t.home.joinHeading}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetCode}
              onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
              placeholder={t.lobby.roomCodePlaceholder}
              aria-label={t.lobby.roomCode}
              className="flex-1 min-w-0 bg-black border border-zinc-700 px-3 py-2 rounded text-cyan-300 uppercase focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              type="submit"
              disabled={!targetCode}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:pointer-events-none text-black font-extrabold rounded transition-all cursor-pointer"
            >
              {t.home.joinCta}
            </button>
          </div>
        </form>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={openRules}
            className="flex items-center gap-2 text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.lobby.howToPlayPrompt}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
