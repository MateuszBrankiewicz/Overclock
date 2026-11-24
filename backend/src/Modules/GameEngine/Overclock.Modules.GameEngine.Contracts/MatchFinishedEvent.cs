using Mediator;

namespace Overclock.Modules.GameEngine.Contracts;

public sealed record MatchFinishedEvent(
    string RoomCode,
    Guid? WinnerId,
    string? WinnerNickname,
    int RoundCount,
    int BurntModulesCount,
    int DurationSeconds,
    DateTimeOffset FinishedAtUtc) : INotification;
