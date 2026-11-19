namespace Overclock.Modules.GameEngine.Application.Ports;

public sealed record RoomMetadata(
    string RoomCode,
    Guid HostId,
    string State,
    int PlayerCount,
    DateTimeOffset UpdatedAtUtc);

public interface IRoomMetadataStore
{
    Task UpsertAsync(RoomMetadata metadata, CancellationToken ct = default);

    Task<RoomMetadata?> GetAsync(string roomCode, CancellationToken ct = default);

    Task RemoveAsync(string roomCode, CancellationToken ct = default);
}
