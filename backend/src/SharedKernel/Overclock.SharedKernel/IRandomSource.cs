namespace Overclock.SharedKernel;

public interface IRandomSource
{
    int Next(int minValue, int maxValue);
}
