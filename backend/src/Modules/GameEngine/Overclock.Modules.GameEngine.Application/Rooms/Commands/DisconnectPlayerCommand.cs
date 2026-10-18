using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record DisconnectPlayerCommand(string RoomCode, string ConnectionId)
    : IRequest<Result>;

internal sealed class DisconnectPlayerCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IDisconnectGraceManager graceManager,
    ITurnTimerEngine turnTimer,
    IGameStateProjector projector)
    : IRequestHandler<DisconnectPlayerCommand, Result>
{
    private static readonly TimeSpan DefaultGracePeriod = TimeSpan.FromSeconds(30);

    public async ValueTask<Result> Handle(DisconnectPlayerCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(room =>
        {
            var seat = room.Seats.FirstOrDefault(s => s.ConnectionId == request.ConnectionId);
            if (seat is null)
            {
                return Result<DisconnectInfo>.NotFound("Room.ConnectionNotFound");
            }

            var playerId = seat.Id;
            var sessionToken = seat.SessionToken;
            var roomCode = room.Id.Value;

            var result = room.HandleDisconnect(request.ConnectionId);
            if (!result.IsSuccess)
            {
                return result.ToResult<DisconnectInfo>();
            }

            return Result<DisconnectInfo>.Success(new DisconnectInfo(playerId, sessionToken, roomCode));
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        var info = outcome.Value;

        await notifier.NotifyPlayerStatusChangedAsync(
            info.RoomCode,
            info.PlayerId.Value,
            PlayerStatus.Disconnected,
            CancellationToken.None);

        // Start 30s grace timer before automatic removal or elimination
        graceManager.StartGracePeriod(
            info.RoomCode,
            info.PlayerId,
            info.SessionToken,
            DefaultGracePeriod,
            async () =>
            {
                if (registry.TryGet(info.RoomCode, out var activeSession))
                {
                    var graceOutcome = await activeSession.EnqueueAsync(activeRoom =>
                    {
                        var targetSeat = activeRoom.Seats.FirstOrDefault(s => s.Id == info.PlayerId);
                        if (targetSeat is null || targetSeat.Status != PlayerStatus.Disconnected)
                        {
                            return Result<GracePeriodOutcome>.Success(
                                new GracePeriodOutcome(GraceAction.None, [], 0));
                        }

                        if (activeRoom.State == RoomState.Lobby)
                        {
                            var removeResult = activeRoom.RemovePlayer(info.PlayerId);
                            if (!removeResult.IsSuccess)
                            {
                                return removeResult.ToResult<GracePeriodOutcome>();
                            }

                            var snapshots = projector.ProjectForActiveConnections(activeRoom);
                            return Result<GracePeriodOutcome>.Success(
                                new GracePeriodOutcome(GraceAction.RemovedFromLobby, snapshots, activeRoom.Seats.Count));
                        }
                        else
                        {
                            var wasCurrentTurnPlayer = activeRoom.CurrentTurnPlayerId == info.PlayerId;
                            var eliminateResult = activeRoom.EliminatePlayer(info.PlayerId);
                            if (!eliminateResult.IsSuccess)
                            {
                                return eliminateResult.ToResult<GracePeriodOutcome>();
                            }

                            if (activeRoom.State == RoomState.GameOver)
                            {
                                turnTimer.Cancel(activeRoom.Id.Value);
                            }
                            else if (wasCurrentTurnPlayer && activeRoom.State == RoomState.TurnActive && activeRoom.CurrentTurnPlayerId is { } nextPlayerId)
                            {
                                turnTimer.Start(activeSession, nextPlayerId, activeRoom.TurnSequenceId);
                            }

                            var snapshots = projector.ProjectForActiveConnections(activeRoom);
                            return Result<GracePeriodOutcome>.Success(
                                new GracePeriodOutcome(GraceAction.Eliminated, snapshots, activeRoom.Seats.Count));
                        }
                    });

                    if (graceOutcome.IsSuccess)
                    {
                        var outcomeData = graceOutcome.Value;
                        if (outcomeData.Action == GraceAction.RemovedFromLobby)
                        {
                            if (outcomeData.RemainingPlayerCount == 0)
                            {
                                turnTimer.Cancel(info.RoomCode);
                                registry.Remove(info.RoomCode);
                            }
                            else
                            {
                                await notifier.BroadcastSnapshotsAsync(
                                    outcomeData.Snapshots,
                                    CancellationToken.None);
                            }
                        }
                        else if (outcomeData.Action == GraceAction.Eliminated)
                        {
                            await notifier.NotifyPlayerStatusChangedAsync(
                                info.RoomCode,
                                info.PlayerId.Value,
                                PlayerStatus.Eliminated,
                                CancellationToken.None);

                            await notifier.BroadcastSnapshotsAsync(
                                outcomeData.Snapshots,
                                CancellationToken.None);
                        }
                    }
                }
            });

        return Result.Success();
    }

    private enum GraceAction
    {
        None,
        RemovedFromLobby,
        Eliminated
    }

    private sealed record DisconnectInfo(PlayerId PlayerId, Guid SessionToken, string RoomCode);

    private sealed record GracePeriodOutcome(
        GraceAction Action,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots,
        int RemainingPlayerCount);
}
