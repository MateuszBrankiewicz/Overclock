using System.Collections.Concurrent;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

public sealed class DisconnectGraceManager : IDisconnectGraceManager, IDisposable
{
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _timers = new();

    public void StartGracePeriod(
        string roomCode,
        PlayerId playerId,
        Guid sessionToken,
        TimeSpan duration,
        Func<ValueTask> onExpired)
    {
        CancelGracePeriod(sessionToken);

        var cts = new CancellationTokenSource();
        if (!_timers.TryAdd(sessionToken, cts))
        {
            cts.Dispose();
            return;
        }

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(duration, cts.Token);
                if (_timers.TryRemove(sessionToken, out var activeCts))
                {
                    activeCts.Dispose();
                    await onExpired();
                }
            }
            catch (OperationCanceledException)
            {
                // Reconnected within grace window; timer cancelled cleanly
            }
        });
    }

    public bool CancelGracePeriod(Guid sessionToken)
    {
        if (_timers.TryRemove(sessionToken, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
            return true;
        }

        return false;
    }

    public bool HasActiveGracePeriod(Guid sessionToken) => _timers.ContainsKey(sessionToken);

    public void Dispose()
    {
        foreach (var cts in _timers.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }

        _timers.Clear();
    }
}
