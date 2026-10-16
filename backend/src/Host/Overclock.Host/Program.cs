var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi("overclock");

var app = builder.Build();

app.MapOpenApi();

app.MapGet("/", () => "Hello World!")
    .WithName("GetRoot")
    .WithTags("Root")
    .Produces<string>(StatusCodes.Status200OK);

app.MapGet("/api/health", () => Results.Ok(new { status = "Healthy" }))
    .WithName("GetHealth")
    .WithTags("Health")
    .Produces(StatusCodes.Status200OK);

app.Run();

public partial class Program { }
