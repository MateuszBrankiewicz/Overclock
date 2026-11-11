namespace Overclock.Modules.GameEngine.Domain.Rooms;

public abstract record TurnExpiredOutcome
{
    private TurnExpiredOutcome() { }

    public sealed record AutoTrace(TraceResolution Resolution) : TurnExpiredOutcome;

    public sealed record LeadForfeit(PlayerId ForfeitingPlayerId) : TurnExpiredOutcome;
}