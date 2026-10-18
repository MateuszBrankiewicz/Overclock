using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record StartRoundCommand(string RoomCode, Guid RequesterId)
    : IRequest<Result>;

internal sealed class StartRoundCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    ITurnTimerEngine turnTimer,
    IGameStateProjector projector,
    IRandomSource? randomSource = null)
    : IRequestHandler<StartRoundCommand, Result>
{
    public async ValueTask<Result> Handle(StartRoundCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(room =>
        {
            var result = room.StartRound(new PlayerId(request.RequesterId), randomSource);
            if (!result.IsSuccess)
            {
                return result.ToResult<IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)>>();
            }

            turnTimer.Start(session, room.CurrentTurnPlayerId!.Value, room.TurnSequenceId);
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
