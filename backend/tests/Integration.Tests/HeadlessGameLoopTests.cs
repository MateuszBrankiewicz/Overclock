using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Overclock.Host.Hubs;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.SharedKernel;
using Xunit;

namespace Integration.Tests;

public class HeadlessGameLoopTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private HubConnection CreateHubConnection(WebApplicationFactory<Program>? customFactory = null)
    {
        var targetFactory = customFactory ?? factory;
        return new HubConnectionBuilder()
            .WithUrl(
                "http://localhost/hubs/game",
                options =>
                {
                    options.HttpMessageHandlerFactory = _ => targetFactory.Server.CreateHandler();
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

    [Fact]
    public async Task Intermission_AdvancesRoundAutomatically_EvenWhenHostDisconnectsDuringIntermission()
    {
        var testFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddSingleton<ITurnTimerEngine>(sp =>
                    new TurnTimerEngine(
                        sp.GetRequiredService<ITurnDelay>(),
                        sp.GetService<IGameNotifier>(),
                        sp.GetService<IGameStateProjector>(),
                        sp.GetService<IRandomSource>(),
                        turnDuration: TimeSpan.FromSeconds(15),
                        intermissionDuration: TimeSpan.FromMilliseconds(400)));
            });
        });

        var roomCode = $"CYBER-I{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";

        await using var connHost = CreateHubConnection(testFactory);
        await connHost.StartAsync();
        var respHost = await connHost.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "CreateRoom",
            new CreateRoomRequest("HostPlayer", roomCode));
        Assert.True(respHost.IsSuccess, respHost.Error);

        await using var connGuest1 = CreateHubConnection(testFactory);
        await connGuest1.StartAsync();
        var respGuest1 = await connGuest1.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "Guest1"));
        Assert.True(respGuest1.IsSuccess, respGuest1.Error);

        await using var connGuest2 = CreateHubConnection(testFactory);
        await connGuest2.StartAsync();
        var respGuest2 = await connGuest2.InvokeAsync<HubResponse<RoomJoinResultDto>>(
            "JoinRoom",
            new JoinRoomRequest(roomCode, "Guest2"));
        Assert.True(respGuest2.IsSuccess, respGuest2.Error);

        var roundStartedTcs = new TaskCompletionSource<RoundStartedDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connGuest1.On<RoundStartedDto>("RoundStarted", r =>
        {
            if (r.RoundNumber == 2)
            {
                roundStartedTcs.TrySetResult(r);
            }
        });

        var roundOverTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connGuest1.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "RoundOver")
            {
                roundOverTcs.TrySetResult(s);
            }
        });

        var voltageStartedTcs = new TaskCompletionSource<VoltageTestStartedEvent>(TaskCreationOptions.RunContinuationsAsynchronously);
        connGuest1.On<VoltageTestStartedEvent>("VoltageTestStarted", v => voltageStartedTcs.TrySetResult(v));

        var round2ActiveTcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connGuest1.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive" && s.RoundNumber == 2)
            {
                round2ActiveTcs.TrySetResult(s);
            }
        });

        var hostRound1Tcs = new TaskCompletionSource<PlayerGameStateDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        connHost.On<PlayerGameStateDto>("ReceiveGameState", s =>
        {
            if (s.State == "TurnActive" && s.RoundNumber == 1)
            {
                hostRound1Tcs.TrySetResult(s);
            }
        });

        await connHost.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await connGuest1.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));
        await connGuest2.InvokeAsync<HubResponse>("SetReady", new SetReadyRequest(roomCode, true));

        var startResp = await connHost.InvokeAsync<HubResponse>("StartRound", new StartRoundRequest(roomCode));
        Assert.True(startResp.IsSuccess, startResp.Error);

        var hostRound1State = await hostRound1Tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotEmpty(hostRound1State.MyHand);
        var targetProtocol = Enum.Parse<CardProtocol>(hostRound1State.CurrentTargetProtocol!);

        var playResp = await connHost.InvokeAsync<HubResponse>(
            "PlayCards",
            new PlayCardsRequest(roomCode, [hostRound1State.MyHand[0].Id], targetProtocol));
        Assert.True(playResp.IsSuccess, playResp.Error);

        var traceResp = await connGuest1.InvokeAsync<HubResponse<TraceResolutionDto>>(
            "CallTrace",
            new CallTraceRequest(roomCode));
        Assert.True(traceResp.IsSuccess, traceResp.Error);

        var completedTask = await Task.WhenAny(roundOverTcs.Task, voltageStartedTcs.Task);
        if (completedTask == voltageStartedTcs.Task)
        {
            var voltageEvent = await voltageStartedTcs.Task;
            var loserConn = voltageEvent.PendingPlayerId == respHost.Data!.PlayerId
                ? connHost
                : (voltageEvent.PendingPlayerId == respGuest1.Data!.PlayerId ? connGuest1 : connGuest2);
            await loserConn.InvokeAsync<HubResponse>("TriggerDischarge", new TriggerDischargeRequest(roomCode));
        }

        var roundOverState = await roundOverTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.NotNull(roundOverState.IntermissionDeadlineUtc);
        Assert.True(roundOverState.IntermissionDeadlineUtc > DateTime.UtcNow);

        // Host drops during intermission
        await connHost.StopAsync();
        await connHost.DisposeAsync();

        // Server advances automatically without any client calling StartRound
        var round2Started = await roundStartedTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal(2, round2Started.RoundNumber);

        var round2State = await round2ActiveTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Equal("TurnActive", round2State.State);
        Assert.Equal(2, round2State.RoundNumber);
    }
}

