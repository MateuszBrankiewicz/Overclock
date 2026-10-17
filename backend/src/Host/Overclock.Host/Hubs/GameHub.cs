using Mediator;
using Microsoft.AspNetCore.SignalR;
using Overclock.Host.Services;
using Overclock.Modules.GameEngine.Application.Rooms.Commands;
using Overclock.Modules.GameEngine.Contracts;

namespace Overclock.Host.Hubs;

public sealed class GameHub(ISender sender, IConnectionTracker connectionTracker) : Hub<IGameClient>
{
    public async Task<HubResponse<RoomJoinResultDto>> CreateRoom(CreateRoomRequest request)
    {
        var command = new CreateRoomCommand(request.RoomCode, request.HostNickname, Context.ConnectionId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        if (result.IsSuccess)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, result.Value.RoomCode);
            connectionTracker.Track(
                Context.ConnectionId,
                result.Value.RoomCode,
                result.Value.PlayerId,
                result.Value.SessionToken);
        }

        return HubResponse<RoomJoinResultDto>.From(result);
    }

    public async Task<HubResponse<RoomJoinResultDto>> JoinRoom(JoinRoomRequest request)
    {
        var command = new JoinRoomCommand(request.RoomCode, request.Nickname, Context.ConnectionId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        if (result.IsSuccess)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, result.Value.RoomCode);
            connectionTracker.Track(
                Context.ConnectionId,
                result.Value.RoomCode,
                result.Value.PlayerId,
                result.Value.SessionToken);
        }

        return HubResponse<RoomJoinResultDto>.From(result);
    }

    public async Task<HubResponse> SetReady(SetReadyRequest request)
    {
        var playerId = request.PlayerId ?? GetCallerPlayerId();
        var command = new SetReadyCommand(request.RoomCode, playerId, request.IsReady);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> StartRound(StartRoundRequest request)
    {
        var requesterId = request.RequesterId ?? GetCallerPlayerId();
        var command = new StartRoundCommand(request.RoomCode, requesterId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> PlayCards(PlayCardsRequest request)
    {
        var playerId = request.PlayerId ?? GetCallerPlayerId();
        var command = new PlayCardsCommand(request.RoomCode, playerId, request.CardIds, request.DeclaredProtocol);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse<TraceResolutionDto>> CallTrace(CallTraceRequest request)
    {
        var accuserId = request.AccuserPlayerId ?? GetCallerPlayerId();
        var command = new CallTraceCommand(request.RoomCode, accuserId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse<TraceResolutionDto>.From(result);
    }

    public async Task<HubResponse<PlayerGameStateDto>> Reconnect(ReconnectRequest request)
    {
        var command = new ReconnectCommand(request.RoomCode, request.SessionToken, Context.ConnectionId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        if (result.IsSuccess)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, request.RoomCode);
            connectionTracker.Track(
                Context.ConnectionId,
                request.RoomCode,
                result.Value.MyPlayerId,
                request.SessionToken);
        }

        return HubResponse<PlayerGameStateDto>.From(result);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (connectionTracker.TryGet(Context.ConnectionId, out var info))
        {
            await sender.Send(new DisconnectPlayerCommand(info.RoomCode, Context.ConnectionId));
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, info.RoomCode);
            connectionTracker.Remove(Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    private Guid GetCallerPlayerId()
    {
        if (connectionTracker.TryGet(Context.ConnectionId, out var info))
        {
            return info.PlayerId;
        }

        return Guid.Empty;
    }
}
