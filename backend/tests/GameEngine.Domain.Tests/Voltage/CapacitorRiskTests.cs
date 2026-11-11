using Overclock.Modules.GameEngine.Domain.Voltage;

namespace GameEngine.Domain.Tests.Voltage;

public sealed class CapacitorRiskTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(6)]
    public void Constructor_WithValidLevels_SetsLevel(int level)
    {
        var risk = new CapacitorRisk(level);
        Assert.Equal(level, risk.Level);
        Assert.Equal($"{level}/6", risk.ToString());
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(7)]
    [InlineData(10)]
    public void Constructor_WithInvalidLevels_ThrowsArgumentOutOfRangeException(int level)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new CapacitorRisk(level));
    }

    [Fact]
    public void Initial_HasLevelOne()
    {
        Assert.Equal(1, CapacitorRisk.Initial.Level);
    }

    [Fact]
    public void Default_HasLevelOne_PreventingZeroRiskImmortality()
    {
        CapacitorRisk defaultRisk = default;
        Assert.Equal(1, defaultRisk.Level);
        Assert.Equal("1/6", defaultRisk.ToString());
    }

    [Theory]
    [InlineData(1, 2)]
    [InlineData(2, 3)]
    [InlineData(3, 4)]
    [InlineData(4, 5)]
    [InlineData(5, 6)]
    [InlineData(6, 6)]
    public void Increment_IncreasesLevelUpToSix(int current, int expected)
    {
        var risk = new CapacitorRisk(current);
        var incremented = risk.Increment();
        Assert.Equal(expected, incremented.Level);
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 1)]
    [InlineData(3, 1)]
    [InlineData(4, 2)]
    [InlineData(5, 2)]
    [InlineData(6, 3)]
    public void Halve_RoundsDownWithMinimumOfOne(int current, int expected)
    {
        var risk = new CapacitorRisk(current);
        var halved = risk.Halve();
        Assert.Equal(expected, halved.Level);
    }

    [Theory]
    [InlineData(1, 1, true)]
    [InlineData(1, 2, false)]
    [InlineData(2, 2, true)]
    [InlineData(2, 3, false)]
    [InlineData(3, 3, true)]
    [InlineData(3, 4, false)]
    [InlineData(4, 4, true)]
    [InlineData(4, 5, false)]
    [InlineData(5, 5, true)]
    [InlineData(5, 6, false)]
    [InlineData(6, 6, true)]
    public void IsOverload_EvaluatesRollAgainstCurrentLevel(int level, int roll, bool expectedOverload)
    {
        var risk = new CapacitorRisk(level);
        Assert.Equal(expectedOverload, risk.IsOverload(roll));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(7)]
    public void IsOverload_WithInvalidRoll_ThrowsArgumentOutOfRangeException(int invalidRoll)
    {
        var risk = new CapacitorRisk(1);
        Assert.Throws<ArgumentOutOfRangeException>(() => risk.IsOverload(invalidRoll));
    }
}
