using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record CallTraceCommand(string RoomCode, Guid AccuserPlayerId)
    : IRequest<Result<TraceResolutionDto>>;

internal sealed class CallTraceCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    ITurnTimerEngine turnTimer,
    VoltageTestCoordinator voltageCoordinator)
    : IRequestHandler<CallTraceCommand, Result<TraceResolutionDto>>
{
    public async ValueTask<Result<TraceResolutionDto>> Handle(CallTraceCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result<TraceResolutionDto>.NotFound("Room.NotFound");
        }

        var outcome = await session.EnqueueAsync(room =>
        {
            var result = room.CallTrace(new PlayerId(request.AccuserPlayerId));
            if (!result.IsSuccess)
            {
                return result.ToResult<CallTraceOutcome>();
            }

            var res = result.Value;
            turnTimer.Cancel(room.Id.Value);
            var sequenceNumber = room.NextEventSequence();
            var dto = new TraceResolutionDto(
                res.AccuserPlayerId.Value,
                res.AccusedPlayerId.Value,
                res.LoserPlayerId.Value,
                res.RevealedCards.Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString(), VisualSeedGenerator.FromCardId(c.Id.Value))).ToList(),
                res.DeclaredProtocol.ToString(),
                res.BluffDetected,
                sequenceNumber);

            var completeResult = room.CompleteBluffCheck();
            if (!completeResult.IsSuccess)
            {
                return completeResult.ToResult<CallTraceOutcome>();
            }

            var voltageResolution = voltageCoordinator.ProcessVoltageTestEntry(session, room, res.LoserPlayerId);
            return Result<CallTraceOutcome>.Success(new CallTraceOutcome(dto, voltageResolution));
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult<TraceResolutionDto>();
        }

        await notifier.NotifyTraceCalledAsync(request.RoomCode, outcome.Value.Resolution, CancellationToken.None);
        await voltageCoordinator.DispatchResolutionAsync(request.RoomCode, outcome.Value.VoltageResolution, CancellationToken.None);

        return Result<TraceResolutionDto>.Success(outcome.Value.Resolution);
    }

    private sealed record CallTraceOutcome(
        TraceResolutionDto Resolution,
        VoltageTestCoordinator.VoltageTestResolution VoltageResolution);
}
