using System.Collections.Concurrent;
using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Ports;
using Overclock.Modules.GameEngine.Application.Projections;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Contracts;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Application.Services;

public sealed class TurnTimerEngine : ITurnTimerEngine
{
    public static readonly TimeSpan DefaultTurnDuration = TimeSpan.FromSeconds(15);
    public static readonly TimeSpan DefaultWatchdogDuration = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan DefaultIntermissionDuration = TimeSpan.FromSeconds(10);

    private readonly ConcurrentDictionary<TimerKey, TimerEntry> _timers = new();
    private readonly ITurnDelay _delay;
    private readonly IGameNotifier? _notifier;
    private readonly IGameStateProjector? _projector;
    private readonly IRandomSource _randomSource;
    private readonly IMatchFinishedDispatcher? _matchFinishedDispatcher;
    private readonly TimeSpan _turnDuration;
    private readonly TimeSpan _intermissionDuration;

    public TimeSpan IntermissionDuration => _intermissionDuration;

    public TurnTimerEngine(ITurnDelay delay, TimeSpan? turnDuration = null, TimeSpan? intermissionDuration = null)
        : this(delay, null, null, null, turnDuration, intermissionDuration, null)
    {
    }

    public TurnTimerEngine(
        ITurnDelay delay,
        IGameNotifier? notifier,
        TimeSpan? turnDuration = null,
        TimeSpan? intermissionDuration = null)
        : this(delay, notifier, null, null, turnDuration, intermissionDuration, null)
    {
    }

    public TurnTimerEngine(
        ITurnDelay delay,
        IGameNotifier? notifier,
        IGameStateProjector? projector,
        IRandomSource? randomSource = null,
        TimeSpan? turnDuration = null,
        TimeSpan? intermissionDuration = null,
        IMatchFinishedDispatcher? matchFinishedDispatcher = null)
    {
        _delay = delay;
        _notifier = notifier;
        _projector = projector;
        _randomSource = randomSource ?? CryptoRandomSource.Instance;
        _matchFinishedDispatcher = matchFinishedDispatcher;
        _turnDuration = turnDuration ?? DefaultTurnDuration;
        _intermissionDuration = intermissionDuration ?? DefaultIntermissionDuration;
    }

    public void Start(GameRoomSession session, PlayerId playerId, long turnSequenceId, TimeSpan? duration = null)
    {
        ArgumentNullException.ThrowIfNull(session);

        var key = new TimerKey(session.RoomCode, TimerKind.Turn);
        var entry = new TimerEntry(session, playerId, turnSequenceId, TimerKind.Turn);
        if (_timers.TryRemove(key, out var previous))
        {
            previous.Cancel();
        }

        _timers[key] = entry;
        entry.Task = RunTurnAsync(session.RoomCode, entry, duration ?? _turnDuration);
    }

    public void StartDischargeWatchdog(
        GameRoomSession session,
        PlayerId playerId,
        long dischargeSequenceId,
        TimeSpan? duration = null)
    {
        ArgumentNullException.ThrowIfNull(session);

        var key = new TimerKey(session.RoomCode, TimerKind.DischargeDecision);
        var entry = new TimerEntry(session, playerId, dischargeSequenceId, TimerKind.DischargeDecision);
        if (_timers.TryRemove(key, out var previous))
        {
            previous.Cancel();
        }

        _timers[key] = entry;
        entry.Task = RunWatchdogAsync(session.RoomCode, entry, duration ?? DefaultWatchdogDuration);
    }

    public void StartIntermission(
        GameRoomSession session,
        int roundNumber,
        TimeSpan? duration = null)
    {
        ArgumentNullException.ThrowIfNull(session);

        var key = new TimerKey(session.RoomCode, TimerKind.Intermission);
        var entry = new TimerEntry(session, default, roundNumber, TimerKind.Intermission);
        if (_timers.TryRemove(key, out var previous))
        {
            previous.Cancel();
        }

        _timers[key] = entry;
        entry.Task = RunIntermissionAsync(session.RoomCode, entry, duration ?? _intermissionDuration);
    }

    public bool RescheduleTurn(string roomCode, long turnSequenceId, TimeSpan newRemainingDuration)
    {
        var key = new TimerKey(roomCode, TimerKind.Turn);
        if (!_timers.TryGetValue(key, out var existing))
        {
            return false;
        }

        if (existing.SequenceId != turnSequenceId)
        {
            return false;
        }

        Start(existing.Session, existing.PlayerId, existing.SequenceId, newRemainingDuration);
        return true;
    }

    public void Cancel(string roomCode, TimerKind? kind = null)
    {
        if (kind is null)
        {
            foreach (TimerKind k in Enum.GetValues<TimerKind>())
            {
                if (_timers.TryRemove(new TimerKey(roomCode, k), out var entry))
                {
                    entry.Cancel();
                }
            }
        }
        else
        {
            if (_timers.TryRemove(new TimerKey(roomCode, kind.Value), out var entry))
            {
                entry.Cancel();
            }
        }
    }

    public async ValueTask DisposeAsync()
    {
        var entries = _timers.Values.ToArray();
        _timers.Clear();

        foreach (var entry in entries)
        {
            entry.Cancel();
        }

        var tasks = entries
            .Select(entry => entry.Task)
            .Where(task => task is not null)
            .Cast<Task>()
            .ToArray();

        if (tasks.Length > 0)
        {
            try
            {
                await Task.WhenAll(tasks).ConfigureAwait(false);
            }
            catch
            {
                // Ignore cancellations during shutdown
            }
        }
    }

    private async Task RunTurnAsync(string roomCode, TimerEntry entry, TimeSpan duration)
    {
        var key = new TimerKey(roomCode, TimerKind.Turn);
        try
        {
            await _delay.DelayAsync(duration, entry.CancellationToken).ConfigureAwait(false);

            if (entry.CancellationToken.IsCancellationRequested)
            {
                return;
            }

            var action = new TurnExpiredAction(entry.PlayerId, entry.SequenceId);
            var result = await entry.Session.EnqueueAsync(room =>
            {
                var actionResult = action.Execute(room);
                if (!actionResult.IsSuccess)
                {
                    return actionResult.ToResult<TurnExpiredResult>();
                }

                TraceResolutionDto? traceResolutionDto = null;
                VoltageTestStartedEvent? voltageStartedEvent = null;
                CapacitorDischargedEvent? dischargedEvent = null;
                PlayerEliminatedEvent? eliminatedEvent = null;

                var outcome = actionResult.Value;
                if (outcome is TurnExpiredOutcome.AutoTrace autoTrace)
                {
                    var res = autoTrace.Resolution;
                    var seqTrace = room.NextEventSequence();
                    traceResolutionDto = new TraceResolutionDto(
                        res.AccuserPlayerId.Value,
                        res.AccusedPlayerId.Value,
                        res.LoserPlayerId.Value,
                        res.RevealedCards.Select(c => new PlayerCardDto(c.Id.Value, c.Protocol.ToString(), VisualSeedGenerator.FromCardId(c.Id.Value))).ToList(),
                        res.DeclaredProtocol.ToString(),
                        res.BluffDetected,
                        seqTrace);

                    room.CompleteBluffCheck();

                    var loserSeat = room.Seats.FirstOrDefault(s => s.Id == res.LoserPlayerId);
                    var hasGroundWire = loserSeat?.Exploit is { IsBurned: false, Type: Domain.Exploits.ExploitType.GroundWire };

                    if (hasGroundWire)
                    {
                        var deadlineUtc = DateTime.UtcNow.Add(DefaultWatchdogDuration);
                        var seqStarted = room.NextEventSequence();
                        voltageStartedEvent = new VoltageTestStartedEvent(
                            Type: "VoltageTestStarted",
                            RoomCode: room.Id.Value,
                            PendingPlayerId: res.LoserPlayerId.Value,
                            DecisionDeadlineUtc: deadlineUtc,
                            SequenceNumber: seqStarted);

                        StartDischargeWatchdog(entry.Session, res.LoserPlayerId, room.DischargeSequenceId, DefaultWatchdogDuration);
                    }
                    else
                    {
                        var initialRisk = loserSeat?.Risk.Level ?? 1;
                        var discharge = room.DischargeCapacitor(res.LoserPlayerId, _randomSource);
                        if (discharge.IsSuccess)
                        {
                            var d = discharge.Value;
                            var seqDischarge = room.NextEventSequence();
                            dischargedEvent = new CapacitorDischargedEvent(
                                Type: "CapacitorDischarged",
                                RoomCode: room.Id.Value,
                                PlayerId: res.LoserPlayerId.Value,
                                Roll: d.Roll,
                                RiskLevel: initialRisk,
                                ResultingRiskLevel: d.ResultingRisk.Level,
                                Overloaded: d.Overloaded,
                                SequenceNumber: seqDischarge);

                            if (d.Overloaded)
                            {
                                var seqElim = room.NextEventSequence();
                                var placement = room.Seats.Count(s => s.Status != PlayerStatus.Eliminated) + 1;
                                eliminatedEvent = new PlayerEliminatedEvent(
                                    Type: "PlayerEliminated",
                                    RoomCode: room.Id.Value,
                                    PlayerId: res.LoserPlayerId.Value,
                                    Placement: placement,
                                    SequenceNumber: seqElim);
                            }
                        }
                    }
                }
                else if (outcome is TurnExpiredOutcome.LeadForfeit leadForfeit)
                {
                    var forfeitSeat = room.Seats.FirstOrDefault(s => s.Id == leadForfeit.ForfeitingPlayerId);
                    var hasGroundWire = forfeitSeat?.Exploit is { IsBurned: false, Type: Domain.Exploits.ExploitType.GroundWire };

                    if (hasGroundWire)
                    {
                        var deadlineUtc = DateTime.UtcNow.Add(DefaultWatchdogDuration);
                        var seqStarted = room.NextEventSequence();
                        voltageStartedEvent = new VoltageTestStartedEvent(
                            Type: "VoltageTestStarted",
                            RoomCode: room.Id.Value,
                            PendingPlayerId: leadForfeit.ForfeitingPlayerId.Value,
                            DecisionDeadlineUtc: deadlineUtc,
                            SequenceNumber: seqStarted);

                        StartDischargeWatchdog(entry.Session, leadForfeit.ForfeitingPlayerId, room.DischargeSequenceId, DefaultWatchdogDuration);
                    }
                    else
                    {
                        var initialRisk = forfeitSeat?.Risk.Level ?? 1;
                        var discharge = room.DischargeCapacitor(leadForfeit.ForfeitingPlayerId, _randomSource);
                        if (discharge.IsSuccess)
                        {
                            var d = discharge.Value;
                            var seqDischarge = room.NextEventSequence();
                            dischargedEvent = new CapacitorDischargedEvent(
                                Type: "CapacitorDischarged",
                                RoomCode: room.Id.Value,
                                PlayerId: leadForfeit.ForfeitingPlayerId.Value,
                                Roll: d.Roll,
                                RiskLevel: initialRisk,
                                ResultingRiskLevel: d.ResultingRisk.Level,
                                Overloaded: d.Overloaded,
                                SequenceNumber: seqDischarge);

                            if (d.Overloaded)
                            {
                                var seqElim = room.NextEventSequence();
                                var placement = room.Seats.Count(s => s.Status != PlayerStatus.Eliminated) + 1;
                                eliminatedEvent = new PlayerEliminatedEvent(
                                    Type: "PlayerEliminated",
                                    RoomCode: room.Id.Value,
                                    PlayerId: leadForfeit.ForfeitingPlayerId.Value,
                                    Placement: placement,
                                    SequenceNumber: seqElim);
                            }
                        }
                    }
                }

                if (room.State == RoomState.RoundOver)
                {
                    var deadlineUtc = DateTime.UtcNow.Add(_intermissionDuration);
                    room.MarkIntermissionDeadline(deadlineUtc);
                    StartIntermission(entry.Session, room.RoundNumber, _intermissionDuration);
                }
                else if (room.State == RoomState.GameOver)
                {
                    _matchFinishedDispatcher?.Dispatch(MatchFinishedEventFactory.FromRoom(room));
                }

                var snapshots = _projector is not null
                    ? _projector.ProjectForActiveConnections(room)
                    : GameStateProjector.ProjectForActiveConnections(room);

                return Result<TurnExpiredResult>.Success(new TurnExpiredResult(
                    traceResolutionDto,
                    voltageStartedEvent,
                    dischargedEvent,
                    eliminatedEvent,
                    snapshots));
            }, CancellationToken.None).ConfigureAwait(false);

            if (result.IsSuccess && _notifier is not null)
            {
                var res = result.Value;
                if (res.TraceResolution is not null)
                {
                    await _notifier.NotifyTraceCalledAsync(roomCode, res.TraceResolution, CancellationToken.None).ConfigureAwait(false);
                }

                if (res.VoltageStarted is not null)
                {
                    await _notifier.NotifyVoltageTestStartedAsync(roomCode, res.VoltageStarted, CancellationToken.None).ConfigureAwait(false);
                }

                if (res.Discharged is not null)
                {
                    await _notifier.NotifyCapacitorDischargedAsync(roomCode, res.Discharged, CancellationToken.None).ConfigureAwait(false);
                }

                if (res.Eliminated is not null)
                {
                    await _notifier.NotifyPlayerEliminatedAsync(roomCode, res.Eliminated, CancellationToken.None).ConfigureAwait(false);
                }

                await _notifier.BroadcastSnapshotsAsync(res.Snapshots, CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
        {
        }
        finally
        {
            _timers.TryRemove(new KeyValuePair<TimerKey, TimerEntry>(key, entry));
            entry.Dispose();
        }
    }

    private async Task RunWatchdogAsync(string roomCode, TimerEntry entry, TimeSpan duration)
    {
        var key = new TimerKey(roomCode, TimerKind.DischargeDecision);
        try
        {
            await _delay.DelayAsync(duration, entry.CancellationToken).ConfigureAwait(false);

            if (entry.CancellationToken.IsCancellationRequested)
            {
                return;
            }

            var result = await entry.Session.EnqueueAsync(room =>
            {
                if (room.State != RoomState.VoltageTest ||
                    room.PendingDischargePlayerId != entry.PlayerId ||
                    room.DischargeSequenceId != entry.SequenceId)
                {
                    return Result<WatchdogResult>.Conflict("Watchdog.Stale");
                }

                var seat = room.Seats.FirstOrDefault(s => s.Id == entry.PlayerId);
                var initialRisk = seat?.Risk.Level ?? 1;

                var discharge = room.DischargeCapacitor(entry.PlayerId, _randomSource);
                if (!discharge.IsSuccess)
                {
                    return discharge.ToResult<WatchdogResult>();
                }

                var d = discharge.Value;
                var seqDischarge = room.NextEventSequence();
                var dischargedEvent = new CapacitorDischargedEvent(
                    Type: "CapacitorDischarged",
                    RoomCode: room.Id.Value,
                    PlayerId: entry.PlayerId.Value,
                    Roll: d.Roll,
                    RiskLevel: initialRisk,
                    ResultingRiskLevel: d.ResultingRisk.Level,
                    Overloaded: d.Overloaded,
                    SequenceNumber: seqDischarge);

                PlayerEliminatedEvent? eliminatedEvent = null;
                if (d.Overloaded)
                {
                    var seqElim = room.NextEventSequence();
                    var placement = room.Seats.Count(s => s.Status != PlayerStatus.Eliminated) + 1;
                    eliminatedEvent = new PlayerEliminatedEvent(
                        Type: "PlayerEliminated",
                        RoomCode: room.Id.Value,
                        PlayerId: entry.PlayerId.Value,
                        Placement: placement,
                        SequenceNumber: seqElim);
                }

                if (room.State == RoomState.RoundOver)
                {
                    var deadlineUtc = DateTime.UtcNow.Add(_intermissionDuration);
                    room.MarkIntermissionDeadline(deadlineUtc);
                    StartIntermission(entry.Session, room.RoundNumber, _intermissionDuration);
                }
                else if (room.State == RoomState.GameOver)
                {
                    _matchFinishedDispatcher?.Dispatch(MatchFinishedEventFactory.FromRoom(room));
                }

                var snapshots = _projector is not null
                    ? _projector.ProjectForActiveConnections(room)
                    : GameStateProjector.ProjectForActiveConnections(room);

                return Result<WatchdogResult>.Success(new WatchdogResult(dischargedEvent, eliminatedEvent, snapshots));
            }, CancellationToken.None).ConfigureAwait(false);

            if (result.IsSuccess && _notifier is not null)
            {
                var res = result.Value;
                await _notifier.NotifyCapacitorDischargedAsync(roomCode, res.Discharged, CancellationToken.None).ConfigureAwait(false);
                if (res.Eliminated is not null)
                {
                    await _notifier.NotifyPlayerEliminatedAsync(roomCode, res.Eliminated, CancellationToken.None).ConfigureAwait(false);
                }
                await _notifier.BroadcastSnapshotsAsync(res.Snapshots, CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
        {
        }
        finally
        {
            _timers.TryRemove(new KeyValuePair<TimerKey, TimerEntry>(key, entry));
            entry.Dispose();
        }
    }

    private async Task RunIntermissionAsync(string roomCode, TimerEntry entry, TimeSpan duration)
    {
        var key = new TimerKey(roomCode, TimerKind.Intermission);
        try
        {
            await _delay.DelayAsync(duration, entry.CancellationToken).ConfigureAwait(false);

            if (entry.CancellationToken.IsCancellationRequested)
            {
                return;
            }

            var result = await entry.Session.EnqueueAsync(room =>
            {
                if (room.State != RoomState.RoundOver || room.RoundNumber != (int)entry.SequenceId)
                {
                    return Result<IntermissionExpiredResult>.Conflict("Intermission.Stale");
                }

                var advanceResult = room.AdvanceRound(_randomSource);
                if (!advanceResult.IsSuccess)
                {
                    return advanceResult.ToResult<IntermissionExpiredResult>();
                }

                var seqRound = room.NextEventSequence();
                var roundStartedEvent = new RoundStartedDto(
                    room.Id.Value,
                    room.RoundNumber,
                    room.CurrentTargetProtocol?.ToString() ?? "Alpha",
                    room.CurrentTurnPlayerId!.Value.Value,
                    seqRound);

                if (room.State == RoomState.TurnActive && room.CurrentTurnPlayerId is { } nextPlayerId)
                {
                    var deadlineUtc = DateTime.UtcNow.Add(_turnDuration);
                    room.MarkTurnDeadline(deadlineUtc);
                    Start(entry.Session, nextPlayerId, room.TurnSequenceId, _turnDuration);
                }

                var snapshots = _projector is not null
                    ? _projector.ProjectForActiveConnections(room)
                    : GameStateProjector.ProjectForActiveConnections(room);

                return Result<IntermissionExpiredResult>.Success(new IntermissionExpiredResult(roundStartedEvent, snapshots));
            }, CancellationToken.None).ConfigureAwait(false);

            if (result.IsSuccess && _notifier is not null)
            {
                var res = result.Value;
                await _notifier.NotifyRoundStartedAsync(roomCode, res.RoundStarted, CancellationToken.None).ConfigureAwait(false);
                await _notifier.BroadcastSnapshotsAsync(res.Snapshots, CancellationToken.None).ConfigureAwait(false);
            }
        }
        catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
        {
        }
        finally
        {
            _timers.TryRemove(new KeyValuePair<TimerKey, TimerEntry>(key, entry));
            entry.Dispose();
        }
    }

    private sealed record IntermissionExpiredResult(
        RoundStartedDto RoundStarted,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots);

    private readonly record struct TimerKey(string RoomCode, TimerKind Kind);

    private sealed record TurnExpiredResult(
        TraceResolutionDto? TraceResolution,
        VoltageTestStartedEvent? VoltageStarted,
        CapacitorDischargedEvent? Discharged,
        PlayerEliminatedEvent? Eliminated,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots);

    private sealed record WatchdogResult(
        CapacitorDischargedEvent Discharged,
        PlayerEliminatedEvent? Eliminated,
        IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots);

    private sealed class TimerEntry(
        GameRoomSession session,
        PlayerId playerId,
        long sequenceId,
        TimerKind kind) : IDisposable
    {
        private readonly CancellationTokenSource _cancellation = new();
        private bool _disposed;

        public GameRoomSession Session { get; } = session;
        public PlayerId PlayerId { get; } = playerId;
        public long SequenceId { get; } = sequenceId;
        public TimerKind Kind { get; } = kind;
        public Task? Task { get; set; }
        public CancellationToken CancellationToken => _cancellation.Token;

        public void Cancel()
        {
            try
            {
                if (!_disposed)
                {
                    _cancellation.Cancel();
                }
            }
            catch (ObjectDisposedException)
            {
            }
        }

        public void Dispose()
        {
            _disposed = true;
            _cancellation.Dispose();
        }
    }
}

public sealed class TaskTurnDelay : ITurnDelay
{
    public Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken) =>
        Task.Delay(duration, cancellationToken);
}
