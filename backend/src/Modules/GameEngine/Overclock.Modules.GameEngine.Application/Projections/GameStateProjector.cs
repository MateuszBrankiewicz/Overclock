using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Projections;

public sealed class GameStateProjector : IGameStateProjector
{
    PlayerGameStateDto IGameStateProjector.Project(GameRoom room, PlayerId recipientId) => Project(room, recipientId);

    public static PlayerGameStateDto Project(GameRoom room, PlayerId recipientId)
    {
        ArgumentNullException.ThrowIfNull(room);

        var recipientSeat = room.Seats.FirstOrDefault(s => s.Id == recipientId);
        var myHand = recipientSeat?.Hand
            .Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString()))
            .ToList() ?? [];

        var seats = room.Seats
            .Select(s => new PlayerSeatDto(
                s.Id.Value,
                s.Nickname,
                s.Status.ToString(),
                s.IsReady,
                s.Hand.Count))
            .ToList();

        TraceResolutionDto? traceResolutionDto = null;
        if (room.LastTraceResolution is not null)
        {
            var res = room.LastTraceResolution;
            traceResolutionDto = new TraceResolutionDto(
                res.AccuserPlayerId.Value,
                res.AccusedPlayerId.Value,
                res.LoserPlayerId.Value,
                res.RevealedCards.Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString())).ToList(),
                res.DeclaredProtocol.ToString(),
                res.BluffDetected);
        }

        return new PlayerGameStateDto(
            room.Id.Value,
            room.State.ToString(),
            room.HostId.Value,
            recipientId.Value,
            myHand,
            seats,
            room.TablePile.Count,
            room.CurrentTargetProtocol?.ToString(),
            room.CurrentTurnPlayerId?.Value,
            room.RoundNumber,
            traceResolutionDto,
            room.WinnerId?.Value);
    }
}
