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

    public Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, long sequenceNumber = 1, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).PlayerStatusChanged(new PlayerStatusChangedDto(playerId, status.ToString(), sequenceNumber));
    }

    public Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, long sequenceNumber = 1, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).CardsPlayed(new CardsPlayedDto(playerId, cardCount, declaredProtocol.ToString(), sequenceNumber));
    }

    public Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).TraceCalled(resolution);
    }

    public Task NotifyRoundStartedAsync(string roomCode, RoundStartedDto notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).RoundStarted(notification);
    }

    public Task NotifyCapacitorDischargedAsync(string roomCode, CapacitorDischargedEvent notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).CapacitorDischarged(notification);
    }

    public Task NotifyPlayerEliminatedAsync(string roomCode, PlayerEliminatedEvent notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).PlayerEliminated(notification);
    }

    public Task NotifyExploitTriggeredAsync(string roomCode, ExploitTriggeredEvent notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).ExploitTriggered(notification);
    }

    public Task NotifyPacketSniffedAsync(string connectionId, PacketSniffedEvent notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Client(connectionId).PacketSniffed(notification);
    }

    public Task NotifyVoltageTestStartedAsync(string roomCode, VoltageTestStartedEvent notification, CancellationToken ct = default)
    {
        return hubContext.Clients.Group(roomCode).VoltageTestStarted(notification);
    }

    public Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default)
    {
        return hubContext.Clients.Client(connectionId).ReceiveGameState(snapshot);
    }

    public async Task BroadcastSnapshotsAsync(
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> snapshots,
        CancellationToken ct = default)
    {
        foreach (var (connectionId, snapshot) in snapshots)
        {
            await hubContext.Clients.Client(connectionId).ReceiveGameState(snapshot);
        }
    }
}
