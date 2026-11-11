using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Exploits;
using Overclock.Modules.GameEngine.Domain.Voltage;

namespace Overclock.Modules.GameEngine.Domain.Rooms;

public sealed class PlayerSeat
{
    private readonly List<Card> _hand = [];

    public PlayerId Id { get; }
    public string Nickname { get; }
    public string? ConnectionId { get; private set; }
    public Guid SessionToken { get; }
    public IReadOnlyList<Card> Hand => _hand;
    public PlayerStatus Status { get; private set; }
    public bool IsReady { get; private set; }
    public DateTimeOffset? DisconnectedAtUtc { get; private set; }
    public CapacitorRisk Risk { get; private set; } = CapacitorRisk.Initial;
    public ExploitModule? Exploit { get; private set; }

    public PlayerSeat(
        PlayerId id,
        string nickname,
        string? connectionId,
        Guid sessionToken,
        PlayerStatus status = PlayerStatus.Active,
        bool isReady = false,
        CapacitorRisk? risk = null,
        ExploitModule? exploit = null)
    {
        Id = id;
        Nickname = nickname;
        ConnectionId = connectionId;
        SessionToken = sessionToken;
        Status = status;
        IsReady = isReady;
        Risk = risk ?? CapacitorRisk.Initial;
        Exploit = exploit;
    }

    internal void AssignExploit(ExploitModule exploit)
    {
        Exploit = exploit;
    }

    internal void BurnExploit()
    {
        if (Exploit is not null)
        {
            Exploit = Exploit.Burn();
        }
    }

    internal void HalveRisk()
    {
        Risk = Risk.Halve();
    }

    internal void ApplyDischarge(DischargeOutcome outcome)
    {
        Risk = outcome.ResultingRisk;
        if (outcome.Overloaded)
        {
            Eliminate();
        }
    }

    internal void ResetForMatch(ExploitModule initialExploit)
    {
        if (Status == PlayerStatus.Eliminated)
        {
            Status = PlayerStatus.Active;
        }

        Risk = CapacitorRisk.Initial;
        Exploit = initialExploit;
        _hand.Clear();
    }

    internal void ResetForNewRound()
    {
        _hand.Clear();
    }

    internal void SetReady(bool ready)
    {
        IsReady = ready;
    }

    internal void AssignHand(IEnumerable<Card> cards)
    {
        _hand.Clear();
        _hand.AddRange(cards);
    }

    internal void ClearHand()
    {
        _hand.Clear();
    }

    internal bool HasCards(IEnumerable<CardId> cardIds)
    {
        var targetIds = cardIds.ToList();
        var availableIds = _hand.Select(c => c.Id).ToList();

        foreach (var id in targetIds)
        {
            if (!availableIds.Remove(id))
            {
                return false;
            }
        }

        return true;
    }

    internal Result<IReadOnlyList<Card>> RemoveCards(IEnumerable<CardId> cardIds)
    {
        var targetIds = cardIds.ToList();
        if (!HasCards(targetIds))
        {
            return Result<IReadOnlyList<Card>>.Invalid(new ValidationError(
                "Hand.MissingCards",
                "Player does not hold all specified cards."));
        }

        var removed = new List<Card>();
        foreach (var id in targetIds)
        {
            var cardIndex = _hand.FindIndex(c => c.Id == id);
            if (cardIndex >= 0)
            {
                removed.Add(_hand[cardIndex]);
                _hand.RemoveAt(cardIndex);
            }
        }

        return Result<IReadOnlyList<Card>>.Success(removed);
    }

    internal void Disconnect(DateTimeOffset? disconnectedAt = null)
    {
        Status = PlayerStatus.Disconnected;
        DisconnectedAtUtc = disconnectedAt ?? DateTimeOffset.UtcNow;
    }

    internal void Reconnect(string newConnectionId)
    {
        ConnectionId = newConnectionId;
        Status = PlayerStatus.Active;
        DisconnectedAtUtc = null;
    }

    internal void Eliminate()
    {
        Status = PlayerStatus.Eliminated;
        _hand.Clear();
    }
}
