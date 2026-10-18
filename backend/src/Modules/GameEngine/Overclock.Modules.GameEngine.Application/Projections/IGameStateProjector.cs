using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Projections;

public interface IGameStateProjector
{
    PlayerGameStateDto Project(GameRoom room, PlayerId recipientId);

    IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> ProjectForActiveConnections(GameRoom room);
}
