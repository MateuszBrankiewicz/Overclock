using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record JoinRoomCommand(
    string RoomCode,
    string Nickname,
    string ConnectionId,
    string? PreferredCharacterId = null)
    : IRequest<Result<RoomJoinResultDto>>;

internal sealed class JoinRoomCommandHandler(
    IGameRoomRegistry registry,
    IGameNotifier notifier,
    IGameStateProjector projector)
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

        var joinOutcome = await session.EnqueueAsync(room =>
        {
            var addResult = room.AddPlayer(playerId, request.Nickname, request.ConnectionId, sessionToken, request.PreferredCharacterId);
            if (!addResult.IsSuccess)
            {
                return addResult.ToResult<JoinRoomOutcome>();
            }

            var seat = addResult.Value;
            var seatDto = new PlayerSeatDto(seat.Id.Value, seat.Nickname, seat.Status.ToString(), seat.IsReady, seat.Hand.Count, seat.CharacterId);
            var gameState = projector.Project(room, playerId);

            var joinResultDto = new RoomJoinResultDto(
                room.Id.Value,
                playerId.Value,
                sessionToken,
                gameState);

            return Result<JoinRoomOutcome>.Success(new JoinRoomOutcome(seatDto, joinResultDto));
        }, ct);

        if (!joinOutcome.IsSuccess)
        {
            return joinOutcome.ToResult<RoomJoinResultDto>();
        }

        await notifier.NotifyPlayerJoinedAsync(request.RoomCode, joinOutcome.Value.SeatDto, CancellationToken.None);

        return Result<RoomJoinResultDto>.Success(joinOutcome.Value.JoinResultDto);
    }

    private sealed record JoinRoomOutcome(PlayerSeatDto SeatDto, RoomJoinResultDto JoinResultDto);
}
