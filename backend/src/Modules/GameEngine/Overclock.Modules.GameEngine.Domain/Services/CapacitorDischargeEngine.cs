using Overclock.Modules.GameEngine.Domain.Voltage;
using Overclock.SharedKernel;

namespace Overclock.Modules.GameEngine.Domain.Services;

public static class CapacitorDischargeEngine
{
    public const int DieFaces = 6;

    public static DischargeOutcome Discharge(CapacitorRisk currentRisk, IRandomSource rng)
    {
        ArgumentNullException.ThrowIfNull(rng);

        var roll = rng.Next(1, DieFaces + 1);
        var overloaded = currentRisk.IsOverload(roll);
        var resultingRisk = overloaded ? currentRisk : currentRisk.Increment();

        return new DischargeOutcome(currentRisk, roll, overloaded, resultingRisk);
    }
}
