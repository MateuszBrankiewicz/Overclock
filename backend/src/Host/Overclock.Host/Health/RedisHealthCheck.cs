using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace Overclock.Host.Health;

public sealed class RedisHealthCheck : IHealthCheck
{
    private readonly IServiceProvider _services;

    public RedisHealthCheck(IServiceProvider services)
    {
        _services = services;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var multiplexer = _services.GetService<IConnectionMultiplexer>();
        if (multiplexer is null)
        {
            return HealthCheckResult.Healthy("Redis not configured (single-instance mode).");
        }

        try
        {
            var latency = await multiplexer.GetDatabase().PingAsync();
            return HealthCheckResult.Healthy($"Redis ping {latency.TotalMilliseconds:F1} ms.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis ping failed.", ex);
        }
    }
}
