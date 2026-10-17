using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record StartRoundCommand(string RoomCode, Guid RequesterId)
    : IRequest<Result>;

internal sealed class StartRoundCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IRandomSource? randomSource = null)
    : IRequestHandler<StartRoundCommand, Result>
{
    public async ValueTask<Result> Handle(StartRoundCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(async room =>
        {
            var result = room.StartRound(new PlayerId(request.RequesterId), randomSource);
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
