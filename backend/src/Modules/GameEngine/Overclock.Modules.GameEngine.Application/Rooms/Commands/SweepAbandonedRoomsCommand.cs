using Ardalis.Result;
using Mediator;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

/// <summary>
/// Evicts rooms in which no player has held a live connection for at least <see cref="IdleFor"/>.
/// Returns the number of evicted rooms. Prevents abandoned rooms (e.g. finished matches whose players
/// all dropped) from accumulating in memory.
/// </summary>
public sealed record SweepAbandonedRoomsCommand(TimeSpan IdleFor) : IRequest<Result<int>>;

internal sealed class SweepAbandonedRoomsCommandHandler(
    IGameRoomRegistry registry,
    TimeProvider? timeProvider = null)
    : IRequestHandler<SweepAbandonedRoomsCommand, Result<int>>
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public async ValueTask<Result<int>> Handle(SweepAbandonedRoomsCommand request, CancellationToken ct)
    {
        var evicted = 0;

        foreach (var roomCode in registry.ListRoomCodes())
        {
            ct.ThrowIfCancellationRequested();

            if (!registry.TryGet(roomCode, out var session))
            {
                continue;
            }

            var nowUtc = _timeProvider.GetUtcNow();
            var abandoned = await session.EnqueueAsync(
                room => Result<bool>.Success(room.IsAbandoned(nowUtc, request.IdleFor)),
                ct);

            if (abandoned.IsSuccess && abandoned.Value && registry.Remove(roomCode))
            {
                evicted++;
            }
        }

        return Result<int>.Success(evicted);
    }
}
