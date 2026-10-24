using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Xunit;

namespace Integration.Tests;

public class HeadlessGameLoopTests(WebApplicationFactory<Program> factory)
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
    public async Task Phase0_FullHeadlessGameLoop_ThreePlayers_PlayTurns_Reconnect_And_AntiCheat()
    {
        var roomCode = $"CYBER-H{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        // 1. Three virtual players connect and create/join the room
        await using var connA = CreateHubConnection();
        await connA.StartAsync();
        var respA = await connA.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("PlayerA", roomCode));
        Assert.True(respA.IsSuccess, respA.Error);
        var playerAId = respA.Data!.PlayerId;
        var sessionTokenA = respA.Data.SessionToken;

        await using var connB = CreateHubConnection();
        await connB.StartAsync();
        var respB = await connB.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "PlayerB"));
        Assert.True(respB.IsSuccess, respB.Error);
        var playerBId = respB.Data!.PlayerId;

        await using var connC = CreateHubConnection();
        await connC.StartAsync();
        var respC = await connC.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "PlayerC"));
        Assert.True(respC.IsSuccess, respC.Error);
        var playerCId = respC.Data!.PlayerId;

        // Register state capture listeners
        var stateTcsA = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connA.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive") stateTcsA.TrySetResult(s);
        });

        var stateTcsB = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connB.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive") stateTcsB.TrySetResult(s);
        });

        var stateTcsC = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connC.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive") stateTcsC.TrySetResult(s);
        });

        // 2. Synchronize readiness
        var readyA = await connA.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        Assert.True(readyA.IsSuccess, readyA.Error);
        var readyB = await connB.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        Assert.True(readyB.IsSuccess, readyB.Error);
        var readyC = await connC.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        Assert.True(readyC.IsSuccess, readyC.Error);

        // 3. Pass deal phase: Start Round
        var startResp = await connA.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResp.IsSuccess, startResp.Error);

        var initialStateA = await stateTcsA.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var initialStateB = await stateTcsB.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var initialStateC = await stateTcsC.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Assert.NotNull(initialStateA);
        Assert.NotNull(initialStateB);
        Assert.NotNull(initialStateC);

        Assert.NotEmpty(initialStateA.MyHand);
        Assert.NotEmpty(initialStateB.MyHand);
        Assert.NotEmpty(initialStateC.MyHand);

        // Success Criterion 3: Anti-Cheat verification
        // Hands must be completely disjoint
        var handAIds = initialStateA.MyHand.Select(c => c.Id).ToHashSet();
        var handBIds = initialStateB.MyHand.Select(c => c.Id).ToHashSet();
        var handCIds = initialStateC.MyHand.Select(c => c.Id).ToHashSet();

        Assert.Empty(handAIds.Intersect(handBIds));
        Assert.Empty(handAIds.Intersect(handCIds));
        Assert.Empty(handBIds.Intersect(handCIds));

        // Client B inspects payload JSON: ZERO information about Player A or Player C card types is leaked
        var jsonB = JsonSerializer.Serialize(initialStateB);
        foreach (var idA in handAIds)
        {
            Assert.DoesNotContain(idA.ToString(), jsonB);
        }
        foreach (var idC in handCIds)
        {
            Assert.DoesNotContain(idC.ToString(), jsonB);
        }

        // 4. Play 3 full turns
        var connections = new Dictionary<Guid, HubConnection>
        {
            [playerAId] = connA,
            [playerBId] = connB,
            [playerCId] = connC
        };

        var latestStates = new Dictionary<Guid, PlayerGameStateDto>
        {
            [playerAId] = initialStateA,
            [playerBId] = initialStateB,
            [playerCId] = initialStateC
        };

        // Wire real-time state updates
        connA.On<PlayerGameStateDto>("ReceiveGameState", s => latestStates[playerAId] = s);
        connB.On<PlayerGameStateDto>("ReceiveGameState", s => latestStates[playerBId] = s);
        connC.On<PlayerGameStateDto>("ReceiveGameState", s => latestStates[playerCId] = s);

        for (var turn = 1; turn <= 3; turn++)
        {
            var activePlayerId = latestStates[playerAId].CurrentTurnPlayerId!.Value;
            var activeConn = connections[activePlayerId];
            var activeState = latestStates[activePlayerId];
            var playedCard = activeState.MyHand[0];
            var declaredProtocol = Enum.Parse<CardProtocol>(activeState.CurrentTargetProtocol!);

            var playTcs = new TaskCompletionSource<CardsPlayedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
            connA.On<CardsPlayedDto>("CardsPlayed", cp => playTcs.TrySetResult(cp));

            var playResp = await activeConn.InvokeAsync<HubResponse>(
                "PlayCards",
                new PlayCardsRequest(roomCode, [playedCard.Id], declaredProtocol));
            Assert.True(playResp.IsSuccess, playResp.Error);

            await playTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));

            // Wait for single-writer channel loop to propagate snapshot to all players
            await Task.Delay(100);
            Assert.Equal(turn, latestStates[playerAId].TablePileCount);

            // Anti-cheat verification on table cards: face-down played card ID is never leaked
            var nonActivePlayer = activePlayerId == playerAId ? playerBId : playerAId;
            var nonActiveJson = JsonSerializer.Serialize(latestStates[nonActivePlayer]);
            Assert.DoesNotContain(playedCard.Id.ToString(), nonActiveJson);
        }

        // 5. Success Criterion 2: Player A simulates connection loss and reconnects
        var preDisconnectHandA = latestStates[playerAId].MyHand.Select(c => c.Id).ToList();

        // Socket drops
        await connA.StopAsync();
        await connA.DisposeAsync();
        await Task.Delay(150);

        // Reconnect within grace period with valid session token
        await using var reconnectedConnA = CreateHubConnection();
        await reconnectedConnA.StartAsync();

        var reconnectResp = await reconnectedConnA.InvokeAsync<HubResponse<PlayerGameStateDto>>(
            "Reconnect",
            new ReconnectRequest(roomCode, sessionTokenA));

        Assert.NotNull(reconnectResp);
        Assert.True(reconnectResp.IsSuccess, reconnectResp.Error);
        Assert.NotNull(reconnectResp.Data);
        Assert.Equal(roomCode, reconnectResp.Data.RoomCode);
        Assert.Equal(playerAId, reconnectResp.Data.MyPlayerId);

        // Restores their hand completely
        var restoredHandA = reconnectResp.Data.MyHand.Select(c => c.Id).ToList();
        Assert.Equal(preDisconnectHandA, restoredHandA);

        // Status is active
        var seatA = reconnectResp.Data.Seats.First(s => s.PlayerId == playerAId);
        Assert.Equal("Active", seatA.Status);

        // 6. Call TRACE to resolve bluffs and round
        var traceResolution = await reconnectedConnA.InvokeAsync<HubResponse<TraceResolutionDto>>(
            "CallTrace",
            new CallTraceRequest(roomCode));

        Assert.NotNull(traceResolution);
        Assert.True(traceResolution.IsSuccess, traceResolution.Error);
        Assert.NotNull(traceResolution.Data);
        Assert.NotEmpty(traceResolution.Data.RevealedCards);
    }
}

