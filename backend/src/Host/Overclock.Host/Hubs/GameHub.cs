using Ardalis.Result;
using Mediator;
using Microsoft.AspNetCore.SignalR;
using Overclock.Host.Services;
using Overclock.Modules.GameEngine.Application.Rooms.Commands;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.SharedKernel;

namespace Overclock.Host.Hubs;

public sealed class GameHub(ISender sender, IConnectionTracker connectionTracker) : Hub<IGameClient>
{
    public async Task<HubResponse<RoomJoinResultDto>> CreateRoom(CreateRoomRequest request)
    {
        var command = new CreateRoomCommand(request.RoomCode, request.HostNickname, Context.ConnectionId, request.PreferredCharacterId);
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
        var command = new JoinRoomCommand(request.RoomCode, request.Nickname, Context.ConnectionId, request.PreferredCharacterId);
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

    public async Task<HubResponse> SelectCharacter(SelectCharacterRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new SelectCharacterCommand(request.RoomCode, caller.Value.PlayerId, request.CharacterId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> SetReady(SetReadyRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new SetReadyCommand(request.RoomCode, caller.Value.PlayerId, request.IsReady);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> StartRound(StartRoundRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new StartRoundCommand(request.RoomCode, caller.Value.PlayerId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> PlayCards(PlayCardsRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new PlayCardsCommand(request.RoomCode, caller.Value.PlayerId, request.CardIds, request.DeclaredProtocol);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse<TraceResolutionDto>> CallTrace(CallTraceRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse<TraceResolutionDto>.From(caller.ToResult<TraceResolutionDto>());
        }

        var command = new CallTraceCommand(request.RoomCode, caller.Value.PlayerId);
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

    public async Task<HubResponse> ActivateExploit(ActivateExploitRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new ActivateExploitCommand(
            request.RoomCode,
            caller.Value.PlayerId,
            request.Exploit,
            request.NewTargetProtocol,
            Context.ConnectionId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> TriggerDischarge(TriggerDischargeRequest request)
    {
        var caller = ValidateCaller(request.RoomCode);
        if (!caller.IsSuccess)
        {
            return HubResponse.From(caller.ToResult());
        }

        var command = new TriggerDischargeCommand(request.RoomCode, caller.Value.PlayerId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        return HubResponse.From(result);
    }

    public async Task<HubResponse> LeaveRoom(LeaveRoomRequest request)
    {
        if (!connectionTracker.TryGet(Context.ConnectionId, out var info))
        {
            return HubResponse.From(Result.Success());
        }

        if (!string.Equals(info.RoomCode, request.RoomCode, StringComparison.OrdinalIgnoreCase))
        {
            return HubResponse.From(Result.Forbidden("Connection.RoomMismatch"));
        }

        var command = new LeaveRoomCommand(request.RoomCode, info.PlayerId);
        var result = await sender.Send(command, Context.ConnectionAborted);

        if (result.IsSuccess)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, info.RoomCode);
            connectionTracker.Remove(Context.ConnectionId);
        }

        return HubResponse.From(result);
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

    private Result<(Guid PlayerId, string RoomCode)> ValidateCaller(string requestedRoomCode)
    {
        if (!connectionTracker.TryGet(Context.ConnectionId, out var info))
        {
            return Result<(Guid PlayerId, string RoomCode)>.Unauthorized("Connection.Unregistered");
        }

        if (!string.Equals(info.RoomCode, requestedRoomCode, StringComparison.OrdinalIgnoreCase))
        {
            return Result<(Guid PlayerId, string RoomCode)>.Forbidden("Connection.RoomMismatch");
        }

        return Result<(Guid PlayerId, string RoomCode)>.Success((info.PlayerId, info.RoomCode));
    }
}
