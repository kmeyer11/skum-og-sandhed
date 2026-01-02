using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkumOgSandhed.Domain.Entities;
using SkumOgSandhed.Domain.Interfaces;
using SkumOgSandhed.Persistence.GoogleSheets;

namespace SkumOgSandhed.Persistence.Repositories
{
    public class GoogleSheetsBeerRepository : IBeerRepository
    {
        private readonly BeerLoaderService _loader;

    public GoogleSheetsBeerRepository(BeerLoaderService loader)
    {
        _loader = loader;
    }

    public Task<IReadOnlyList<Beer>> GetBeersAsync() => _loader.LoadBeersAsync();
    }
}