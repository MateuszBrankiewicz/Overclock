using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record ReconnectCommand(string RoomCode, Guid SessionToken, string NewConnectionId)
    : IRequest<Result<PlayerGameStateDto>>;

internal sealed class ReconnectCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IDisconnectGraceManager graceManager)
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

        var outcome = await session.EnqueueAsync(async room =>
        {
            var reconnectResult = room.HandleReconnect(request.SessionToken, request.NewConnectionId);
            if (!reconnectResult.IsSuccess)
            {
                return Result<PlayerGameStateDto>.NotFound(
                    reconnectResult.Errors.FirstOrDefault() ?? "Room.InvalidSessionToken");
            }

            var seat = reconnectResult.Value;

            // Notify opponents that player is active again
            await notifier.NotifyPlayerStatusChangedAsync(
                room.Id.Value,
                seat.Id.Value,
                PlayerStatus.Active,
                ct);

            // Transmit full state snapshot tailored to the reconnected player
            var snapshot = GameStateProjector.Project(room, seat.Id);
            return Result<PlayerGameStateDto>.Success(snapshot);
        }, ct);

        return outcome;
    }
}
