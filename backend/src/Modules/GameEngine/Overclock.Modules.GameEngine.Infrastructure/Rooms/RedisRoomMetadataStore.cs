using System.Text.Json;
using Microsoft.Extensions.Logging;
using Overclock.Modules.GameEngine.Application.Ports;
using StackExchange.Redis;

namespace Overclock.Modules.GameEngine.Infrastructure.Rooms;

/// <summary>
/// Persists room metadata in Redis using the overclock:game:room:{id} namespace with an explicit 2-hour TTL.
/// </summary>
public sealed class RedisRoomMetadataStore : IRoomMetadataStore
{
    private static readonly TimeSpan RoomMetadataTtl = TimeSpan.FromHours(2);
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisRoomMetadataStore> _logger;

    public RedisRoomMetadataStore(IConnectionMultiplexer redis, ILogger<RedisRoomMetadataStore> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public static string BuildKey(string roomCode) =>
        $"overclock:game:room:{roomCode.Trim().ToUpperInvariant()}";

    public async Task UpsertAsync(RoomMetadata metadata, CancellationToken ct = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var json = JsonSerializer.Serialize(metadata);
            await db.StringSetAsync(BuildKey(metadata.RoomCode), json, RoomMetadataTtl);
        }
        catch (Exception ex) when (ex is RedisException or TimeoutException)
        {
            _logger.LogWarning(ex, "Failed to upsert Redis room metadata for {RoomCode}", metadata.RoomCode);
        }
    }

    public async Task<RoomMetadata?> GetAsync(string roomCode, CancellationToken ct = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var value = await db.StringGetAsync(BuildKey(roomCode));
            if (value.IsNullOrEmpty)
            {
                return null;
            }

            return JsonSerializer.Deserialize<RoomMetadata>(value.ToString());
        }
        catch (Exception ex) when (ex is RedisException or TimeoutException or JsonException)
        {
            _logger.LogWarning(ex, "Failed to read Redis room metadata for {RoomCode}", roomCode);
            return null;
        }
    }

    public async Task RemoveAsync(string roomCode, CancellationToken ct = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync(BuildKey(roomCode));
        }
        catch (Exception ex) when (ex is RedisException or TimeoutException)
        {
            _logger.LogWarning(ex, "Failed to remove Redis room metadata for {RoomCode}", roomCode);
        }
    }
}

public sealed class NoOpRoomMetadataStore : IRoomMetadataStore
{
    public Task UpsertAsync(RoomMetadata metadata, CancellationToken ct = default) => Task.CompletedTask;

    public Task<RoomMetadata?> GetAsync(string roomCode, CancellationToken ct = default) =>
        Task.FromResult<RoomMetadata?>(null);

    public Task RemoveAsync(string roomCode, CancellationToken ct = default) => Task.CompletedTask;
}
