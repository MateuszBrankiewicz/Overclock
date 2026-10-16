namespace Overclock.Modules.GameEngine.Domain.Cards;

public sealed class Card
{
    public CardId Id { get; }
    public CardProtocol Protocol { get; }

    public bool IsWildcard => Protocol == CardProtocol.Glitch;
    public bool IsForcedBluff => Protocol == CardProtocol.Corrupted;

    public Card(CardId id, CardProtocol protocol)
    {
        Id = id;
        Protocol = protocol;
    }

    public static Card Create(CardProtocol protocol) => new(CardId.New(), protocol);

    public bool MatchesProtocol(CardProtocol targetProtocol)
    {
        if (IsWildcard)
        {
            return true;
        }

        if (IsForcedBluff)
        {
            return false;
        }

        return Protocol == targetProtocol;
    }

    public override string ToString() => $"Card({Id.Value:N}, {Protocol})";
}
