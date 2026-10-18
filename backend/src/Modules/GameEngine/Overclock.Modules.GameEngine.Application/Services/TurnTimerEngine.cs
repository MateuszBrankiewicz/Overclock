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

    private readonly ConcurrentDictionary<string, TimerEntry> _timers =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ITurnDelay _delay;
    private readonly IGameNotifier? _notifier;
    private readonly IGameStateProjector? _projector;
    private readonly TimeSpan _turnDuration;

    public TurnTimerEngine(ITurnDelay delay, TimeSpan? turnDuration = null)
        : this(delay, null, null, turnDuration)
    {
    }

    public TurnTimerEngine(
        ITurnDelay delay,
        IGameNotifier? notifier,
        TimeSpan? turnDuration = null)
        : this(delay, notifier, null, turnDuration)
    {
    }

    public TurnTimerEngine(
        ITurnDelay delay,
        IGameNotifier? notifier,
        IGameStateProjector? projector,
        TimeSpan? turnDuration = null)
    {
        _delay = delay;
        _notifier = notifier;
        _projector = projector;
        _turnDuration = turnDuration ?? DefaultTurnDuration;
    }

    public void Start(GameRoomSession session, PlayerId playerId, long turnSequenceId)
    {
        ArgumentNullException.ThrowIfNull(session);

        var entry = new TimerEntry(session, playerId, turnSequenceId);
        if (_timers.TryRemove(session.RoomCode, out var previous))
        {
            previous.Cancel();
        }

        _timers[session.RoomCode] = entry;
        entry.Task = RunAsync(session.RoomCode, entry);
    }

    public void Cancel(string roomCode)
    {
        if (_timers.TryRemove(roomCode, out var entry))
        {
            entry.Cancel();
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

    private async Task RunAsync(string roomCode, TimerEntry entry)
    {
        try
        {
            await _delay.DelayAsync(_turnDuration, entry.CancellationToken).ConfigureAwait(false);

            if (entry.CancellationToken.IsCancellationRequested)
            {
                return;
            }

            var action = new TurnExpiredAction(entry.PlayerId, entry.TurnSequenceId);
            var result = await entry.Session.EnqueueAsync(room =>
            {
                var actionResult = action.Execute(room);
                if (!actionResult.IsSuccess)
                {
                    return actionResult.ToResult<(TurnExpired Outcome, IReadOnlyList<(string ConnectionId, PlayerGameStateDto Snapshot)> Snapshots)>();
                }

                var snapshots = _projector is not null
                    ? _projector.ProjectForActiveConnections(room)
                    : GameStateProjector.ProjectForActiveConnections(room);

                return Result<(TurnExpired, IReadOnlyList<(string, PlayerGameStateDto)>)>.Success((actionResult.Value, snapshots));
            }, CancellationToken.None).ConfigureAwait(false);

            if (result.IsSuccess)
            {
                var (outcome, snapshots) = result.Value;

                if (outcome.NextPlayerId is { } nextPlayerId &&
                    entry.Session.Room.State == RoomState.TurnActive)
                {
                    Start(entry.Session, nextPlayerId, entry.Session.Room.TurnSequenceId);
                }

                if (_notifier is not null)
                {
                    try
                    {
                        await _notifier.BroadcastSnapshotsAsync(
                            roomCode,
                            snapshots,
                            CancellationToken.None).ConfigureAwait(false);
                    }
                    catch
                    {
                        // Failure to deliver network broadcast should not fault the authoritative timer loop
                    }
                }
            }
        }
        catch (Exception ex) when (ex is OperationCanceledException or ObjectDisposedException)
        {
        }
        finally
        {
            _timers.TryRemove(new KeyValuePair<string, TimerEntry>(roomCode, entry));
            entry.Dispose();
        }
    }

    private sealed class TimerEntry(
        GameRoomSession session,
        PlayerId playerId,
        long turnSequenceId) : IDisposable
    {
        private readonly CancellationTokenSource _cancellation = new();
        private bool _disposed;

        public GameRoomSession Session { get; } = session;
        public PlayerId PlayerId { get; } = playerId;
        public long TurnSequenceId { get; } = turnSequenceId;
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