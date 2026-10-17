using Overclock.Host.Hubs;
using Overclock.Host.Services;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi("overclock");
builder.Services.AddSignalR();
builder.Services.AddMediator();
builder.Services.AddGameEngine();
builder.Services.AddSingleton<IConnectionTracker, InMemoryConnectionTracker>();
builder.Services.AddSingleton<IGameNotifier, SignalRGameNotifier>();

var app = builder.Build();

app.MapOpenApi();
app.MapHub<GameHub>("/hubs/game");

app.MapGet("/", () => "Hello World!")
    .WithName("GetRoot")
    .WithTags("Root")
    .Produces<string>(StatusCodes.Status200OK);

app.MapGet("/api/health", () => Results.Ok(new { status = "Healthy" }))
    .WithName("GetHealth")
    .WithTags("Health")
    .Produces(StatusCodes.Status200OK);

app.Run();

public partial class Program { }
