using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SkumOgSandhed.Domain.Entities;

namespace SkumOgSandhed.Domain.Interfaces
{
    public interface IBeerRepository
    {
        Task<IReadOnlyList<Beer>> GetBeersAsync();
    }
}