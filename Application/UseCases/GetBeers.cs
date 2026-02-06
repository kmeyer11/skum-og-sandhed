using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkumOgSandhed.Domain.Interfaces;
using SkumOgSandhed.Domain.Entities;

namespace SkumOgSandhed.Application.UseCases
{
    public class GetBeers
    {
        private readonly IBeerRepository _beerRepository;

        public GetBeers(IBeerRepository beerRepository)
        {
            _beerRepository = beerRepository;
        }

        public Task<IReadOnlyList<Beer>> ExecuteAsync()
        {
            return _beerRepository.GetBeersAsync();
        }
    }
}