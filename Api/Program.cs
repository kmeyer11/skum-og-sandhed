using SkumOgSandhed.Application.UseCases;
using SkumOgSandhed.Persistence.Repositories;
using SkumOgSandhed.Persistence.GoogleSheets;
using SkumOgSandhed.Domain.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// --- Services ---
// Tilføj CORS for at tillade Client på en anden port
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5216") // Client port
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// --- Persistence DI ---
builder.Services.AddSingleton(sp => new GoogleSheetsService(
    "141LDJNA1KpJpEULTmpme4MhyJkoZ9fRHmbnqYH4EKfs"));
builder.Services.AddSingleton<BeerLoaderService>();
builder.Services.AddScoped<IBeerRepository, GoogleSheetsBeerRepository>();

// --- Application DI ---
builder.Services.AddScoped<GetBeers>();

builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// --- Middleware ---
app.UseCors(); // Brug CORS

// --- Minimal API Endpoint ---
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


// --- Run app ---
app.Run();
