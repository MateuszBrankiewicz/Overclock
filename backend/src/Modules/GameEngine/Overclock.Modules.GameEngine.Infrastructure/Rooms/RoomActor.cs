using System.Threading.Channels;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

public sealed class RoomActor : IRoomActor, IAsyncDisposable
{
    private readonly GameRoom _room;
    private readonly Channel<IGameAction> _actions;
    private readonly CancellationTokenSource _shutdown = new();
    private readonly Task _consumer;
    private readonly Lazy<Task> _disposeTask;

    public RoomActor(GameRoom room)
    {
        _room = room;
        _actions = Channel.CreateUnbounded<IGameAction>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
            AllowSynchronousContinuations = false
        });
        _consumer = ConsumeAsync();
        _disposeTask = new(DisposeCoreAsync, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public Task<Ardalis.Result.Result> EnqueueAsync(
        GameAction action,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);

        if (!_actions.Writer.TryWrite(action))
        {
            return Task.FromException<Ardalis.Result.Result>(
                new ObjectDisposedException(nameof(RoomActor)));
        }

        return action.Completion.WaitAsync(cancellationToken);
    }

    public Task<Ardalis.Result.Result<TResult>> EnqueueAsync<TResult>(
        GameAction<TResult> action,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(action);

        if (!_actions.Writer.TryWrite(action))
        {
            return Task.FromException<Ardalis.Result.Result<TResult>>(
                new ObjectDisposedException(nameof(RoomActor)));
        }

        return action.Completion.WaitAsync(cancellationToken);
    }

    public ValueTask DisposeAsync() => new(_disposeTask.Value);

    private async Task DisposeCoreAsync()
    {
        _actions.Writer.TryComplete();

        try
        {
            await _consumer.ConfigureAwait(false);
        }
        finally
        {
            _shutdown.Cancel();
            _shutdown.Dispose();
        }
    }

    private async Task ConsumeAsync()
    {
        await foreach (var action in _actions.Reader.ReadAllAsync(_shutdown.Token))
        {
            action.Execute(_room);
        }
    }
}