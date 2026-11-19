using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Overclock.Modules.Stats.Infrastructure.Persistence;

public sealed class StatsDbContextDesignTimeFactory : IDesignTimeDbContextFactory<StatsDbContext>
{
    public StatsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<StatsDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=overclock;Username=overclock;Password=overclock_secret",
            npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "stats"));

        return new StatsDbContext(optionsBuilder.Options);
    }
}
