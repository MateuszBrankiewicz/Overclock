using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
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

        var traceCalled = new TraceCalledEvent(
            Type: "TraceCalled",
            RoomCode: "CYBER-7X9",
            CallerId: player1Id,
            AccusedPlayerId: player2Id,
            RevealedCards: new List<CardDto>
            {
                new(cardId, CardSuit.Overload, 8)
            },
            BluffDetected: true);

        var turnStarted = new TurnStartedEvent(
            Type: "TurnStarted",
            RoomCode: "CYBER-7X9",
            ActivePlayerId: player1Id,
            TurnDeadlineUtc: new DateTime(2026, 10, 16, 12, 0, 0, DateTimeKind.Utc),
            CurrentVoltage: 120);

        var voltageOverloaded = new VoltageOverloadedEvent(
            Type: "VoltageOverloaded",
            RoomCode: "CYBER-7X9",
            EliminatedPlayerId: player2Id,
            FinalVoltage: 240);

        await File.WriteAllTextAsync(Path.Combine(fixtureDir, "TraceCalled.json"), JsonSerializer.Serialize(traceCalled, JsonOptions));
        await File.WriteAllTextAsync(Path.Combine(fixtureDir, "TurnStarted.json"), JsonSerializer.Serialize(turnStarted, JsonOptions));
        await File.WriteAllTextAsync(Path.Combine(fixtureDir, "VoltageOverloaded.json"), JsonSerializer.Serialize(voltageOverloaded, JsonOptions));

        Assert.True(File.Exists(Path.Combine(fixtureDir, "TraceCalled.json")));
    }

    private static string? FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (File.Exists(Path.Combine(dir, "Overclock.slnx")) || Directory.Exists(Path.Combine(dir, ".git")))
            {
                return dir;
            }
            dir = Path.GetDirectoryName(dir);
        }
        return null;
    }
}
