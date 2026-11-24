using Microsoft.EntityFrameworkCore;
using Overclock.Modules.Stats.Domain;

namespace Overclock.Modules.Stats.Infrastructure.Persistence;

public sealed class StatsDbContext : DbContext
{
    public StatsDbContext(DbContextOptions<StatsDbContext> options)
        : base(options)
    {
    }

    public DbSet<MatchRecord> MatchRecords => Set<MatchRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("stats");
        modelBuilder.ApplyConfiguration(new MatchRecordConfiguration());
    }
}
