namespace Overclock.Modules.GameEngine.Domain.Rooms;

public readonly record struct TurnExpired(
    PlayerId PlayerId,
    long TurnSequenceId,
    PlayerId? NextPlayerId);