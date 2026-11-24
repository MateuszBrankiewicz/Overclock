using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Overclock.Host.Health;
using Overclock.Host.Hubs;
using Overclock.Host.Services;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Infrastructure;
using Overclock.Modules.Stats.Infrastructure;
using StackExchange.Redis;

if (args.Contains("--healthcheck", StringComparer.Ordinal))
{
    using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
    try
    {
        using var response = await httpClient.GetAsync("http://127.0.0.1:5000/readyz");
        return response.IsSuccessStatusCode ? 0 : 1;
    }
    catch
    {
        return 1;
    }
}

var builder = WebApplication.CreateBuilder(args);

// X-Forwarded-* is honoured only from trusted proxies. Defaults to loopback; deployments behind a reverse
// proxy list its address/network under ForwardedHeaders:KnownProxies / ForwardedHeaders:KnownNetworks.
// Trusting every sender would let any client spoof its IP and bypass the per-IP limits.
var trustedProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
var trustedNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var proxy in trustedProxies)
    {
        options.KnownProxies.Add(IPAddress.Parse(proxy));
    }

    foreach (var network in trustedNetworks)
    {
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
    }
});

// Cross-origin access is limited to Cors:AllowedOrigins. The bundled nginx serves the SPA and proxies
// /hubs on the same origin, so production needs no entries; Development additionally allows localhost.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var allowLocalhostOrigins = builder.Environment.IsDevelopment();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => IsAllowedOrigin(origin, allowedOrigins, allowLocalhostOrigins))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
builder.Services.AddOpenApi("overclock");

builder.Services.Configure<SignalRLimitsOptions>(builder.Configuration.GetSection(SignalRLimitsOptions.SectionName));
builder.Services.AddSingleton<SignalRRateLimitHubFilter>();
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.AddFilter<SignalRRateLimitHubFilter>();
})
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
        ConnectionMultiplexer.Connect(redisConnectionString));
    signalRBuilder.AddStackExchangeRedis(redisConnectionString, options =>
    {
        options.Configuration.ChannelPrefix = RedisChannel.Literal("overclock:signalr");
    });
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var path = httpContext.Request.Path;
        if (path.StartsWithSegments("/healthz") ||
            path.StartsWithSegments("/readyz") ||
            path.StartsWithSegments("/hubs"))
        {
            return RateLimitPartition.GetNoLimiter("bypass");
        }

        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromSeconds(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    });
});

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<RedisHealthCheck>("redis", tags: ["ready"])
    .AddCheck<PostgresHealthCheck>("postgres", tags: ["ready"]);

builder.Services.AddMediator();
builder.Services.AddGameEngine();
builder.Services.AddStatsModule(builder.Configuration);
builder.Services.AddSingleton<IConnectionTracker, InMemoryConnectionTracker>();
builder.Services.AddSingleton<IGameNotifier, SignalRGameNotifier>();
builder.Services.AddGameEngineInfrastructure();
builder.Services.AddHostedService<AbandonedRoomSweeper>();

var app = builder.Build();

await app.Services.ApplyStatsMigrationsAsync();

app.UseForwardedHeaders();
app.UseCors();
app.UseRateLimiter();
app.MapOpenApi();
app.MapHub<GameHub>("/hubs/game");
app.MapHealthChecks("/healthz", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live")
});
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});

app.MapGet("/", () => "Hello World!")
    .WithName("GetRoot")
    .WithTags("Root")
    .Produces<string>(StatusCodes.Status200OK);

app.MapGet("/api/health", () => Results.Ok(new { status = "Healthy" }))
    .WithName("GetHealth")
    .WithTags("Health")
    .Produces(StatusCodes.Status200OK);

await app.RunAsync();
return 0;

static bool IsAllowedOrigin(string origin, string[] allowedOrigins, bool allowLocalhost)
{
    if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
    {
        return true;
    }

    return allowLocalhost &&
        Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
        (uri.IsLoopback || string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase));
}

public partial class Program { }
