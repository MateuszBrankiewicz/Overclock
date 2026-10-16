using System.Reflection;
using Ardalis.Result;
using Mediator;
using Xunit;

namespace Architecture.Tests;

public class CqrsShapeTests
{
    private static IEnumerable<Type> ApplicationTypes() =>
        ModuleCatalog.Modules.SelectMany(m => ModuleCatalog.Load(m, "Application").GetTypes());

    private static bool IsRecord(Type t) => t.GetMethod("<Clone>$") is not null;

    [Fact]
    public void Commands_and_queries_are_records()
    {
        var offenders = ApplicationTypes()
            .Where(t => t.IsClass && !t.IsAbstract && typeof(IMessage).IsAssignableFrom(t) && !IsRecord(t))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(offenders);
    }

    [Fact]
    public void Handlers_return_Result()
    {
        var offenders = ApplicationTypes()
            .SelectMany(t => t.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>))
                .Select(i => (Handler: t, Response: i.GetGenericArguments()[1])))
            .Where(x => x.Response != typeof(Result) &&
                        !(x.Response.IsGenericType && x.Response.GetGenericTypeDefinition() == typeof(Result<>)))
            .Select(x => $"{x.Handler.FullName} returns {x.Response.Name}")
            .ToList();

        Assert.Empty(offenders);
    }
}
