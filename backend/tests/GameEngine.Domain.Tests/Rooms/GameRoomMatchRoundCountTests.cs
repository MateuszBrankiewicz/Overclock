using Overclock.Modules.GameEngine.Domain.Rooms;
using Xunit;

namespace GameEngine.Domain.Tests.Rooms;

public class GameRoomMatchRoundCountTests
{
    [Fact]
    public void MatchRoundCount_ResetsOnRematch_WhileRoundNumberContinuesIncrementing()
    {
        var hostId = PlayerId.New();
        var guestId = PlayerId.New();
        var room = GameRoom.Create(RoomId.New("CYBER-7X9"), hostId, "Host", "conn-host", Guid.NewGuid()).Value;
        room.AddPlayer(guestId, "Guest", "conn-guest", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(guestId, true);

        Assert.True(room.StartRound(hostId).IsSuccess);
        Assert.Equal(1, room.RoundNumber);
        Assert.Equal(1, room.MatchRoundCount);

        // Eliminate guest to finish match
        Assert.True(room.EliminatePlayer(guestId).IsSuccess);
        Assert.Equal(RoomState.GameOver, room.State);

        // Start a rematch in the same room
        Assert.True(room.StartRound(hostId).IsSuccess);
        Assert.Equal(2, room.RoundNumber);
        Assert.Equal(1, room.MatchRoundCount);
    }
}
