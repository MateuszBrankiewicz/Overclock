using System.Collections.Concurrent;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace Overclock.Host.Hubs;

/// <summary>
/// Enforces per-connection SignalR action rate limits (10 actions/sec) and per-IP room creation limits (5/min).
/// </summary>
public sealed class SignalRRateLimitHubFilter : IHubFilter, IDisposable
{
    private static readonly TimeSpan RoomCreateStaleAfter = TimeSpan.FromMinutes(2);
    private readonly ConcurrentDictionary<string, FixedWindowRateLimiter> _actionLimiters = new();
    private readonly ConcurrentDictionary<string, RoomCreateEntry> _roomCreateLimiters = new();
    private long _lastSweepUtcTicks = DateTime.UtcNow.Ticks;

    private sealed class RoomCreateEntry : IDisposable
    {
        public FixedWindowRateLimiter Limiter { get; } = new(new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });

        private long _lastAccessUtcTicks = DateTime.UtcNow.Ticks;

        public long LastAccessUtcTicks => Volatile.Read(ref _lastAccessUtcTicks);

        public void Touch(long utcTicks) => Volatile.Write(ref _lastAccessUtcTicks, utcTicks);

        public void Dispose() => Limiter.Dispose();
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var connectionId = invocationContext.Context.ConnectionId;
        var actionLimiter = _actionLimiters.GetOrAdd(connectionId, _ =>
            new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromSeconds(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

        using var actionLease = actionLimiter.AttemptAcquire(1);
        if (!actionLease.IsAcquired)
        {
            throw new HubException("Rate limit exceeded. Maximum 10 SignalR actions per second.");
        }

        if (string.Equals(invocationContext.HubMethodName, nameof(GameHub.CreateRoom), StringComparison.Ordinal))
        {
            var nowTicks = DateTime.UtcNow.Ticks;
            SweepStaleRoomCreateLimiters(nowTicks);

            var ipKey = invocationContext.Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString()
                ?? connectionId;
            var entry = _roomCreateLimiters.GetOrAdd(ipKey, _ => new RoomCreateEntry());
            entry.Touch(nowTicks);

            using var createLease = entry.Limiter.AttemptAcquire(1);
            if (!createLease.IsAcquired)
            {
                throw new HubException("Room creation rate limit exceeded. Maximum 5 rooms per minute.");
            }
        }

        return await next(invocationContext);
    }

    private void SweepStaleRoomCreateLimiters(long nowTicks)
    {
        var lastSweep = Volatile.Read(ref _lastSweepUtcTicks);
        if (nowTicks - lastSweep < RoomCreateStaleAfter.Ticks)
        {
            return;
        }

        if (Interlocked.CompareExchange(ref _lastSweepUtcTicks, nowTicks, lastSweep) != lastSweep)
        {
            return;
        }

        var cutoff = nowTicks - RoomCreateStaleAfter.Ticks;
        foreach (var kvp in _roomCreateLimiters)
        {
            if (kvp.Value.LastAccessUtcTicks < cutoff &&
                _roomCreateLimiters.TryRemove(kvp.Key, out var removed))
            {
                removed.Dispose();
            }
        }
    }

    public Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        if (_actionLimiters.TryRemove(context.Context.ConnectionId, out var limiter))
        {
            limiter.Dispose();
        }

        return next(context, exception);
    }

    public void Dispose()
    {
        foreach (var limiter in _actionLimiters.Values)
        {
            limiter.Dispose();
        }

        foreach (var entry in _roomCreateLimiters.Values)
        {
            entry.Dispose();
        }
    }
}
