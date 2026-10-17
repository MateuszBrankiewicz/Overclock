using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record CallTraceCommand(string RoomCode, Guid AccuserPlayerId)
    : IRequest<Result<TraceResolutionDto>>;

internal sealed class CallTraceCommandHandler(IGameRoomRegistry registry, IGameNotifier notifier)
    : IRequestHandler<CallTraceCommand, Result<TraceResolutionDto>>
{
    public async ValueTask<Result<TraceResolutionDto>> Handle(CallTraceCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result<TraceResolutionDto>.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(async room =>
        {
            var result = room.CallTrace(new PlayerId(request.AccuserPlayerId));
            if (!result.IsSuccess)
            {
                return Result<TraceResolutionDto>.Invalid(result.ValidationErrors);
            }

            var res = result.Value;
            var dto = new TraceResolutionDto(
                res.AccuserPlayerId.Value,
                res.AccusedPlayerId.Value,
                res.LoserPlayerId.Value,
                res.RevealedCards.Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString())).ToList(),
                res.DeclaredProtocol.ToString(),
                res.BluffDetected);

            await notifier.NotifyTraceCalledAsync(room.Id.Value, dto, ct);

            await notifier.BroadcastGameStateAsync(
                room.Id.Value,
                id => GameStateProjector.Project(room, id),
                room.Seats,
                ct);

            return Result<TraceResolutionDto>.Success(dto);
        }, ct);

        return outcome;
    }
}
