using System.Net;
using Mediator;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;
using Overclock.Modules.Stats.Infrastructure.Persistence;
using StackExchange.Redis;
using Testcontainers.PostgreSql;
using Testcontainers.Redis;

namespace Integration.Tests;

public class Phase4ProductionReadinessTests
{
    [Fact]
    public async Task HealthEndpoints_ReturnHealthy()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var liveResponse = await client.GetAsync("/healthz");
        var readyResponse = await client.GetAsync("/readyz");

        Assert.Equal(HttpStatusCode.OK, liveResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, readyResponse.StatusCode);
    }

    [Fact]
    public async Task RateLimiting_Returns429_WhenFiring50RequestsInOneSecond()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var tasks = Enumerable.Range(0, 50)
            .Select(_ => client.GetAsync("/api/health"))
            .ToArray();

        var responses = await Task.WhenAll(tasks);

        Assert.Contains(responses, r => r.StatusCode == HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task RedisBackplane_RelaysEventsAcrossTwoInstances_AndStoresRoomMetadataWithTtl()
    {
        await using var redisContainer = new RedisBuilder("redis:7-alpine")
            .Build();
        await redisContainer.StartAsync();

        var redisConnectionString = redisContainer.GetConnectionString();

        await using var factoryA = new WebApplicationFactory<Program>()
            // UseSetting, not ConfigureAppConfiguration: Program reads these values while building the host,
            // before late-added configuration sources are visible.
            .WithWebHostBuilder(b => b.UseSetting("ConnectionStrings:Redis", redisConnectionString));

        await using var factoryB = new WebApplicationFactory<Program>()
            // UseSetting, not ConfigureAppConfiguration: Program reads these values while building the host,
            // before late-added configuration sources are visible.
            .WithWebHostBuilder(b => b.UseSetting("ConnectionStrings:Redis", redisConnectionString));

        var hubConnectionB = new HubConnectionBuilder()
            .WithUrl(new Uri(factoryB.Server.BaseAddress, "/hubs/game"), options =>
            {
                options.HttpMessageHandlerFactory = _ => factoryB.Server.CreateHandler();
            })
            .Build();

        var receivedTcs = new TaskCompletionSource<RoundStartedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hubConnectionB.On<RoundStartedDto>("RoundStarted", dto => receivedTcs.TrySetResult(dto));

        await hubConnectionB.StartAsync();
        try
        {
            var created = await hubConnectionB.InvokeAsync<HubResponse<RoomJoinResultDto>>(
                "CreateRoom",
                new CreateRoomRequest("RelayHost", null));
            Assert.True(created.IsSuccess);
            var roomCode = created.Data!.RoomCode;
            Assert.False(string.IsNullOrWhiteSpace(roomCode));

            // Allow Redis room metadata write to complete
            await Task.Delay(150);

            var multiplexer = await ConnectionMultiplexer.ConnectAsync(redisConnectionString);
            var db = multiplexer.GetDatabase();
            var key = RedisRoomMetadataStore.BuildKey(roomCode);
            var storedValue = await db.StringGetAsync(key);
            var ttl = await db.KeyTimeToLiveAsync(key);

            Assert.False(storedValue.IsNullOrEmpty);
            Assert.NotNull(ttl);
            Assert.True(ttl!.Value > TimeSpan.FromMinutes(1));

            // Broadcast from Instance A to the SignalR group that Instance B's client joined
            var hubContextA = factoryA.Services.GetRequiredService<IHubContext<GameHub>>();
            var expectedDto = new RoundStartedDto(
                roomCode,
                1,
                "Alpha",
                Guid.NewGuid(),
                99);

            await hubContextA.Clients.Group(roomCode).SendAsync("RoundStarted", expectedDto);

            var received = await receivedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
            Assert.Equal(roomCode, received.RoomCode);
            Assert.Equal(99, received.SequenceNumber);
        }
        finally
        {
            await hubConnectionB.DisposeAsync();
        }
    }

    [Fact]
    public async Task StatsModule_PersistsMatchRecordToPostgres_WhenMatchFinishedEventPublished()
    {
        await using var postgres = new PostgreSqlBuilder("postgres:17-alpine")
            .Build();
        await postgres.StartAsync();

        var connectionString = postgres.GetConnectionString();

        await using var factory = new WebApplicationFactory<Program>()
            // UseSetting, not ConfigureAppConfiguration: Program reads these values while building the host,
            // before late-added configuration sources are visible.
            .WithWebHostBuilder(b => b.UseSetting("ConnectionStrings:Database", connectionString));

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<StatsDbContext>();
            await dbContext.Database.MigrateAsync();

            var publisher = scope.ServiceProvider.GetRequiredService<IPublisher>();
            var winnerId = Guid.NewGuid();
            await publisher.Publish(new MatchFinishedEvent(
                RoomCode: "CYBER-404",
                WinnerId: winnerId,
                WinnerNickname: "Volt",
                RoundCount: 4,
                BurntModulesCount: 2,
                DurationSeconds: 185,
                FinishedAtUtc: DateTimeOffset.UtcNow));
        }

        await using (var verifyScope = factory.Services.CreateAsyncScope())
        {
            var dbContext = verifyScope.ServiceProvider.GetRequiredService<StatsDbContext>();
            var record = await dbContext.MatchRecords.AsNoTracking().SingleOrDefaultAsync(x => x.RoomCode == "CYBER-404");
            Assert.NotNull(record);
            Assert.Equal("Volt", record.WinnerNickname);
            Assert.Equal(4, record.RoundCount);
            Assert.Equal(2, record.BurntModulesCount);
            Assert.Equal(185, record.DurationSeconds);
        }
    }
}
