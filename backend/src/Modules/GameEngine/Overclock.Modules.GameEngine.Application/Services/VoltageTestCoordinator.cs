using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;
using ExploitType = Overclock.Modules.GameEngine.Domain.Exploits.ExploitType;

namespace Overclock.Modules.GameEngine.Application.Services;

public sealed class VoltageTestCoordinator(
    ITurnTimerEngine timerEngine,
    IGameNotifier? notifier = null,
    IGameStateProjector? projector = null,
    IRandomSource? randomSource = null,
    IMatchFinishedDispatcher? matchFinishedDispatcher = null)
{
    public static readonly TimeSpan GroundWireDecisionDuration = TimeSpan.FromSeconds(5);
    private readonly IRandomSource _randomSource = randomSource ?? CryptoRandomSource.Instance;

    public sealed record VoltageTestResolution(
        VoltageTestStartedEvent? StartedEvent,
        CapacitorDischargedEvent? DischargedEvent,
        PlayerEliminatedEvent? EliminatedEvent,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots);

    public VoltageTestResolution ProcessVoltageTestEntry(
        GameRoomSession session,
        GameRoom room,
        PlayerId pendingPlayerId)
    {
        var seat = room.Seats.FirstOrDefault(s => s.Id == pendingPlayerId);
        var hasGroundWire = seat?.Exploit is { IsBurned: false, Type: ExploitType.GroundWire };

        if (hasGroundWire)
        {
            timerEngine.Cancel(room.Id.Value, TimerKind.DischargeDecision);
            timerEngine.StartDischargeWatchdog(session, pendingPlayerId, room.DischargeSequenceId, GroundWireDecisionDuration);

            var deadlineUtc = DateTime.UtcNow.Add(GroundWireDecisionDuration);
            var seqStarted = room.NextEventSequence();
            var startedEvent = new VoltageTestStartedEvent(
                Type: "VoltageTestStarted",
                RoomCode: room.Id.Value,
                PendingPlayerId: pendingPlayerId.Value,
                DecisionDeadlineUtc: deadlineUtc,
                SequenceNumber: seqStarted);

            var snapshots = ProjectSnapshots(room);
            return new VoltageTestResolution(startedEvent, null, null, snapshots);
        }

        return ExecuteDischarge(session, room, pendingPlayerId);
    }

    public VoltageTestResolution ExecuteDischarge(GameRoom room, PlayerId pendingPlayerId)
    {
        timerEngine.Cancel(room.Id.Value, TimerKind.DischargeDecision);

        var seat = room.Seats.FirstOrDefault(s => s.Id == pendingPlayerId);
        var initialRisk = seat?.Risk.Level ?? 1;

        var dischargeResult = room.DischargeCapacitor(pendingPlayerId, _randomSource);
        if (!dischargeResult.IsSuccess)
        {
            var emptySnapshots = ProjectSnapshots(room);
            return new VoltageTestResolution(null, null, null, emptySnapshots);
        }

        var outcome = dischargeResult.Value;
        var seqDischarge = room.NextEventSequence();
        var dischargedEvent = new CapacitorDischargedEvent(
            Type: "CapacitorDischarged",
            RoomCode: room.Id.Value,
            PlayerId: pendingPlayerId.Value,
            Roll: outcome.Roll,
            RiskLevel: initialRisk,
            ResultingRiskLevel: outcome.ResultingRisk.Level,
            Overloaded: outcome.Overloaded,
            SequenceNumber: seqDischarge);

        PlayerEliminatedEvent? eliminatedEvent = null;
        if (outcome.Overloaded)
        {
            var seqElim = room.NextEventSequence();
            var placement = room.Seats.Count(s => s.Status != PlayerStatus.Eliminated) + 1;
            eliminatedEvent = new PlayerEliminatedEvent(
                Type: "PlayerEliminated",
                RoomCode: room.Id.Value,
                PlayerId: pendingPlayerId.Value,
                Placement: placement,
                SequenceNumber: seqElim);
        }

        var snapshots = ProjectSnapshots(room);
        return new VoltageTestResolution(null, dischargedEvent, eliminatedEvent, snapshots);
    }

    public VoltageTestResolution ExecuteDischarge(GameRoomSession session, GameRoom room, PlayerId pendingPlayerId)
    {
        var resolution = ExecuteDischarge(room, pendingPlayerId);
        if (room.State == RoomState.RoundOver)
        {
            var deadlineUtc = DateTime.UtcNow.Add(timerEngine.IntermissionDuration);
            room.MarkIntermissionDeadline(deadlineUtc);
            timerEngine.StartIntermission(session, room.RoundNumber, timerEngine.IntermissionDuration);
            resolution = resolution with { Snapshots = ProjectSnapshots(room) };
        }
        else if (room.State == RoomState.GameOver)
        {
            matchFinishedDispatcher?.Dispatch(MatchFinishedEventFactory.FromRoom(room));
        }

        return resolution;
    }

    public async Task DispatchResolutionAsync(string roomCode, VoltageTestResolution resolution, CancellationToken ct = default)
    {
        if (notifier is null)
        {
            return;
        }

        if (resolution.StartedEvent is not null)
        {
            await notifier.NotifyVoltageTestStartedAsync(roomCode, resolution.StartedEvent, ct).ConfigureAwait(false);
        }

        if (resolution.DischargedEvent is not null)
        {
            await notifier.NotifyCapacitorDischargedAsync(roomCode, resolution.DischargedEvent, ct).ConfigureAwait(false);
        }

        if (resolution.EliminatedEvent is not null)
        {
            await notifier.NotifyPlayerEliminatedAsync(roomCode, resolution.EliminatedEvent, ct).ConfigureAwait(false);
        }

        if (resolution.Snapshots.Count > 0)
        {
            await notifier.BroadcastSnapshotsAsync(resolution.Snapshots, ct).ConfigureAwait(false);
        }
    }

    private IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> ProjectSnapshots(GameRoom room) =>
        projector is not null
            ? projector.ProjectForActiveConnections(room)
            : GameStateProjector.ProjectForActiveConnections(room);
}
