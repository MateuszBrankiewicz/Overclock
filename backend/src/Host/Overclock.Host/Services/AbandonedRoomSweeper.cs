using Mediator;
using Overclock.Modules.GameEngine.Application.Rooms.Commands;

namespace Overclock.Host.Services;

/// <summary>
/// Periodically dispatches <see cref="SweepAbandonedRoomsCommand"/> so rooms without live players
/// do not accumulate in memory.
/// </summary>
public sealed class AbandonedRoomSweeper(
    IServiceScopeFactory scopeFactory,
    ILogger<AbandonedRoomSweeper> logger) : BackgroundService
{
    internal static readonly TimeSpan SweepInterval = TimeSpan.FromMinutes(1);
    internal static readonly TimeSpan IdleFor = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(SweepInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();
                var result = await sender.Send(new SweepAbandonedRoomsCommand(IdleFor), stoppingToken);

                if (result.IsSuccess && result.Value > 0)
                {
                    logger.LogInformation("Evicted {Count} abandoned room(s).", result.Value);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Abandoned room sweep failed.");
            }
        }
    }
}
