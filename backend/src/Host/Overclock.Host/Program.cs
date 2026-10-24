using Overclock.Host.Hubs;
using Overclock.Host.Services;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
builder.Services.AddOpenApi("overclock");
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddMediator();
builder.Services.AddGameEngine();
builder.Services.AddSingleton<IConnectionTracker, InMemoryConnectionTracker>();
builder.Services.AddSingleton<IGameNotifier, SignalRGameNotifier>();
builder.Services.AddGameEngineInfrastructure();

var app = builder.Build();

app.UseCors();
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
