using Overclock.Modules.GameEngine.Domain.Cards;

namespace Overclock.Host.Hubs;

public sealed record CreateRoomRequest(string HostNickname, string? RoomCode = null);

public sealed record JoinRoomRequest(string RoomCode, string Nickname);

public sealed record SetReadyRequest(string RoomCode, bool IsReady, Guid? PlayerId = null);

public sealed record StartRoundRequest(string RoomCode, Guid? RequesterId = null);

public sealed record PlayCardsRequest(
    string RoomCode,
    IReadOnlyList<Guid> CardIds,
    CardProtocol DeclaredProtocol,
    Guid? PlayerId = null);

public sealed record CallTraceRequest(string RoomCode, Guid? AccuserPlayerId = null);

public sealed record ReconnectRequest(string RoomCode, Guid SessionToken);
