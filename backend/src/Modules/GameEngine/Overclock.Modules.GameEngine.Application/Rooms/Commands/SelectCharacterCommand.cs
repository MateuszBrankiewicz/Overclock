using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record SelectCharacterCommand(string RoomCode, Guid PlayerId, string CharacterId) : IRequest<Result>;

internal sealed class SelectCharacterCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IGameStateProjector projector) : IRequestHandler<SelectCharacterCommand, Result>
{
    public async ValueTask<Result> Handle(SelectCharacterCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound", $"Room '{request.RoomCode}' was not found.");
        }

        var result = await session.EnqueueAsync(room =>
        {
            var selectResult = room.SelectCharacter(new PlayerId(request.PlayerId), request.CharacterId);
            if (!selectResult.IsSuccess)
            {
                return selectResult;
            }

            var snapshots = projector.ProjectForActiveConnections(room);
            return Result<IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)>>.Success(snapshots);
        }, ct);

        if (!result.IsSuccess)
        {
            return result.ToResult();
        }

        await notifier.BroadcastSnapshotsAsync(result.Value, ct);
        return Result.Success();
    }
}
