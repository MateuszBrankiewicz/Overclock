using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record PlayCardsCommand(
    string RoomCode,
    Guid PlayerId,
    IReadOnlyList<Guid> CardIds,
    CardProtocol DeclaredProtocol)
    : IRequest<Result>;

internal sealed class PlayCardsCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    ITurnTimerEngine turnTimer)
    : IRequestHandler<PlayCardsCommand, Result>
{
    public async ValueTask<Result> Handle(PlayCardsCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var domainCardIds = request.CardIds.Select(id => new CardId(id)).ToList();

        var outcome = await session.EnqueueAsync(room =>
        {
            var result = room.PlayCards(new PlayerId(request.PlayerId), domainCardIds, request.DeclaredProtocol);
            if (!result.IsSuccess)
            {
                return result.ToResult<IReadOnlyList<PlayerSeat>>();
            }

            if (room.State == RoomState.TurnActive && room.CurrentTurnPlayerId is { } nextPlayerId)
            {
                turnTimer.Start(session, nextPlayerId, room.TurnSequenceId);
            }
            else
            {
                turnTimer.Cancel(room.Id.Value);
            }

            return Result<IReadOnlyList<PlayerSeat>>.Success(room.Seats.ToList());
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        await notifier.NotifyCardsPlayedAsync(
            request.RoomCode,
            request.PlayerId,
            request.CardIds.Count,
            request.DeclaredProtocol,
            CancellationToken.None);

        await notifier.BroadcastGameStateAsync(
            request.RoomCode,
            id => GameStateProjector.Project(session.Room, id),
            outcome.Value,
            CancellationToken.None);

        return Result.Success();
    }
}
