namespace Overclock.Modules.GameEngine.Domain.Voltage;

public readonly record struct DischargeOutcome(
    CapacitorRisk InitialRisk,
    int Roll,
    bool Overloaded,
    CapacitorRisk ResultingRisk);
