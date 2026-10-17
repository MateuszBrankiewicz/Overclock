using System.Collections.Concurrent;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

public sealed class RoomManager : IRoomRegistry, IAsyncDisposable
{
    private readonly ConcurrentDictionary<RoomId, Lazy<RoomActor>> _rooms = new();

    public IRoomActor GetOrCreate(RoomId roomId, Func<GameRoom> roomFactory)
    {
        ArgumentNullException.ThrowIfNull(roomFactory);
        var lazyActor = _rooms.GetOrAdd(
            roomId,
            _ => new Lazy<RoomActor>(
                () => new RoomActor(roomFactory()),
                LazyThreadSafetyMode.ExecutionAndPublication));

        return lazyActor.Value;
    }

    public bool TryGet(RoomId roomId, out IRoomActor? room)
    {
        if (_rooms.TryGetValue(roomId, out var lazyActor))
        {
            room = lazyActor.Value;
            return true;
        }

        room = null;
        return false;
    }

    public async ValueTask<bool> RemoveAsync(RoomId roomId)
    {
        if (!_rooms.TryRemove(roomId, out var lazyActor))
        {
            return false;
        }

        if (lazyActor.IsValueCreated)
        {
            await lazyActor.Value.DisposeAsync().ConfigureAwait(false);
        }

        return true;
    }

    public async ValueTask DisposeAsync()
    {
        var actors = _rooms.Values
            .Where(lazyActor => lazyActor.IsValueCreated)
            .Select(lazyActor => lazyActor.Value)
            .ToArray();
        _rooms.Clear();

        foreach (var actor in actors)
        {
            await actor.DisposeAsync().ConfigureAwait(false);
        }
    }
}