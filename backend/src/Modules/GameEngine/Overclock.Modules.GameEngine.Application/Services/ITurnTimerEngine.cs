using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Services;

public interface ITurnTimerEngine : IAsyncDisposable
{
    TimeSpan IntermissionDuration { get; }

    void Start(GameRoomSession session, PlayerId playerId, long turnSequenceId, TimeSpan? duration = null);

    void StartDischargeWatchdog(GameRoomSession session, PlayerId playerId, long dischargeSequenceId, TimeSpan? duration = null);

    void StartIntermission(GameRoomSession session, int roundNumber, TimeSpan? duration = null);

    bool RescheduleTurn(string roomCode, long turnSequenceId, TimeSpan newRemainingDuration);

    void Cancel(string roomCode, TimerKind? kind = null);
}

public interface ITurnDelay
{
    Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken);
}