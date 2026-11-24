using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record CreateRoomCommand(
    string? RoomCode,
    string HostNickname,
    string ConnectionId,
    string? PreferredCharacterId = null)
    : IRequest<Result<RoomJoinResultDto>>;

internal sealed class CreateRoomCommandHandler(
    IGameRoomRegistry registry,
    IGameStateProjector projector)
    : IRequestHandler<CreateRoomCommand, Result<RoomJoinResultDto>>
{
    public ValueTask<Result<RoomJoinResultDto>> Handle(CreateRoomCommand request, CancellationToken ct)
    {
        var roomIdResult = string.IsNullOrWhiteSpace(request.RoomCode)
            ? Result<RoomId>.Success(RoomId.Generate())
            : RoomId.Create(request.RoomCode);
        if (!roomIdResult.IsSuccess)
        {
            return ValueTask.FromResult(roomIdResult.ToResult<RoomJoinResultDto>());
        }

        var hostId = PlayerId.New();
        var sessionToken = Guid.NewGuid();

        var roomResult = registry.CreateRoom(
            roomIdResult.Value,
            hostId,
            request.HostNickname,
            request.ConnectionId,
            sessionToken,
            request.PreferredCharacterId);

        if (!roomResult.IsSuccess)
        {
            return ValueTask.FromResult(roomResult.ToResult<RoomJoinResultDto>());
        }

        var session = roomResult.Value;
        var gameState = projector.Project(session.Room, hostId);
        var joinResult = new RoomJoinResultDto(
            session.RoomCode,
            hostId.Value,
            sessionToken,
            gameState);

        return ValueTask.FromResult(Result<RoomJoinResultDto>.Success(joinResult));
    }
}
