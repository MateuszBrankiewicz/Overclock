using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record LeaveRoomCommand(string RoomCode, Guid PlayerId) : IRequest<Result>;

internal sealed class LeaveRoomCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IDisconnectGraceManager graceManager,
    ITurnTimerEngine turnTimer,
    IGameStateProjector projector,
    IMatchFinishedDispatcher? matchFinishedDispatcher = null,
    TimeProvider? timeProvider = null)
    : IRequestHandler<LeaveRoomCommand, Result>
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public async ValueTask<Result> Handle(LeaveRoomCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.Success();
        }

        var outcome = await session.EnqueueAsync(room =>
        {
            var seat = room.Seats.FirstOrDefault(s => s.Id.Value == request.PlayerId);
            if (seat is null || seat.HasLeft)
            {
                return Result<LeaveRoomOutcome>.Success(
                    new LeaveRoomOutcome(room.IsEmpty, null, false, Guid.Empty, []));
            }

            var sessionToken = seat.SessionToken;
            var wasCurrentTurnPlayer = room.CurrentTurnPlayerId?.Value == request.PlayerId;
            var wasRoundOver = room.State == RoomState.RoundOver;
            var wasGameOver = room.State == RoomState.GameOver;

            var leaveResult = room.Leave(new PlayerId(request.PlayerId));
            if (!leaveResult.IsSuccess)
            {
                return leaveResult.ToResult<LeaveRoomOutcome>();
            }

            var leaveOutcome = leaveResult.Value;

            if (room.State == RoomState.GameOver)
            {
                turnTimer.Cancel(room.Id.Value);
                if (!wasGameOver)
                {
                    matchFinishedDispatcher?.Dispatch(MatchFinishedEventFactory.FromRoom(room));
                }
            }
            else if (!wasRoundOver && room.State == RoomState.RoundOver)
            {
                turnTimer.Cancel(room.Id.Value);
                var deadlineUtc = _timeProvider.GetUtcNow().UtcDateTime.Add(turnTimer.IntermissionDuration);
                room.MarkIntermissionDeadline(deadlineUtc);
                turnTimer.StartIntermission(session, room.RoundNumber, turnTimer.IntermissionDuration);
            }
            else if (wasCurrentTurnPlayer && room.State == RoomState.TurnActive && room.CurrentTurnPlayerId is { } nextPlayerId)
            {
                var deadlineUtc = _timeProvider.GetUtcNow().UtcDateTime.Add(TurnTimerEngine.DefaultTurnDuration);
                room.MarkTurnDeadline(deadlineUtc);
                turnTimer.Start(session, nextPlayerId, room.TurnSequenceId);
            }

            var snapshots = projector.ProjectForActiveConnections(room);
            var sequenceNumber = room.NextEventSequence();
            if (!room.IsEmpty)
            {
                registry.RefreshMetadata(room);
            }

            return Result<LeaveRoomOutcome>.Success(
                new LeaveRoomOutcome(
                    leaveOutcome.RoomEmpty,
                    leaveOutcome.HostChangedTo,
                    leaveOutcome.WasEliminated,
                    sessionToken,
                    snapshots,
                    sequenceNumber));
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        var data = outcome.Value;

        if (data.SessionToken != Guid.Empty)
        {
            graceManager.CancelGracePeriod(data.SessionToken);
        }

        if (data.RoomEmpty)
        {
            turnTimer.Cancel(request.RoomCode);
            registry.Remove(request.RoomCode);
        }
        else
        {
            if (data.WasEliminated)
            {
                await notifier.NotifyPlayerStatusChangedAsync(
                    request.RoomCode,
                    request.PlayerId,
                    PlayerStatus.Eliminated,
                    data.SequenceNumber,
                    CancellationToken.None);
            }

            if (data.Snapshots.Count > 0)
            {
                await notifier.BroadcastSnapshotsAsync(
                    data.Snapshots,
                    CancellationToken.None);
            }
        }

        return Result.Success();
    }

    private sealed record LeaveRoomOutcome(
        bool RoomEmpty,
        PlayerId? HostChangedTo,
        bool WasEliminated,
        Guid SessionToken,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots,
        long SequenceNumber = 1);
}
