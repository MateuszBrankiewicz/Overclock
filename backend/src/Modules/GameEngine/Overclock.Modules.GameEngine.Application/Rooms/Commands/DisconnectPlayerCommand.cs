using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record DisconnectPlayerCommand(string RoomCode, string ConnectionId)
    : IRequest<Result>;

internal sealed class DisconnectPlayerCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IDisconnectGraceManager graceManager)
    : IRequestHandler<DisconnectPlayerCommand, Result>
{
    private static readonly TimeSpan DefaultGracePeriod = TimeSpan.FromSeconds(30);

    public async ValueTask<Result> Handle(DisconnectPlayerCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(async room =>
        {
            var seat = room.Seats.FirstOrDefault(s => s.ConnectionId == request.ConnectionId);
            if (seat is null)
            {
                return Result.NotFound("Room.ConnectionNotFound");
            }

            var playerId = seat.Id;
            var sessionToken = seat.SessionToken;
            var roomCode = room.Id.Value;

            var result = room.HandleDisconnect(request.ConnectionId);
            if (!result.IsSuccess)
            {
                return result;
            }

            await notifier.NotifyPlayerStatusChangedAsync(
                roomCode,
                playerId.Value,
                PlayerStatus.Disconnected,
                ct);

            // Start 30s grace timer before automatic elimination
            graceManager.StartGracePeriod(
                roomCode,
                playerId,
                sessionToken,
                DefaultGracePeriod,
                async () =>
                {
                    if (registry.TryGet(roomCode, out var activeSession))
                    {
                        await activeSession.EnqueueAsync(async activeRoom =>
                        {
                            var targetSeat = activeRoom.Seats.FirstOrDefault(s => s.Id == playerId);
                            if (targetSeat is not null && targetSeat.Status == PlayerStatus.Disconnected)
                            {
                                activeRoom.EliminatePlayer(playerId);
                                await notifier.NotifyPlayerStatusChangedAsync(
                                    roomCode,
                                    playerId.Value,
                                    PlayerStatus.Eliminated);

                                await notifier.BroadcastGameStateAsync(
                                    roomCode,
                                    id => GameStateProjector.Project(activeRoom, id),
                                    activeRoom.Seats);
                            }

                            return Result.Success();
                        });
                    }
                });

            return Result.Success();
        }, ct);

        return outcome;
    }
}
