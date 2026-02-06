using Domain.Entities;

namespace SkumOgSandhed.Domain.Entities
{
    public class Beer
    {
        public int BeerId { get; set; }
        public string Name { get; set; }
        public List<string> Breweries { get; set; } = new();
        public int ReleaseYear { get; set; }
        public int DrinkingYear { get; set; }
        public decimal Abv { get; set; }
        public string? FoodPairing { get; set; } = "Ingen";
        public string? Description { get; set; } = "Ingen Beskrivelse";
        public string Fermentation { get; set; }
        public string YeastType { get; set; }
        public decimal Price { get; set; }
        public decimal? Rating { get; set; } = 0;
        public decimal? UntappdRating { get; set; } = 0;
        public List<string> Hops { get; set; } = new();
        public List<string> Malts { get; set; } = new();
        public List<string> Adjuncts { get; set; } = new();
        public List<string> Types { get; set; } = new();
    }
}