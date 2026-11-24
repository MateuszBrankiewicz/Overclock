using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Modules.Stats.Application;
using Overclock.Modules.Stats.Infrastructure.Persistence;

namespace Overclock.Modules.Stats.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddStatsModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Database");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddScoped<IMatchRecordRepository, NoOpMatchRecordRepository>();
            return services;
        }

        services.AddDbContext<StatsDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "stats")));

        services.AddScoped<IMatchRecordRepository, EfMatchRecordRepository>();
        return services;
    }

    public static async Task ApplyStatsMigrationsAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetService<StatsDbContext>();
        if (dbContext is not null)
        {
            await dbContext.Database.MigrateAsync(ct).ConfigureAwait(false);
        }
    }
}
