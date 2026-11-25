// Ølsmagningen: én øl ad gangen i id-rækkefølge (202601, 202602, …) og en slutskærm efter den sidste.
$(function () {
    var { esc, kr, pct, tags } = Skum;

    // slots[i] er øl nr. i + 1, eller null hvis det nummer ikke er skrevet ind i arket.
    var beers = [], slots = [], index = 0, tastingYear;
    var $beer = $('#tastingBeer'), $end = $('#tastingEnd');

    // Id'et er år + løbenummer, så året kommer fra id'et og ikke fra "Druk år", som først udfyldes senere.
    var yearOf = b => Math.floor(b.beerId / 100);
    var numberOf = b => b.beerId % 100;
    // Loaderen udfylder tomme celler med standardtekster, som ikke skal stå på etiketten.
    var filled = s => s && s !== 'Ingen' && s !== 'Ingen Beskrivelse' ? s : '';

    $.getJSON('/api/beers.json')
        .done(function (data) {
            // Smagningen er altid den nyeste årgang i arket.
            tastingYear = Math.max(...data.map(yearOf));
            beers = data.filter(b => yearOf(b) === tastingYear && numberOf(b) > 0).sort((a, b) => a.beerId - b.beerId);

            document.title = `Ølsmagning ${tastingYear} – Skum og Sandhed`;
            $('#tastingTitle').text(`Ølsmagning ${tastingYear}`);
            $('#statsLink').prop('hash', String(tastingYear));
            $('#tasting').attr('aria-busy', 'false');

            if (!beers.length) {
                $('#tastingStatus').text('Der er ingen øl i arket endnu.');
                return;
            }
            slots = Array.from({ length: numberOf(beers[beers.length - 1]) }, () => null);
            beers.forEach(b => { slots[numberOf(b) - 1] = b; });

            $('#tastingStatus').remove();
            buildWall();
            // Adressen er øllens nummer, så en genindlæsning lander på samme flaske, også hvis arket har fået nye øl imens.
            var hash = location.hash.slice(1), fromHash = parseInt(hash, 10);
            show(hash === 'slut' ? slots.length : fromHash >= 1 && fromHash <= slots.length ? fromHash - 1 : 0);
        })
        .fail(function () {
            $('#tastingStatus').text('Kunne ikke hente øl fra arket. Genindlæs siden, eller tjek at Google-arket er delt med service accounten.');
            $('#tasting').attr('aria-busy', 'false');
        });

    function show(i) {
        index = Math.max(0, Math.min(i, slots.length));
        history.replaceState(null, '', '#' + (index === slots.length ? 'slut' : index + 1));
        if (index === slots.length) return showEnd();

        var b = slots[index], n = index + 1, left = slots.length - n;
        $end.prop('hidden', true);
        $beer.prop('hidden', false);
        $('#prevBtn').prop('disabled', index === 0);

        $('#beerLabel').toggleClass('missing', !b).html(b ? label(b, n) : `
            <span class="no">Øl nr. ${n}</span>
            <h2>?</h2>
            <div class="style">Ikke skrevet ind i arket endnu</div>`);
        $('#beerSide').html(`
            ${b ? side(b) : `<p class="side-empty">Skriv øl nr. ${n} ind i arket med id ${tastingYear}${String(n).padStart(2, '0')}, og genindlæs siden.</p>`}
            <div class="progress">${n} af ${slots.length} · ${left ? `${left} tilbage` : 'sidste øl'}
                <div class="bar"><b style="width:${n / slots.length * 100}%"></b></div>
            </div>`);
        replay($beer.find('.label-wrap'));
    }

    // Kun det, der står i arket, kommer på etiketten; tomme felter udelades i stedet for at vise "–".
    function label(b, n) {
        var meta = [
            ['Alkohol', b.abv > 0 && pct(b.abv)],
            ['Brygget', b.releaseYear > 0 && b.releaseYear],
            ['Gær', filled(b.yeastType) && esc(b.yeastType)]
        ].filter(([, v]) => v);
        return `
            <span class="no">Øl nr. ${n}</span>
            ${b.breweries.length ? `<div class="brew">${esc(b.breweries.join(' & '))}</div>` : ''}
            <h2>${filled(b.name) ? esc(b.name) : '<span class="unnamed">Uden navn</span>'}</h2>
            ${b.types.length ? `<div class="style">${esc(b.types.join(' · '))}</div>` : ''}
            ${meta.length ? `<div class="rule"></div>
            <dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}`;
    }

    function side(b) {
        var rows = [
            ['Humle', b.hops.length && tags(b.hops, 'hop')],
            ['Malt', b.malts.length && tags(b.malts)],
            ['Adjuncts', b.adjuncts.length && tags(b.adjuncts)],
            ['Passer til', filled(b.foodPairing) && esc(b.foodPairing)]
        ].filter(([, v]) => v);
        var description = filled(b.description);
        if (!description && !rows.length) return '<p class="side-empty">Der står ikke mere om denne øl i arket endnu.</p>';
        return `
            ${description ? `<blockquote>${esc(description)}</blockquote>` : ''}
            ${rows.length ? `<dl class="ing">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}`;
    }

    function showEnd() {
        var priced = beers.filter(b => b.price > 0), strong = beers.filter(b => b.abv > 0);
        var total = priced.reduce((s, b) => s + b.price, 0);
        var avgAbv = strong.length ? Math.round(strong.reduce((s, b) => s + b.abv, 0) / strong.length * 10) / 10 : 0;
        var unpriced = beers.length - priced.length;
        // Uden markeringen ville en manglende pris bare få totalen til at se lavere ud.
        $('#endSummary').text(`${beers.length} øl · ${kr(total)}${unpriced ? ` (${unpriced} uden pris)` : ''} · ${pct(avgAbv)} i snit`);
        $beer.prop('hidden', true);
        $end.prop('hidden', false);
        replay($end);
    }

    function buildWall() {
        $('#labelWall').html(slots.map((b, i) => `
            <li><button type="button" class="mini${b ? '' : ' missing'}" data-index="${i}">
                <small>Nr. ${i + 1}</small>
                ${b ? `<b>${filled(b.name) ? esc(b.name) : 'Uden navn'}</b><span>${b.abv > 0 ? pct(b.abv) : ''}</span>` : '<b>?</b><span>Mangler</span>'}
            </button></li>`).join(''));
    }

    // Genstarter indgangsanimationen, så hvert skift føles som en ny skænk.
    function replay($el) {
        $el.removeClass('pour-in');
        void $el[0].offsetWidth;
        $el.addClass('pour-in');
    }

    var next = () => show(index + 1);
    var prev = () => show(index - 1);

    $('#nextBtn').on('click', next);
    $('#prevBtn').on('click', prev);
    $('#restartBtn').on('click', () => show(0));
    $('#labelWall').on('click', '.mini', function () { show(+this.dataset.index); });
    // Et tryk hvor som helst på øllen går videre; knapperne har deres egne handlinger.
    $beer.on('click', function (e) { if (!$(e.target).closest('button, a').length) next(); });

    // PageDown/PageUp er det, en præsentationsklikker sender.
    $(document).on('keydown', function (e) {
        if (!slots.length || e.altKey || e.ctrlKey || e.metaKey) return;
        // En fokuseret knap reagerer selv på mellemrum, så den skal ikke også tælle her.
        if (e.key === ' ' && $(e.target).is('button, a')) return;
        if (['ArrowRight', 'PageDown', ' '].includes(e.key) && $end.prop('hidden')) { e.preventDefault(); next(); }
        else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); prev(); }
        else if (e.key === 'Home') { e.preventDefault(); show(0); }
    });
});
