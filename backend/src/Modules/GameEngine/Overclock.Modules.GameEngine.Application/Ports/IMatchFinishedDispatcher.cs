using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Ports;

public interface IMatchFinishedDispatcher
{
    void Dispatch(MatchFinishedEvent notification);
}

public static class MatchFinishedEventFactory
{
    public static MatchFinishedEvent FromRoom(GameRoom room)
    {
        var now = DateTimeOffset.UtcNow;
        var winner = room.WinnerId is { } winnerId
            ? room.Seats.FirstOrDefault(s => s.Id == winnerId)
            : null;
        var burntCount = room.Seats.Count(s => s.Status == PlayerStatus.Eliminated);
        var durationSeconds = room.MatchStartedAtUtc is { } started
            ? Math.Max(0, (int)(now - started).TotalSeconds)
            : 0;

        return new MatchFinishedEvent(
            room.Id.Value,
            room.WinnerId?.Value,
            winner?.Nickname,
            room.MatchRoundCount,
            burntCount,
            durationSeconds,
            now);
    }
}
