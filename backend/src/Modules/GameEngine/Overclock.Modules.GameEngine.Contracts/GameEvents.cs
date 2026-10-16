namespace Overclock.Modules.GameEngine.Contracts;

public enum CardSuit
{
    Signal,
    Clock,
    Overload,
    Ground
}

public sealed record CardDto(Guid Id, CardSuit Suit, int Value);

public sealed record TraceCalledEvent(
    string Type,
    string RoomCode,
    Guid CallerId,
    Guid AccusedPlayerId,
    IReadOnlyList<CardDto> RevealedCards,
    bool BluffDetected);

public sealed record TurnStartedEvent(
    string Type,
    string RoomCode,
    Guid ActivePlayerId,
    DateTime TurnDeadlineUtc,
    int CurrentVoltage);

public sealed record VoltageOverloadedEvent(
    string Type,
    string RoomCode,
    Guid EliminatedPlayerId,
    int FinalVoltage);
