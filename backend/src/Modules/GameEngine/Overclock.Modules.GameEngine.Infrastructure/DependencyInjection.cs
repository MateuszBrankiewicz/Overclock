using Microsoft.Extensions.DependencyInjection;
using Overclock.Modules.GameEngine.Application.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddGameEngineInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<Rooms.RoomManager>();
        services.AddSingleton<IRoomRegistry>(provider =>
            provider.GetRequiredService<Rooms.RoomManager>());

        return services;
    }
}