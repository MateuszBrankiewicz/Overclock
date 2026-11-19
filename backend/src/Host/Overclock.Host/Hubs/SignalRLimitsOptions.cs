namespace Overclock.Host.Hubs;

/// <summary>
/// Abuse limits for the game hub, bound from the <c>SignalRLimits</c> configuration section.
/// Per-client limits are keyed by remote IP (IPv6 grouped by /64 prefix).
/// </summary>
public sealed class SignalRLimitsOptions
{
    public const string SectionName = "SignalRLimits";

    /// <summary>Hub invocations per connection per second.</summary>
    public int ActionsPerSecond { get; set; } = 10;

    /// <summary>CreateRoom calls per client per minute.</summary>
    public int RoomCreatesPerMinute { get; set; } = 5;

    /// <summary>JoinRoom and Reconnect calls per client per minute (blocks room-code enumeration).</summary>
    public int RoomJoinsPerMinute { get; set; } = 20;

    /// <summary>Concurrent hub connections per client.</summary>
    public int MaxConnectionsPerClient { get; set; } = 16;
}
