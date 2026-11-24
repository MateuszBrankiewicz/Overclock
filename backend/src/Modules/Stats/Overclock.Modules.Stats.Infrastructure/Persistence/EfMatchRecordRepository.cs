using Overclock.Modules.Stats.Application;
using Overclock.Modules.Stats.Domain;

namespace Overclock.Modules.Stats.Infrastructure.Persistence;

public sealed class EfMatchRecordRepository : IMatchRecordRepository
{
    private readonly StatsDbContext _dbContext;

    public EfMatchRecordRepository(StatsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(MatchRecord record, CancellationToken ct = default)
    {
        await _dbContext.MatchRecords.AddAsync(record, ct).ConfigureAwait(false);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}

public sealed class NoOpMatchRecordRepository : IMatchRecordRepository
{
    public Task AddAsync(MatchRecord record, CancellationToken ct = default) => Task.CompletedTask;
}
