using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
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
        for (var i = 0; i < 50 && room.TurnSequenceId == 1; i++)
        {
            await Task.Delay(10);
        }
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(nextPlayerId, room.CurrentTurnPlayerId);
        Assert.NotEqual(1, room.TurnSequenceId);
    }

    [Fact]
    public async Task Timer_SuccessiveTimeouts_AdvanceThroughAllPlayers()
    {
        var (room, hostPlayerId, secondPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        await using var timer = new TurnTimerEngine(delay, TimeSpan.FromSeconds(15));

        timer.Start(session, hostPlayerId, room.TurnSequenceId);

        // 1st timeout: Host -> Second player
        await delay.AdvanceAsync();
        for (var i = 0; i < 50 && room.TurnSequenceId < 2; i++)
        {
            await Task.Delay(10);
        }
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(secondPlayerId, room.CurrentTurnPlayerId);
        Assert.Equal(2, room.TurnSequenceId);

        // Wait for 2nd delay to begin
        await delay.Started;

        // 2nd timeout: Second player -> Host
        await delay.AdvanceAsync();
        for (var i = 0; i < 50 && room.TurnSequenceId < 3; i++)
        {
            await Task.Delay(10);
        }
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(hostPlayerId, room.CurrentTurnPlayerId);
        Assert.Equal(3, room.TurnSequenceId);
    }

    [Fact]
    public async Task Timer_Expiration_BroadcastsUpdatedGameState()
    {
        var (room, currentPlayerId, nextPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, TimeSpan.FromSeconds(15));

        timer.Start(session, currentPlayerId, room.TurnSequenceId);
        await delay.AdvanceAsync();
        await notifier.BroadcastReceived.WaitAsync(TimeSpan.FromSeconds(2));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(1, notifier.BroadcastCount);
        Assert.Equal(room.Id.Value, notifier.LastBroadcastRoomCode);
        Assert.NotNull(notifier.LastBroadcastSample);
        Assert.Equal(nextPlayerId.Value, notifier.LastBroadcastSample.CurrentTurnPlayerId);
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
        private readonly object _lock = new();
        private TaskCompletionSource _release =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private TaskCompletionSource _returned =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private TaskCompletionSource _started =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task Returned
        {
            get
            {
                lock (_lock)
                {
                    return _returned.Task;
                }
            }
        }

        public Task Started
        {
            get
            {
                lock (_lock)
                {
                    return _started.Task;
                }
            }
        }

        public async Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken)
        {
            TaskCompletionSource releaseTcs;
            TaskCompletionSource returnedTcs;
            lock (_lock)
            {
                _started.TrySetResult();
                releaseTcs = _release;
                returnedTcs = _returned;
            }

            try
            {
                await releaseTcs.Task.WaitAsync(cancellationToken);
            }
            finally
            {
                returnedTcs.TrySetResult();
            }
        }

        public async Task AdvanceAsync()
        {
            Task returnedTask;
            lock (_lock)
            {
                returnedTask = _returned.Task;
                _release.TrySetResult();
                _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
                _returned = new(TaskCreationOptions.RunContinuationsAsynchronously);
                _started = new(TaskCreationOptions.RunContinuationsAsynchronously);
            }

            await returnedTask;
        }

        public void Release()
        {
            lock (_lock)
            {
                _release.TrySetResult();
                _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
                _started = new(TaskCreationOptions.RunContinuationsAsynchronously);
            }
        }
    }

    private sealed class FakeGameNotifier : IGameNotifier
    {
        private readonly TaskCompletionSource _broadcastReceived =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task BroadcastReceived => _broadcastReceived.Task;
        public int BroadcastCount { get; private set; }
        public string? LastBroadcastRoomCode { get; private set; }
        public PlayerGameStateDto? LastBroadcastSample { get; private set; }

        public Task BroadcastGameStateAsync(
            string roomCode,
            Func<PlayerId, PlayerGameStateDto> snapshotFactory,
            IReadOnlyList<PlayerSeat> seats,
            CancellationToken ct = default)
        {
            BroadcastCount++;
            LastBroadcastRoomCode = roomCode;
            if (seats.Count > 0)
            {
                LastBroadcastSample = snapshotFactory(seats[0].Id);
            }
            _broadcastReceived.TrySetResult();
            return Task.CompletedTask;
        }

        public Task BroadcastSnapshotsAsync(
            string roomCode,
            IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> snapshots,
            CancellationToken ct = default)
        {
            BroadcastCount++;
            LastBroadcastRoomCode = roomCode;
            if (snapshots.Count > 0)
            {
                LastBroadcastSample = snapshots[0].Snapshot;
            }
            _broadcastReceived.TrySetResult();
            return Task.CompletedTask;
        }

        public Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default) =>
            Task.CompletedTask;
    }
}