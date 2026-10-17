using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Services;

public interface IDisconnectGraceManager
{
    void StartGracePeriod(string roomCode, PlayerId playerId, Guid sessionToken, TimeSpan duration, Func<ValueTask> onExpired);

    bool CancelGracePeriod(Guid sessionToken);

    bool HasActiveGracePeriod(Guid sessionToken);
}
