using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Characters;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using Xunit;

namespace GameEngine.Domain.Tests.Rooms;

public class GameRoomCharacterSelectionTests
{
    private static (GameRoom Room, PlayerId HostId, PlayerId GuestId) CreateRoomWithTwoPlayers(
        string? hostPreferred = null,
        string? guestPreferred = null)
    {
        var hostId = PlayerId.New();
        var guestId = PlayerId.New();
        var room = GameRoom.Create(
            RoomId.New("CYBER-7X9"),
            hostId,
            "Host",
            "conn-host",
            Guid.NewGuid(),
            hostPreferred).Value;

        room.AddPlayer(guestId, "Guest", "conn-guest", Guid.NewGuid(), guestPreferred);
        return (room, hostId, guestId);
    }

    [Fact]
    public void CreateAndJoin_AssignsPreferredCharacterWhenAvailable()
    {
        var (room, hostId, guestId) = CreateRoomWithTwoPlayers("volt", "proxy");

        Assert.Equal("volt", room.Seats.First(s => s.Id == hostId).CharacterId);
        Assert.Equal("proxy", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void CreateAndJoin_FallsBackToFirstAvailableWhenPreferredIsTakenOrInvalid()
    {
        var (room, hostId, guestId) = CreateRoomWithTwoPlayers("ghost", "ghost");

        Assert.Equal("ghost", room.Seats.First(s => s.Id == hostId).CharacterId);
        // "ghost" is taken, next available in catalog is "volt"
        Assert.Equal("volt", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void CreateAndJoin_FallsBackToFirstAvailableWhenPreferredIsNull()
    {
        var (room, hostId, guestId) = CreateRoomWithTwoPlayers(null, null);

        Assert.Equal("ghost", room.Seats.First(s => s.Id == hostId).CharacterId);
        Assert.Equal("volt", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void SelectCharacter_Succeeds_WhenCharacterIsAvailable()
    {
        var (room, _, guestId) = CreateRoomWithTwoPlayers("ghost", "volt");

        var result = room.SelectCharacter(guestId, "proxy");

        Assert.True(result.IsSuccess);
        Assert.Equal("proxy", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void SelectCharacter_Idempotent_WhenSelectingSameCharacter()
    {
        var (room, _, guestId) = CreateRoomWithTwoPlayers("ghost", "volt");

        var result = room.SelectCharacter(guestId, "volt");

        Assert.True(result.IsSuccess);
        Assert.Equal("volt", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void SelectCharacter_ReturnsConflict_WhenCharacterTakenByAnotherPlayer()
    {
        var (room, _, guestId) = CreateRoomWithTwoPlayers("ghost", "volt");

        var result = room.SelectCharacter(guestId, "ghost");

        Assert.False(result.IsSuccess);
        Assert.Equal(Ardalis.Result.ResultStatus.Conflict, result.Status);
        Assert.Contains(result.Errors, e => e.Contains("CharacterTaken"));
        Assert.Equal("volt", room.Seats.First(s => s.Id == guestId).CharacterId);
    }

    [Fact]
    public void SelectCharacter_ReturnsInvalid_WhenCharacterIsUnknown()
    {
        var (room, _, guestId) = CreateRoomWithTwoPlayers("ghost", "volt");

        var result = room.SelectCharacter(guestId, "non-existent-rig");

        Assert.False(result.IsSuccess);
        Assert.Equal(Ardalis.Result.ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Room.InvalidCharacter");
    }

    [Fact]
    public void SelectCharacter_ReturnsConflict_WhenNotInLobby()
    {
        var (room, hostId, guestId) = CreateRoomWithTwoPlayers("ghost", "volt");
        room.SetReady(hostId, true);
        room.SetReady(guestId, true);
        room.StartRound(hostId, new ConstantRandomSource());

        var result = room.SelectCharacter(guestId, "proxy");

        Assert.False(result.IsSuccess);
        Assert.Equal(Ardalis.Result.ResultStatus.Conflict, result.Status);
        Assert.Contains(result.Errors, e => e.Contains("NotInLobby"));
    }

    [Fact]
    public void SelectCharacter_ReturnsNotFound_WhenPlayerNotFound()
    {
        var (room, _, _) = CreateRoomWithTwoPlayers("ghost", "volt");

        var result = room.SelectCharacter(PlayerId.New(), "proxy");

        Assert.False(result.IsSuccess);
        Assert.Equal(Ardalis.Result.ResultStatus.NotFound, result.Status);
    }

    private sealed class ConstantRandomSource : IRandomSource
    {
        public int Next(int minValue, int maxValue) => minValue;
    }
}
