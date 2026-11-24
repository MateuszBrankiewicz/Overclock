using Mediator;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Contracts;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

public sealed class MediatorMatchFinishedDispatcher : IMatchFinishedDispatcher
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MediatorMatchFinishedDispatcher> _logger;

    public MediatorMatchFinishedDispatcher(
        IServiceScopeFactory scopeFactory,
        ILogger<MediatorMatchFinishedDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void Dispatch(MatchFinishedEvent notification)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var publisher = scope.ServiceProvider.GetRequiredService<IPublisher>();
                await publisher.Publish(notification, CancellationToken.None).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to dispatch MatchFinishedEvent for room {RoomCode}", notification.RoomCode);
            }
        });
    }
}
