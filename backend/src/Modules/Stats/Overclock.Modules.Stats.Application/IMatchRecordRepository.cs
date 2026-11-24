using Overclock.Modules.Stats.Domain;

namespace Overclock.Modules.Stats.Application;

public interface IMatchRecordRepository
{
    Task AddAsync(MatchRecord record, CancellationToken ct = default);
}
