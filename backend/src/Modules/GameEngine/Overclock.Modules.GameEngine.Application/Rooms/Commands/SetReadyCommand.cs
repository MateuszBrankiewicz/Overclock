using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record SetReadyCommand(string RoomCode, Guid PlayerId, bool IsReady)
    : IRequest<Result>;

internal sealed class SetReadyCommandHandler(IGameRoomRegistry registry, IGameNotifier notifier)
    : IRequestHandler<SetReadyCommand, Result>
{
    public async ValueTask<Result> Handle(SetReadyCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(async room =>
        {
            var result = room.SetReady(new PlayerId(request.PlayerId), request.IsReady);
            if (!result.IsSuccess)
            {
                return result;
            }

            await notifier.BroadcastGameStateAsync(
                room.Id.Value,
                id => GameStateProjector.Project(room, id),
                room.Seats,
                ct);

            return Result.Success();
        }, ct);

        return outcome;
    }
}
