using System.Security.Cryptography;

namespace Overclock.SharedKernel;

public sealed class CryptoRandomSource : IRandomSource
{
    public static CryptoRandomSource Instance { get; } = new();

    public int Next(int minValue, int maxValue)
    {
        ArgumentOutOfRangeException.ThrowIfGreaterThanOrEqual(minValue, maxValue);
        return RandomNumberGenerator.GetInt32(minValue, maxValue);
    }
}
