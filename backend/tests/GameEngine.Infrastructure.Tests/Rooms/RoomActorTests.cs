using System.Collections.Concurrent;
using Ardalis.Result;
using Overclock.Modules.GameEngine.Application.Rooms;
using Overclock.Modules.GameEngine.Domain.Rooms;
using Overclock.Modules.GameEngine.Infrastructure.Rooms;

namespace Overclock.Modules.GameEngine.Infrastructure.Tests.Rooms;

public sealed class RoomActorTests
{
    [Fact]
    public async Task EnqueueAsync_ExecutesActionsInFifoOrderWithSingleConsumer()
    {
        await using var actor = new RoomActor(CreateRoom());
        var executionOrder = new List<int>();
        var activeExecutions = 0;
        var maxConcurrency = 0;
        var actions = Enumerable.Range(0, 100)
            .Select(index => GameAction<int>.Create(_ =>
            {
                var active = Interlocked.Increment(ref activeExecutions);
                UpdateMaximum(ref maxConcurrency, active);
                executionOrder.Add(index);
                Thread.Yield();
                Interlocked.Decrement(ref activeExecutions);
                return Result<int>.Success(index);
            }))
            .ToArray();

        var tasks = actions.Select(action => actor.EnqueueAsync(action)).ToArray();
        var results = await Task.WhenAll(tasks);

        Assert.Equal(Enumerable.Range(0, 100), executionOrder);
        Assert.Equal(Enumerable.Range(0, 100), results.Select(result => result.Value));
        Assert.Equal(1, maxConcurrency);
    }

    [Fact]
    public async Task EnqueueAsync_HandlesConcurrentWritersWithoutLossOrConcurrentExecution()
    {
        await using var actor = new RoomActor(CreateRoom());
        var executed = new ConcurrentBag<int>();
        var activeExecutions = 0;
        var maxConcurrency = 0;

        var tasks = Enumerable.Range(0, 100)
            .Select(index => Task.Run(async () =>
            {
                var action = GameAction<int>.Create(_ =>
                {
                    var active = Interlocked.Increment(ref activeExecutions);
                    UpdateMaximum(ref maxConcurrency, active);
                    executed.Add(index);
                    Thread.Yield();
                    Interlocked.Decrement(ref activeExecutions);
                    return Result<int>.Success(index);
                });

                return await actor.EnqueueAsync(action);
            }));

        var results = await Task.WhenAll(tasks);

        Assert.Equal(Enumerable.Range(0, 100), results.Select(result => result.Value).OrderBy(value => value));
        Assert.Equal(Enumerable.Range(0, 100), executed.OrderBy(value => value));
        Assert.Equal(1, maxConcurrency);
    }

    [Fact]
    public async Task EnqueueAsync_SupportsNonGenericResultActions()
    {
        await using var actor = new RoomActor(CreateRoom());
        var result = await actor.EnqueueAsync(GameAction.Create(_ => Result.Success()));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task EnqueueAsync_DoesNotStopConsumerAfterActionFailure()
    {
        await using var actor = new RoomActor(CreateRoom());
        var failingAction = GameAction<int>.Create(_ => throw new InvalidOperationException("test failure"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => actor.EnqueueAsync(failingAction));

        var succeedingAction = GameAction.Create(_ => Result.Success());
        var result = await actor.EnqueueAsync(succeedingAction);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task DisposeAsync_IsIdempotent()
    {
        var actor = new RoomActor(CreateRoom());

        await actor.DisposeAsync();
        await actor.DisposeAsync();
    }

    [Fact]
    public async Task RoomManager_GetOrCreate_IsAtomicForTheSameRoomId()
    {
        await using var manager = new RoomManager();
        var roomId = RoomId.New("CYBER-7X9");

        var actors = await Task.WhenAll(Enumerable.Range(0, 100)
            .Select(_ => Task.Run(() => manager.GetOrCreate(roomId, CreateRoom))));

        Assert.All(actors, actor => Assert.Same(actors[0], actor));
    }

    [Fact]
    public async Task RoomManager_TryGet_WaitsForLazyActorInitialization()
    {
        await using var manager = new RoomManager();
        var roomId = RoomId.New("CYBER-7X9");
        using var factoryStarted = new ManualResetEventSlim();
        using var releaseFactory = new ManualResetEventSlim();

        var createTask = Task.Run(() => manager.GetOrCreate(roomId, () =>
        {
            factoryStarted.Set();
            releaseFactory.Wait();
            return CreateRoom();
        }));

        factoryStarted.Wait();
        var tryGetTask = Task.Run(() => manager.TryGet(roomId, out var actor) ? actor : null);
        releaseFactory.Set();

        var actorFromCreate = await createTask;
        var actorFromTryGet = await tryGetTask;

        Assert.Same(actorFromCreate, actorFromTryGet);
    }

    private static GameRoom CreateRoom() => GameRoom.Create(
        RoomId.New("CYBER-7X9"),
        PlayerId.New(),
        "Host",
        "connection",
        Guid.NewGuid()).Value;

    private static void UpdateMaximum(ref int maximum, int value)
    {
        while (true)
        {
            var current = Volatile.Read(ref maximum);
            if (value <= current || Interlocked.CompareExchange(ref maximum, value, current) == current)
            {
                return;
            }
        }
    }
}