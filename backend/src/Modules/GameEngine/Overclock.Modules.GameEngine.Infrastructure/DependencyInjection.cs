using Microsoft.Extensions.DependencyInjection;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddGameEngine(this IServiceCollection services)
    {
        services.AddSingleton<InMemoryGameRoomRegistry>();
        services.AddSingleton<IGameRoomRegistry>(sp => sp.GetRequiredService<InMemoryGameRoomRegistry>());
        services.AddSingleton<IDisconnectGraceManager, DisconnectGraceManager>();
        services.AddSingleton<ITurnDelay, TaskTurnDelay>();
        services.AddSingleton<ITurnTimerEngine, TurnTimerEngine>();
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
