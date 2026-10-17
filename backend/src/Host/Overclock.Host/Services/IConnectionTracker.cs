namespace Overclock.Host.Services;

public interface IConnectionTracker
{
    void Track(string connectionId, string roomCode, Guid playerId, Guid sessionToken);

    bool TryGet(string connectionId, out (string RoomCode, Guid PlayerId, Guid SessionToken) info);

    void Remove(string connectionId);
}
