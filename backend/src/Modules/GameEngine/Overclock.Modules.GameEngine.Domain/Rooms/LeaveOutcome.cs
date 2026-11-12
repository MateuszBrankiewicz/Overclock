namespace Overclock.Modules.GameEngine.Domain.Rooms;

public sealed record LeaveOutcome(
    bool RoomEmpty,
    PlayerId? HostChangedTo,
    bool WasEliminated = false);
