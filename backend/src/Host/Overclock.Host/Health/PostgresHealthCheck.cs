using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

namespace Overclock.Host.Health;

public sealed class PostgresHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public PostgresHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var connectionString = _configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return HealthCheckResult.Healthy("Database connection string not configured (in-memory mode).");
        }

        try
        {
            await using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                "SELECT to_regclass('stats.match_records') IS NOT NULL;",
                conn);
            var schemaReady = await cmd.ExecuteScalarAsync(cancellationToken) is true;
            return schemaReady
                ? HealthCheckResult.Healthy("PostgreSQL connection and stats schema healthy.")
                : HealthCheckResult.Unhealthy("PostgreSQL connected, but stats.match_records table is missing.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL readiness check failed.", ex);
        }
    }
}
