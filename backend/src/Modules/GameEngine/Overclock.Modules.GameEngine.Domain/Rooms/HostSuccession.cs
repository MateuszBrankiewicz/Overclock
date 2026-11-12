namespace Overclock.Modules.GameEngine.Domain.Rooms;

public static class HostSuccession
{
    public static PlayerId? NextHost(IReadOnlyList<PlayerSeat> seats, PlayerId currentHost)
    {
        ArgumentNullException.ThrowIfNull(seats);

        var candidate = seats.FirstOrDefault(s =>
            s.Id != currentHost &&
            s.Status != PlayerStatus.Eliminated &&
            s.Status != PlayerStatus.Disconnected &&
            !s.HasLeft);

        if (candidate is not null)
        {
            return candidate.Id;
        }

        var fallback = seats.FirstOrDefault(s =>
            s.Id != currentHost &&
            !s.HasLeft);

        return fallback?.Id;
    }
}
