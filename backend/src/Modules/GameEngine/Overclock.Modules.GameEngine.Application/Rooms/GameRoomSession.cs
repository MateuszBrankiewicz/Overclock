using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public sealed class GameRoomSession : IAsyncDisposable
{
    private readonly IRoomActor _actor;

    public GameRoom Room { get; }
    public string RoomCode => Room.Id.Value;

    public GameRoomSession(GameRoom room, IRoomActor actor)
    {
        Room = room;
        _actor = actor;
    }

    public Task<Result<T>> EnqueueAsync<T>(Func<GameRoom, Result<T>> action, CancellationToken ct = default) =>
        _actor.EnqueueAsync(GameAction<T>.Create(action), ct);

    public Task<Result> EnqueueAsync(Func<GameRoom, Result> action, CancellationToken ct = default) =>
        _actor.EnqueueAsync(GameAction.Create(action), ct);

    public Task<Result<T>> EnqueueAsync<T>(Func<GameRoom, ValueTask<Result<T>>> action, CancellationToken ct = default) =>
        _actor.EnqueueAsync(GameAction<T>.Create(action), ct);

    public Task<Result> EnqueueAsync(Func<GameRoom, ValueTask<Result>> action, CancellationToken ct = default) =>
        _actor.EnqueueAsync(GameAction.Create(action), ct);

    public ValueTask DisposeAsync() => _actor is IAsyncDisposable disposable
        ? disposable.DisposeAsync()
        : ValueTask.CompletedTask;
}
