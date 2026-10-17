using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Rooms;

namespace Overclock.Modules.GameEngine.Application.Rooms;

public interface IGameAction
{
    void Execute(GameRoom room);
}

public sealed class GameAction : IGameAction
{
    private readonly Func<GameRoom, Result> _handler;
    private readonly TaskCompletionSource<Result> _completion =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    private GameAction(Func<GameRoom, Result> handler)
    {
        _handler = handler;
    }

    public Task<Result> Completion => _completion.Task;

    public static GameAction Create(Func<GameRoom, Result> handler)
    {
        ArgumentNullException.ThrowIfNull(handler);
        return new GameAction(handler);
    }

    public void Execute(GameRoom room)
    {
        try
        {
            _completion.TrySetResult(_handler(room));
        }
        catch (Exception exception)
        {
            _completion.TrySetException(exception);
        }
    }
}

public sealed class GameAction<TResult> : IGameAction
{
    private readonly Func<GameRoom, Result<TResult>> _handler;
    private readonly TaskCompletionSource<Result<TResult>> _completion =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    private GameAction(Func<GameRoom, Result<TResult>> handler)
    {
        _handler = handler;
    }

    public Task<Result<TResult>> Completion => _completion.Task;

    public static GameAction<TResult> Create(Func<GameRoom, Result<TResult>> handler)
    {
        ArgumentNullException.ThrowIfNull(handler);
        return new GameAction<TResult>(handler);
    }

    public void Execute(GameRoom room)
    {
        try
        {
            _completion.TrySetResult(_handler(room));
        }
        catch (Exception exception)
        {
            _completion.TrySetException(exception);
        }
    }
}