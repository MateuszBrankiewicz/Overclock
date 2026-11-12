using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record TriggerDischargeCommand(string RoomCode, Guid PlayerId) : IRequest<Result>;

internal sealed class TriggerDischargeCommandHandler(
    IGameRoomRegistry registry,
    VoltageTestCoordinator voltageCoordinator)
    : IRequestHandler<TriggerDischargeCommand, Result>
{
    public async ValueTask<Result> Handle(TriggerDischargeCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result.NotFound("Room.NotFound");
        }

        var domainPlayerId = new PlayerId(request.PlayerId);
        var outcome = await session.EnqueueAsync(room =>
        {
            if (room.State != RoomState.VoltageTest)
            {
                return Result<VoltageTestCoordinator.VoltageTestResolution>.Conflict(
                    "Voltage.NotActive",
                    $"Cannot trigger discharge in room state '{room.State}'.");
            }

            if (room.PendingDischargePlayerId != domainPlayerId)
            {
                return Result<VoltageTestCoordinator.VoltageTestResolution>.Invalid(new ValidationError(
                    "Voltage.NotPendingPlayer",
                    $"Player '{domainPlayerId}' is not the pending discharge player '{room.PendingDischargePlayerId}'."));
            }

            var resolution = voltageCoordinator.ExecuteDischarge(session, room, domainPlayerId);
            return Result<VoltageTestCoordinator.VoltageTestResolution>.Success(resolution);
        }, ct);

        if (!outcome.IsSuccess)
        {
            return outcome.ToResult();
        }

        await voltageCoordinator.DispatchResolutionAsync(request.RoomCode, outcome.Value, CancellationToken.None);
        return Result.Success();
    }
}
