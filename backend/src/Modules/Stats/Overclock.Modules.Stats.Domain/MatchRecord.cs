namespace Overclock.Modules.Stats.Domain;

public sealed class MatchRecord
{
    private MatchRecord() { }

    public Guid Id { get; private set; }
    public string RoomCode { get; private set; } = string.Empty;
    public Guid? WinnerId { get; private set; }
    public string? WinnerNickname { get; private set; }
    public int RoundCount { get; private set; }
    public int BurntModulesCount { get; private set; }
    public int DurationSeconds { get; private set; }
    public DateTimeOffset FinishedAtUtc { get; private set; }

    public static MatchRecord Create(
        string roomCode,
        Guid? winnerId,
        string? winnerNickname,
        int roundCount,
        int burntModulesCount,
        int durationSeconds,
        DateTimeOffset finishedAtUtc)
    {
        return new MatchRecord
        {
            Id = Guid.NewGuid(),
            RoomCode = roomCode,
            WinnerId = winnerId,
            WinnerNickname = winnerNickname,
            RoundCount = roundCount,
            BurntModulesCount = burntModulesCount,
            DurationSeconds = durationSeconds,
            FinishedAtUtc = finishedAtUtc
        };
    }
}
