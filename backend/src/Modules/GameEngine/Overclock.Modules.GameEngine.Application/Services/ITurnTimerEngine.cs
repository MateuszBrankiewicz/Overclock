using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Services;

public interface ITurnTimerEngine : IAsyncDisposable
{
    void Start(GameRoomSession session, PlayerId playerId, long turnSequenceId);

    void Cancel(string roomCode);
}

public interface ITurnDelay
{
    Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken);
}