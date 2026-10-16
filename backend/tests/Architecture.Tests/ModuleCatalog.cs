using System.Reflection;
using Xunit;

namespace Architecture.Tests;

public static class ModuleCatalog
{
    public static readonly string[] Modules = ["GameEngine", "Identity", "Economy", "Stats"];
    public static readonly string[] Layers = ["Domain", "Application", "Infrastructure", "Contracts"];

    public static Assembly Load(string module, string layer) => Assembly.Load($"Overclock.Modules.{module}.{layer}");
    public static string Ns(string module, string layer) => $"Overclock.Modules.{module}.{layer}";

    public static TheoryData<string> All() => new(Modules);

    public static TheoryData<string, string> Pairs()
    {
        var data = new TheoryData<string, string>();
        foreach (var a in Modules)
        {
            foreach (var b in Modules.Where(b => b != a))
            {
                data.Add(a, b);
            }
        }
        return data;
    }
}
