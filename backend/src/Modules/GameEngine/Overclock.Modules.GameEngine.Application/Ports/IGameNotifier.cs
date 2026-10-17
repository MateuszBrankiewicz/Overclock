using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Ports;

public interface IGameNotifier
{
    Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default);

    Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, CancellationToken ct = default);

    Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, CancellationToken ct = default);

    Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default);

    Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default);

    Task BroadcastGameStateAsync(
        string roomCode,
        Func<PlayerId, PlayerGameStateDto> snapshotFactory,
        IReadOnlyList<PlayerSeat> seats,
        CancellationToken ct = default);
}
