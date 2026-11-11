namespace Overclock.Modules.GameEngine.Domain.Voltage;

public readonly record struct CapacitorRisk
{
    public const int MinLevel = 1;
    public const int MaxLevel = 6;

    private readonly int _aboveMin;

    public int Level => MinLevel + _aboveMin;

    public static CapacitorRisk Initial => new(MinLevel);

    public CapacitorRisk(int level)
    {
        if (level is < MinLevel or > MaxLevel)
        {
            throw new ArgumentOutOfRangeException(
                nameof(level),
                level,
                $"Capacitor risk level must be between {MinLevel} and {MaxLevel}.");
        }

        _aboveMin = level - MinLevel;
    }

    public CapacitorRisk Increment() => new(Math.Min(MaxLevel, Level + 1));

    public CapacitorRisk Halve() => new(Math.Max(MinLevel, Level / 2));

    public bool IsOverload(int roll)
    {
        if (roll is < 1 or > 6)
        {
            throw new ArgumentOutOfRangeException(nameof(roll), roll, "Roll must be between 1 and 6.");
        }

        return roll <= Level;
    }

    public override string ToString() => $"{Level}/6";
}
