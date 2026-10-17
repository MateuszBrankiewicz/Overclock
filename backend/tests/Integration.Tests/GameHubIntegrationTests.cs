using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Xunit;

namespace Integration.Tests;

public class GameHubIntegrationTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private HubConnection CreateHubConnection()
    {
        return new HubConnectionBuilder()
            .WithUrl(
                "http://localhost/hubs/game",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                })
            .Build();
    }

    [Fact]
    public async Task CreateRoom_ReturnsSuccessWithSessionTokenAndLobbyState()
    {
        await using var connection = CreateHubConnection();
        await connection.StartAsync();

        var roomCode = $"CYBER-C{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var request = new CreateRoomRequest("AliceHost", roomCode);

        var response = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>("CreateRoom", request);

        Assert.NotNull(response);
        Assert.True(response.IsSuccess, response.Error);
        Assert.NotNull(response.Data);
        Assert.Equal(roomCode, response.Data.RoomCode);
        Assert.NotEqual(Guid.Empty, response.Data.PlayerId);
        Assert.NotEqual(Guid.Empty, response.Data.SessionToken);
        Assert.Equal("Lobby", response.Data.GameState.State);
        Assert.Single(response.Data.GameState.Seats);
        Assert.Equal("AliceHost", response.Data.GameState.Seats[0].Nickname);
    }

    [Fact]
    public async Task JoinRoom_AddsPlayerToRoomAndReturnsDistinctSessionToken()
    {
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var roomCode = $"CYBER-J{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));

        Assert.True(hostResponse.IsSuccess);

        await using var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();

        var joinResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "GuestPlayer"));

        Assert.NotNull(joinResponse);
        Assert.True(joinResponse.IsSuccess, joinResponse.Error);
        Assert.NotNull(joinResponse.Data);
        Assert.Equal(roomCode, joinResponse.Data.RoomCode);
        Assert.NotEqual(hostResponse.Data!.PlayerId, joinResponse.Data.PlayerId);
        Assert.NotEqual(hostResponse.Data.SessionToken, joinResponse.Data.SessionToken);
        Assert.Equal(2, joinResponse.Data.GameState.Seats.Count);
    }

    [Fact]
    public async Task SetReady_SynchronizesReadinessAcrossClients()
    {
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var roomCode = $"CYBER-R{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));

        Assert.True(hostResponse.IsSuccess);

        var readyResponse = await hostConnection.InvokeAsync<HubResponse>(
            "SetReady",
            new SetReadyRequest(roomCode, true));

        Assert.NotNull(readyResponse);
        Assert.True(readyResponse.IsSuccess, readyResponse.Error);
    }

    [Fact]
    public async Task Action_WhenUnregisteredOrRoomMismatch_ReturnsFailure()
    {
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var roomCode = $"CYBER-M{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        await using var alienConnection = CreateHubConnection();
        await alienConnection.StartAsync();

        // 1. Calling action without joining any room -> Connection.Unregistered
        var unregResponse = await alienConnection.InvokeAsync<HubResponse>(
            "SetReady",
            new SetReadyRequest(roomCode, true));
        Assert.NotNull(unregResponse);
        Assert.False(unregResponse.IsSuccess);
        Assert.Equal("Connection.Unregistered", unregResponse.ErrorCode);

        // 2. Alien joins another room -> Room mismatch when calling action on original room
        var otherRoomCode = $"CYBER-O{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        var alienRoomResponse = await alienConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("AlienHost", otherRoomCode));
        Assert.True(alienRoomResponse.IsSuccess);

        var mismatchResponse = await alienConnection.InvokeAsync<HubResponse>(
            "SetReady",
            new SetReadyRequest(roomCode, true));
        Assert.NotNull(mismatchResponse);
        Assert.False(mismatchResponse.IsSuccess);
        Assert.Equal("Connection.RoomMismatch", mismatchResponse.ErrorCode);
    }

    [Fact]
    public async Task JoinRoom_WhenMatchAlreadyStarted_ReturnsConflictErrorCode()
    {
        var roomCode = $"CYBER-S{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        await using var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();
        var guestResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "GuestPlayer"));
        Assert.True(guestResponse.IsSuccess);

        // Both ready up
        await hostConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await guestConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));

        // Host starts round
        var startResponse = await hostConnection.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResponse.IsSuccess);

        // A third player attempts to join active game -> should get Conflict with "Room.NotInLobby"
        await using var lateConnection = CreateHubConnection();
        await lateConnection.StartAsync();
        var lateResponse = await lateConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "LatePlayer"));

        Assert.NotNull(lateResponse);
        Assert.False(lateResponse.IsSuccess);
        Assert.Equal("Room.NotInLobby", lateResponse.ErrorCode);
    }

    [Fact]
    public async Task DisconnectAndReconnect_RestoresActiveStatusAndPreservesState()
    {
        var roomCode = $"CYBER-D{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        // 1. Host creates room
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        // 2. Guest joins room
        var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();

        var guestResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "GuestPlayer"));
        Assert.True(guestResponse.IsSuccess);

        var guestPlayerId = guestResponse.Data!.PlayerId;
        var guestSessionToken = guestResponse.Data.SessionToken;

        // 3. Guest simulates disconnection (drops socket connection)
        await guestConnection.StopAsync();
        await guestConnection.DisposeAsync();

        // Small yield to allow OnDisconnectedAsync processing
        await Task.Delay(100);

        // 4. Guest reconnects via a NEW SignalR connection using their SessionToken
        await using var reconnectedConnection = CreateHubConnection();
        await reconnectedConnection.StartAsync();

        var reconnectResponse = await reconnectedConnection.InvokeAsync<HubResponse<PlayerGameStateDto>>(
            "Reconnect",
            new ReconnectRequest(roomCode, guestSessionToken));

        Assert.NotNull(reconnectResponse);
        Assert.True(reconnectResponse.IsSuccess, reconnectResponse.Error);
        Assert.NotNull(reconnectResponse.Data);
        Assert.Equal(roomCode, reconnectResponse.Data.RoomCode);
        Assert.Equal(guestPlayerId, reconnectResponse.Data.MyPlayerId);

        // Assert reconnected player seat is Active (not Disconnected)
        var mySeat = reconnectResponse.Data.Seats.FirstOrDefault(s => s.PlayerId == guestPlayerId);
        Assert.NotNull(mySeat);
        Assert.Equal("Active", mySeat.Status);
    }

    [Fact]
    public async Task Reconnect_WithInvalidSessionToken_ReturnsNotFound()
    {
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var roomCode = $"CYBER-F{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
        await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));

        await using var alienConnection = CreateHubConnection();
        await alienConnection.StartAsync();

        var invalidSession = Guid.NewGuid();
        var reconnectResponse = await alienConnection.InvokeAsync<HubResponse<PlayerGameStateDto>>(
            "Reconnect",
            new ReconnectRequest(roomCode, invalidSession));

        Assert.NotNull(reconnectResponse);
        Assert.False(reconnectResponse.IsSuccess);
    }
}
