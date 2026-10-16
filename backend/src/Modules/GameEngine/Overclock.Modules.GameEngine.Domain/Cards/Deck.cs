using Ardalis.Result;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Domain.Cards;

public sealed class Deck
{
    public const int CardsPerHand = 5;
    public const int MinPlayers = 2;
    public const int MaxPlayers = 4;

    private readonly List<Card> _remainingCards;
    private readonly List<Card> _burnedPile;
    private readonly List<Card> _allCards;

    public Guid Id { get; }
    public int PlayerCount { get; }
    public IReadOnlyList<Card> AllCards => _allCards.AsReadOnly();
    public IReadOnlyList<Card> BurnedPile => _burnedPile.AsReadOnly();
    public IReadOnlyList<Card> RemainingCards => _remainingCards.AsReadOnly();

    public int TotalCount => _allCards.Count;
    public int BurnedCount => _burnedPile.Count;
    public int RemainingCount => _remainingCards.Count;

    private Deck(Guid id, int playerCount, List<Card> allCards, List<Card> burnedPile, List<Card> remainingCards)
    {
        Id = id;
        PlayerCount = playerCount;
        _allCards = allCards;
        _burnedPile = burnedPile;
        _remainingCards = remainingCards;
    }

    public static Result<Deck> Create(int playerCount, IRandomSource? randomSource = null)
    {
        if (playerCount < MinPlayers || playerCount > MaxPlayers)
        {
            return Result<Deck>.Invalid(new ValidationError(
                "Deck.InvalidPlayerCount",
                $"Player count must be between {MinPlayers} and {MaxPlayers}, but was {playerCount}."));
        }

        var rng = randomSource ?? CryptoRandomSource.Instance;
        var cards = BuildDeckComposition(playerCount);

        // Shuffle deck using Fisher-Yates
        rng.Shuffle(cards);

        var burnedCount = GetBurnedCount(playerCount);
        var burned = cards.Take(burnedCount).ToList();
        var remaining = cards.Skip(burnedCount).ToList();

        return Result<Deck>.Success(new Deck(
            Guid.NewGuid(),
            playerCount,
            [.. cards],
            burned,
            remaining));
    }

    public Result<Card> DrawOne()
    {
        if (_remainingCards.Count == 0)
        {
            return Result<Card>.Invalid(new ValidationError("Deck.Empty", "No cards remaining in deck."));
        }

        var card = _remainingCards[0];
        _remainingCards.RemoveAt(0);
        return Result<Card>.Success(card);
    }

    public Result<IReadOnlyList<Card>> Draw(int count)
    {
        if (count < 0)
        {
            return Result<IReadOnlyList<Card>>.Invalid(new ValidationError(
                "Deck.InvalidDrawCount",
                "Draw count cannot be negative."));
        }

        if (count > _remainingCards.Count)
        {
            return Result<IReadOnlyList<Card>>.Invalid(new ValidationError(
                "Deck.InsufficientCards",
                $"Cannot draw {count} cards. Only {_remainingCards.Count} cards remaining."));
        }

        var drawn = _remainingCards.Take(count).ToList();
        _remainingCards.RemoveRange(0, count);
        return Result<IReadOnlyList<Card>>.Success(drawn);
    }

    public Result<IReadOnlyList<Card>> DealHand() => Draw(CardsPerHand);

    public static int GetBurnedCount(int playerCount) => playerCount switch
    {
        2 => 4,
        3 => 3,
        4 => 2,
        _ => 0
    };

    public static int GetTotalCardsCount(int playerCount) => playerCount switch
    {
        2 => 14,
        3 => 18,
        4 => 22,
        _ => 0
    };

    private static List<Card> BuildDeckComposition(int playerCount)
    {
        var (alpha, beta, gamma, glitch, corrupted) = playerCount switch
        {
            2 => (4, 4, 4, 1, 1),
            3 => (5, 5, 5, 2, 1),
            4 => (6, 6, 6, 2, 2),
            _ => (0, 0, 0, 0, 0)
        };

        var cards = new List<Card>(alpha + beta + gamma + glitch + corrupted);

        for (var i = 0; i < alpha; i++)
        {
            cards.Add(Card.Create(CardProtocol.Alpha));
        }

        for (var i = 0; i < beta; i++)
        {
            cards.Add(Card.Create(CardProtocol.Beta));
        }

        for (var i = 0; i < gamma; i++)
        {
            cards.Add(Card.Create(CardProtocol.Gamma));
        }

        for (var i = 0; i < glitch; i++)
        {
            cards.Add(Card.Create(CardProtocol.Glitch));
        }

        for (var i = 0; i < corrupted; i++)
        {
            cards.Add(Card.Create(CardProtocol.Corrupted));
        }

        return cards;
    }
}
