using Overclock.Modules.GameEngine.Contracts;

namespace Overclock.Host.Hubs;

public interface IGameClient
{
    Task ReceiveGameState(PlayerGameStateDto snapshot);

    Task PlayerJoined(PlayerSeatDto player);

    Task PlayerStatusChanged(PlayerStatusChangedDto notification);

    Task CardsPlayed(CardsPlayedDto notification);

    Task TraceCalled(TraceResolutionDto resolution);

    Task RoundStarted(RoundStartedDto notification);

    Task CapacitorDischarged(CapacitorDischargedEvent notification);

    Task PlayerEliminated(PlayerEliminatedEvent notification);

    Task ExploitTriggered(ExploitTriggeredEvent notification);

    Task PacketSniffed(PacketSniffedEvent notification);

    Task VoltageTestStarted(VoltageTestStartedEvent notification);
}
