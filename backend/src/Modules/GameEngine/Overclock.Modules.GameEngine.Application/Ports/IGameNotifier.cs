using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Ports;

public interface IGameNotifier
{
    Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default);

    Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, long sequenceNumber = 1, CancellationToken ct = default);

    Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, long sequenceNumber = 1, CancellationToken ct = default);

    Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default);

    Task NotifyRoundStartedAsync(string roomCode, RoundStartedDto notification, CancellationToken ct = default);

    Task NotifyCapacitorDischargedAsync(string roomCode, CapacitorDischargedEvent notification, CancellationToken ct = default);

    Task NotifyPlayerEliminatedAsync(string roomCode, PlayerEliminatedEvent notification, CancellationToken ct = default);

    Task NotifyExploitTriggeredAsync(string roomCode, ExploitTriggeredEvent notification, CancellationToken ct = default);

    Task NotifyPacketSniffedAsync(string connectionId, PacketSniffedEvent notification, CancellationToken ct = default);

    Task NotifyVoltageTestStartedAsync(string roomCode, VoltageTestStartedEvent notification, CancellationToken ct = default);

    Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default);

    Task BroadcastSnapshotsAsync(
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> snapshots,
        CancellationToken ct = default);
}
