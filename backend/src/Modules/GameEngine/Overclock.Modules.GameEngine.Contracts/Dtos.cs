namespace Overclock.Modules.GameEngine.Contracts;

public sealed record PlayerCardDto(Guid Id, string Protocol);

public sealed record PlayerSeatDto(
    Guid PlayerId,
    string Nickname,
    string Status,
    bool IsReady,
    int HandCount);

public sealed record TraceResolutionDto(
    Guid AccuserPlayerId,
    Guid AccusedPlayerId,
    Guid LoserPlayerId,
    IReadOnlyList<PlayerCardDto> RevealedCards,
    string DeclaredProtocol,
    bool BluffDetected);

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
    Guid? WinnerId);

public sealed record RoomJoinResultDto(
    string RoomCode,
    Guid PlayerId,
    Guid SessionToken,
    PlayerGameStateDto GameState);

public sealed record CardsPlayedDto(
    Guid PlayerId,
    int CardCount,
    string DeclaredProtocol);

public sealed record PlayerStatusChangedDto(
    Guid PlayerId,
    string Status);

public sealed record RoundStartedDto(
    string RoomCode,
    int RoundNumber,
    string LeadProtocol,
    Guid ActivePlayerId);
