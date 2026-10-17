using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Tests.Services;

public sealed class TurnTimerEngineTests
{
    [Fact]
    public async Task Timer_EnqueuesExpirationAndAdvancesTurn()
    {
        var (room, currentPlayerId, nextPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        await using var timer = new TurnTimerEngine(delay, TimeSpan.FromSeconds(15));

        timer.Start(session, currentPlayerId, room.TurnSequenceId);
        delay.Release();
        await delay.Returned;
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(nextPlayerId, room.CurrentTurnPlayerId);
        Assert.NotEqual(1, room.TurnSequenceId);
    }

    [Fact]
    public async Task Timer_CancelPreventsExpiration()
    {
        var (room, currentPlayerId, _) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        await using var timer = new TurnTimerEngine(delay);

        timer.Start(session, currentPlayerId, room.TurnSequenceId);
        timer.Cancel(room.Id.Value);
        delay.Release();
        await delay.Returned;
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(currentPlayerId, room.CurrentTurnPlayerId);
        Assert.Equal(1, room.TurnSequenceId);
    }

    [Fact]
    public async Task Timer_StaleSequenceDoesNotMutateRoom()
    {
        var (room, currentPlayerId, _) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        await using var timer = new TurnTimerEngine(delay);

        timer.Start(session, currentPlayerId, room.TurnSequenceId - 1);
        delay.Release();
        await delay.Returned;
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(currentPlayerId, room.CurrentTurnPlayerId);
        Assert.Equal(1, room.TurnSequenceId);
    }

    private static (GameRoom Room, PlayerId CurrentPlayerId, PlayerId NextPlayerId) CreateActiveRoom()
    {
        var hostId = PlayerId.New();
        var secondPlayerId = PlayerId.New();
        var room = GameRoom.Create(
            RoomId.New("CYBER-7X9"),
            hostId,
            "Host",
            "connection-host",
            Guid.NewGuid()).Value;

        room.AddPlayer(secondPlayerId, "Player2", "connection-2", Guid.NewGuid());
        room.SetReady(hostId, true);
        room.SetReady(secondPlayerId, true);
        room.StartRound(hostId, new ConstantRandomSource());

        return (room, hostId, secondPlayerId);
    }

    private sealed class ConstantRandomSource : SharedKernel.IRandomSource
    {
        public int Next(int minValue, int maxValue) => 0;
    }

    private sealed class ManualTurnDelay : ITurnDelay
    {
        private readonly TaskCompletionSource _release =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _returned =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task Returned => _returned.Task;

        public async Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken)
        {
            try
            {
                await _release.Task.WaitAsync(cancellationToken);
            }
            finally
            {
                _returned.TrySetResult();
            }
        }

        public void Release() => _release.TrySetResult();
    }
}