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
                return result.ToResult<StartRoundOutcome>();
            }

            turnTimer.Start(session, room.CurrentTurnPlayerId!.Value, room.TurnSequenceId);
            var snapshots = projector.ProjectForActiveConnections(room);
            var roundStartedDto = new RoundStartedDto(
                room.Id.Value,
                room.RoundNumber,
                room.CurrentTargetProtocol?.ToString() ?? "Alpha",
                room.CurrentTurnPlayerId!.Value.Value);

            return Result<StartRoundOutcome>.Success(new StartRoundOutcome(snapshots, roundStartedDto));
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        await notifier.NotifyRoundStartedAsync(
            request.RoomCode,
            outcome.Value.RoundStarted,
            CancellationToken.None);

        await notifier.BroadcastSnapshotsAsync(
            outcome.Value.Snapshots,
            CancellationToken.None);

        return Result.Success();
    }

    private sealed record StartRoundOutcome(
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots,
        RoundStartedDto RoundStarted);
}
