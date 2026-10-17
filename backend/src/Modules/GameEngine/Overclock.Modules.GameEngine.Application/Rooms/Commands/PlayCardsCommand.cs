using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record PlayCardsCommand(
    string RoomCode,
    Guid PlayerId,
    IReadOnlyList<Guid> CardIds,
    CardProtocol DeclaredProtocol)
    : IRequest<Result>;

internal sealed class PlayCardsCommandHandler(IGameRoomRegistry registry, IGameNotifier notifier)
    : IRequestHandler<PlayCardsCommand, Result>
{
    public async ValueTask<Result> Handle(PlayCardsCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var domainCardIds = request.CardIds.Select(id => new CardId(id)).ToList();

        var outcome = await session.EnqueueAsync(async room =>
        {
            var result = room.PlayCards(new PlayerId(request.PlayerId), domainCardIds, request.DeclaredProtocol);
            if (!result.IsSuccess)
            {
                return result;
            }

            await notifier.NotifyCardsPlayedAsync(
                room.Id.Value,
                request.PlayerId,
                request.CardIds.Count,
                request.DeclaredProtocol,
                ct);

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
