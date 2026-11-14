using Mediator;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.Stats.Domain;

namespace Overclock.Modules.Stats.Application;

public sealed class MatchFinishedEventHandler : INotificationHandler<MatchFinishedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    public MatchFinishedEventHandler(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async ValueTask Handle(MatchFinishedEvent notification, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var repository = scope.ServiceProvider.GetRequiredService<IMatchRecordRepository>();

        var record = MatchRecord.Create(
            notification.RoomCode,
            notification.WinnerId,
            notification.WinnerNickname,
            notification.RoundCount,
            notification.BurntModulesCount,
            notification.DurationSeconds,
            notification.FinishedAtUtc);

        await repository.AddAsync(record, cancellationToken).ConfigureAwait(false);
    }
}
