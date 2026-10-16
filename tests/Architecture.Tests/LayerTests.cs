using System.Reflection;
using NetArchTest.Rules;
using Xunit;

namespace Architecture.Tests;

public class LayerTests
{
    [Theory, MemberData(nameof(ModuleCatalog.All), MemberType = typeof(ModuleCatalog))]
    public void Domain_depends_only_on_SharedKernel(string module)
    {
        var result = Types.InAssembly(ModuleCatalog.Load(module, "Domain"))
            .ShouldNot()
            .HaveDependencyOnAny(
                ModuleCatalog.Ns(module, "Application"),
                ModuleCatalog.Ns(module, "Infrastructure"),
                "Overclock.Host", "MediatR", "Mediator", "Microsoft.EntityFrameworkCore", "StackExchange.Redis", "Microsoft.AspNetCore")
            .GetResult();

        Assert.True(result.IsSuccessful, Describe(result));
    }

    [Theory, MemberData(nameof(ModuleCatalog.All), MemberType = typeof(ModuleCatalog))]
    public void Application_does_not_depend_on_Infrastructure_or_Host(string module)
    {
        var result = Types.InAssembly(ModuleCatalog.Load(module, "Application"))
            .ShouldNot()
            .HaveDependencyOnAny(ModuleCatalog.Ns(module, "Infrastructure"), "Overclock.Host",
                                 "Microsoft.EntityFrameworkCore", "StackExchange.Redis", "Microsoft.AspNetCore")
            .GetResult();

        Assert.True(result.IsSuccessful, Describe(result));
    }

    [Theory, MemberData(nameof(ModuleCatalog.Pairs), MemberType = typeof(ModuleCatalog))]
    public void Module_does_not_reference_another_modules_internals(string module, string other)
    {
        var assemblies = ModuleCatalog.Layers.Select(l => ModuleCatalog.Load(module, l));
        var result = Types.InAssemblies(assemblies)
            .ShouldNot()
            .HaveDependencyOnAny(ModuleCatalog.Ns(other, "Domain"),
                                 ModuleCatalog.Ns(other, "Application"),
                                 ModuleCatalog.Ns(other, "Infrastructure"))
            .GetResult();

        Assert.True(result.IsSuccessful, $"{module} -> {other}: only {other}.Contracts is allowed. {Describe(result)}");
    }

    [Fact]
    public void Hubs_and_endpoints_do_not_touch_persistence()
    {
        var result = Types.InAssembly(typeof(Program).Assembly)
            .That().HaveNameEndingWith("Hub").Or().HaveNameEndingWith("Endpoints")
            .ShouldNot()
            .HaveDependencyOnAny([
                "Microsoft.EntityFrameworkCore",
                "StackExchange.Redis",
                .. ModuleCatalog.Modules.Select(m => ModuleCatalog.Ns(m, "Infrastructure"))
            ])
            .GetResult();

        Assert.True(result.IsSuccessful, $"Dispatch via ISender instead. {Describe(result)}");
    }

    private static string Describe(TestResult r) => string.Join(", ", r.FailingTypeNames ?? []);
}
