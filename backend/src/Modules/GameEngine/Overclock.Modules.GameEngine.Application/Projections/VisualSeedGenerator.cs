namespace Overclock.Modules.GameEngine.Application.Projections;

public static class VisualSeedGenerator
{
    private const uint FnvPrime = 16777619;
    private const uint FnvOffsetBasis = 2166136261;

    public static int FromCardId(Guid cardId)
    {
        Span<byte> bytes = stackalloc byte[16];
        _ = cardId.TryWriteBytes(bytes);

        var hash = FnvOffsetBasis;
        for (var i = 0; i < bytes.Length; i++)
        {
            hash ^= bytes[i];
            hash *= FnvPrime;
        }

        // Return positive 31-bit integer
        return (int)(hash & 0x7FFFFFFF);
    }
}

