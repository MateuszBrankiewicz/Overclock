using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
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

    [Fact]
    public async Task AntiCheat_BroadcastAndSnapshot_NeverExposesOpponentCardsOrHiddenTableCards()
    {
        var roomCode = $"CYBER-A{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        // 1. Host creates room
        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var hostCreateResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("AliceHost", roomCode));
        Assert.True(hostCreateResponse.IsSuccess);

        // 2. Guest joins room
        await using var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();

        var guestJoinResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "BobGuest"));
        Assert.True(guestJoinResponse.IsSuccess);

        var hostPlayerId = hostCreateResponse.Data!.PlayerId;
        var guestPlayerId = guestJoinResponse.Data!.PlayerId;

        // 3. Register ReceiveGameState handlers
        var hostReceivedInitialState = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                hostReceivedInitialState.TrySetResult(s);
            }
        });

        var guestReceivedInitialState = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        guestConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                guestReceivedInitialState.TrySetResult(s);
            }
        });

        // 4. Ready up
        await hostConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await guestConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));

        // 5. Start round
        var startResponse = await hostConnection.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResponse.IsSuccess);

        var hostState = await hostReceivedInitialState.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var guestState = await guestReceivedInitialState.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.NotNull(hostState);
        Assert.NotNull(guestState);

        // 6. Assert each player receives only their own cards
        Assert.Equal(5, hostState.MyHand.Count);
        Assert.Equal(5, guestState.MyHand.Count);

        var hostCardIds = hostState.MyHand.Select(c => c.Id).ToHashSet();
        var guestCardIds = guestState.MyHand.Select(c => c.Id).ToHashSet();

        // The two hands must be completely disjoint
        Assert.Empty(hostCardIds.Intersect(guestCardIds));

        // Opponent seats must show hand count, but zero card contents
        var guestSeatInHostView = hostState.Seats.First(s => s.PlayerId == guestPlayerId);
        Assert.Equal(5, guestSeatInHostView.HandCount);

        var hostSeatInGuestView = guestState.Seats.First(s => s.PlayerId == hostPlayerId);
        Assert.Equal(5, hostSeatInGuestView.HandCount);

        // Strict anti-cheat check: Host payload JSON has ZERO opponent card IDs, and vice-versa
        var hostJson = JsonSerializer.Serialize(hostState);
        foreach (var guestCardId in guestCardIds)
        {
            Assert.DoesNotContain(guestCardId.ToString(), hostJson);
        }

        var guestJson = JsonSerializer.Serialize(guestState);
        foreach (var hostCardId in hostCardIds)
        {
            Assert.DoesNotContain(hostCardId.ToString(), guestJson);
        }

        // 7. Active player plays a card
        var activePlayerConnection = hostState.CurrentTurnPlayerId == hostPlayerId ? hostConnection : guestConnection;
        var waitingPlayerConnection = hostState.CurrentTurnPlayerId == hostPlayerId ? guestConnection : hostConnection;
        var activeHand = hostState.CurrentTurnPlayerId == hostPlayerId ? hostState.MyHand : guestState.MyHand;
        var activeTargetProtocol = Enum.Parse<CardProtocol>(hostState.CurrentTargetProtocol!);

        var playedCardId = activeHand[0].Id;
        var waitingReceivedPostPlayState = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        waitingPlayerConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.TablePileCount > 0)
            {
                waitingReceivedPostPlayState.TrySetResult(s);
            }
        });

        var playResponse = await activePlayerConnection.InvokeAsync<HubResponse>(
            "PlayCards",
            new PlayCardsRequest(roomCode, [playedCardId], activeTargetProtocol));
        Assert.True(playResponse.IsSuccess);

        var postPlayWaitingState = await waitingReceivedPostPlayState.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(postPlayWaitingState);
        Assert.Equal(1, postPlayWaitingState.TablePileCount);

        // Strict anti-cheat check: The card played face-down is NOT leaked to waiting player
        var postPlayJson = JsonSerializer.Serialize(postPlayWaitingState);
        Assert.DoesNotContain(playedCardId.ToString(), postPlayJson);
    }

    [Fact]
    public async Task CallTrace_ResolvesBluffAndBroadcastsResolution()
    {
        var roomCode = $"CYBER-T{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

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

        var hostPlayerId = hostResponse.Data!.PlayerId;

        var hostTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                hostTcs.TrySetResult(s);
            }
        });

        var guestTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        guestConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                guestTcs.TrySetResult(s);
            }
        });

        var roundStartedTcs = new TaskCompletionSource<RoundStartedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostConnection.On<RoundStartedDto>("RoundStarted", r => roundStartedTcs.TrySetResult(r));

        await hostConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await guestConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        var startResponse = await hostConnection.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResponse.IsSuccess);

        var roundStartedEvent = await roundStartedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(roundStartedEvent);
        Assert.Equal(roomCode, roundStartedEvent.RoomCode);
        Assert.Equal(1, roundStartedEvent.RoundNumber);

        var hostState = await hostTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var guestState = await guestTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var activeConnection = hostState.CurrentTurnPlayerId == hostPlayerId ? hostConnection : guestConnection;
        var waitingConnection = hostState.CurrentTurnPlayerId == hostPlayerId ? guestConnection : hostConnection;
        var activeHand = hostState.CurrentTurnPlayerId == hostPlayerId ? hostState.MyHand : guestState.MyHand;
        var activeTargetProtocol = Enum.Parse<CardProtocol>(hostState.CurrentTargetProtocol!);

        var cardsPlayedTcs = new TaskCompletionSource<CardsPlayedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        waitingConnection.On<CardsPlayedDto>("CardsPlayed", cp => cardsPlayedTcs.TrySetResult(cp));

        var playResponse = await activeConnection.InvokeAsync<HubResponse>(
            "PlayCards",
            new PlayCardsRequest(roomCode, [activeHand[0].Id], activeTargetProtocol));
        Assert.True(playResponse.IsSuccess);

        var cardsPlayedEvent = await cardsPlayedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(cardsPlayedEvent);
        Assert.Equal(1, cardsPlayedEvent.CardCount);
        Assert.Equal(activeTargetProtocol.ToString(), cardsPlayedEvent.DeclaredProtocol);

        var traceBroadcastTcs = new TaskCompletionSource<TraceResolutionDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        activeConnection.On<TraceResolutionDto>("TraceCalled", res => traceBroadcastTcs.TrySetResult(res));

        var traceResponse = await waitingConnection.InvokeAsync<HubResponse<TraceResolutionDto>>(
            "CallTrace",
            new CallTraceRequest(roomCode));

        Assert.NotNull(traceResponse);
        Assert.True(traceResponse.IsSuccess, traceResponse.Error);
        Assert.NotNull(traceResponse.Data);
        Assert.NotEmpty(traceResponse.Data.RevealedCards);

        var broadcastRes = await traceBroadcastTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(broadcastRes);
        Assert.Equal(traceResponse.Data.LoserPlayerId, broadcastRes.LoserPlayerId);
    }

    [Fact]
    public async Task Reconnect_PushesSnapshotViaReceiveGameState()
    {
        var roomCode = $"CYBER-P{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();

        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();

        var guestResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "GuestPlayer"));
        Assert.True(guestResponse.IsSuccess);

        var guestSessionToken = guestResponse.Data!.SessionToken;
        await guestConnection.StopAsync();
        await guestConnection.DisposeAsync();
        await Task.Delay(100);

        await using var reconnectedConnection = CreateHubConnection();
        var snapshotTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        reconnectedConnection.On<PlayerGameStateDto>("ReceiveGameState", s => snapshotTcs.TrySetResult(s));

        await reconnectedConnection.StartAsync();
        var reconnectResponse = await reconnectedConnection.InvokeAsync<HubResponse<PlayerGameStateDto>>(
            "Reconnect",
            new ReconnectRequest(roomCode, guestSessionToken));

        Assert.True(reconnectResponse.IsSuccess);
        var pushedSnapshot = await snapshotTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(pushedSnapshot);
        Assert.Equal(roomCode, pushedSnapshot.RoomCode);
    }

    [Fact]
    public async Task Snapshot_carries_turn_deadline_while_turn_active()
    {
        var roomCode = $"CYBER-T{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);
        Assert.Null(hostResponse.Data!.GameState.TurnDeadlineUtc);

        await using var guestConnection = CreateHubConnection();
        await guestConnection.StartAsync();
        var guestResponse = await guestConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "GuestPlayer"));
        Assert.True(guestResponse.IsSuccess);
        Assert.Null(guestResponse.Data!.GameState.TurnDeadlineUtc);

        var hostTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        var guestTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);

        hostConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                hostTcs.TrySetResult(s);
            }
        });

        guestConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive")
            {
                guestTcs.TrySetResult(s);
            }
        });

        await hostConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await guestConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));

        var beforeStart = DateTime.UtcNow;
        var startResponse = await hostConnection.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResponse.IsSuccess);

        var hostState1 = await hostTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var guestState1 = await guestTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal("TurnActive", hostState1.State);
        Assert.NotNull(hostState1.TurnDeadlineUtc);
        Assert.InRange(hostState1.TurnDeadlineUtc.Value, beforeStart.AddSeconds(13), beforeStart.AddSeconds(16));

        Assert.Equal("TurnActive", guestState1.State);
        Assert.NotNull(guestState1.TurnDeadlineUtc);
        Assert.InRange(guestState1.TurnDeadlineUtc.Value, beforeStart.AddSeconds(13), beforeStart.AddSeconds(16));

        // Now have the current turn player play cards
        var activePlayerId = hostState1.CurrentTurnPlayerId;
        var activeConnection = activePlayerId == hostResponse.Data.PlayerId ? hostConnection : guestConnection;
        var activeState = activePlayerId == hostResponse.Data.PlayerId ? hostState1 : guestState1;
        var cardToPlay = activeState.MyHand[0].Id;
        var activeTargetProtocol = Enum.Parse<CardProtocol>(hostState1.CurrentTargetProtocol!);

        var hostTurn2Tcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        var guestTurn2Tcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);

        hostConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.SequenceNumber > hostState1.SequenceNumber)
            {
                hostTurn2Tcs.TrySetResult(s);
            }
        });

        guestConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.SequenceNumber > guestState1.SequenceNumber)
            {
                guestTurn2Tcs.TrySetResult(s);
            }
        });

        var beforePlay = DateTime.UtcNow;
        var playResponse = await activeConnection.InvokeAsync<HubResponse>(
            "PlayCards",
            new PlayCardsRequest(roomCode, [cardToPlay], activeTargetProtocol));
        Assert.True(playResponse.IsSuccess, playResponse.Error);

        var hostState2 = await hostTurn2Tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var guestState2 = await guestTurn2Tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal("TurnActive", hostState2.State);
        Assert.NotNull(hostState2.TurnDeadlineUtc);
        Assert.InRange(hostState2.TurnDeadlineUtc.Value, beforePlay.AddSeconds(13), beforePlay.AddSeconds(16));

        Assert.Equal("TurnActive", guestState2.State);
        Assert.NotNull(guestState2.TurnDeadlineUtc);
        Assert.InRange(guestState2.TurnDeadlineUtc.Value, beforePlay.AddSeconds(13), beforePlay.AddSeconds(16));
    }

    [Fact]
    public async Task LeaveRoom_InLobby_RemovesPlayerAndUpdatesHost()
    {
        var roomCode = $"CYBER-L{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

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

        var guestUpdatedStateTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        guestConnection.On<PlayerGameStateDto>("ReceiveGameState", s => guestUpdatedStateTcs.TrySetResult(s));

        var leaveResponse = await hostConnection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest(roomCode));
        Assert.True(leaveResponse.IsSuccess, leaveResponse.Error);

        var guestState = await guestUpdatedStateTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(guestResponse.Data!.PlayerId, guestState.HostId);
        Assert.Single(guestState.Seats);
        Assert.Equal(guestResponse.Data!.PlayerId, guestState.Seats[0].PlayerId);
    }

    [Fact]
    public async Task LeaveRoom_InGame_EliminatesPlayerAndEndsGame()
    {
        var roomCode = $"CYBER-G{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

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

        await hostConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await guestConnection.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));

        var hostGameOverTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostConnection.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "GameOver")
            {
                hostGameOverTcs.TrySetResult(s);
            }
        });

        var statusChangedTcs = new TaskCompletionSource<PlayerStatusChangedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        hostConnection.On<PlayerStatusChangedDto>("PlayerStatusChanged", s => statusChangedTcs.TrySetResult(s));

        await hostConnection.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));

        var leaveResponse = await guestConnection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest(roomCode));
        Assert.True(leaveResponse.IsSuccess, leaveResponse.Error);

        var hostState = await hostGameOverTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal("GameOver", hostState.State);
        Assert.Equal(hostResponse.Data!.PlayerId, hostState.WinnerId);

        var statusChanged = await statusChangedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(guestResponse.Data!.PlayerId, statusChanged.PlayerId);
        Assert.Equal("Eliminated", statusChanged.Status);
    }

    [Fact]
    public async Task LeaveRoom_LastPlayerInLobby_RemovesRoomFromRegistry()
    {
        var roomCode = $"CYBER-E{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var hostConnection = CreateHubConnection();
        await hostConnection.StartAsync();
        var hostResponse = await hostConnection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        var leaveResponse = await hostConnection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest(roomCode));
        Assert.True(leaveResponse.IsSuccess, leaveResponse.Error);

        var registry = factory.Services.GetRequiredService<IGameRoomRegistry>();
        Assert.False(registry.TryGet(roomCode, out _));
    }

    [Fact]
    public async Task LeaveRoom_CancelsGracePeriod()
    {
        var roomCode = $"CYBER-P{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

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

        var graceManager = factory.Services.GetRequiredService<IDisconnectGraceManager>();
        graceManager.StartGracePeriod(
            roomCode,
            new PlayerId(guestResponse.Data!.PlayerId),
            guestResponse.Data!.SessionToken,
            TimeSpan.FromMinutes(1),
            () => ValueTask.CompletedTask);

        Assert.True(graceManager.HasActiveGracePeriod(guestResponse.Data!.SessionToken));

        var leaveResponse = await guestConnection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest(roomCode));
        Assert.True(leaveResponse.IsSuccess, leaveResponse.Error);

        Assert.False(graceManager.HasActiveGracePeriod(guestResponse.Data!.SessionToken));
    }

    [Fact]
    public async Task LeaveRoom_WhenNotJoined_ReturnsSuccess()
    {
        await using var connection = CreateHubConnection();
        await connection.StartAsync();

        var response = await connection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest("CYBER-NONE"));
        Assert.True(response.IsSuccess);
    }

    [Fact]
    public async Task LeaveRoom_WhenRoomMismatch_ReturnsForbidden()
    {
        var roomCode = $"CYBER-M{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var connection = CreateHubConnection();
        await connection.StartAsync();
        var hostResponse = await connection.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(hostResponse.IsSuccess);

        var response = await connection.InvokeAsync<HubResponse>("LeaveRoom", new LeaveRoomRequest("CYBER-OTHER"));
        Assert.False(response.IsSuccess);
        Assert.Equal("Connection.RoomMismatch", response.ErrorCode);
    }
}

