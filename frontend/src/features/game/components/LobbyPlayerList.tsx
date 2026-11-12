import clsx from 'clsx';
import { CheckCircle2, Copy, Shield, Users, XCircle } from 'lucide-react';
import React, { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { PlayerSeat } from '../schemas/gameEvents';
import type { CharacterId } from '../utils/characterCatalog';
import { resolveSeatCharacter } from '../utils/characterCatalog';
import { CharacterSelector } from './CharacterSelector';

export interface LobbyPlayerListProps {
  players: PlayerSeat[];
  myPlayerId: string | null;
  hostId: string | null;
  roomCode: string;
  isHost: boolean;
  selectedCharacterId?: CharacterId;
  characterByPlayerId?: Record<string, CharacterId>;
  onSelectCharacter?: (id: CharacterId) => void;
  onSetReady: (ready: boolean) => void;
  onStartRound: () => void;
}

export const LobbyPlayerList: React.FC<LobbyPlayerListProps> = ({
  players,
  myPlayerId,
  hostId,
  roomCode,
  isHost,
  selectedCharacterId = 'ghost',
  characterByPlayerId,
  onSelectCharacter,
  onSetReady,
  onStartRound,
}) => {
  const { t, language } = useI18n();
  const [copied, setCopied] = useState(false);

  const me = players.find((p) => p.playerId === myPlayerId);
  const isMeReady = Boolean(me?.isReady);
  const allReady = players.length > 0 && players.every((p) => p.isReady);

  const copyRoomCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(roomCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className="w-full bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 font-mono select-none shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-sm text-zinc-200">
            {t.lobby.playersInLobby} ({players.length})
          </h3>
        </div>

        {/* Room invitation banner */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg">
          <span className="text-xs text-zinc-400">{t.lobby.invitePrompt}</span>
          <span className="select-text font-black text-emerald-300 text-sm tracking-wider">
            {roomCode}
          </span>
          <button
            type="button"
            onClick={() => {
              void copyRoomCode();
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-bold rounded cursor-pointer transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>{copied ? t.common.copied : t.common.copyCode}</span>
          </button>
        </div>
      </div>

      {/* Character Switcher inside Lobby */}
      {onSelectCharacter && (
        <div className="pt-1 pb-2 border-b border-zinc-800/80">
          <CharacterSelector
            selectedId={selectedCharacterId}
            onSelect={onSelectCharacter}
            compact
          />
        </div>
      )}

      {/* Players list grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {players.map((p, idx) => {
          const isThisPlayerHost = p.playerId === hostId;
          const isThisMe = p.playerId === myPlayerId;
          const isReady = p.isReady;
          const character = resolveSeatCharacter(
            p.playerId,
            myPlayerId,
            selectedCharacterId,
            idx,
            characterByPlayerId
          );

          return (
            <div
              key={p.playerId}
              className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${
                isThisMe
                  ? 'border-emerald-500/70 bg-emerald-950/20'
                  : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-1.5 truncate">
                  {isThisPlayerHost && (
                    <span title="Host">
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </span>
                  )}
                  <span className="font-bold text-zinc-200 text-xs truncate">
                    {p.nickname} {isThisMe && <span className="text-emerald-400">{t.lobby.youTag}</span>}
                  </span>
                </div>
                {isThisPlayerHost && (
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                    HOST
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 text-[10px]">
                <span
                  className={clsx(
                    'font-black px-1.5 py-0.5 rounded border',
                    character.accentBadgeClass
                  )}
                >
                  [{character.codename}]
                </span>
                <span className="text-zinc-400 truncate ml-2">
                  {language === 'pl' ? character.rolePl : character.roleEn}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/50">
                <span className="text-[10px] text-zinc-500">{t.common.status}:</span>
                <span
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                    isReady
                      ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/40'
                      : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                  }`}
                >
                  {isReady ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{t.lobby.ready}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 text-amber-400" />
                      <span>{t.lobby.notReady}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ready and Start Action controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => onSetReady(!isMeReady)}
          className={`px-5 py-2.5 rounded font-extrabold text-xs transition-all cursor-pointer shadow-md ${
            isMeReady
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30'
          }`}
        >
          {isMeReady ? `[${t.lobby.ready}: ${t.lobby.readyYes}]` : `[${t.lobby.markReady}]`}
        </button>

        {isHost ? (
          <div className="flex items-center gap-3">
            {!allReady && (
              <span className="text-[11px] text-amber-400/90 hidden sm:inline">
                {t.lobby.needReadyPlayers}
              </span>
            )}
            <button
              type="button"
              disabled={!allReady}
              onClick={onStartRound}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-black font-extrabold rounded text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/30"
            >
              [{t.lobby.startMatch}]
            </button>
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">
            {t.lobby.waitingForPlayers}
          </span>
        )}
      </div>
    </div>
  );
};
