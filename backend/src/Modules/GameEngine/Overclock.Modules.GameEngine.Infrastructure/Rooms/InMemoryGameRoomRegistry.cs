using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

public sealed class InMemoryGameRoomRegistry : IGameRoomRegistry, IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, GameRoomSession> _rooms =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ITurnTimerEngine _turnTimer;
    private readonly IRoomMetadataStore? _metadataStore;

    public InMemoryGameRoomRegistry(ITurnTimerEngine turnTimer, IRoomMetadataStore? metadataStore = null)
    {
        _turnTimer = turnTimer;
        _metadataStore = metadataStore;
    }

    public Result<GameRoomSession> CreateRoom(
        RoomId id,
        PlayerId hostId,
        string hostNickname,
        string connectionId,
        Guid sessionToken,
        string? preferredCharacterId = null)
    {
        if (_rooms.ContainsKey(id.Value))
        {
            return Result<GameRoomSession>.Conflict("Room.AlreadyExists", $"Room with code '{id.Value}' already exists.");
        }

        var roomResult = GameRoom.Create(id, hostId, hostNickname, connectionId, sessionToken, preferredCharacterId);
        if (!roomResult.IsSuccess)
        {
            return Result<GameRoomSession>.Invalid(roomResult.ValidationErrors);
        }

        var session = new GameRoomSession(
            roomResult.Value,
            new RoomActor(roomResult.Value));
        if (!_rooms.TryAdd(id.Value, session))
        {
            return Result<GameRoomSession>.Conflict("Room.AlreadyExists", $"Room with code '{id.Value}' already exists.");
        }

        RefreshMetadata(roomResult.Value);

        return Result<GameRoomSession>.Success(session);
    }

    public void RefreshMetadata(GameRoom room)
    {
        _ = _metadataStore?.UpsertAsync(new RoomMetadata(
            room.Id.Value,
            room.HostId.Value,
            room.State.ToString(),
            room.Seats.Count(s => !s.HasLeft),
            DateTimeOffset.UtcNow));
    }

    public bool TryGet(string roomCode, [NotNullWhen(true)] out GameRoomSession? session)
    {
        return _rooms.TryGetValue(roomCode, out session);
    }

    public IReadOnlyList<string> ListRoomCodes() => [.. _rooms.Keys];

    public bool Remove(string roomCode)
    {
        if (_rooms.TryRemove(roomCode, out var session))
        {
            _turnTimer.Cancel(roomCode);
            _ = _metadataStore?.RemoveAsync(roomCode);
            _ = session.DisposeAsync();
            return true;
        }

        return false;
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var session in _rooms.Values)
        {
            await session.DisposeAsync();
        }

        _rooms.Clear();
    }
}
