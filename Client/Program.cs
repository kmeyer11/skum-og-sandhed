using SkumOgSandhed.Application.UseCases;
using SkumOgSandhed.Domain.Interfaces;
using SkumOgSandhed.Persistence.GoogleSheets;
using SkumOgSandhed.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();

var spreadsheetId = builder.Configuration["GoogleSheets:SpreadsheetId"]
    ?? throw new InvalidOperationException("GoogleSheets:SpreadsheetId mangler i konfigurationen.");

builder.Services.AddSingleton(_ => new GoogleSheetsService(spreadsheetId));
builder.Services.AddSingleton<BeerLoaderService>();
builder.Services.AddScoped<IBeerRepository, GoogleSheetsBeerRepository>();
builder.Services.AddScoped<GetBeers>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

var listenUrls = builder.Configuration["ASPNETCORE_URLS"] ?? string.Empty;
if (app.Environment.IsDevelopment() || listenUrls.Contains("https", StringComparison.OrdinalIgnoreCase))
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapRazorPages();

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
