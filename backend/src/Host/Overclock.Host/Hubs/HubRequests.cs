using Overclock.Modules.GameEngine.Domain.Cards;

namespace Overclock.Host.Hubs;

public sealed record CreateRoomRequest(string HostNickname, string? RoomCode = null, string? PreferredCharacterId = null);

public sealed record JoinRoomRequest(string RoomCode, string Nickname, string? PreferredCharacterId = null);

public sealed record SetReadyRequest(string RoomCode, bool IsReady);

public sealed record SelectCharacterRequest(string RoomCode, string CharacterId);

public sealed record StartRoundRequest(string RoomCode);

public sealed record PlayCardsRequest(
    string RoomCode,
    IReadOnlyList<Guid> CardIds,
    CardProtocol DeclaredProtocol);

public sealed record CallTraceRequest(string RoomCode);

public sealed record ReconnectRequest(string RoomCode, Guid SessionToken);

public sealed record ActivateExploitRequest(
    string RoomCode,
    string Exploit,
    CardProtocol? NewTargetProtocol = null);

public sealed record TriggerDischargeRequest(string RoomCode);

public sealed record LeaveRoomRequest(string RoomCode);

