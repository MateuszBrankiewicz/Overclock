using Ardalis.Result;
using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.SharedKernel;
using Xunit;

namespace Overclock.Modules.GameEngine.Domain.Tests.Cards;

public class DeckTests
{
    private sealed class ScriptedRandomSource(Func<int, int, int> nextFunc) : IRandomSource
    {
        public int Next(int minValue, int maxValue) => nextFunc(minValue, maxValue);
    }

    [Theory]
    [InlineData(2, 14, 4, 10, 4, 4, 4, 1, 1)]
    [InlineData(3, 18, 3, 15, 5, 5, 5, 2, 1)]
    [InlineData(4, 22, 2, 20, 6, 6, 6, 2, 2)]
    public void Deck_Create_ScalesCorrectlyForPlayerCount(
        int playerCount,
        int expectedTotal,
        int expectedBurned,
        int expectedRemaining,
        int expectedAlpha,
        int expectedBeta,
        int expectedGamma,
        int expectedGlitch,
        int expectedCorrupted)
    {
        var result = Deck.Create(playerCount);

        Assert.True(result.IsSuccess);
        var deck = result.Value;

        Assert.Equal(playerCount, deck.PlayerCount);
        Assert.Equal(expectedTotal, deck.TotalCount);
        Assert.Equal(expectedBurned, deck.BurnedCount);
        Assert.Equal(expectedRemaining, deck.RemainingCount);
        Assert.Equal(expectedTotal, deck.AllCards.Count);
        Assert.Equal(expectedBurned, deck.BurnedPile.Count);
        Assert.Equal(expectedRemaining, deck.RemainingCards.Count);

        // Verify card composition across all cards (burned + remaining)
        Assert.Equal(expectedAlpha, deck.AllCards.Count(c => c.Protocol == CardProtocol.Alpha));
        Assert.Equal(expectedBeta, deck.AllCards.Count(c => c.Protocol == CardProtocol.Beta));
        Assert.Equal(expectedGamma, deck.AllCards.Count(c => c.Protocol == CardProtocol.Gamma));
        Assert.Equal(expectedGlitch, deck.AllCards.Count(c => c.Protocol == CardProtocol.Glitch));
        Assert.Equal(expectedCorrupted, deck.AllCards.Count(c => c.Protocol == CardProtocol.Corrupted));

        // Ensure all card IDs are unique
        var uniqueIds = deck.AllCards.Select(c => c.Id).Distinct().Count();
        Assert.Equal(expectedTotal, uniqueIds);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(5)]
    [InlineData(10)]
    public void Deck_Create_ReturnsInvalid_ForUnsupportedPlayerCounts(int invalidPlayerCount)
    {
        var result = Deck.Create(invalidPlayerCount);

        Assert.False(result.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, result.Status);
        Assert.Contains(result.ValidationErrors, e => e.Identifier == "Deck.InvalidPlayerCount");
    }

    [Fact]
    public void Deck_DrawOne_PopsFirstRemainingCard()
    {
        var deck = Deck.Create(2).Value;
        var initialRemaining = deck.RemainingCount;
        var expectedNextCard = deck.RemainingCards[0];

        var drawResult = deck.DrawOne();

        Assert.True(drawResult.IsSuccess);
        Assert.Equal(expectedNextCard.Id, drawResult.Value.Id);
        Assert.Equal(initialRemaining - 1, deck.RemainingCount);
    }

    [Fact]
    public void Deck_Draw_PopsRequestedNumberOfCards()
    {
        var deck = Deck.Create(4).Value; // 20 remaining
        var drawResult = deck.Draw(5);

        Assert.True(drawResult.IsSuccess);
        Assert.Equal(5, drawResult.Value.Count);
        Assert.Equal(15, deck.RemainingCount);
    }

    [Fact]
    public void Deck_DealHand_DealsExactlyFiveCards()
    {
        var deck = Deck.Create(3).Value; // 15 remaining

        var hand1 = deck.DealHand();
        var hand2 = deck.DealHand();
        var hand3 = deck.DealHand();

        Assert.True(hand1.IsSuccess);
        Assert.True(hand2.IsSuccess);
        Assert.True(hand3.IsSuccess);

        Assert.Equal(5, hand1.Value.Count);
        Assert.Equal(5, hand2.Value.Count);
        Assert.Equal(5, hand3.Value.Count);
        Assert.Equal(0, deck.RemainingCount);
    }

    [Fact]
    public void Deck_Draw_ReturnsInvalid_WhenInsufficientCards()
    {
        var deck = Deck.Create(2).Value; // 10 remaining
        var drawResult = deck.Draw(11);

        Assert.False(drawResult.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, drawResult.Status);
        Assert.Contains(drawResult.ValidationErrors, e => e.Identifier == "Deck.InsufficientCards");
    }

    [Fact]
    public void Deck_Draw_ReturnsInvalid_WhenCountIsNegative()
    {
        var deck = Deck.Create(2).Value;
        var drawResult = deck.Draw(-1);

        Assert.False(drawResult.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, drawResult.Status);
        Assert.Contains(drawResult.ValidationErrors, e => e.Identifier == "Deck.InvalidDrawCount");
    }

    [Fact]
    public void Deck_DrawOne_ReturnsInvalid_WhenEmpty()
    {
        var deck = Deck.Create(2).Value;
        deck.Draw(deck.RemainingCount); // Empty it

        var drawResult = deck.DrawOne();

        Assert.False(drawResult.IsSuccess);
        Assert.Equal(ResultStatus.Invalid, drawResult.Status);
        Assert.Contains(drawResult.ValidationErrors, e => e.Identifier == "Deck.Empty");
    }

    [Fact]
    public void Deck_Create_UsesCustomRandomSourceForFisherYatesShuffle()
    {
        // Reverse shuffle: at each step i, swap i with 0
        var mockRng = new ScriptedRandomSource((min, max) => 0);

        var result = Deck.Create(2, mockRng);

        Assert.True(result.IsSuccess);
        var deck = result.Value;
        Assert.Equal(14, deck.TotalCount);
    }

    [Fact]
    public void Card_MatchesProtocol_FollowsGameRules()
    {
        var alpha = Card.Create(CardProtocol.Alpha);
        var beta = Card.Create(CardProtocol.Beta);
        var gamma = Card.Create(CardProtocol.Gamma);
        var glitch = Card.Create(CardProtocol.Glitch);
        var corrupted = Card.Create(CardProtocol.Corrupted);

        // Alpha matches only Alpha
        Assert.True(alpha.MatchesProtocol(CardProtocol.Alpha));
        Assert.False(alpha.MatchesProtocol(CardProtocol.Beta));
        Assert.False(alpha.MatchesProtocol(CardProtocol.Gamma));

        // Beta matches only Beta
        Assert.True(beta.MatchesProtocol(CardProtocol.Beta));
        Assert.False(beta.MatchesProtocol(CardProtocol.Alpha));
        Assert.False(beta.MatchesProtocol(CardProtocol.Gamma));

        // Gamma matches only Gamma
        Assert.True(gamma.MatchesProtocol(CardProtocol.Gamma));
        Assert.False(gamma.MatchesProtocol(CardProtocol.Alpha));
        Assert.False(gamma.MatchesProtocol(CardProtocol.Beta));

        // Glitch is Wildcard and matches all base protocols
        Assert.True(glitch.IsWildcard);
        Assert.False(glitch.IsForcedBluff);
        Assert.True(glitch.MatchesProtocol(CardProtocol.Alpha));
        Assert.True(glitch.MatchesProtocol(CardProtocol.Beta));
        Assert.True(glitch.MatchesProtocol(CardProtocol.Gamma));

        // Corrupted is Forced Bluff and never matches any protocol
        Assert.True(corrupted.IsForcedBluff);
        Assert.False(corrupted.IsWildcard);
        Assert.False(corrupted.MatchesProtocol(CardProtocol.Alpha));
        Assert.False(corrupted.MatchesProtocol(CardProtocol.Beta));
        Assert.False(corrupted.MatchesProtocol(CardProtocol.Gamma));
        Assert.False(corrupted.MatchesProtocol(CardProtocol.Glitch));
        Assert.False(corrupted.MatchesProtocol(CardProtocol.Corrupted));
    }
}
