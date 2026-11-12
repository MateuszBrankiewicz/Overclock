using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public sealed class GameRoomLeaveTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id, Guid P2Token) CreateTwoPlayerLobby()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p2Token = Guid.NewGuid();
        var room = GameRoom.Create(RoomId.New("CYBER-LOBBY"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", p2Token);
        return (room, hostId, p2Id, p2Token);
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId P2Id, PlayerId P3Id) CreateThreePlayerGame()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-GAME"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());
        room.AddPlayer(p3Id, "Player3", "conn-p3", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.SetReady(p3Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));
        return (room, hostId, p2Id, p3Id);
    }

    [Fact]
    public void Leave_InLobby_RemovesSeat_AndUpdatesHost()
    {
        var (room, hostId, p2Id, _) = CreateTwoPlayerLobby();

        var result = room.Leave(hostId);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.RoomEmpty);
        Assert.Equal(p2Id, result.Value.HostChangedTo);
        Assert.False(result.Value.WasEliminated);
        Assert.Equal(p2Id, room.HostId);
        Assert.Single(room.Seats);
    }

    [Fact]
    public void Leave_InLobby_LastPlayer_MarksRoomEmpty()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-SOLO"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;

        var result = room.Leave(hostId);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.RoomEmpty);
        Assert.True(room.IsEmpty);
        Assert.Empty(room.Seats);
    }

    [Fact]
    public void Leave_MidGame_MarksHasLeft_AndEliminatesSeat()
    {
        var (room, _, p2Id, p3Id) = CreateThreePlayerGame();

        var result = room.Leave(p2Id);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.WasEliminated);
        var seat = room.Seats.First(s => s.Id == p2Id);
        Assert.True(seat.HasLeft);
        Assert.Equal(PlayerStatus.Eliminated, seat.Status);
        Assert.Null(seat.ConnectionId);
    }

    [Fact]
    public void Leave_MidGame_ActiveTurnPlayer_AdvancesTurn()
    {
        var (room, hostId, _, _) = CreateThreePlayerGame();
        var currentTurnPlayer = room.CurrentTurnPlayerId!.Value;
        var initialTurnSeq = room.TurnSequenceId;

        var result = room.Leave(currentTurnPlayer);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(currentTurnPlayer, room.CurrentTurnPlayerId);
        Assert.NotNull(room.CurrentTurnPlayerId);
        Assert.True(room.TurnSequenceId > initialTurnSeq);
    }

    [Fact]
    public void Leave_MidGame_DownToOneActivePlayer_EndsGame()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-DUEL"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        var result = room.Leave(p2Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(RoomState.GameOver, room.State);
        Assert.Equal(hostId, room.WinnerId);
    }

    [Fact]
    public void Leave_InGameOver_RemovesSeat()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-OVER"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-p2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));
        room.Leave(p2Id); // Transitions to GameOver

        Assert.Equal(RoomState.GameOver, room.State);

        var result = room.Leave(hostId);

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain(room.Seats, s => s.Id == hostId);
        Assert.True(room.IsEmpty);
    }

    [Fact]
    public void Leave_UnknownPlayerOrAlreadyLeft_IsIdempotent()
    {
        var (room, hostId, _, _) = CreateTwoPlayerLobby();
        var unknownPlayer = PlayerId.New();

        var result1 = room.Leave(unknownPlayer);
        Assert.True(result1.IsSuccess);

        var result2 = room.Leave(hostId);
        Assert.True(result2.IsSuccess);

        var result3 = room.Leave(hostId);
        Assert.True(result3.IsSuccess);
    }

    [Fact]
    public void HandleReconnect_ForLeftSeat_ReturnsForbidden()
    {
        var (room, _, p2Id, p2Token) = CreateTwoPlayerLobby();
        room.SetReady(room.HostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(room.HostId, new ConstantRandomSource(0));

        room.Leave(p2Id);

        var reconnect = room.HandleReconnect(p2Token, "conn-new");
        Assert.False(reconnect.IsSuccess);
        Assert.Equal(ResultStatus.Forbidden, reconnect.Status);
    }
}
