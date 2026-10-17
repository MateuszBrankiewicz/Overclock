using Microsoft.AspNetCore.SignalR;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Host.Services;

public sealed class SignalRGameNotifier(IHubContext<GameHub, IGameClient> hubContext) : IGameNotifier
{
    public Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).PlayerJoined(player);
    }

    public Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).PlayerStatusChanged(playerId, status.ToString());
    }

    public Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).CardsPlayed(playerId, cardCount, declaredProtocol.ToString());
    }

    public Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).TraceCalled(resolution);
    }

    public Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default)
    {
        return hubContext.Clients.Client(connectionId).ReceiveGameState(snapshot);
    }

    public async Task BroadcastGameStateAsync(
        string roomCode,
        Func<PlayerId, PlayerGameStateDto> snapshotFactory,
        IReadOnlyList<PlayerSeat> seats,
        CancellationToken ct = default)
    {
        foreach (var seat in seats)
        {
            if (seat.ConnectionId is not null && seat.Status != PlayerStatus.Eliminated)
            {
                var snapshot = snapshotFactory(seat.Id);
                await hubContext.Clients.Client(seat.ConnectionId).ReceiveGameState(snapshot);
            }
        }
    }
}
