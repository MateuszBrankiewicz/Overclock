using Ardalis.Result;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public interface IRoomActor
{
    Task<Result> EnqueueAsync(
        GameAction action,
        CancellationToken cancellationToken = default);

    Task<Result<TResult>> EnqueueAsync<TResult>(
        GameAction<TResult> action,
        CancellationToken cancellationToken = default);
}

public interface IRoomRegistry
{
    IRoomActor GetOrCreate(
        Domain.Rooms.RoomId roomId,
        Func<Domain.Rooms.GameRoom> roomFactory);

    bool TryGet(Domain.Rooms.RoomId roomId, out IRoomActor? room);

    ValueTask<bool> RemoveAsync(Domain.Rooms.RoomId roomId);
}