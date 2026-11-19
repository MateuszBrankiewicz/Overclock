using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Xunit;

namespace Integration.Tests;

/// <summary>
/// A host whose mobile tab is backgrounded (e.g. while sharing the invite) loses its socket. The lobby must
/// survive that long enough for guests to join by code or link, instead of disappearing after 30 seconds.
/// </summary>
public sealed class LobbyDisconnectGraceIntegrationTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly TimeSpan PlayerGrace = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan LastLobbySeatGrace = TimeSpan.FromMinutes(5);

    [Fact]
    public async Task LastLiveLobbySeat_GetsTheLongGrace_OtherLobbySeatsTheDefault()
    {
        var grace = new RecordingGraceManager();
        await using var app = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Replace(ServiceDescriptor.Singleton<IDisconnectGraceManager>(grace))));

        var host = CreateHubConnection(app);
        await host.StartAsync();
        var created = await host.InvokeAsync<HubResponse<RoomJoinResultDto>>("CreateRoom", new CreateRoomRequest("Host"));
        Assert.True(created.IsSuccess, created.Error);
        var roomCode = created.Data!.RoomCode;

        var guest = CreateHubConnection(app);
        await guest.StartAsync();
        var joined = await guest.InvokeAsync<HubResponse<RoomJoinResultDto>>("JoinRoom", new JoinRoomRequest(roomCode, "Guest"));
        Assert.True(joined.IsSuccess, joined.Error);

        // Host still connected: a disconnected guest keeps the usual grace.
        await guest.DisposeAsync();
        Assert.Equal(PlayerGrace, await grace.WaitForAsync(joined.Data!.SessionToken));

        // Nobody else is live any more: the host's seat keeps the room alive for the long grace.
        await host.DisposeAsync();
        Assert.Equal(LastLobbySeatGrace, await grace.WaitForAsync(created.Data.SessionToken));

        await using var late = CreateHubConnection(app);
        await late.StartAsync();
        var lateJoin = await late.InvokeAsync<HubResponse<RoomJoinResultDto>>("JoinRoom", new JoinRoomRequest(roomCode, "Late"));
        Assert.True(lateJoin.IsSuccess, lateJoin.Error);
    }

    private static HubConnection CreateHubConnection(WebApplicationFactory<Program> target) =>
        new HubConnectionBuilder()
            .WithUrl(
                new Uri(target.Server.BaseAddress, "/hubs/game"),
                options => options.HttpMessageHandlerFactory = _ => target.Server.CreateHandler())
            .Build();

    /// <summary>Records requested grace durations and never expires them.</summary>
    private sealed class RecordingGraceManager : IDisconnectGraceManager
    {
        private readonly ConcurrentDictionary<Guid, TaskCompletionSource<TimeSpan>> _started = new();

        public void StartGracePeriod(string roomCode, PlayerId playerId, Guid sessionToken, TimeSpan duration, Func<ValueTask> onExpired) =>
            Started(sessionToken).TrySetResult(duration);

        public bool CancelGracePeriod(Guid sessionToken) => false;

        public bool HasActiveGracePeriod(Guid sessionToken) => false;

        public Task<TimeSpan> WaitForAsync(Guid sessionToken) => Started(sessionToken).Task.WaitAsync(TimeSpan.FromSeconds(10));

        private TaskCompletionSource<TimeSpan> Started(Guid sessionToken) =>
            _started.GetOrAdd(sessionToken, _ => new TaskCompletionSource<TimeSpan>(TaskCreationOptions.RunContinuationsAsynchronously));
    }
}
