using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Rooms;

public class GameRoomInputHardeningTests
{
    [Theory]
    [InlineData("  Neo  ", "Neo")]
    [InlineData("Żółw_42", "Żółw_42")]
    [InlineData("👩‍💻 Hacker", "👩‍💻 Hacker")]
    public void Create_TrimsAndAcceptsPrintableNicknames(string raw, string expected)
    {
        var result = GameRoom.Create(RoomId.New("CYBER-7X9"), PlayerId.New(), raw, "conn", Guid.NewGuid());

        Assert.True(result.IsSuccess);
        Assert.Equal(expected, result.Value.Seats[0].Nickname);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ABCDEFGHIJKLMNOPQRSTUVWXY")] // 25 chars
    [InlineData("evil‮gnp.exe")] // bidi override
    [InlineData("line\nbreak")]
    [InlineData("nul\0byte")]
    public void Create_RejectsInvalidNicknames(string raw)
    {
        var result = GameRoom.Create(RoomId.New("CYBER-7X9"), PlayerId.New(), raw, "conn", Guid.NewGuid());

        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Equal("Room.InvalidNickname", Assert.Single(result.ValidationErrors).Identifier);
    }

    [Fact]
    public void AddPlayer_RejectsOverlongNickname()
    {
        var room = GameRoom.Create(RoomId.New("CYBER-7X9"), PlayerId.New(), "Host", "conn-host", Guid.NewGuid()).Value;

        var result = room.AddPlayer(PlayerId.New(), new string('x', PlayerNickname.MaxLength + 1), "conn-guest", Guid.NewGuid());

        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Equal("Room.InvalidNickname", Assert.Single(result.ValidationErrors).Identifier);
        Assert.Single(room.Seats);
    }

    [Fact]
    public void RoomId_Generate_ProducesValidHighEntropyCodes()
    {
        var codes = Enumerable.Range(0, 500).Select(_ => RoomId.Generate().Value).ToList();

        Assert.All(codes, code =>
        {
            Assert.True(RoomId.IsValid(code));
            Assert.Equal(RoomId.GeneratedLength, code.Length);
            Assert.DoesNotContain('-', code);
        });
        Assert.Equal(codes.Count, codes.Distinct().Count());
    }

    [Fact]
    public void IsAbandoned_OnlyWhenEverySeatIsGoneLongerThanIdleWindow()
    {
        var hostId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-7X9"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        var idle = TimeSpan.FromMinutes(5);
        var now = DateTimeOffset.UtcNow;

        Assert.False(room.IsAbandoned(now, idle));

        room.HandleDisconnect(hostId);

        Assert.False(room.IsAbandoned(DateTimeOffset.UtcNow, idle));
        Assert.True(room.IsAbandoned(DateTimeOffset.UtcNow + idle, idle));
    }

    [Fact]
    public void HasOtherLiveSeat_IgnoresTheCallerAndDisconnectedSeats()
    {
        var hostId = PlayerId.New();
        var guestId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-7X9"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;

        Assert.False(room.HasOtherLiveSeat(hostId));

        Assert.True(room.AddPlayer(guestId, "Guest", "conn-guest", Guid.NewGuid()).IsSuccess);
        Assert.True(room.HasOtherLiveSeat(hostId));

        room.HandleDisconnect(guestId);
        Assert.False(room.HasOtherLiveSeat(hostId));
        Assert.True(room.HasOtherLiveSeat(guestId));
    }
}
