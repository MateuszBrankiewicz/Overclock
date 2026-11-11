using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace GameEngine.Domain.Tests.Rooms;

public sealed class GameRoomVoltageTests
{
    private sealed class ScriptedRandomSource(int fixedRoll) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedRoll;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id, PlayerId P3Id, PlayerId P4Id) SetupFourPlayerGame()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var p4Id = PlayerId.New();

        var roomResult = GameRoom.Create(
            RoomId.New("TEST-4P"),
            hostId,
            "HostUser",
            "conn-host",
            Guid.NewGuid());

        var room = roomResult.Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());
        room.AddPlayer(p3Id, "Player3", "conn-p3", Guid.NewGuid());
        room.AddPlayer(p4Id, "Player4", "conn-p4", Guid.NewGuid());

        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);
        room.SetReady(p4Id, true);

        return (room, hostId, p2Id, p3Id, p4Id);
    }

    [Fact]
    public void StartRound_AssignsRandomExploitsAndInitialRisk_ToAllActivePlayersAtMatchStart()
    {
        var (room, hostId, p2Id, p3Id, p4Id) = SetupFourPlayerGame();

        var startResult = room.StartRound(hostId, new ScriptedRandomSource(0)); // Maps to ExploitType.PacketSniffer
        Assert.True(startResult.IsSuccess);

        foreach (var seat in room.Seats)
        {
            Assert.Equal(1, seat.Risk.Level);
            Assert.NotNull(seat.Exploit);
            Assert.False(seat.Exploit!.IsBurned);
            Assert.Equal(ExploitType.PacketSniffer, seat.Exploit.Type);
        }
    }

    [Fact]
    public void DischargeCapacitor_WhenSafe_IncrementsRiskAndTransitionsToRoundOver()
    {
        var (room, hostId, p2Id, _, _) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(0));

        var hostSeat = room.Seats[0];
        var targetProtocol = room.CurrentTargetProtocol!.Value;
        var bluffProtocol = targetProtocol == CardProtocol.Alpha ? CardProtocol.Beta : CardProtocol.Alpha;
        hostSeat.AssignHand([Card.Create(bluffProtocol)]); // Bluff

        // Host plays bluff declaring target protocol -> Turn goes to P2
        var playResult = room.PlayCards(hostId, [hostSeat.Hand[0].Id], targetProtocol);
        Assert.True(playResult.IsSuccess);

        // P2 calls TRACE -> Host lost
        var traceResult = room.CallTrace(p2Id);
        Assert.True(traceResult.IsSuccess);
        Assert.Equal(hostId, room.PendingDischargePlayerId);

        var completeResult = room.CompleteBluffCheck();
        Assert.True(completeResult.IsSuccess);
        Assert.Equal(RoomState.VoltageTest, room.State);

        // Safe roll = 6 against Risk 1/6
        var dischargeResult = room.DischargeCapacitor(hostId, new ScriptedRandomSource(6));

        Assert.True(dischargeResult.IsSuccess);
        var outcome = dischargeResult.Value;
        Assert.False(outcome.Overloaded);
        Assert.Equal(1, outcome.InitialRisk.Level);
        Assert.Equal(2, outcome.ResultingRisk.Level);
        Assert.Equal(2, hostSeat.Risk.Level);
        Assert.Equal(PlayerStatus.Active, hostSeat.Status);
        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Null(room.PendingDischargePlayerId);
    }

    [Fact]
    public void DischargeCapacitor_WhenOverloaded_EliminatesPlayerAndAdvancesToRoundOver_WhenMultipleSurvivorsRemain()
    {
        var (room, hostId, p2Id, _, _) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(0));

        var hostSeat = room.Seats[0];
        var targetProtocol = room.CurrentTargetProtocol!.Value;
        var bluffProtocol = targetProtocol == CardProtocol.Alpha ? CardProtocol.Beta : CardProtocol.Alpha;
        hostSeat.AssignHand([Card.Create(bluffProtocol)]);

        var playResult = room.PlayCards(hostId, [hostSeat.Hand[0].Id], targetProtocol);
        Assert.True(playResult.IsSuccess);

        var traceResult = room.CallTrace(p2Id);
        Assert.True(traceResult.IsSuccess);

        var completeResult = room.CompleteBluffCheck();
        Assert.True(completeResult.IsSuccess);

        // Overload roll = 1 against Risk 1/6
        var dischargeResult = room.DischargeCapacitor(hostId, new ScriptedRandomSource(1));

        Assert.True(dischargeResult.IsSuccess);
        Assert.True(dischargeResult.Value.Overloaded);
        Assert.Equal(PlayerStatus.Eliminated, hostSeat.Status);
        Assert.Empty(hostSeat.Hand);
        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Equal(p2Id, room.HostId); // P2 inherits host since Host was eliminated
    }

    [Fact]
    public void FourPlayerMatch_SequentialEliminations_EndsInGameOverWithLastSurvivorAsWinner()
    {
        var (room, hostId, p2Id, p3Id, p4Id) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(0));

        // Eliminate Player 1 (Host)
        room.EliminatePlayer(hostId);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(3, room.Seats.Count(s => s.Status == PlayerStatus.Active));

        // Eliminate Player 2
        room.EliminatePlayer(p2Id);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(2, room.Seats.Count(s => s.Status == PlayerStatus.Active));

        // Eliminate Player 3 -> only Player 4 remains -> GameOver!
        room.EliminatePlayer(p3Id);
        Assert.Equal(RoomState.GameOver, room.State);
        Assert.Equal(p4Id, room.WinnerId);
    }

    [Fact]
    public void EliminatedPlayer_CannotPlayCards()
    {
        var (room, hostId, p2Id, _, _) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(0));

        room.EliminatePlayer(hostId);

        var playResult = room.PlayCards(hostId, [CardId.New()], CardProtocol.Alpha);
        Assert.False(playResult.IsSuccess);
    }

    [Fact]
    public void StartRound_SubsequentRound_PreservesRiskAndExploitStatus()
    {
        var (room, hostId, p2Id, _, _) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(1)); // ExploitType.GroundWire

        var hostSeat = room.Seats[0];
        hostSeat.BurnExploit();
        Assert.True(hostSeat.Exploit!.IsBurned);

        // Host plays and survives discharge -> Risk becomes 2/6
        var targetProtocol = room.CurrentTargetProtocol!.Value;
        var bluffProtocol = targetProtocol == CardProtocol.Alpha ? CardProtocol.Beta : CardProtocol.Alpha;
        hostSeat.AssignHand([Card.Create(bluffProtocol)]);

        var playResult = room.PlayCards(hostId, [hostSeat.Hand[0].Id], targetProtocol);
        Assert.True(playResult.IsSuccess);

        var traceResult = room.CallTrace(p2Id);
        Assert.True(traceResult.IsSuccess);

        var completeResult = room.CompleteBluffCheck();
        Assert.True(completeResult.IsSuccess);

        var dischargeResult = room.DischargeCapacitor(hostId, new ScriptedRandomSource(6));
        Assert.True(dischargeResult.IsSuccess);

        Assert.Equal(2, hostSeat.Risk.Level);
        Assert.Equal(RoomState.RoundOver, room.State);

        // Start Round 2
        var r2Result = room.StartRound(hostId, new ScriptedRandomSource(0));
        Assert.True(r2Result.IsSuccess);
        Assert.Equal(2, room.RoundNumber);

        // Survived player should keep risk 2/6 and burned exploit
        Assert.Equal(2, hostSeat.Risk.Level);
        Assert.True(hostSeat.Exploit.IsBurned);
    }

    [Fact]
    public void Rematch_FromGameOver_RestoresEliminatedPlayersWithFreshExploitsAndResetRisk()
    {
        var (room, hostId, p2Id, _, _) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(1));

        // Trigger GameOver by eliminating 3 players
        room.EliminatePlayer(hostId);
        room.EliminatePlayer(p2Id);
        room.EliminatePlayer(room.Seats[2].Id);
        Assert.Equal(RoomState.GameOver, room.State);

        var survivorHost = room.HostId;

        // Start Rematch
        var rematchResult = room.StartRound(survivorHost, new ScriptedRandomSource(2)); // OverclockInjector
        Assert.True(rematchResult.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);

        foreach (var seat in room.Seats)
        {
            Assert.Equal(PlayerStatus.Active, seat.Status);
            Assert.Equal(1, seat.Risk.Level);
            Assert.NotNull(seat.Exploit);
            Assert.False(seat.Exploit!.IsBurned);
            Assert.Equal(ExploitType.OverclockInjector, seat.Exploit.Type);
        }
    }

    [Fact]
    public void StartRound_WhenPlayersNotAllReady_FailsWithoutMutatingSeatStates()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();

        var roomResult = GameRoom.Create(
            RoomId.New("UNREADY-2P"),
            hostId,
            "HostUser",
            "conn-host",
            Guid.NewGuid());

        var room = roomResult.Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());

        room.SetReady(hostId, true);
        // Player 2 is NOT ready!

        var startResult = room.StartRound(hostId);

        Assert.False(startResult.IsSuccess);
        Assert.Equal(RoomState.Lobby, room.State);
        Assert.Null(room.Seats[0].Exploit);
        Assert.Null(room.Seats[1].Exploit);
        Assert.Equal(1, room.Seats[0].Risk.Level);
        Assert.Equal(1, room.Seats[1].Risk.Level);
    }

    [Fact]
    public void Rematch_FromGameOver_PreservesDisconnectedStatusAndGracePeriod()
    {
        var (room, hostId, p2Id, p3Id, p4Id) = SetupFourPlayerGame();
        room.StartRound(hostId, new ScriptedRandomSource(1));

        // Player 2 disconnects during match
        var disconnectTime = DateTimeOffset.UtcNow.AddSeconds(-10);
        room.Seats[1].Disconnect(disconnectTime);
        Assert.Equal(PlayerStatus.Disconnected, room.Seats[1].Status);
        Assert.Equal(disconnectTime, room.Seats[1].DisconnectedAtUtc);

        // Eliminate Host, P3, P4 -> GameOver (P2 was disconnected)
        room.EliminatePlayer(hostId);
        room.EliminatePlayer(p3Id);
        room.EliminatePlayer(p4Id);
        Assert.Equal(RoomState.GameOver, room.State);

        var survivorHost = room.HostId;

        // Rematch starts
        var rematchResult = room.StartRound(survivorHost, new ScriptedRandomSource(0));
        Assert.True(rematchResult.IsSuccess);

        // P2 must remain Disconnected with unchanged DisconnectedAtUtc
        Assert.Equal(PlayerStatus.Disconnected, room.Seats[1].Status);
        Assert.Equal(disconnectTime, room.Seats[1].DisconnectedAtUtc);
    }
}
