using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkumOgSandhed.Domain.Entities;

namespace SkumOgSandhed.Persistence.GoogleSheets
{
    public class BeerLoaderService
    {
        private readonly GoogleSheetsService _sheets;

        public BeerLoaderService(GoogleSheetsService sheets)
        {
            _sheets = sheets;
        }

        public async Task<IReadOnlyList<Beer>> LoadBeersAsync()
        {
            // 1. Load base beers
            var beers = await LoadBaseBeers();

            return beers.Values.ToList();
        }

        private async Task<Dictionary<int, Beer>> LoadBaseBeers()
        {
            var rows = await _sheets.GetRangeAsync("Beers_Input!A2:Q");
            var dict = new Dictionary<int, Beer>();

            foreach (var row in rows)
            {
                if (row.Count < 2) continue;
                if (!int.TryParse(row[0]?.ToString(), out var id)) continue;

                var beer = new Beer
                {
                    BeerId = id,
                    Name = GetString(row, 1),

                    Breweries = SplitList(row, 2),
                    ReleaseYear = GetInt(row, 3),
                    DrinkingYear = GetInt(row, 4),
                    Abv = GetDecimal(row, 5),

                    FoodPairing = GetString(row, 6) ?? "Ingen",
                    Description = GetString(row, 7) ?? "Ingen Beskrivelse",

                    Fermentation = GetString(row, 8),
                    YeastType = GetString(row, 9),

                    Price = GetDecimal(row, 10),
                    Rating = GetInt(row, 11),
                    UntappdRating = GetDecimal(row, 12),

                    Hops = SplitList(row, 13),
                    Malts = SplitList(row, 14),
                    Adjuncts = SplitList(row, 15),
                    Types = SplitList(row, 16)
                };

                dict[id] = beer;
            }

            return dict;
        }

        private static string? GetString(IList<object> row, int i) =>
        i < row.Count ? row[i]?.ToString() : null;

        private static int GetInt(IList<object> row, int i) =>
            i < row.Count && int.TryParse(row[i]?.ToString(), out var v) ? v : 0;

        private static double GetDouble(IList<object> row, int i) =>
            i < row.Count && double.TryParse(row[i]?.ToString(), out var v) ? v : 0;

        private static decimal GetDecimal(IList<object> row, int i) =>
            i < row.Count && decimal.TryParse(row[i]?.ToString(), out var v) ? v : 0;

        private static List<string> SplitList(IList<object> row, int i) =>
            i < row.Count && !string.IsNullOrWhiteSpace(row[i]?.ToString())
                ? row[i]!.ToString()!
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(x => x.Trim())
                    .ToList()
                : new List<string>();

    }
}