using Overclock.Modules.GameEngine.Application.Projections;
using Xunit;

namespace GameEngine.Infrastructure.Tests.Projections;

public class VisualSeedGeneratorTests
{
    [Fact]
    public void FromCardId_AlwaysProducesIdenticalSeed_ForIdenticalGuid()
    {
        var cardId = Guid.Parse("12345678-1234-5678-1234-567812345678");

        var seed1 = VisualSeedGenerator.FromCardId(cardId);
        var seed2 = VisualSeedGenerator.FromCardId(cardId);

        Assert.Equal(seed1, seed2);
        Assert.True(seed1 >= 0);
    }

    [Fact]
    public void FromCardId_ProducesDifferentSeeds_ForDifferentGuids()
    {
        var cardId1 = Guid.NewGuid();
        var cardId2 = Guid.NewGuid();

        var seed1 = VisualSeedGenerator.FromCardId(cardId1);
        var seed2 = VisualSeedGenerator.FromCardId(cardId2);

        Assert.NotEqual(seed1, seed2);
    }
}

