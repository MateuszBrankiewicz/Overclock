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
    bool BluffDetected,
    long SequenceNumber = 1);

public sealed record CapacitorDischargedEvent(
    string Type,
    string RoomCode,
    Guid PlayerId,
    int Roll,
    int RiskLevel,
    int ResultingRiskLevel,
    bool Overloaded,
    long SequenceNumber = 1);

public sealed record PlayerEliminatedEvent(
    string Type,
    string RoomCode,
    Guid PlayerId,
    int Placement,
    long SequenceNumber = 1);

public sealed record ExploitTriggeredEvent(
    string Type,
    string RoomCode,
    Guid PlayerId,
    string Exploit,
    string? NewTargetProtocol = null,
    int? NewRiskLevel = null,
    DateTime? TurnDeadlineUtc = null,
    long SequenceNumber = 1);

public sealed record PacketSniffedEvent(
    string Type,
    string RoomCode,
    Guid PlayerId,
    PlayerCardDto Card,
    long SequenceNumber = 1);

public sealed record VoltageTestStartedEvent(
    string Type,
    string RoomCode,
    Guid PendingPlayerId,
    DateTime? DecisionDeadlineUtc = null,
    long SequenceNumber = 1);
