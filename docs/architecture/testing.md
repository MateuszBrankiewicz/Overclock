# Testing Strategy & Deterministic Verification

This document specifies the test architecture and automated verification standards for **Project: Overclock** ([ADR 0005](../adr/0005-ai-architecture-harness-and-deterministic-guardrails.md)).

---

## 1. Test Layers

| Layer | Tooling | Purpose | Runs in |
|---|---|---|---|
| Architecture | xUnit + NetArchTest.Rules + reflection | Module/layer boundaries, CQRS shape, Result return types | `verify.sh --fast`, CI |
| Domain unit | xUnit | Room state machine transitions, bluff/voltage rules (pure C#) | `verify.sh --fast`, CI |
| Integration | WebApplicationFactory + Testcontainers (Postgres, Redis) | Endpoints, hubs, migrations, Redis TTL/keys — **no fake DB/cache mocks** | `verify.sh`, CI |
| Contract | C# fixture export + Vitest | SignalR event records ↔ Zod schemas (ADR 0007) | `verify.sh`, CI |
| Frontend unit | Vitest | Zod schemas, Zustand slices, hooks | `verify.sh --fast`, CI |
| E2E | Playwright | Login → create room → 2 players play a round | CI (later) |

---

## 2. Architecture Tests (`tests/Architecture.Tests`) — protected

> NetArchTest's `HaveDependencyOn*` matches **namespace prefixes**. Always use fully-qualified namespaces
> (`Overclock.Modules.GameEngine.Infrastructure`), never bare words like `"Infrastructure"` — those match nothing.

```csharp
// tests/Architecture.Tests/ModuleCatalog.cs
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
            foreach (var b in Modules.Where(b => b != a))
                data.Add(a, b);
        return data;
    }
}
```

```csharp
// tests/Architecture.Tests/LayerTests.cs
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
                "Overclock.Host", "MediatR", "Microsoft.EntityFrameworkCore", "StackExchange.Redis", "Microsoft.AspNetCore")
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

        Assert.True(result.IsSuccessful, $"{module} → {other}: only {other}.Contracts is allowed. {Describe(result)}");
    }

    [Fact]
    public void Hubs_and_endpoints_do_not_touch_persistence()
    {
        var result = Types.InAssembly(typeof(Program).Assembly)
            .That().Inherit(typeof(Hub)).Or().HaveNameEndingWith("Endpoints")
            .ShouldNot()
            .HaveDependencyOnAny(["Microsoft.EntityFrameworkCore", "StackExchange.Redis",
                                  .. ModuleCatalog.Modules.Select(m => ModuleCatalog.Ns(m, "Infrastructure"))])
            .GetResult();

        Assert.True(result.IsSuccessful, $"Dispatch via ISender instead. {Describe(result)}");
    }

    private static string Describe(TestResult r) => string.Join(", ", r.FailingTypeNames ?? []);
}
```

```csharp
// tests/Architecture.Tests/CqrsShapeTests.cs — reflection for rules NetArchTest cannot express
public class CqrsShapeTests
{
    private static IEnumerable<Type> ApplicationTypes() =>
        ModuleCatalog.Modules.SelectMany(m => ModuleCatalog.Load(m, "Application").GetTypes());

    private static bool IsRecord(Type t) => t.GetMethod("<Clone>$") is not null;

    [Fact]
    public void Commands_and_queries_are_records()
    {
        var offenders = ApplicationTypes()
            .Where(t => t.IsClass && !t.IsAbstract && typeof(IBaseRequest).IsAssignableFrom(t) && !IsRecord(t))
            .Select(t => t.FullName);

        Assert.Empty(offenders);
    }

    [Fact]
    public void Handlers_return_Result() // ADR 0006
    {
        var offenders = ApplicationTypes()
            .SelectMany(t => t.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IRequestHandler<,>))
                .Select(i => (Handler: t, Response: i.GetGenericArguments()[1])))
            .Where(x => x.Response != typeof(Result) &&
                        !(x.Response.IsGenericType && x.Response.GetGenericTypeDefinition() == typeof(Result<>)))
            .Select(x => $"{x.Handler.FullName} returns {x.Response.Name}");

        Assert.Empty(offenders);
    }
}
```

**Rule for agents:** these tests may be extended (new rules) only with human approval and never weakened.

---

## 3. Integration Tests (`tests/Integration.Tests`)

* Real PostgreSQL and Redis via **Testcontainers** — never mock `DbContext`, repositories, `IConnectionMultiplexer`, or `IDistributedCache`.
* Containers are started **once per test run** (assembly/collection fixture) and state is reset between tests with **Respawn** (Postgres) and `FLUSHDB` (Redis).
* Migrations are applied with `MigrateAsync()` for **every module `DbContext`** — a model change without a migration fails here.
* Non-determinism is replaced through DI: `IRandomSource` (shuffle, capacitor roll) and `TimeProvider` (turn timers, `FakeTimeProvider`).

```csharp
// tests/Integration.Tests/Infrastructure/OverclockAppFixture.cs
public sealed class OverclockAppFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder().WithImage("postgres:17-alpine").Build();
    private readonly RedisContainer _redis = new RedisBuilder().WithImage("redis:7-alpine").Build();

    public FakeTimeProvider Time { get; } = new();
    public ScriptedRandomSource Random { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Postgres", _postgres.GetConnectionString());
        builder.UseSetting("ConnectionStrings:Redis", _redis.GetConnectionString());
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<TimeProvider>(Time);
            services.AddSingleton<IRandomSource>(Random);
        });
    }

    public async ValueTask InitializeAsync()
    {
        await Task.WhenAll(_postgres.StartAsync(), _redis.StartAsync());
        using var scope = Services.CreateScope();
        foreach (var db in scope.ServiceProvider.GetServices<IModuleDbContext>())
        {
            await db.Database.MigrateAsync();
        }
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
        await _redis.DisposeAsync();
    }
}
```

Every new command/endpoint/hub method ships with at least one integration test covering the success path and one domain-failure path (asserting the mapped HTTP status / `HubResponse`). Redis writes are asserted for key format and TTL (`KeyTimeToLiveAsync` is not null).

---

## 4. Contract Tests (ADR 0007)

* Backend: `SignalRContractFixtureTests` serializes a sample of every record in `*.Contracts` used as a hub event, with the hub's JSON options, to `tests/contracts/signalr/<EventName>.json`. If the file content changes, the test fails until the fixture is re-committed (snapshot).
* Frontend: `features/*/schemas/*.contract.test.ts` loads each fixture and asserts `Schema.safeParse(fixture).success === true`.

---

## 5. Verification Script

```bash
bash scripts/verify.sh --fast   # docs lint, format, build -warnaserror, architecture tests, ESLint, tsc, Vitest
bash scripts/verify.sh          # + Testcontainers integration tests + codegen drift (requires Docker)
```

Gate semantics: a gate is skipped only while its layer does not exist; once `src/**/*.csproj` exists, missing `Architecture.Tests` / `Integration.Tests` is a **failure**, and a skipped gate yields `PARTIAL`, never `SUCCESS`.
