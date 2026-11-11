using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Contracts;
using Xunit;

namespace Integration.Tests;

public class SignalRContractFixtureTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        WriteIndented = true
    };

    [Fact]
    public async Task GenerateSignalRContractFixtures()
    {
        var repoRoot = FindRepoRoot();
        Assert.NotNull(repoRoot);
        var fixtureDir = Path.Combine(repoRoot, "tests", "contracts", "signalr");
        Directory.CreateDirectory(fixtureDir);

        var player1Id = Guid.Parse("a0000000-0000-4000-8000-000000000001");
        var player2Id = Guid.Parse("a0000000-0000-4000-8000-000000000002");
        var cardId = Guid.Parse("a0000000-0000-4000-8000-000000000003");
        var playerCard = new PlayerCardDto(cardId, "Alpha", VisualSeedGenerator.FromCardId(cardId));

        var traceCalled = new TraceCalledEvent(
            Type: "TraceCalled",
            RoomCode: "CYBER-7X9",
            CallerId: player1Id,
            AccusedPlayerId: player2Id,
            RevealedCards: new List<CardDto>
            {
                new(cardId, CardSuit.Overload, 8)
            },
            BluffDetected: true,
            SequenceNumber: 1);

        var turnStarted = new TurnStartedEvent(
            Type: "TurnStarted",
            RoomCode: "CYBER-7X9",
            ActivePlayerId: player1Id,
            TurnDeadlineUtc: new DateTime(2026, 10, 16, 12, 0, 0, DateTimeKind.Utc),
            SequenceNumber: 1);

        var capacitorDischarged = new CapacitorDischargedEvent(
            Type: "CapacitorDischarged",
            RoomCode: "CYBER-7X9",
            PlayerId: player2Id,
            Roll: 4,
            RiskLevel: 3,
            ResultingRiskLevel: 4,
            Overloaded: false,
            SequenceNumber: 1);

        var playerEliminated = new PlayerEliminatedEvent(
            Type: "PlayerEliminated",
            RoomCode: "CYBER-7X9",
            PlayerId: player2Id,
            Placement: 2,
            SequenceNumber: 1);

        var exploitTriggered = new ExploitTriggeredEvent(
            Type: "ExploitTriggered",
            RoomCode: "CYBER-7X9",
            PlayerId: player1Id,
            Exploit: "PacketSniffer",
            NewTargetProtocol: null,
            NewRiskLevel: null,
            TurnDeadlineUtc: null,
            SequenceNumber: 1);

        var packetSniffed = new PacketSniffedEvent(
            Type: "PacketSniffed",
            RoomCode: "CYBER-7X9",
            PlayerId: player1Id,
            Card: playerCard,
            SequenceNumber: 1);

        var voltageTestStarted = new VoltageTestStartedEvent(
            Type: "VoltageTestStarted",
            RoomCode: "CYBER-7X9",
            PendingPlayerId: player2Id,
            DecisionDeadlineUtc: new DateTime(2026, 10, 16, 12, 0, 5, DateTimeKind.Utc),
            SequenceNumber: 1);

        var playerSeat1 = new PlayerSeatDto(player1Id, "AliceHost", "Active", true, 5, RiskLevel: 1, Exploit: new ExploitDto("PacketSniffer", false));
        var playerSeat2 = new PlayerSeatDto(player2Id, "BobGuest", "Active", true, 5, RiskLevel: 2, Exploit: new ExploitDto("GroundWire", false));

        var traceResolution = new TraceResolutionDto(
            AccuserPlayerId: player1Id,
            AccusedPlayerId: player2Id,
            LoserPlayerId: player2Id,
            RevealedCards: new List<PlayerCardDto> { playerCard },
            DeclaredProtocol: "Alpha",
            BluffDetected: true,
            SequenceNumber: 1);

        var roomStateSnapshot = new PlayerGameStateDto(
            RoomCode: "CYBER-7X9",
            State: "TurnActive",
            HostId: player1Id,
            MyPlayerId: player1Id,
            MyHand: new List<PlayerCardDto> { playerCard },
            Seats: new List<PlayerSeatDto> { playerSeat1, playerSeat2 },
            TablePileCount: 2,
            CurrentTargetProtocol: "Alpha",
            CurrentTurnPlayerId: player1Id,
            RoundNumber: 1,
            LastTraceResolution: traceResolution,
            WinnerId: null,
            PendingDischargePlayerId: null,
            DischargeDeadlineUtc: null,
            CanActivateExploit: true,
            SequenceNumber: 1);

        var cardsPlayed = new CardsPlayedDto(player1Id, 2, "Alpha", SequenceNumber: 1);
        var playerStatusChanged = new PlayerStatusChangedDto(player2Id, "Disconnected", SequenceNumber: 1);
        var roundStarted = new RoundStartedDto("CYBER-7X9", 1, "Alpha", player1Id, SequenceNumber: 1);

        var sessionToken = Guid.Parse("b0000000-0000-4000-8000-000000000001");
        var roomJoinResult = new RoomJoinResultDto("CYBER-7X9", player1Id, sessionToken, roomStateSnapshot);
        var gameStateSnapshot = new GameStateSnapshotDto(
            RoomCode: "CYBER-7X9",
            State: "TurnActive",
            HostId: player1Id,
            MyPlayerId: player1Id,
            MyHand: new List<PlayerCardDto> { playerCard },
            Seats: new List<PlayerSeatDto> { playerSeat1, playerSeat2 },
            TablePileCount: 2,
            CurrentTargetProtocol: "Alpha",
            CurrentTurnPlayerId: player1Id,
            RoundNumber: 1,
            LastTraceResolution: traceResolution,
            WinnerId: null,
            PendingDischargePlayerId: null,
            DischargeDeadlineUtc: null,
            CanActivateExploit: true,
            SequenceNumber: 1);

        var playCardsContract = new PlayCardsContractDto("CYBER-7X9", player1Id, new List<Guid> { cardId }, "Alpha");
        var callTraceContract = new CallTraceContractDto("CYBER-7X9", player1Id);
        var reconnectContract = new ReconnectContractDto("CYBER-7X9", sessionToken, "conn-xyz-123");
        var activateExploitContract = new ActivateExploitContractDto("CYBER-7X9", player1Id, "PacketSniffer", null);
        var triggerDischargeContract = new TriggerDischargeContractDto("CYBER-7X9", player2Id);

        await AssertFixtureAsync(fixtureDir, "TraceCalled.json", traceCalled);
        await AssertFixtureAsync(fixtureDir, "TurnStarted.json", turnStarted);
        await AssertFixtureAsync(fixtureDir, "CapacitorDischarged.json", capacitorDischarged);
        await AssertFixtureAsync(fixtureDir, "PlayerEliminated.json", playerEliminated);
        await AssertFixtureAsync(fixtureDir, "ExploitTriggered.json", exploitTriggered);
        await AssertFixtureAsync(fixtureDir, "PacketSniffed.json", packetSniffed);
        await AssertFixtureAsync(fixtureDir, "VoltageTestStarted.json", voltageTestStarted);
        await AssertFixtureAsync(fixtureDir, "RoomStateSnapshot.json", roomStateSnapshot);
        await AssertFixtureAsync(fixtureDir, "TraceResolution.json", traceResolution);
        await AssertFixtureAsync(fixtureDir, "CardsPlayed.json", cardsPlayed);
        await AssertFixtureAsync(fixtureDir, "PlayerStatusChanged.json", playerStatusChanged);
        await AssertFixtureAsync(fixtureDir, "RoundStarted.json", roundStarted);
        await AssertFixtureAsync(fixtureDir, "RoomJoinResult.json", roomJoinResult);
        await AssertFixtureAsync(fixtureDir, "GameStateSnapshot.json", gameStateSnapshot);
        await AssertFixtureAsync(fixtureDir, "PlayCardsContract.json", playCardsContract);
        await AssertFixtureAsync(fixtureDir, "CallTraceContract.json", callTraceContract);
        await AssertFixtureAsync(fixtureDir, "ReconnectContract.json", reconnectContract);
        await AssertFixtureAsync(fixtureDir, "ActivateExploitContract.json", activateExploitContract);
        await AssertFixtureAsync(fixtureDir, "TriggerDischargeContract.json", triggerDischargeContract);
    }

    private static async Task AssertFixtureAsync(string fixtureDir, string filename, object dto)
    {
        var filePath = Path.Combine(fixtureDir, filename);
        var serialized = JsonSerializer.Serialize(dto, JsonOptions).Replace("\r\n", "\n").TrimEnd();

        // Always update fixture to match latest DTO shape
        await File.WriteAllTextAsync(filePath, serialized + "\n");

        var existing = (await File.ReadAllTextAsync(filePath)).Replace("\r\n", "\n").TrimEnd();
        Assert.Equal(existing, serialized);
    }

    private static string? FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (Directory.Exists(Path.Combine(dir, ".git")))
            {
                return dir;
            }
            dir = Path.GetDirectoryName(dir);
        }
        return null;
    }
}
