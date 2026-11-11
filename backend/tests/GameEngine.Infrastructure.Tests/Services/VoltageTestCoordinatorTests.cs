using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
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

public sealed class VoltageTestCoordinatorTests
{
    [Fact]
    public async Task ProcessVoltageTestEntry_WhenHoldingGroundWire_StartsWatchdogAndReturnsStartedEvent()
    {
        var (room, hostId, _) = CreateActiveRoomWithExploit(ExploitType.GroundWire);
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var timer = new RecordingTimerEngine();
        var notifier = new RecordingGameNotifier();
        var coordinator = new VoltageTestCoordinator(timer, notifier, new GameStateProjector());

        var hostSeat = room.Seats.First(s => s.Id == hostId);
        var playResult = room.PlayCards(hostId, [hostSeat.Hand[0].Id], room.CurrentTargetProtocol!.Value);
        Assert.True(playResult.IsSuccess);
        var secondPlayerId = room.Seats.First(s => s.Id != hostId).Id;
        var traceResult = room.CallTrace(secondPlayerId);
        Assert.True(traceResult.IsSuccess);
        var completeResult = room.CompleteBluffCheck();
        Assert.True(completeResult.IsSuccess);

        Assert.Equal(RoomState.VoltageTest, room.State);
        var pendingPlayerId = room.PendingDischargePlayerId!.Value;

        var resolution = coordinator.ProcessVoltageTestEntry(session, room, pendingPlayerId);

        Assert.NotNull(resolution.StartedEvent);
        Assert.Null(resolution.DischargedEvent);
        Assert.Equal(TimerKind.DischargeDecision, timer.LastStartedKind);
    }

    [Fact]
    public async Task ExecuteDischarge_WhenSurvives_SetsRoundOverAndReturnsEvent()
    {
        var (room, hostId, _) = CreateActiveRoomWithExploit(ExploitType.PacketSniffer);
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var timer = new RecordingTimerEngine();
        var notifier = new RecordingGameNotifier();
        // Safe roll = 6 against risk 1 -> survives
        var coordinator = new VoltageTestCoordinator(timer, notifier, new GameStateProjector(), new FixedRollRandomSource(6));

        var hostSeat = room.Seats.First(s => s.Id == hostId);
        room.PlayCards(hostId, [hostSeat.Hand[0].Id], room.CurrentTargetProtocol!.Value);
        var secondPlayerId = room.Seats.First(s => s.Id != hostId).Id;
        room.CallTrace(secondPlayerId);
        room.CompleteBluffCheck();

        var pendingPlayerId = room.PendingDischargePlayerId!.Value;
        var resolution = coordinator.ExecuteDischarge(room, pendingPlayerId);

        Assert.NotNull(resolution.DischargedEvent);
        Assert.False(resolution.DischargedEvent.Overloaded);
        Assert.Null(resolution.EliminatedEvent);
        Assert.Equal(RoomState.RoundOver, room.State);
    }

    [Fact]
    public async Task ExecuteDischarge_WhenOverloaded_EliminatesAndReturnsEliminatedEvent()
    {
        var (room, hostId, _) = CreateActiveRoomWithExploit(ExploitType.PacketSniffer);
        await using var session = new GameRoomSession(room, new RoomActor(room));
        var timer = new RecordingTimerEngine();
        var notifier = new RecordingGameNotifier();
        // Overload roll = 1 against risk 1 -> overloaded!
        var coordinator = new VoltageTestCoordinator(timer, notifier, new GameStateProjector(), new FixedRollRandomSource(1));

        var hostSeat = room.Seats.First(s => s.Id == hostId);
        room.PlayCards(hostId, [hostSeat.Hand[0].Id], room.CurrentTargetProtocol!.Value);
        var secondPlayerId = room.Seats.First(s => s.Id != hostId).Id;
        room.CallTrace(secondPlayerId);
        room.CompleteBluffCheck();

        var pendingPlayerId = room.PendingDischargePlayerId!.Value;
        var resolution = coordinator.ExecuteDischarge(room, pendingPlayerId);

        Assert.NotNull(resolution.DischargedEvent);
        Assert.True(resolution.DischargedEvent.Overloaded);
        Assert.NotNull(resolution.EliminatedEvent);
        Assert.Equal(pendingPlayerId.Value, resolution.EliminatedEvent.PlayerId);
    }

    [Fact]
    public async Task DispatchResolutionAsync_BroadcastsExpectedEvents()
    {
        var timer = new RecordingTimerEngine();
        var notifier = new RecordingGameNotifier();
        var coordinator = new VoltageTestCoordinator(timer, notifier, new GameStateProjector());

        var started = new VoltageTestStartedEvent("VoltageTestStarted", "ROOM-1", Guid.NewGuid());
        var discharged = new CapacitorDischargedEvent("CapacitorDischarged", "ROOM-1", Guid.NewGuid(), 3, 1, 2, false);
        var resolution = new VoltageTestCoordinator.VoltageTestResolution(started, discharged, null, []);

        await coordinator.DispatchResolutionAsync("ROOM-1", resolution);

        Assert.Single(notifier.StartedEvents);
        Assert.Single(notifier.DischargedEvents);
        Assert.Empty(notifier.EliminatedEvents);
    }

    private static (GameRoom Room, PlayerId HostId, PlayerId SecondPlayerId) CreateActiveRoomWithExploit(ExploitType hostExploit)
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
        var exploitIndex = hostExploit switch
        {
            ExploitType.PacketSniffer => 0,
            ExploitType.GroundWire => 1,
            ExploitType.OverclockInjector => 2,
            ExploitType.EmpFlare => 3,
            _ => 0
        };
        room.StartRound(hostId, new IndexedRandomSource(exploitIndex));

        return (room, hostId, secondPlayerId);
    }

    private sealed class IndexedRandomSource(int fixedIndex) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => fixedIndex;
    }

    private sealed class FixedRollRandomSource(int roll) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => roll;
    }

    private sealed class RecordingTimerEngine : ITurnTimerEngine
    {
        public TimerKind? LastStartedKind { get; private set; }
        public TimerKind? LastCanceledKind { get; private set; }

        public void Start(GameRoomSession session, PlayerId playerId, long turnSequenceId, TimeSpan? duration = null)
        {
            LastStartedKind = TimerKind.Turn;
        }

        public void StartDischargeWatchdog(GameRoomSession session, PlayerId playerId, long dischargeSequenceId, TimeSpan? duration = null)
        {
            LastStartedKind = TimerKind.DischargeDecision;
        }

        public bool RescheduleTurn(string roomCode, long turnSequenceId, TimeSpan newRemainingDuration) => true;

        public void Cancel(string roomCode, TimerKind? kind = null)
        {
            LastCanceledKind = kind;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class RecordingGameNotifier : IGameNotifier
    {
        public List<VoltageTestStartedEvent> StartedEvents { get; } = new();
        public List<CapacitorDischargedEvent> DischargedEvents { get; } = new();
        public List<PlayerEliminatedEvent> EliminatedEvents { get; } = new();

        public Task BroadcastSnapshotsAsync(IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> snapshots, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyCardsPlayedAsync(string roomCode, Guid playerId, int cardCount, CardProtocol declaredProtocol, long sequenceNumber = 1, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyPlayerJoinedAsync(string roomCode, PlayerSeatDto player, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyPlayerStatusChangedAsync(string roomCode, Guid playerId, PlayerStatus status, long sequenceNumber = 1, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyRoundStartedAsync(string roomCode, RoundStartedDto notification, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyTraceCalledAsync(string roomCode, TraceResolutionDto resolution, CancellationToken ct = default) => Task.CompletedTask;
        public Task SendPlayerSnapshotAsync(string connectionId, PlayerGameStateDto snapshot, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyCapacitorDischargedAsync(string roomCode, CapacitorDischargedEvent notification, CancellationToken ct = default)
        {
            DischargedEvents.Add(notification);
            return Task.CompletedTask;
        }
        public Task NotifyPlayerEliminatedAsync(string roomCode, PlayerEliminatedEvent notification, CancellationToken ct = default)
        {
            EliminatedEvents.Add(notification);
            return Task.CompletedTask;
        }
        public Task NotifyExploitTriggeredAsync(string roomCode, ExploitTriggeredEvent notification, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyPacketSniffedAsync(string connectionId, PacketSniffedEvent notification, CancellationToken ct = default) => Task.CompletedTask;
        public Task NotifyVoltageTestStartedAsync(string roomCode, VoltageTestStartedEvent notification, CancellationToken ct = default)
        {
            StartedEvents.Add(notification);
            return Task.CompletedTask;
        }
    }
}
