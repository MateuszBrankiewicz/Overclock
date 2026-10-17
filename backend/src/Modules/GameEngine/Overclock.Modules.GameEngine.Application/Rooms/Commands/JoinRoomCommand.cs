using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record JoinRoomCommand(string RoomCode, string Nickname, string ConnectionId)
    : IRequest<Result<RoomJoinResultDto>>;

internal sealed class JoinRoomCommandHandler(IGameRoomRegistry registry, IGameNotifier notifier)
    : IRequestHandler<JoinRoomCommand, Result<RoomJoinResultDto>>
{
    public async ValueTask<Result<RoomJoinResultDto>> Handle(JoinRoomCommand request, CancellationToken ct)
    {
        if (!registry.TryGet(request.RoomCode, out var session))
        {
            return Result<RoomJoinResultDto>.NotFound("Room.NotFound");
        }

        var playerId = PlayerId.New();
        var sessionToken = Guid.NewGuid();

        var joinResult = await session.EnqueueAsync(async room =>
        {
            var addResult = room.AddPlayer(playerId, request.Nickname, request.ConnectionId, sessionToken);
            if (!addResult.IsSuccess)
            {
                return Result<RoomJoinResultDto>.Invalid(addResult.ValidationErrors);
            }

            var seat = addResult.Value;
            var seatDto = new PlayerSeatDto(seat.Id.Value, seat.Nickname, seat.Status.ToString(), seat.IsReady, seat.Hand.Count);
            await notifier.NotifyPlayerJoinedAsync(room.Id.Value, seatDto, ct);

            var gameState = GameStateProjector.Project(room, playerId);
            return Result<RoomJoinResultDto>.Success(new RoomJoinResultDto(
                room.Id.Value,
                playerId.Value,
                sessionToken,
                gameState));
        }, ct);

        return joinResult;
    }
}
