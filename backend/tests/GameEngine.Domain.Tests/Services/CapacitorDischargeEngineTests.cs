using Overclock.Modules.GameEngine.Domain.Services;
using Overclock.Modules.GameEngine.Domain.Voltage;
using Overclock.SharedKernel;

namespace GameEngine.Domain.Tests.Services;

public sealed class CapacitorDischargeEngineTests
{
    private sealed class ScriptedRandomSource(int fixedRoll) : IRandomSource
    {
        public int RecordedMin { get; private set; }
        public int RecordedMax { get; private set; }

        public int Next(int minValue, int maxValue)
        {
            RecordedMin = minValue;
            RecordedMax = maxValue;
            return fixedRoll;
        }
    }

    [Theory]
    [InlineData(1, 1, true, 1)]
    [InlineData(1, 2, false, 2)]
    [InlineData(1, 3, false, 2)]
    [InlineData(1, 4, false, 2)]
    [InlineData(1, 5, false, 2)]
    [InlineData(1, 6, false, 2)]
    [InlineData(2, 1, true, 2)]
    [InlineData(2, 2, true, 2)]
    [InlineData(2, 3, false, 3)]
    [InlineData(2, 4, false, 3)]
    [InlineData(2, 5, false, 3)]
    [InlineData(2, 6, false, 3)]
    [InlineData(3, 1, true, 3)]
    [InlineData(3, 2, true, 3)]
    [InlineData(3, 3, true, 3)]
    [InlineData(3, 4, false, 4)]
    [InlineData(3, 5, false, 4)]
    [InlineData(3, 6, false, 4)]
    [InlineData(4, 1, true, 4)]
    [InlineData(4, 2, true, 4)]
    [InlineData(4, 3, true, 4)]
    [InlineData(4, 4, true, 4)]
    [InlineData(4, 5, false, 5)]
    [InlineData(4, 6, false, 5)]
    [InlineData(5, 1, true, 5)]
    [InlineData(5, 2, true, 5)]
    [InlineData(5, 3, true, 5)]
    [InlineData(5, 4, true, 5)]
    [InlineData(5, 5, true, 5)]
    [InlineData(5, 6, false, 6)]
    [InlineData(6, 1, true, 6)]
    [InlineData(6, 2, true, 6)]
    [InlineData(6, 3, true, 6)]
    [InlineData(6, 4, true, 6)]
    [InlineData(6, 5, true, 6)]
    [InlineData(6, 6, true, 6)]
    public void Discharge_ExhaustiveMatrix_EvaluatesAllRollAndRiskCombinationsDeterministically(
        int riskLevel,
        int roll,
        bool expectedOverload,
        int expectedResultingRisk)
    {
        var risk = new CapacitorRisk(riskLevel);
        var rng = new ScriptedRandomSource(roll);

        var outcome = CapacitorDischargeEngine.Discharge(risk, rng);

        Assert.Equal(riskLevel, outcome.InitialRisk.Level);
        Assert.Equal(roll, outcome.Roll);
        Assert.Equal(expectedOverload, outcome.Overloaded);
        Assert.Equal(expectedResultingRisk, outcome.ResultingRisk.Level);
        Assert.Equal(1, rng.RecordedMin);
        Assert.Equal(7, rng.RecordedMax);
    }

    [Fact]
    public void Discharge_UniformDistributionSanityCheck_PassesChiSquareGoodnessOfFit()
    {
        // 60,000 rolls tested against uniform expectation of 10,000 per die face (5 degrees of freedom).
        // Critical value for alpha = 1e-6 at df=5 is ~36.87.
        const int totalRolls = 60_000;
        const int dieFaces = 6;
        const double expectedPerFace = totalRolls / (double)dieFaces;
        const double criticalChiSquareThreshold = 36.87;

        var counts = new int[dieFaces + 1];
        var rng = CryptoRandomSource.Instance;
        var dummyRisk = new CapacitorRisk(1);

        for (var i = 0; i < totalRolls; i++)
        {
            var outcome = CapacitorDischargeEngine.Discharge(dummyRisk, rng);
            counts[outcome.Roll]++;
        }

        var chiSquare = 0.0;
        for (var face = 1; face <= dieFaces; face++)
        {
            var diff = counts[face] - expectedPerFace;
            chiSquare += (diff * diff) / expectedPerFace;
        }

        Assert.True(
            chiSquare < criticalChiSquareThreshold,
            $"Chi-square statistic {chiSquare:F2} exceeded threshold {criticalChiSquareThreshold}. Distribution may not be uniform.");
    }
}
