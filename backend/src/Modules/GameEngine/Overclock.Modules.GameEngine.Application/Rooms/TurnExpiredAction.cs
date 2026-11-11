using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public sealed record TurnExpiredAction(PlayerId PlayerId, long TurnSequenceId)
{
    public Result<TurnExpiredOutcome> Execute(GameRoom room) =>
        room.ExpireTurn(PlayerId, TurnSequenceId);
}