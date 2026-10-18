using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record SetReadyCommand(string RoomCode, Guid PlayerId, bool IsReady)
    : IRequest<Result>;

internal sealed class SetReadyCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IGameStateProjector projector)
    : IRequestHandler<SetReadyCommand, Result>
{
    public async ValueTask<Result> Handle(SetReadyCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(room =>
        {
            var result = room.SetReady(new PlayerId(request.PlayerId), request.IsReady);
            if (!result.IsSuccess)
            {
                return result.ToResult<IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)>>();
            }

            var snapshots = projector.ProjectForActiveConnections(room);
            return Result<IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)>>.Success(snapshots);
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        await notifier.BroadcastSnapshotsAsync(
            request.RoomCode,
            outcome.Value,
            CancellationToken.None);

        return Result.Success();
    }
}
