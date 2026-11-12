using Overclock.Modules.GameEngine.Domain.Cards;
using Overclock.Modules.GameEngine.Domain.Characters;
using Xunit;

namespace GameEngine.Domain.Tests.Characters;

public class CharacterCatalogTests
{
    [Fact]
    public void Catalog_ContainsFourCanonicalCharacters()
    {
        Assert.Equal(["ghost", "volt", "proxy", "null"], CharacterCatalog.All);
    }

    [Fact]
    public void Catalog_CapacityMeetsOrExceedsMaxPlayersInvariant()
    {
        Assert.True(CharacterCatalog.All.Count >= Deck.MaxPlayers);
    }

    [Theory]
    [InlineData("ghost", true)]
    [InlineData("volt", true)]
    [InlineData("proxy", true)]
    [InlineData("null", true)]
    [InlineData("bogus", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsValid_ValidatesCharactersCorrectly(string? characterId, bool expected)
    {
        Assert.Equal(expected, CharacterCatalog.IsValid(characterId));
    }
}
