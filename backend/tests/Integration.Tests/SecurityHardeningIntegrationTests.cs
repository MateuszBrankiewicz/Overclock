using System.Net;
using System.Text.RegularExpressions;
using Mediator;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Rooms.Commands;
using Overclock.Modules.GameEngine.Contracts;
using Xunit;

namespace Integration.Tests;

public partial class SecurityHardeningIntegrationTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [GeneratedRegex("^[2-9A-HJKMNP-Z]{8}$")]
    private static partial Regex GeneratedRoomCode();

    private static HubConnection CreateHubConnection(WebApplicationFactory<Program> target) =>
        new HubConnectionBuilder()
            .WithUrl(
                new Uri(target.Server.BaseAddress, "/hubs/game"),
                options => options.HttpMessageHandlerFactory = _ => target.Server.CreateHandler())
            .Build();

    private static string NewRoomCode(string tag) =>
        $"CYBER-{tag}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

    [Fact]
    public async Task Connection_CannotOccupyMoreThanOneSeat_UntilItLeaves()
    {
        await using var connection = CreateHubConnection(factory);
        await connection.StartAsync();

        var first = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Squatter", NewRoomCode("S")));
        Assert.True(first.IsSuccess, first.Error);

        var secondCreate = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Squatter", NewRoomCode("S")));
        Assert.False(secondCreate.IsSuccess);
        Assert.Equal("Connection.AlreadyInRoom", secondCreate.ErrorCode);

        await using var host = CreateHubConnection(factory);
        await host.StartAsync();
        var otherRoom = await host.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Host", NewRoomCode("T")));
        Assert.True(otherRoom.IsSuccess, otherRoom.Error);

        var seatGrab = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom", new JoinRoomRequest(otherRoom.Data!.RoomCode, "Squatter"));
        Assert.False(seatGrab.IsSuccess);
        Assert.Equal("Connection.AlreadyInRoom", seatGrab.ErrorCode);

        var leave = await connection.InvokeAsync<HubResponse>(
            "LeaveRoom", new LeaveRoomRequest(first.Data!.RoomCode));
        Assert.True(leave.IsSuccess, leave.Error);

        var join = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom", new JoinRoomRequest(otherRoom.Data.RoomCode, "Squatter"));
        Assert.True(join.IsSuccess, join.Error);
        Assert.Equal(2, join.Data!.GameState.Seats.Count);
    }

    [Fact]
    public async Task Nicknames_AreValidatedServerSide()
    {
        await using var connection = CreateHubConnection(factory);
        await connection.StartAsync();

        var tooLong = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest(new string('A', 500), NewRoomCode("N")));
        Assert.False(tooLong.IsSuccess);
        Assert.Equal("Room.InvalidNickname", tooLong.ErrorCode);

        var trimmed = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("  Neo  ", NewRoomCode("N")));
        Assert.True(trimmed.IsSuccess, trimmed.Error);
        Assert.Equal("Neo", Assert.Single(trimmed.Data!.GameState.Seats).Nickname);
    }

    [Fact]
    public async Task CreateRoom_WithoutCode_GeneratesUnguessableCode()
    {
        await using var connection = CreateHubConnection(factory);
        await connection.StartAsync();

        var created = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Host"));

        Assert.True(created.IsSuccess, created.Error);
        Assert.Matches(GeneratedRoomCode(), created.Data!.RoomCode);
    }

    [Fact]
    public async Task SweepAbandonedRooms_EvictsRoomsWithoutLivePlayers_AndKeepsActiveOnes()
    {
        var registry = factory.Services.GetRequiredService<IGameRoomRegistry>();

        await using var stays = CreateHubConnection(factory);
        await stays.StartAsync();
        var activeRoom = await stays.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Stays", NewRoomCode("A")));
        Assert.True(activeRoom.IsSuccess, activeRoom.Error);

        var leaves = CreateHubConnection(factory);
        await leaves.StartAsync();
        var abandonedRoom = await leaves.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom", new CreateRoomRequest("Leaves", NewRoomCode("B")));
        Assert.True(abandonedRoom.IsSuccess, abandonedRoom.Error);
        await leaves.DisposeAsync();

        // Wait until the server has processed the disconnect.
        var deadline = DateTime.UtcNow.AddSeconds(5);
        while (DateTime.UtcNow < deadline)
        {
            registry.TryGet(abandonedRoom.Data!.RoomCode, out var session);
            if (session is null || session.Room.Seats.All(s => s.DisconnectedAtUtc is not null))
            {
                break;
            }

            await Task.Delay(50);
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        var sweep = await sender.Send(new SweepAbandonedRoomsCommand(TimeSpan.Zero));

        Assert.True(sweep.IsSuccess);
        Assert.False(registry.TryGet(abandonedRoom.Data!.RoomCode, out _));
        Assert.True(registry.TryGet(activeRoom.Data!.RoomCode, out _));
    }

    [Fact]
    public async Task PerClientLimits_CapConnectionsAndJoinAttempts()
    {
        await using var limited = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SignalRLimits:MaxConnectionsPerClient"] = "2",
                ["SignalRLimits:RoomJoinsPerMinute"] = "3",
            }));
            builder.ConfigureServices(services => services.AddTransient<IStartupFilter, FixedRemoteIpStartupFilter>());
        });

        await using var first = CreateHubConnection(limited);
        await first.StartAsync();
        await using var second = CreateHubConnection(limited);
        await second.StartAsync();

        await using var third = CreateHubConnection(limited);
        await Assert.ThrowsAnyAsync<Exception>(async () =>
        {
            await third.StartAsync();
            // Rejection happens in OnConnectedAsync; the server then closes the connection.
            await third.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest("CYBER-NONE"));
        });

        for (var attempt = 0; attempt < 3; attempt++)
        {
            var guess = await first.InvokeAsync<HubResponse<RoomJoinResultDto>>(
                "JoinRoom", new JoinRoomRequest(NewRoomCode("G"), "Guesser"));
            Assert.Equal("Room.NotFound", guess.ErrorCode);
        }

        var blocked = await Assert.ThrowsAsync<HubException>(() =>
            second.InvokeAsync<HubResponse<RoomJoinResultDto>>(
                "JoinRoom", new JoinRoomRequest(NewRoomCode("G"), "Guesser")));
        Assert.Contains("Join rate limit", blocked.Message);
    }

    private sealed class FixedRemoteIpStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                context.Connection.RemoteIpAddress = IPAddress.Parse("2001:db8:1234:5678::42");
                return nextMiddleware(context);
            });
            next(app);
        };
    }
}
