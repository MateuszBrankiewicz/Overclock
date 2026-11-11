using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Projections;

public sealed class GameStateProjector : IGameStateProjector
{
    PlayerGameStateDto IGameStateProjector.Project(GameRoom room, PlayerId recipientId) => Project(room, recipientId);

    IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> IGameStateProjector.ProjectForActiveConnections(GameRoom room) =>
        ProjectForActiveConnections(room);

    public static IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> ProjectForActiveConnections(GameRoom room)
    {
        ArgumentNullException.ThrowIfNull(room);

        var list = new List<(string ConnectionId, PlayerGameStateDto Snapshot)>();
        foreach (var seat in room.Seats)
        {
            if (seat.ConnectionId is not null && seat.Status != PlayerStatus.Disconnected)
            {
                list.Add((seat.ConnectionId, Project(room, seat.Id)));
            }
        }

        return list;
    }

    public static PlayerGameStateDto Project(GameRoom room, PlayerId recipientId)
    {
        ArgumentNullException.ThrowIfNull(room);

        var recipientSeat = room.Seats.FirstOrDefault(s => s.Id == recipientId);
        var myHand = recipientSeat?.Hand
            .Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString(), VisualSeedGenerator.FromCardId(c.Id.Value)))
            .ToList() ?? [];

        var seats = room.Seats
            .Select(s => new PlayerSeatDto(
                s.Id.Value,
                s.Nickname,
                s.Status.ToString(),
                s.IsReady,
                s.Hand.Count,
                s.Risk.Level,
                s.Exploit is not null ? new ExploitDto(s.Exploit.Type.ToString(), s.Exploit.IsBurned) : null))
            .ToList();

        TraceResolutionDto? traceResolutionDto = null;
        if (room.LastTraceResolution is not null)
        {
            var res = room.LastTraceResolution;
            traceResolutionDto = new TraceResolutionDto(
                res.AccuserPlayerId.Value,
                res.AccusedPlayerId.Value,
                res.LoserPlayerId.Value,
                res.RevealedCards.Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString(), VisualSeedGenerator.FromCardId(c.Id.Value))).ToList(),
                res.DeclaredProtocol.ToString(),
                res.BluffDetected,
                room.EventSequenceNumber);
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
            room.WinnerId?.Value,
            room.PendingDischargePlayerId?.Value,
            DischargeDeadlineUtc: null,
            CanActivateExploit: room.CanActivateExploit(recipientId),
            SequenceNumber: room.EventSequenceNumber);
    }
}
