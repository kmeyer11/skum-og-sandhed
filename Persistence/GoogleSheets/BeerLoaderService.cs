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

            // 2. Load relation sheets and add string lists
            await LoadStringRelations(beers, "Beer_Breweries", row => row[1].ToString(), (beer, value) => beer.Breweries.Add(value));
            await LoadStringRelations(beers, "Beer_Hops", row => row[1].ToString(), (beer, value) => beer.Hops.Add(value));
            await LoadStringRelations(beers, "Beer_Malts", row => row[1].ToString(), (beer, value) => beer.Malts.Add(value));
            await LoadStringRelations(beers, "Beer_Adjuncts", row => row[1].ToString(), (beer, value) => beer.Adjuncts.Add(value));
            await LoadStringRelations(beers, "Beer_BeerTypes", row => row[1].ToString(), (beer, value) => beer.Types.Add(value));

            return beers.Values.ToList();
        }

        private async Task<Dictionary<int, Beer>> LoadBaseBeers()
        {
            var rows = await _sheets.GetRangeAsync("Beers_Input!A2:Q");
            var dict = new Dictionary<int, Beer>();
            foreach (var row in rows)
            {
                dict.Add(int.Parse(row[0].ToString()), new Beer
                {
                    BeerId = int.Parse(row[0].ToString()),
                    Name = row[1].ToString()
                });
            }
            return dict;
        }

        private async Task LoadStringRelations(Dictionary<int, Beer> beers, string sheet, Func<IList<object>, string> factory, Action<Beer, string> add)
        {
            var rows = await _sheets.GetRangeAsync($"{sheet}!A2:B");
            foreach (var row in rows)
            {
                if (row.Count < 2) continue;

                var beerId = int.Parse(row[0].ToString());
                var value = factory(row);

                if (!beers.TryGetValue(beerId, out var beer)) continue;

                add(beer, value);
            }
        }
    }
}