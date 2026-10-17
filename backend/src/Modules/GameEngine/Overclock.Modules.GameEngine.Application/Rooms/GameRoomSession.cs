using System.Threading.Channels;
using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public sealed class GameRoomSession : IAsyncDisposable
{
    private readonly Channel<Func<ValueTask>> _channel;
    private readonly Task _loopTask;
    private readonly CancellationTokenSource _cts = new();

    public GameRoom Room { get; }
    public string RoomCode => Room.Id.Value;

    public GameRoomSession(GameRoom room)
    {
        Room = room;
        _channel = Channel.CreateUnbounded<Func<ValueTask>>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
        _loopTask = Task.Run(RunLoopAsync);
    }

    public async Task<Result<T>> EnqueueAsync<T>(Func<GameRoom, Result<T>> action, CancellationToken ct = default)
    {
        var tcs = new TaskCompletionSource<Result<T>>(TaskCreationOptions.RunContinuationsAsynchronously);

        ValueTask Item()
        {
            try
            {
                var result = action(Room);
                tcs.TrySetResult(result);
            }
            catch (Exception ex)
            {
                tcs.TrySetException(ex);
            }
            return ValueTask.CompletedTask;
        }

        await _channel.Writer.WriteAsync(Item, ct);
        return await tcs.Task;
    }

    public async Task<Result> EnqueueAsync(Func<GameRoom, Result> action, CancellationToken ct = default)
    {
        var tcs = new TaskCompletionSource<Result>(TaskCreationOptions.RunContinuationsAsynchronously);

        ValueTask Item()
        {
            try
            {
                var result = action(Room);
                tcs.TrySetResult(result);
            }
            catch (Exception ex)
            {
                tcs.TrySetException(ex);
            }
            return ValueTask.CompletedTask;
        }

        await _channel.Writer.WriteAsync(Item, ct);
        return await tcs.Task;
    }

    public async Task<Result<T>> EnqueueAsync<T>(Func<GameRoom, ValueTask<Result<T>>> action, CancellationToken ct = default)
    {
        var tcs = new TaskCompletionSource<Result<T>>(TaskCreationOptions.RunContinuationsAsynchronously);

        async ValueTask Item()
        {
            try
            {
                var result = await action(Room);
                tcs.TrySetResult(result);
            }
            catch (Exception ex)
            {
                tcs.TrySetException(ex);
            }
        }

        await _channel.Writer.WriteAsync(Item, ct);
        return await tcs.Task;
    }

    public async Task<Result> EnqueueAsync(Func<GameRoom, ValueTask<Result>> action, CancellationToken ct = default)
    {
        var tcs = new TaskCompletionSource<Result>(TaskCreationOptions.RunContinuationsAsynchronously);

        async ValueTask Item()
        {
            try
            {
                var result = await action(Room);
                tcs.TrySetResult(result);
            }
            catch (Exception ex)
            {
                tcs.TrySetException(ex);
            }
        }

        await _channel.Writer.WriteAsync(Item, ct);
        return await tcs.Task;
    }

    private async Task RunLoopAsync()
    {
        var reader = _channel.Reader;
        try
        {
            while (await reader.WaitToReadAsync(_cts.Token))
            {
                while (reader.TryRead(out var action))
                {
                    await action();
                }
            }
        }
        catch (OperationCanceledException) when (_cts.IsCancellationRequested)
        {
            // Normal shutdown
        }
    }

    public async ValueTask DisposeAsync()
    {
        _cts.Cancel();
        _channel.Writer.TryComplete();
        try
        {
            await _loopTask;
        }
        catch
        {
            // Ignore cancel during teardown
        }
        _cts.Dispose();
    }
}
