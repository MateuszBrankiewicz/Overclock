using Overclock.Modules.GameEngine.Contracts;

namespace Overclock.Host.Hubs;

public interface IGameClient
{
    Task ReceiveGameState(PlayerGameStateDto snapshot);

    Task PlayerJoined(PlayerSeatDto player);

    Task PlayerStatusChanged(Guid playerId, string status);

    Task CardsPlayed(Guid playerId, int count, string declaredProtocol);

    Task TraceCalled(TraceResolutionDto resolution);
}
