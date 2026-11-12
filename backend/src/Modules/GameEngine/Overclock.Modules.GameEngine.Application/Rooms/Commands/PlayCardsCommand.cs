using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
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
    ITurnTimerEngine turnTimer,
    IGameStateProjector projector,
    TimeProvider? timeProvider = null)
    : IRequestHandler<PlayCardsCommand, Result>
{
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

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
                return result.ToResult<PlayCardsOutcome>();
            }

            var sequenceNumber = room.NextEventSequence();

            if (room.State == RoomState.TurnActive && room.CurrentTurnPlayerId is { } nextPlayerId)
            {
                var deadlineUtc = _timeProvider.GetUtcNow().UtcDateTime.Add(TurnTimerEngine.DefaultTurnDuration);
                room.MarkTurnDeadline(deadlineUtc);
                turnTimer.Start(session, nextPlayerId, room.TurnSequenceId);
            }
            else
            {
                turnTimer.Cancel(room.Id.Value);
            }

            var snapshots = projector.ProjectForActiveConnections(room);
            return Result<PlayCardsOutcome>.Success(new PlayCardsOutcome(snapshots, sequenceNumber));
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
            outcome.Value.SequenceNumber,
            CancellationToken.None);

        await notifier.BroadcastSnapshotsAsync(
            outcome.Value.Snapshots,
            CancellationToken.None);

        return Result.Success();
    }

    private sealed record PlayCardsOutcome(
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots,
        long SequenceNumber);
}
