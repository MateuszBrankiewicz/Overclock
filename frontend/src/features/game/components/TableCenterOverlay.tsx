import React from 'react';

import type { PlayerSeat } from '../schemas/gameEvents';
import { useGameSession } from '../session/useGameSession';
import { useGameStore } from '../stores/useGameStore';
import type { CenterOverlayKind } from '../utils/centerOverlay';
import { LobbyPlayerList } from './LobbyPlayerList';
import { MatchSummary } from './MatchSummary';
import { RoundIntermissionBanner } from './RoundIntermissionBanner';

export interface TableCenterOverlayProps {
  overlay: CenterOverlayKind;
  roomCode: string;
  players: PlayerSeat[];
  isHost: boolean;
}

export const TableCenterOverlay: React.FC<TableCenterOverlayProps> = ({
  overlay,
  roomCode,
  players,
  isHost,
}) => {
  const session = useGameSession();
  const playerId = useGameStore((s) => s.playerId);
  const hostId = useGameStore((s) => s.hostId);
  const winnerId = useGameStore((s) => s.winnerId);
  const placementByPlayerId = useGameStore((s) => s.placementByPlayerId);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const lastDischargeOutcome = useGameStore((s) => s.lastDischargeOutcome);
  const intermissionDeadlineUtc = useGameStore((s) => s.intermissionDeadlineUtc);
  const selectedCharacterId = useGameStore((s) => s.selectedCharacterId);

  if (overlay === 'lobby') {
    return (
      <LobbyPlayerList
        players={players}
        myPlayerId={playerId}
        hostId={hostId}
        roomCode={roomCode}
        isHost={isHost}
        selectedCharacterId={selectedCharacterId}
        onSelectCharacter={(id) => void session.selectCharacter(id)}
        onSetReady={(ready) => void session.setReady(ready)}
        onStartRound={() => void session.startRound()}
      />
    );
  }
  if (overlay === 'summary') {
    return (
      <MatchSummary
        players={players}
        placementByPlayerId={placementByPlayerId}
        winnerId={winnerId}
        myPlayerId={playerId}
        roundNumber={roundNumber}
        isHost={isHost}
        onPlayAgain={() => void session.startRound()}
        onLeave={() => void session.leaveRoom()}
      />
    );
  }
  if (overlay === 'intermission') {
    return (
      <RoundIntermissionBanner
        key={roundNumber}
        roundNumber={roundNumber}
        players={players}
        lastDischargeOutcome={lastDischargeOutcome}
        isHost={isHost}
        hostId={hostId}
        myPlayerId={playerId}
        onLeave={() => void session.leaveRoom()}
        isDischargeCinematicActive={false}
        onStartNextRound={() => void session.startRound()}
        intermissionDeadlineUtc={intermissionDeadlineUtc}
      />
    );
  }
  return null;
};
