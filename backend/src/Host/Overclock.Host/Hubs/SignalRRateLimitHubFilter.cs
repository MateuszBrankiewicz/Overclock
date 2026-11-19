using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace Overclock.Host.Hubs;

/// <summary>
/// Enforces game hub abuse limits (see <see cref="SignalRLimitsOptions"/>): per-connection action rate,
/// per-client room creation and join rates, and a per-client cap on concurrent connections.
/// </summary>
public sealed class SignalRRateLimitHubFilter : IHubFilter, IDisposable
{
    private const string CreateBucket = "create";
    private const string JoinBucket = "join";
    private static readonly TimeSpan ClientLimiterStaleAfter = TimeSpan.FromMinutes(2);

    private readonly SignalRLimitsOptions _options;
    private readonly ConcurrentDictionary<string, FixedWindowRateLimiter> _actionLimiters = new();
    private readonly ConcurrentDictionary<string, ClientLimiterEntry> _clientLimiters = new();
    private readonly ConcurrentDictionary<string, string> _connectionClients = new();
    private readonly ConcurrentDictionary<string, int> _clientConnectionCounts = new();
    private long _lastSweepUtcTicks = DateTime.UtcNow.Ticks;

    public SignalRRateLimitHubFilter(IOptions<SignalRLimitsOptions> options)
    {
        _options = options.Value;
    }

    private sealed class ClientLimiterEntry(int permitsPerMinute) : IDisposable
    {
        public FixedWindowRateLimiter Limiter { get; } = new(new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitsPerMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });

        private long _lastAccessUtcTicks = DateTime.UtcNow.Ticks;

        public long LastAccessUtcTicks => Volatile.Read(ref _lastAccessUtcTicks);

        public void Touch(long utcTicks) => Volatile.Write(ref _lastAccessUtcTicks, utcTicks);

        public void Dispose() => Limiter.Dispose();
    }

    public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
    {
        var clientKey = ResolveClientKey(context.Context);
        if (clientKey is not null)
        {
            var count = _clientConnectionCounts.AddOrUpdate(clientKey, 1, (_, current) => current + 1);
            if (count > _options.MaxConnectionsPerClient)
            {
                ReleaseConnectionSlot(clientKey);
                throw new HubException("Too many concurrent connections from this client.");
            }

            _connectionClients[context.Context.ConnectionId] = clientKey;
        }

        await next(context);
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var connectionId = invocationContext.Context.ConnectionId;
        var actionLimiter = _actionLimiters.GetOrAdd(connectionId, _ =>
            new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
            {
                PermitLimit = _options.ActionsPerSecond,
                Window = TimeSpan.FromSeconds(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

        using var actionLease = actionLimiter.AttemptAcquire(1);
        if (!actionLease.IsAcquired)
        {
            throw new HubException($"Rate limit exceeded. Maximum {_options.ActionsPerSecond} SignalR actions per second.");
        }

        switch (invocationContext.HubMethodName)
        {
            case nameof(GameHub.CreateRoom):
                AcquireClientPermit(invocationContext.Context, CreateBucket, _options.RoomCreatesPerMinute,
                    $"Room creation rate limit exceeded. Maximum {_options.RoomCreatesPerMinute} rooms per minute.");
                break;
            case nameof(GameHub.JoinRoom):
            case nameof(GameHub.Reconnect):
                AcquireClientPermit(invocationContext.Context, JoinBucket, _options.RoomJoinsPerMinute,
                    $"Join rate limit exceeded. Maximum {_options.RoomJoinsPerMinute} join attempts per minute.");
                break;
        }

        return await next(invocationContext);
    }

    public Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        var connectionId = context.Context.ConnectionId;
        if (_actionLimiters.TryRemove(connectionId, out var limiter))
        {
            limiter.Dispose();
        }

        if (_connectionClients.TryRemove(connectionId, out var clientKey))
        {
            ReleaseConnectionSlot(clientKey);
        }

        return next(context, exception);
    }

    /// <summary>
    /// Groups clients by IPv4 address or IPv6 /64 prefix, so rotating addresses inside one IPv6
    /// allocation does not bypass per-client limits. Returns null when the remote address is unknown.
    /// </summary>
    internal static string? ResolveClientKey(HubCallerContext context)
    {
        var address = context.GetHttpContext()?.Connection.RemoteIpAddress;
        if (address is null)
        {
            return null;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var bytes = address.GetAddressBytes();
            Array.Clear(bytes, 8, 8);
            return $"{new IPAddress(bytes)}/64";
        }

        return address.ToString();
    }

    private void AcquireClientPermit(HubCallerContext context, string bucket, int permitsPerMinute, string error)
    {
        var nowTicks = DateTime.UtcNow.Ticks;
        SweepStaleClientLimiters(nowTicks);

        var clientKey = ResolveClientKey(context) ?? context.ConnectionId;
        var entry = _clientLimiters.GetOrAdd($"{bucket}|{clientKey}", _ => new ClientLimiterEntry(permitsPerMinute));
        entry.Touch(nowTicks);

        using var lease = entry.Limiter.AttemptAcquire(1);
        if (!lease.IsAcquired)
        {
            throw new HubException(error);
        }
    }

    private void ReleaseConnectionSlot(string clientKey)
    {
        var remaining = _clientConnectionCounts.AddOrUpdate(clientKey, 0, (_, current) => Math.Max(0, current - 1));
        if (remaining == 0)
        {
            _clientConnectionCounts.TryRemove(new KeyValuePair<string, int>(clientKey, 0));
        }
    }

    private void SweepStaleClientLimiters(long nowTicks)
    {
        var lastSweep = Volatile.Read(ref _lastSweepUtcTicks);
        if (nowTicks - lastSweep < ClientLimiterStaleAfter.Ticks)
        {
            return;
        }

        if (Interlocked.CompareExchange(ref _lastSweepUtcTicks, nowTicks, lastSweep) != lastSweep)
        {
            return;
        }

        var cutoff = nowTicks - ClientLimiterStaleAfter.Ticks;
        foreach (var kvp in _clientLimiters)
        {
            if (kvp.Value.LastAccessUtcTicks < cutoff &&
                _clientLimiters.TryRemove(kvp.Key, out var removed))
            {
                removed.Dispose();
            }
        }
    }

    public void Dispose()
    {
        foreach (var limiter in _actionLimiters.Values)
        {
            limiter.Dispose();
        }

        foreach (var entry in _clientLimiters.Values)
        {
            entry.Dispose();
        }
    }
}
