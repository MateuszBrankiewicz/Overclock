using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public class GameRoomLobbyTests
{
    private sealed class ConstantRandomSource(int fixedValue) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedValue;
    }

    [Fact]
    public void Create_InitializesHostSeat_InLobbyState()
    {
        var roomId = RoomId.New("CYBER-7X9");
        var hostId = PlayerId.New();
        var sessionToken = Guid.NewGuid();

        var result = GameRoom.Create(roomId, hostId, "HostZero", "conn-host", sessionToken);

        Assert.True(result.IsSuccess);
        var room = result.Value;

        Assert.Equal(roomId, room.Id);
        Assert.Equal(hostId, room.HostId);
        Assert.Equal(RoomState.Lobby, room.State);
        Assert.Single(room.Seats);

        var hostSeat = room.Seats[0];
        Assert.Equal(hostId, hostSeat.Id);
        Assert.Equal("HostZero", hostSeat.Nickname);
        Assert.Equal("conn-host", hostSeat.ConnectionId);
        Assert.Equal(sessionToken, hostSeat.SessionToken);
        Assert.Equal(PlayerStatus.Active, hostSeat.Status);
        Assert.False(hostSeat.IsReady);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("AB")] // too short (<3)
    [InlineData("TOOLONGROOMIDEXCEEDINGTWENTYCHARS")] // too long (>20)
    [InlineData("ROOM@#$")] // invalid characters
    [InlineData("-START-HYPHEN")]
    public void RoomId_Create_FailsForMalformedRoomCodes(string invalidCode)
    {
        var result = RoomId.Create(invalidCode);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.InvalidId");
    }

    [Theory]
    [InlineData("CYBER-7X9")]
    [InlineData("ROOM1")]
    [InlineData("A-B-C-123")]
    public void RoomId_Create_SucceedsForValidRoomCodes(string validCode)
    {
        var result = RoomId.Create(validCode);

        Assert.True(result.IsSuccess);
        Assert.Equal(validCode.ToUpperInvariant(), result.Value.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_Fails_WhenNicknameIsInvalid(string nickname)
    {
        var result = GameRoom.Create(RoomId.New("CYBER-1"), PlayerId.New(), nickname, "conn", Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.InvalidNickname");
    }

    [Fact]
    public void AddPlayer_AddsSeatSuccessfully_UpToMaxCapacity()
    {
        var room = GameRoom.Create(RoomId.New("CYBER-101"), PlayerId.New(), "Host", "conn-1", Guid.NewGuid()).Value;

        var p2Result = room.AddPlayer(PlayerId.New(), "Player2", "conn-2", Guid.NewGuid());
        var p3Result = room.AddPlayer(PlayerId.New(), "Player3", "conn-3", Guid.NewGuid());
        var p4Result = room.AddPlayer(PlayerId.New(), "Player4", "conn-4", Guid.NewGuid());

        Assert.True(p2Result.IsSuccess);
        Assert.True(p3Result.IsSuccess);
        Assert.True(p4Result.IsSuccess);
        Assert.Equal(4, room.Seats.Count);

        // 5th player should fail
        var p5Result = room.AddPlayer(PlayerId.New(), "Player5", "conn-5", Guid.NewGuid());
        Assert.False(p5Result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, p5Result.Status);
        Assert.Contains(p5Result.ValidationErrors, e => e.Identifier == "Room.Full");
    }

    [Fact]
    public void AddPlayer_Fails_WhenPlayerOrSessionAlreadyExists()
    {
        var hostId = PlayerId.New();
        var hostSession = Guid.NewGuid();
        var room = GameRoom.Create(RoomId.New("CYBER-102"), hostId, "Host", "conn-1", hostSession).Value;

        // Duplicate player ID
        var dupPlayer = room.AddPlayer(hostId, "Duplicate", "conn-2", Guid.NewGuid());
        Assert.False(dupPlayer.IsSuccess);
        Assert.Contains(dupPlayer.ValidationErrors, e => e.Identifier == "Room.PlayerAlreadyJoined");

        // Duplicate session token
        var dupSession = room.AddPlayer(PlayerId.New(), "Player2", "conn-2", hostSession);
        Assert.False(dupSession.IsSuccess);
        Assert.Contains(dupSession.ValidationErrors, e => e.Identifier == "Room.DuplicateSessionToken");
    }

    [Fact]
    public void SetReady_TogglesReadiness()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-103"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;

        var readyResult = room.SetReady(hostId, true);
        Assert.True(readyResult.IsSuccess);
        Assert.True(room.Seats[0].IsReady);

        var unreadyResult = room.SetReady(hostId, false);
        Assert.True(unreadyResult.IsSuccess);
        Assert.False(room.Seats[0].IsReady);
    }

    [Fact]
    public void RemovePlayer_RemovesSeat_AndReassignsHost()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-104"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        var p2Id = PlayerId.New();
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());

        var removeResult = room.RemovePlayer(hostId);

        Assert.True(removeResult.IsSuccess);
        Assert.Single(room.Seats);
        Assert.Equal(p2Id, room.HostId);
    }

    [Fact]
    public void LobbyOperations_Fail_WhenGameIsAlreadyActive()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-105"), hostId, "Host", "conn-1", Guid.NewGuid()).Value;
        room.AddPlayer(p2Id, "Player2", "conn-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(p2Id, true);
        room.StartRound(hostId, new ConstantRandomSource(0));

        Assert.Equal(RoomState.TurnActive, room.State);

        var addResult = room.AddPlayer(PlayerId.New(), "P3", "conn-3", Guid.NewGuid());
        Assert.Equal(ResultStatus.Conflict, addResult.Status);

        var removeResult = room.RemovePlayer(p2Id);
        Assert.Equal(ResultStatus.Conflict, removeResult.Status);

        var readyResult = room.SetReady(p2Id, false);
        Assert.Equal(ResultStatus.Conflict, readyResult.Status);
    }
}
