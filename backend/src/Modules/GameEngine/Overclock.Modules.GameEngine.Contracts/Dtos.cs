namespace Overclock.Modules.GameEngine.Contracts;

public enum ExploitType
{
    PacketSniffer,
    GroundWire,
    OverclockInjector,
    EmpFlare
}

public sealed record ExploitDto(string Type, bool IsBurned);

public sealed record PlayerCardDto(Guid Id, string Protocol, int VisualSeed = 0);

public sealed record PlayerSeatDto(
    Guid PlayerId,
    string Nickname,
    string Status,
    bool IsReady,
    int HandCount,
    string CharacterId = "ghost",
    int RiskLevel = 1,
    ExploitDto? Exploit = null);

public sealed record TraceResolutionDto(
    Guid AccuserPlayerId,
    Guid AccusedPlayerId,
    Guid LoserPlayerId,
    IReadOnlyList<PlayerCardDto> RevealedCards,
    string DeclaredProtocol,
    bool BluffDetected,
    long SequenceNumber = 1);

public sealed record PlayerGameStateDto(
    string RoomCode,
    string State,
    Guid HostId,
    Guid MyPlayerId,
    IReadOnlyList<PlayerCardDto> MyHand,
    IReadOnlyList<PlayerSeatDto> Seats,
    int TablePileCount,
    string? CurrentTargetProtocol,
    Guid? CurrentTurnPlayerId,
    int RoundNumber,
    TraceResolutionDto? LastTraceResolution,
    Guid? WinnerId,
    Guid? PendingDischargePlayerId = null,
    DateTime? DischargeDeadlineUtc = null,
    DateTime? TurnDeadlineUtc = null,
    DateTime? IntermissionDeadlineUtc = null,
    bool CanActivateExploit = false,
    long SequenceNumber = 1);

public sealed record RoomJoinResultDto(
    string RoomCode,
    Guid PlayerId,
    Guid SessionToken,
    PlayerGameStateDto GameState);

public sealed record CardsPlayedDto(
    Guid PlayerId,
    int CardCount,
    string DeclaredProtocol,
    long SequenceNumber = 1);

public sealed record PlayerStatusChangedDto(
    Guid PlayerId,
    string Status,
    long SequenceNumber = 1);

public sealed record RoundStartedDto(
    string RoomCode,
    int RoundNumber,
    string LeadProtocol,
    Guid ActivePlayerId,
    long SequenceNumber = 1);

public sealed record GameStateSnapshotDto(
    string RoomCode,
    string State,
    Guid HostId,
    Guid MyPlayerId,
    IReadOnlyList<PlayerCardDto> MyHand,
    IReadOnlyList<PlayerSeatDto> Seats,
    int TablePileCount,
    string? CurrentTargetProtocol,
    Guid? CurrentTurnPlayerId,
    int RoundNumber,
    TraceResolutionDto? LastTraceResolution,
    Guid? WinnerId,
    Guid? PendingDischargePlayerId = null,
    DateTime? DischargeDeadlineUtc = null,
    DateTime? TurnDeadlineUtc = null,
    DateTime? IntermissionDeadlineUtc = null,
    bool CanActivateExploit = false,
    long SequenceNumber = 1);

public sealed record PlayCardsContractDto(
    string RoomCode,
    Guid PlayerId,
    IReadOnlyList<Guid> CardIds,
    string DeclaredProtocol);

public sealed record CallTraceContractDto(
    string RoomCode,
    Guid AccuserPlayerId);

public sealed record ReconnectContractDto(
    string RoomCode,
    Guid SessionToken,
    string NewConnectionId);

public sealed record ActivateExploitContractDto(
    string RoomCode,
    Guid PlayerId,
    string Exploit,
    string? NewTargetProtocol = null);

public sealed record TriggerDischargeContractDto(
    string RoomCode,
    Guid PlayerId);

public sealed record LeaveRoomContractDto(
    string RoomCode,
    Guid PlayerId);

public sealed record SelectCharacterContractDto(
    string RoomCode,
    Guid PlayerId,
    string CharacterId);

