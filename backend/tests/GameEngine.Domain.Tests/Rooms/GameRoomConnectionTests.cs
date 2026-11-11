using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public class GameRoomConnectionTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    [Fact]
    public void HandleDisconnect_MarksSeatDisconnected()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-401"), hostId, "Host", "conn-host-1", Guid.NewGuid()).Value;

        var disconnectResult = room.HandleDisconnect("conn-host-1");

        Assert.True(disconnectResult.IsSuccess);
        Assert.Equal(PlayerStatus.Disconnected, room.Seats[0].Status);
        Assert.NotNull(room.Seats[0].DisconnectedAtUtc);
    }

    [Fact]
    public void HandleReconnect_RestoresActiveStatus_AndUpdatesConnectionId()
    {
        var hostId = PlayerId.New();
        var sessionToken = Guid.NewGuid();
        var room = GameRoom.Create(RoomId.New("CYBER-402"), hostId, "Host", "conn-old", sessionToken).Value;
        room.HandleDisconnect("conn-old");

        var reconnectResult = room.HandleReconnect(sessionToken, "conn-new");

        Assert.True(reconnectResult.IsSuccess);
        var seat = reconnectResult.Value;
        Assert.Equal(PlayerStatus.Active, seat.Status);
        Assert.Equal("conn-new", seat.ConnectionId);
        Assert.Null(seat.DisconnectedAtUtc);
    }

    [Fact]
    public void HandleReconnect_Fails_WhenSessionTokenNotFound()
    {
        var room = GameRoom.Create(RoomId.New("CYBER-403"), PlayerId.New(), "Host", "conn-1", Guid.NewGuid()).Value;

        var reconnectResult = room.HandleReconnect(Guid.NewGuid(), "conn-new");

        Assert.False(reconnectResult.IsSuccess);
        Assert.Equal(ResultStatus.NotFound, reconnectResult.Status);
    }

    [Fact]
    public void HandleReconnect_Fails_WhenSeatEliminated()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p2Session = Guid.NewGuid();
        var room = GameRoom.Create(RoomId.New("CYBER-406"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", p2Session);
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        room.EliminatePlayer(p2Id);

        var reconnectResult = room.HandleReconnect(p2Session, "conn-new");

        Assert.False(reconnectResult.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, reconnectResult.Status);
        Assert.Contains(reconnectResult.ValidationErrors, e => e.Identifier == "Room.PlayerEliminated");
    }

    [Fact]
    public void EliminatePlayer_TransitionsToGameOver_AndSetsWinner_WhenOnlyOnePlayerRemains()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-404"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        // Eliminate Player 2
        var elimResult = room.EliminatePlayer(p2Id);

        Assert.True(elimResult.IsSuccess);
        Assert.Equal(PlayerStatus.Eliminated, room.Seats[1].Status);
        Assert.Equal(RoomState.GameOver, room.State);
        Assert.Null(room.CurrentTurnPlayerId);
        Assert.Equal(hostId, room.WinnerId); // Host is the winner!
    }

    [Fact]
    public void EliminatePlayer_AdvancesTurn_IfEliminatedPlayerHeldCurrentTurn()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-405"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.AddPlayer(p3Id, "Player3", "conn-3", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        Assert.Equal(hostId, room.CurrentTurnPlayerId);

        // Eliminate current turn player (Host)
        var elimResult = room.EliminatePlayer(hostId);

        Assert.True(elimResult.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State); // 2 players still remain
        Assert.Equal(p2Id, room.CurrentTurnPlayerId); // Turn advanced to Player 2
        Assert.Null(room.WinnerId);
    }

    [Fact]
    public void EliminatePlayer_ReassignsHostToSurvivingPlayer_WhenHostIsEliminated()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-407"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.AddPlayer(p3Id, "Player3", "conn-3", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        // Eliminate Host in a 3-player match
        var elimResult = room.EliminatePlayer(hostId);

        Assert.True(elimResult.IsSuccess);
        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(p2Id, room.HostId); // P2 became the new host!

        // Emulate round finish: P2 plays cards and calls TRACE with P3
        room.PlayCards(p2Id, [room.Seats[1].Hand[0].Id], CardProtocol.Alpha);
        room.CallTrace(p3Id);
        room.CompleteBluffCheck();
        room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, new ConstantRandomSource(6));

        Assert.Equal(RoomState.RoundOver, room.State);

        // New host (P2) can start Round 2 without getting blocked
        var startR2Result = room.StartRound(p2Id, new ConstantRandomSource(1));
        Assert.True(startR2Result.IsSuccess);
        Assert.Equal(2, room.RoundNumber);
    }
}
