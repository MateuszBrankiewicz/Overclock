using Overclock.Modules.GameEngine.Domain.Rooms;
using Xunit;

namespace GameEngine.Domain.Tests.Rooms;

public sealed class HostSuccessionTests
{
    [Fact]
    public void NextHost_PicksFirstConnectedActiveNonHostSeat()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();

        var hostSeat = new PlayerSeat(hostId, "Host", "conn-host", Guid.NewGuid());
        var p2Seat = new PlayerSeat(p2Id, "Player2", "conn-2", Guid.NewGuid());
        var p3Seat = new PlayerSeat(p3Id, "Player3", "conn-3", Guid.NewGuid());

        var nextHost = HostSuccession.NextHost([hostSeat, p2Seat, p3Seat], hostId);

        Assert.Equal(p2Id, nextHost);
    }

    [Fact]
    public void NextHost_SkipsDisconnectedEliminatedAndLeftSeats()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();
        var p4Id = PlayerId.New();
        var p5Id = PlayerId.New();

        var hostSeat = new PlayerSeat(hostId, "Host", "conn-host", Guid.NewGuid());
        var p2Seat = new PlayerSeat(p2Id, "Player2", null, Guid.NewGuid());
        p2Seat.MarkLeft();

        var p3Seat = new PlayerSeat(p3Id, "Player3", "conn-3", Guid.NewGuid());
        p3Seat.Eliminate();

        var p4Seat = new PlayerSeat(p4Id, "Player4", "conn-4", Guid.NewGuid());
        p4Seat.Disconnect();

        var p5Seat = new PlayerSeat(p5Id, "Player5", "conn-5", Guid.NewGuid());

        var nextHost = HostSuccession.NextHost([hostSeat, p2Seat, p3Seat, p4Seat, p5Seat], hostId);

        Assert.Equal(p5Id, nextHost);
    }

    [Fact]
    public void NextHost_FallsBackToDisconnectedOrEliminated_IfNoConnectedActiveExists()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();
        var p3Id = PlayerId.New();

        var hostSeat = new PlayerSeat(hostId, "Host", "conn-host", Guid.NewGuid());
        var p2Seat = new PlayerSeat(p2Id, "Player2", "conn-2", Guid.NewGuid());
        p2Seat.Disconnect();

        var p3Seat = new PlayerSeat(p3Id, "Player3", "conn-3", Guid.NewGuid());
        p3Seat.Eliminate();

        var nextHost = HostSuccession.NextHost([hostSeat, p2Seat, p3Seat], hostId);

        Assert.Equal(p2Id, nextHost);
    }

    [Fact]
    public void NextHost_ReturnsNull_WhenAllOtherSeatsHaveLeft()
    {
        var hostId = PlayerId.New();
        var p2Id = PlayerId.New();

        var hostSeat = new PlayerSeat(hostId, "Host", "conn-host", Guid.NewGuid());
        var p2Seat = new PlayerSeat(p2Id, "Player2", null, Guid.NewGuid());
        p2Seat.MarkLeft();

        var nextHost = HostSuccession.NextHost([hostSeat, p2Seat], hostId);

        Assert.Null(nextHost);
    }

    [Fact]
    public void NextHost_ReturnsNull_WhenOnlyHostExists()
    {
        var hostId = PlayerId.New();
        var hostSeat = new PlayerSeat(hostId, "Host", "conn-host", Guid.NewGuid());

        var nextHost = HostSuccession.NextHost([hostSeat], hostId);

        Assert.Null(nextHost);
    }
}
