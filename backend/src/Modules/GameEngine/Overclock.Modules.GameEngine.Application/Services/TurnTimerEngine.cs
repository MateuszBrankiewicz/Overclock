using System.Collections.Concurrent;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Services;

public sealed class TurnTimerEngine : ITurnTimerEngine
{
    public static readonly TimeSpan DefaultTurnDuration = TimeSpan.FromSeconds(15);

    private readonly ConcurrentDictionary<string, TimerEntry> _timers =
        new(StringComparer.OrdinalIgnoreCase);
    private readonly ITurnDelay _delay;
    private readonly TimeSpan _turnDuration;

    public TurnTimerEngine(ITurnDelay delay, TimeSpan? turnDuration = null)
    {
        _delay = delay;
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
            await Task.WhenAll(tasks).ConfigureAwait(false);
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
            await entry.Session.EnqueueAsync(action.Execute, CancellationToken.None)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (entry.CancellationToken.IsCancellationRequested)
        {
        }
        finally
        {
            if (_timers.TryGetValue(roomCode, out var current) && ReferenceEquals(current, entry))
            {
                _timers.TryRemove(roomCode, out _);
            }

            entry.Dispose();
        }
    }

    private sealed class TimerEntry(
        GameRoomSession session,
        PlayerId playerId,
        long turnSequenceId) : IDisposable
    {
        private readonly CancellationTokenSource _cancellation = new();

        public GameRoomSession Session { get; } = session;
        public PlayerId PlayerId { get; } = playerId;
        public long TurnSequenceId { get; } = turnSequenceId;
        public Task? Task { get; set; }
        public CancellationToken CancellationToken => _cancellation.Token;

        public void Cancel() => _cancellation.Cancel();

        public void Dispose() => _cancellation.Dispose();
    }
}

public sealed class TaskTurnDelay : ITurnDelay
{
    public Task DelayAsync(TimeSpan duration, CancellationToken cancellationToken) =>
        Task.Delay(duration, cancellationToken);
}