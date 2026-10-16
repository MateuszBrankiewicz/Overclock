namespace Overclock.SharedKernel;

public static class RandomSourceExtensions
{
    public static void Shuffle<T>(this IRandomSource random, IList<T> list)
    {
        ArgumentNullException.ThrowIfNull(random);
        ArgumentNullException.ThrowIfNull(list);

        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = random.Next(0, i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }
}
