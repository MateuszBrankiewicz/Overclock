using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public sealed class GameRoomAdvanceRoundTests
{
    private sealed class FixedRollRandomSource(int roll) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => roll;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id) CreateRoomInRoundOver()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-RO"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new FixedRollRandomSource(0));

        var currentTurnPlayer = room.CurrentTurnPlayerId!.Value;
        var otherPlayer = currentTurnPlayer == hostId ? p2Id : hostId;

        var seat = room.Seats.First(s => s.Id == currentTurnPlayer);
        room.PlayCards(currentTurnPlayer, [seat.Hand[0].Id], room.CurrentTargetProtocol!.Value);

        room.CallTrace(otherPlayer);
        room.CompleteBluffCheck();
        room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, new FixedRollRandomSource(6));

        return (room, hostId, p2Id);
    }

    [Fact]
    public void AdvanceRound_Fails_WhenNotInRoundOver()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-LOBBY"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;

        var result = room.AdvanceRound();

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public void AdvanceRound_Succeeds_WhenInRoundOver()
    {
        var (room, hostId, p2Id) = CreateRoomInRoundOver();
        Assert.Equal(RoomState.RoundOver, room.State);
        var initialRound = room.RoundNumber;
        var initialTurnSeq = room.TurnSequenceId;
        room.MarkIntermissionDeadline(DateTime.UtcNow.AddSeconds(10));

        var result = room.AdvanceRound(new FixedRollRandomSource(0));

        Assert.True(result.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(initialRound + 1, room.RoundNumber);
        Assert.True(room.TurnSequenceId > initialTurnSeq);
        Assert.Null(room.IntermissionDeadlineUtc);
        Assert.NotNull(room.CurrentTurnPlayerId);
        Assert.NotNull(room.CurrentTargetProtocol);
        Assert.All(room.Seats.Where(s => s.Status != PlayerStatus.Eliminated), s => Assert.Equal(Deck.CardsPerHand, s.Hand.Count));
    }

    [Fact]
    public void AdvanceRound_Fails_WhenFewerThanMinPlayers()
    {
        var (room, hostId, p2Id) = CreateRoomInRoundOver();
        // Eliminate player 2
        room.EliminatePlayer(p2Id);

        // State is now GameOver
        var result = room.AdvanceRound();

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Conflict, result.Status);
    }

    [Fact]
    public void AdvanceRound_Works_WhenHostIsDisconnected()
    {
        var (room, hostId, _) = CreateRoomInRoundOver();
        room.HandleDisconnect(hostId);

        var result = room.AdvanceRound(new FixedRollRandomSource(0));

        Assert.True(result.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);
    }
}
