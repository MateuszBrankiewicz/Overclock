using System.Collections.Concurrent;

namespace Overclock.Host.Services;

public sealed class InMemoryConnectionTracker : IConnectionTracker
{
    private readonly ConcurrentDictionary<string, (string RoomCode, Guid PlayerId, Guid SessionToken)> _connections = new();

    public void Track(string connectionId, string roomCode, Guid playerId, Guid sessionToken)
    {
        foreach (var kvp in _connections)
        {
            if (kvp.Value.SessionToken == sessionToken && kvp.Key != connectionId)
            {
                _connections.TryRemove(kvp.Key, out _);
            }
        }

        _connections[connectionId] = (roomCode, playerId, sessionToken);
    }

    public bool TryGet(string connectionId, out (string RoomCode, Guid PlayerId, Guid SessionToken) info)
    {
        return _connections.TryGetValue(connectionId, out info);
    }

    public void Remove(string connectionId)
    {
        _connections.TryRemove(connectionId, out _);
    }
}
