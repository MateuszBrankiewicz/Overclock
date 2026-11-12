using System.Diagnostics.CodeAnalysis;
using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public interface IGameRoomRegistry
{
    Result<GameRoomSession> CreateRoom(RoomId id, PlayerId hostId, string hostNickname, string connectionId, Guid sessionToken, string? preferredCharacterId = null);

    bool TryGet(string roomCode, [NotNullWhen(true)] out GameRoomSession? session);

    bool Remove(string roomCode);
}
