using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record ReconnectCommand(string RoomCode, Guid SessionToken, string NewConnectionId)
    : IRequest<Result<PlayerGameStateDto>>;

internal sealed class ReconnectCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IDisconnectGraceManager graceManager,
    IGameStateProjector projector)
    : IRequestHandler<ReconnectCommand, Result<PlayerGameStateDto>>
{
    public async ValueTask<Result<PlayerGameStateDto>> Handle(ReconnectCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result<PlayerGameStateDto>.NotFound("Room.NotFound");
        }

        // Cancel pending 30s elimination grace period if active
        graceManager.CancelGracePeriod(request.SessionToken);

        var outcome = await session.EnqueueAsync(room =>
        {
            var reconnectResult = room.HandleReconnect(request.SessionToken, request.NewConnectionId);
            if (!reconnectResult.IsSuccess)
            {
                return reconnectResult.ToResult<ReconnectOutcome>();
            }

            var seat = reconnectResult.Value;
            var sequenceNumber = room.NextEventSequence();
            var snapshot = projector.Project(room, seat.Id);
            return Result<ReconnectOutcome>.Success(new ReconnectOutcome(seat.Id.Value, snapshot, sequenceNumber));
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult<PlayerGameStateDto>();
        }

        // Notify opponents that player is active again
        await notifier.NotifyPlayerStatusChangedAsync(
            request.RoomCode,
            outcome.Value.PlayerId,
            PlayerStatus.Active,
            outcome.Value.SequenceNumber,
            CancellationToken.None);

        await notifier.SendPlayerSnapshotAsync(
            request.NewConnectionId,
            outcome.Value.Snapshot,
            CancellationToken.None);

        return Result<PlayerGameStateDto>.Success(outcome.Value.Snapshot);
    }

    private sealed record ReconnectOutcome(Guid PlayerId, PlayerGameStateDto Snapshot, long SequenceNumber);
}
