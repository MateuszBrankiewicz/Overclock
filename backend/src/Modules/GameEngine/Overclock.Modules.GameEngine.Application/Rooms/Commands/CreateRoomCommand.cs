using Ardalis.Result;
using Mediator;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Rooms.Commands;

public sealed record CreateRoomCommand(string? RoomCode, string HostNickname, string ConnectionId)
    : IRequest<Result<RoomJoinResultDto>>;

internal sealed class CreateRoomCommandHandler(IGameRoomRegistry registry)
    : IRequestHandler<CreateRoomCommand, Result<RoomJoinResultDto>>
{
    public ValueTask<Result<RoomJoinResultDto>> Handle(CreateRoomCommand request, CancellationToken ct)
    {
        var rawCode = string.IsNullOrWhiteSpace(request.RoomCode)
            ? $"CYBER-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}"
            : request.RoomCode;

        var roomIdResult = RoomId.Create(rawCode);
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
            sessionToken);

        if (!roomResult.IsSuccess)
        {
            return ValueTask.FromResult(roomResult.ToResult<RoomJoinResultDto>());
        }

        var session = roomResult.Value;
        var gameState = GameStateProjector.Project(session.Room, hostId);
        var joinResult = new RoomJoinResultDto(
            session.RoomCode,
            hostId.Value,
            sessionToken,
            gameState);

        return ValueTask.FromResult(Result<RoomJoinResultDto>.Success(joinResult));
    }
}
