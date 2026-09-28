// Fælles formattering, øl-dialogen og boblerne i heroen, brugt af både arkivet og statistiksiden.
window.Skum = (function () {
    var esc = s => $('<div>').text(s ?? '').html();
    var num = (n, digits) => n.toLocaleString('da-DK', { minimumFractionDigits: digits, maximumFractionDigits: 2 });
    // Arket giver 0 for tomme celler, så 0 betyder "ikke udfyldt" og vises som en streg.
    var orDash = (n, fmt) => n ? fmt(n) : '–';
    var kr = n => orDash(n, v => num(v, 0) + ' kr');
    var pct = n => orDash(n, v => num(v, 1) + ' %');
    var rating = n => orDash(n, v => num(v, 1));
    var year = n => orDash(n, v => v);
    var text = s => s ? esc(s) : '–';

    function tags(list, cls) {
        return list.length
            ? list.map(x => `<span class="tag ${cls || ''}">${esc(x)}</span>`).join('')
            : '<span class="none">Ingen</span>';
    }

    function openBeer(data) {
        var dialog = document.getElementById('beerModal');
        $('#beerModalLabel').text(data.name);
        $('#beerBreweries').text(data.breweries.join(' & '));
        $('#beerDescription').text(data.description ?? '');
        $('#beerFacts').html([
            ['Røvernes rating', rating(data.rating)], ['Untappd', rating(data.untappdRating)],
            ['ABV', pct(data.abv)], ['Pris', kr(data.price)],
            ['Brygget', year(data.releaseYear)], ['Drukket', year(data.drinkingYear)],
            ['Gæring', text(data.fermentation)], ['Gærtype', text(data.yeastType)]
        ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join(''));
        $('#beerIngredients').html(`
            <dt>Typer</dt><dd>${tags(data.types)}</dd>
            <dt>Humle</dt><dd>${tags(data.hops, 'hop')}</dd>
            <dt>Malt</dt><dd>${tags(data.malts)}</dd>
            <dt>Adjuncts</dt><dd>${tags(data.adjuncts)}</dd>
            <dt>Passer til</dt><dd>${text(data.foodPairing)}</dd>`);
        dialog.showModal();
    }

    $(function () {
        var bubbles = document.querySelector('.bubbles');
        for (var i = 0; bubbles && i < 18; i++) {
            var s = document.createElement('span');
            var size = 3 + Math.random() * 6;
            s.style.left = Math.random() * 100 + '%';
            s.style.width = s.style.height = size + 'px';
            s.style.animationDuration = 4 + Math.random() * 6 + 's';
            s.style.animationDelay = -Math.random() * 8 + 's';
            bubbles.appendChild(s);
        }

        var dialog = document.getElementById('beerModal');
        if (!dialog) return;
        $('.d-close').on('click', () => dialog.close());
        dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    });

    return { esc, num, orDash, kr, pct, rating, year, text, openBeer };
})();
