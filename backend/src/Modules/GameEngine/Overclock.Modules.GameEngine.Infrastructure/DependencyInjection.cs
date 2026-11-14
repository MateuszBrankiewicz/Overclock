using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;
using Overclock.SharedKernel;
using StackExchange.Redis;

namespace Overclock.Modules.GameEngine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddGameEngine(this IServiceCollection services)
    {
        services.AddSingleton<IRoomMetadataStore>(sp =>
        {
            var multiplexer = sp.GetService<IConnectionMultiplexer>();
            if (multiplexer is null)
            {
                return new NoOpRoomMetadataStore();
            }

            return new RedisRoomMetadataStore(
                multiplexer,
                sp.GetRequiredService<ILogger<RedisRoomMetadataStore>>());
        });
        services.AddSingleton<InMemoryGameRoomRegistry>();
        services.AddSingleton<IGameRoomRegistry>(sp => sp.GetRequiredService<InMemoryGameRoomRegistry>());
        services.AddSingleton<IDisconnectGraceManager, DisconnectGraceManager>();
        services.AddSingleton<ITurnDelay, TaskTurnDelay>();
        services.AddSingleton<IGameStateProjector, GameStateProjector>();
        services.AddSingleton<IMatchFinishedDispatcher, MediatorMatchFinishedDispatcher>();
        services.AddSingleton<ITurnTimerEngine>(sp =>
            new TurnTimerEngine(
                sp.GetRequiredService<ITurnDelay>(),
                sp.GetService<IGameNotifier>(),
                sp.GetService<IGameStateProjector>(),
                sp.GetService<IRandomSource>(),
                matchFinishedDispatcher: sp.GetService<IMatchFinishedDispatcher>()));
        services.AddSingleton<VoltageTestCoordinator>(sp =>
            new VoltageTestCoordinator(
                sp.GetRequiredService<ITurnTimerEngine>(),
                sp.GetService<IGameNotifier>(),
                sp.GetService<IGameStateProjector>(),
                sp.GetService<IRandomSource>(),
                sp.GetService<IMatchFinishedDispatcher>()));
        services.AddSingleton<IRandomSource>(CryptoRandomSource.Instance);

        return services;
    }

    public static IServiceCollection AddGameEngineInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<RoomManager>();
        services.AddSingleton<IRoomRegistry>(provider =>
            provider.GetRequiredService<RoomManager>());

        return services;
    }
}
