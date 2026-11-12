using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Application.Services;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;
using Overclock.SharedKernel;
using ExploitType = Overclock.Modules.GameEngine.Domain.Exploits.ExploitType;

namespace Overclock.Modules.GameEngine.Infrastructure.Tests.Services;

public sealed class TurnTimerEngineTests
{
    [Fact]
    public async Task Timer_LeadTimeout_EnqueuesLeadForfeitAndDischargesCapacitor()
    {
        var (room, currentPlayerId, _) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource(), TimeSpan.FromSeconds(15));

        timer.Start(session, currentPlayerId, room.TurnSequenceId);
        await delay.AdvanceAsync();
        await notifier.DischargeReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Null(room.CurrentTurnPlayerId);
        Assert.NotNull(room.LastDischargeOutcome);
        Assert.False(room.LastDischargeOutcome.Value.Overloaded);
    }

    [Fact]
    public async Task Timer_TimeoutAfterPlay_PerformsAutoTraceAndDischargesLoser()
    {
        var (room, hostPlayerId, secondPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var hostSeat = room.Seats.First(s => s.Id == hostPlayerId);
        var playCard = hostSeat.Hand[0];
        var playResult = room.PlayCards(hostPlayerId, [playCard.Id], room.CurrentTargetProtocol!.Value);
        Assert.True(playResult.IsSuccess);

        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource(), TimeSpan.FromSeconds(15));

        Assert.Equal(secondPlayerId, room.CurrentTurnPlayerId);
        timer.Start(session, secondPlayerId, room.TurnSequenceId);

        await delay.AdvanceAsync();
        await notifier.DischargeReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.NotNull(room.LastTraceResolution);
        Assert.NotNull(room.LastDischargeOutcome);
        Assert.False(room.LastDischargeOutcome.Value.Overloaded);
    }

    [Fact]
    public async Task Timer_Expiration_BroadcastsUpdatedGameState()
    {
        var (room, currentPlayerId, _) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource(), TimeSpan.FromSeconds(15));

        timer.Start(session, currentPlayerId, room.TurnSequenceId);
        await delay.AdvanceAsync();
        await notifier.BroadcastReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(1, notifier.BroadcastCount);
        Assert.Equal(room.Id.Value, notifier.LastBroadcastRoomCode);
        Assert.NotNull(notifier.LastBroadcastSample);
        Assert.Null(notifier.LastBroadcastSample.CurrentTurnPlayerId);
        Assert.Single(notifier.Discharges);
        Assert.False(notifier.Discharges[0].Overloaded);
    }

    [Fact]
    public async Task Timer_WatchdogExpiration_DischargesPendingPlayer()
    {
        var (room, hostPlayerId, _) = CreateActiveRoom(new GroundWireRandomSource());
        await using var session = new GameRoomSession(room, new RoomActor(room));

        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource());

        timer.Start(session, hostPlayerId, room.TurnSequenceId);
        await delay.AdvanceAsync();
        await notifier.VoltageStartReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.VoltageTest, room.State);
        Assert.Equal(hostPlayerId, room.PendingDischargePlayerId);
        Assert.Single(notifier.VoltageStarts);

        await delay.Started;
        await delay.AdvanceAsync();
        await notifier.DischargeReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Single(notifier.Discharges);
        Assert.Equal(hostPlayerId.Value, notifier.Discharges[0].PlayerId);
        Assert.False(notifier.Discharges[0].Overloaded);
    }

    [Fact]
    public async Task Timer_RescheduleTurn_ReturnsTrueForMatchingSequence()
    {
        var (room, hostPlayerId, _) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var delay = new ManualTurnDelay();
        await using var timer = new TurnTimerEngine(delay);

        timer.Start(session, hostPlayerId, room.TurnSequenceId);
        var rescheduled = timer.RescheduleTurn(room.Id.Value, room.TurnSequenceId, TimeSpan.FromSeconds(5));

        Assert.True(rescheduled);
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

    [Fact]
    public async Task Timer_Intermission_AdvancesRoundAutomatically_WhenInRoundOver()
    {
        var (room, hostPlayerId, secondPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));

        var hostSeat = room.Seats.First(s => s.Id == hostPlayerId);
        room.PlayCards(hostPlayerId, [hostSeat.Hand[0].Id], room.CurrentTargetProtocol!.Value);
        room.CallTrace(secondPlayerId);
        room.CompleteBluffCheck();
        room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, new SafeRollRandomSource());
        Assert.Equal(RoomState.RoundOver, room.State);

        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource(), TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(10));

        timer.StartIntermission(session, room.RoundNumber, TimeSpan.FromSeconds(10));
        await delay.AdvanceAsync();
        var roundStarted = await notifier.RoundStartedReceived.WaitAsync(TimeSpan.FromSeconds(3));
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.TurnActive, room.State);
        Assert.Equal(2, room.RoundNumber);
        Assert.Equal(2, roundStarted.RoundNumber);
        Assert.NotNull(room.CurrentTurnPlayerId);
    }

    [Fact]
    public async Task Timer_Intermission_StaleRoundNumber_IsIgnored()
    {
        var (room, hostPlayerId, secondPlayerId) = CreateActiveRoom();
        await using var session = new GameRoomSession(room, new RoomActor(room));

        var hostSeat = room.Seats.First(s => s.Id == hostPlayerId);
        room.PlayCards(hostPlayerId, [hostSeat.Hand[0].Id], room.CurrentTargetProtocol!.Value);
        room.CallTrace(secondPlayerId);
        room.CompleteBluffCheck();
        room.DischargeCapacitor(room.PendingDischargePlayerId!.Value, new SafeRollRandomSource());
        Assert.Equal(RoomState.RoundOver, room.State);

        var delay = new ManualTurnDelay();
        var notifier = new FakeGameNotifier();
        await using var timer = new TurnTimerEngine(delay, notifier, null, new SafeRollRandomSource(), TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(10));

        timer.StartIntermission(session, 99, TimeSpan.FromSeconds(10));
        await delay.AdvanceAsync();
        await session.EnqueueAsync(_ => Result.Success());

        Assert.Equal(RoomState.RoundOver, room.State);
        Assert.Equal(1, room.RoundNumber);
    }


    private static (GameRoom Room, PlayerId CurrentPlayerId, PlayerId NextPlayerId) CreateActiveRoom(SharedKernel.IRandomSource? randomSource = null)
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
        room.StartRound(hostId, randomSource ?? new ConstantRandomSource());

        return (room, hostId, secondPlayerId);
    }

    private sealed class ConstantRandomSource : SharedKernel.IRandomSource
    {
        public int Next(int minValue, int maxValue) => 0;
    }

    private sealed class GroundWireRandomSource : SharedKernel.IRandomSource
    {
        public int Next(int minValue, int maxValue) => 1;
    }

    private sealed class SafeRollRandomSource : SharedKernel.IRandomSource
    {
        public int Next(int minValue, int maxValue)
        {
            if (minValue <= 6 && 6 < maxValue) return 6;
            return minValue;
        }
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
        private readonly TaskCompletionSource _dischargeReceived =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _voltageStartReceived =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource<RoundStartedDto> _roundStartedReceived =
            new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task BroadcastReceived => _broadcastReceived.Task;
        public Task DischargeReceived => _dischargeReceived.Task;
        public Task VoltageStartReceived => _voltageStartReceived.Task;
        public Task<RoundStartedDto> RoundStartedReceived => _roundStartedReceived.Task;

        public int BroadcastCount { get; private set; }
        public string? LastBroadcastRoomCode { get; private set; }
        public PlayerGameStateDto? LastBroadcastSample { get; private set; }
        public List<CapacitorDischargedEvent> Discharges { get; } = new();
        public List<TraceResolutionDto> Traces { get; } = new();
        public List<VoltageTestStartedEvent> VoltageStarts { get; } = new();

        public Task BroadcastSnapshotsAsync(
            IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> snapshots,
            CancellationToken ct = default)
        {
            BroadcastCount++;
            if (snapshots.Count > 0)
            {
                LastBroadcastRoomCode = snapshots[0].Snapshot.RoomCode;
                LastBroadcastSample = snapshots[0].Snapshot;
            }
            _broadcastReceived.TrySetResult();
            return Task.CompletedTask;
        }

        public Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, long sequenceNumber = 1, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, long sequenceNumber = 1, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default)
        {
            Traces.Add(resolution);
            return Task.CompletedTask;
        }

        public Task NotifyRoundStartedAsync(string roomCode, RoundStartedDto notification, CancellationToken ct = default)
        {
            _roundStartedReceived.TrySetResult(notification);
            return Task.CompletedTask;
        }

        public Task NotifyCapacitorDischargedAsync(string roomCode, CapacitorDischargedEvent notification, CancellationToken ct = default)
        {
            Discharges.Add(notification);
            _dischargeReceived.TrySetResult();
            return Task.CompletedTask;
        }

        public Task NotifyPlayerEliminatedAsync(string roomCode, PlayerEliminatedEvent notification, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyExploitTriggeredAsync(string roomCode, ExploitTriggeredEvent notification, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyPacketSniffedAsync(string connectionId, PacketSniffedEvent notification, CancellationToken ct = default) =>
            Task.CompletedTask;

        public Task NotifyVoltageTestStartedAsync(string roomCode, VoltageTestStartedEvent notification, CancellationToken ct = default)
        {
            VoltageStarts.Add(notification);
            _voltageStartReceived.TrySetResult();
            return Task.CompletedTask;
        }

        public Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default) =>
            Task.CompletedTask;
    }
}
