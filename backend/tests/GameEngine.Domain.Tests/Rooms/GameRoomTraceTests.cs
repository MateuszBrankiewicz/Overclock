using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public class GameRoomTraceTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id) SetupActiveGame()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-300"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(new ConstantRandomSource(0)); // Target: Alpha
        return (room, hostId, p2Id);
    }

    [Fact]
    public void CallTrace_Fails_WhenNoCardsHaveBeenPlayed()
    {
        var (room, _, p2Id) = SetupActiveGame();

        var traceResult = room.CallTrace(p2Id);

        Assert.False(traceResult.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, traceResult.Status);
        Assert.Contains(traceResult.ValidationErrors, e => e.Identifier == "Trace.NoCardsPlayed");
    }

    [Fact]
    public void CallTrace_Fails_WhenPlayerChallengesThemselves()
    {
        var (room, hostId, _) = SetupActiveGame();
        var hostCard = room.Seats[0].Hand[0].Id;
        room.PlayCards(hostId, [hostCard], CardProtocol.Alpha);

        // Host attempts to call trace on their own play
        var traceResult = room.CallTrace(hostId);

        Assert.False(traceResult.IsSuccess);
        Assert.Contains(traceResult.ValidationErrors, e => e.Identifier == "Trace.CannotTraceSelf");
    }

    [Fact]
    public void CallTrace_DetectsBluff_WhenPlayedCardsDoNotMatchProtocol()
    {
        var (room, hostId, p2Id) = SetupActiveGame();

        // Assign a known non-matching card (Beta) to Host
        var hostSeat = room.Seats[0];
        var bluffCard = Card.Create(CardProtocol.Beta);
        hostSeat.AssignHand([bluffCard]);

        // Host plays Beta as Alpha (bluff!)
        room.PlayCards(hostId, [bluffCard.Id], CardProtocol.Alpha);

        // Player 2 calls trace
        var traceResult = room.CallTrace(p2Id);

        Assert.True(traceResult.IsSuccess);
        var resolution = traceResult.Value;

        Assert.True(resolution.BluffDetected);
        Assert.Equal(p2Id, resolution.AccuserPlayerId);
        Assert.Equal(hostId, resolution.AccusedPlayerId);
        Assert.Equal(hostId, resolution.LoserPlayerId); // Host lost!
        Assert.Equal(RoomState.RoundOver, room.State);
    }

    [Fact]
    public void CallTrace_DetectsTruth_WhenPlayedCardsMatchProtocol()
    {
        var (room, hostId, p2Id) = SetupActiveGame();

        // Assign a genuine matching card (Alpha) to Host
        var hostSeat = room.Seats[0];
        var truthCard = Card.Create(CardProtocol.Alpha);
        hostSeat.AssignHand([truthCard]);

        // Host plays Alpha truthfully
        room.PlayCards(hostId, [truthCard.Id], CardProtocol.Alpha);

        // Player 2 calls trace
        var traceResult = room.CallTrace(p2Id);

        Assert.True(traceResult.IsSuccess);
        var resolution = traceResult.Value;

        Assert.False(resolution.BluffDetected);
        Assert.Equal(p2Id, resolution.AccuserPlayerId);
        Assert.Equal(hostId, resolution.AccusedPlayerId);
        Assert.Equal(p2Id, resolution.LoserPlayerId); // Accuser was wrong and lost!
        Assert.Equal(RoomState.RoundOver, room.State);
    }

    [Fact]
    public void CallTrace_TreatsGlitchCard_AsWildcardTruth()
    {
        var (room, hostId, p2Id) = SetupActiveGame();

        var hostSeat = room.Seats[0];
        var glitchCard = Card.Create(CardProtocol.Glitch);
        hostSeat.AssignHand([glitchCard]);

        // Host plays Glitch as Alpha (wildcard, so not a bluff)
        room.PlayCards(hostId, [glitchCard.Id], CardProtocol.Alpha);

        var traceResult = room.CallTrace(p2Id);

        Assert.True(traceResult.IsSuccess);
        Assert.False(traceResult.Value.BluffDetected);
        Assert.Equal(p2Id, traceResult.Value.LoserPlayerId);
    }

    [Fact]
    public void CallTrace_TreatsCorruptedCard_AsForcedBluff()
    {
        var (room, hostId, p2Id) = SetupActiveGame();

        var hostSeat = room.Seats[0];
        var corruptedCard = Card.Create(CardProtocol.Corrupted);
        hostSeat.AssignHand([corruptedCard]);

        // Host plays Corrupted as Alpha (always a bluff!)
        room.PlayCards(hostId, [corruptedCard.Id], CardProtocol.Alpha);

        var traceResult = room.CallTrace(p2Id);

        Assert.True(traceResult.IsSuccess);
        Assert.True(traceResult.Value.BluffDetected);
        Assert.Equal(hostId, traceResult.Value.LoserPlayerId);
    }
}
