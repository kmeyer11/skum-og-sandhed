using SkumOgSandhed.Application.UseCases;
using SkumOgSandhed.Domain.Interfaces;
using SkumOgSandhed.Persistence.GoogleSheets;
using SkumOgSandhed.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? new[] { "http://localhost:5216", "http://localhost:8008" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var spreadsheetId = builder.Configuration["GoogleSheets:SpreadsheetId"]
    ?? throw new InvalidOperationException("GoogleSheets:SpreadsheetId mangler i konfigurationen.");

builder.Services.AddSingleton(_ => new GoogleSheetsService(spreadsheetId));
builder.Services.AddSingleton<BeerLoaderService>();
builder.Services.AddScoped<IBeerRepository, GoogleSheetsBeerRepository>();
builder.Services.AddScoped<GetBeers>();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseCors();

app.MapGet("/api/beers", async (GetBeers useCase) =>
{
    try
    {
        var beers = await useCase.ExecuteAsync();
        return Results.Ok(beers);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.Run();
