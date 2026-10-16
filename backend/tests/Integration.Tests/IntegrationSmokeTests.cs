using System.IO;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Integration.Tests;

public class IntegrationSmokeTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public IntegrationSmokeTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RootEndpoint_ReturnsSuccessAndHelloWorld()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/");

        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Equal("Hello World!", content);
    }

    [Fact]
    public async Task OpenApiEndpoint_ReturnsValidOpenApiSpecification()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/overclock.json");

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("openapi", json);

        // Ensure spec is saved to src/Frontend/openapi/overclock.json if directory exists
        var repoRoot = FindRepoRoot();
        if (repoRoot != null)
        {
            var openApiDir = Path.Combine(repoRoot, "frontend", "openapi");
            if (Directory.Exists(openApiDir))
            {
                var filePath = Path.Combine(openApiDir, "overclock.json");
                // Pretty format json
                using var doc = JsonDocument.Parse(json);
                var formatted = JsonSerializer.Serialize(doc.RootElement, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(filePath, formatted);
            }
        }
    }

    private static string? FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            if (Directory.Exists(Path.Combine(dir, ".git")))
            {
                return dir;
            }
            dir = Path.GetDirectoryName(dir);
        }
        return null;
    }
}
