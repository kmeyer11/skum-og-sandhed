$(function () {
    var { esc, num, kr, pct, rating, openBeer } = Skum;

    // Arket har huller: 0 betyder tom celle. Ratings over 5 er slåfejl, da skalaen er 0–5.
    var hasRating = b => b.rating > 0 && b.rating <= 5;
    var hasUntappd = b => b.untappdRating > 0;
    var hasPrice = b => b.price > 0;
    var hasAbv = b => b.abv > 0;

    var sum = xs => xs.reduce((a, x) => a + x, 0);
    var mean = xs => xs.length ? sum(xs) / xs.length : null;
    var plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    var signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + num(Math.abs(n), 1);

    var css = getComputedStyle(document.documentElement);
    var tok = name => css.getPropertyValue(name).trim();
    var color = {
        roverne: tok('--series-1'), untappd: tok('--series-2'),
        ink: tok('--foam'), muted: tok('--foam-soft'), line: tok('--line'),
        surface: tok('--bottle-raised'), bottle: tok('--bottle')
    };

    var beers = [], byId = new Map(), years = [], selected = 'all', charts = {};

    $.getJSON('/api/beers')
        .done(function (data) {
            beers = data.filter(b => b.drinkingYear > 0);
            beers.forEach(b => byId.set(b.beerId, b));
            years = [...new Set(beers.map(b => b.drinkingYear))].sort();
            $('#statsStatus').remove();
            $('#stats').attr('aria-busy', 'false');
            buildYearPicker();
            buildYearCharts();
            buildTypeCharts();
            buildCoverage();
            render();
        })
        .fail(function () {
            $('#statsStatus').text('Kunne ikke hente øl fra arket. Genindlæs siden, eller tjek at Google-arket er delt med service accounten.');
            $('#stats').attr('aria-busy', 'false');
        });

    // ---------- Beregninger ----------

    function summarize(list) {
        var rated = list.filter(hasRating), untappd = list.filter(hasUntappd);
        var priced = list.filter(hasPrice), abv = list.filter(hasAbv);
        return {
            count: list.length,
            rating: mean(rated.map(b => b.rating)), ratingN: rated.length,
            untappd: mean(untappd.map(b => b.untappdRating)), untappdN: untappd.length,
            price: mean(priced.map(b => b.price)), priceN: priced.length,
            priceMin: priced.length ? Math.min(...priced.map(b => b.price)) : null,
            priceMax: priced.length ? Math.max(...priced.map(b => b.price)) : null,
            total: priced.length ? sum(priced.map(b => b.price)) : null,
            abv: mean(abv.map(b => b.abv)), abvN: abv.length
        };
    }

    var inYear = y => beers.filter(b => b.drinkingYear === y);
    var scope = () => selected === 'all' ? beers : inYear(selected);
    var yearStats = () => years.map(y => ({ year: y, ...summarize(inYear(y)) }));

    // ---------- År-vælger ----------

    function buildYearPicker() {
        var opts = [['all', 'Alle år'], ...years.map(y => [y, String(y)])];
        $('#yearPicker').html(opts.map(([v, label]) =>
            `<button type="button" class="chip" data-year="${v}" aria-pressed="${v === selected}">${label}</button>`).join(''));
        $('#yearPicker').on('click', '.chip', function () {
            var v = $(this).data('year');
            selected = v === 'all' ? 'all' : Number(v);
            $('#yearPicker .chip').each(function () {
                this.setAttribute('aria-pressed', String($(this).data('year') == selected));
            });
            render();
        });
    }

    function render() {
        renderKpis();
        renderLists();
        highlightScatters();
        $('#topScope').text(selected === 'all' ? 'alle år' : selected);
        $('#winnersWrap').toggle(selected === 'all');
    }

    // ---------- Nøgletal ----------

    function sparkline(values, highlightIndex) {
        var w = 120, h = 32, pad = 4;
        var present = values.filter(v => v != null);
        if (present.length < 2) return '';
        var lo = Math.min(...present), hi = Math.max(...present), span = hi - lo || 1;
        var x = i => pad + i * (w - 2 * pad) / (values.length - 1);
        var y = v => h - pad - (v - lo) / span * (h - 2 * pad);
        var d = '', pen = false;
        values.forEach((v, i) => {
            if (v == null) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
            pen = true;
        });
        var dots = values.map((v, i) => v == null ? '' :
            `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === highlightIndex ? 4 : 2}" class="${i === highlightIndex ? 'hl' : ''}"/>`).join('');
        return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/>${dots}</svg>`;
    }

    function renderKpis() {
        var s = summarize(scope()), all = summarize(beers), ys = yearStats();
        var hl = selected === 'all' ? -1 : years.indexOf(selected);
        var vs = (v, avg, fmt) => selected === 'all' || v == null || avg == null ? ''
            : `<span class="delta">${signed(v - avg)}${fmt} mod snittet</span>`;

        var tiles = [
            {
                label: 'Øl smagt', value: s.count,
                note: selected === 'all' ? `på ${plural(years.length, 'smagning', 'smagninger')}` : `snittet er ${num(all.count / years.length, 0)}`,
                spark: ys.map(y => y.count)
            },
            {
                label: 'Røvernes snit', value: s.rating != null ? num(s.rating, 2) : '–',
                note: s.rating != null ? `ud af 5, ${plural(s.ratingN, 'bedømt øl', 'bedømte øl')}` : 'ingen ratings i arket',
                extra: vs(s.rating, all.rating, ''), spark: ys.map(y => y.rating)
            },
            {
                label: 'Untappd snit', value: s.untappd != null ? num(s.untappd, 2) : '–',
                note: s.untappd != null ? `ud af 5, ${plural(s.untappdN, 'øl', 'øl')}` : 'ingen Untappd i arket',
                extra: vs(s.untappd, all.untappd, ''), spark: ys.map(y => y.untappd)
            },
            {
                label: 'Snitpris', value: s.price != null ? kr(Math.round(s.price)) : '–',
                note: s.price != null ? `${kr(s.priceMin)} til ${kr(s.priceMax)}` : 'ingen priser i arket',
                extra: vs(s.price, all.price, ' kr'), spark: ys.map(y => y.price)
            },
            {
                label: 'Samlet regning', value: s.total != null ? kr(Math.round(s.total)) : '–',
                note: s.total != null ? `for ${plural(s.priceN, 'øl', 'øl')} med pris` : 'ingen priser i arket',
                spark: ys.map(y => y.total)
            },
            {
                label: 'Snitstyrke', value: s.abv != null ? pct(s.abv) : '–',
                note: s.abv != null ? `${plural(s.abvN, 'øl', 'øl')} med ABV` : 'ingen ABV i arket',
                extra: vs(s.abv, all.abv, ' %'), spark: ys.map(y => y.abv)
            }
        ];

        $('#kpis').html(tiles.map(t => `
            <div class="kpi">
                <div class="kpi-label">${t.label}</div>
                <div class="kpi-value">${t.value}</div>
                <div class="kpi-note">${t.note}${t.extra || ''}</div>
                ${sparkline(t.spark, hl)}
            </div>`).join(''));
    }

    // ---------- Lister ----------

    function rankItem(b, value, meta) {
        return `<li><button type="button" class="rank-item" data-id="${b.beerId}">
            <span class="rank-name">${esc(b.name)}<small>${meta ?? esc(b.breweries.join(' & ')) + ' · ' + b.drinkingYear}</small></span>
            <span class="rank-value">${value}</span></button></li>`;
    }

    function fillList(sel, items, empty) {
        $(sel).html(items.length ? items.join('') : `<li class="empty">${empty}</li>`);
    }

    function renderLists() {
        var list = scope(), where = selected === 'all' ? '' : ` for ${selected}`;
        var rated = list.filter(hasRating).sort((a, b) => b.rating - a.rating);
        var n = Math.min(5, Math.floor(rated.length / 2) || rated.length);

        fillList('#topList', rated.slice(0, n).map(b => rankItem(b, rating(b.rating))),
            `Ingen Røverne-ratings${where} i arket.`);
        fillList('#bottomList', rated.length > 1 ? rated.slice(-n).reverse().map(b => rankItem(b, rating(b.rating))) : [],
            `For få Røverne-ratings${where} i arket.`);

        var both = list.filter(b => hasRating(b) && hasUntappd(b))
            .map(b => ({ b, diff: b.rating - b.untappdRating }));
        fillList('#weLoved', both.filter(x => x.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5)
            .map(x => rankItem(x.b, signed(x.diff))),
            both.length ? 'Ingen. Untappd var altid gladere end os.' : `Ingen øl med begge ratings${where}.`);
        fillList('#worldLoved', both.filter(x => x.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 5)
            .map(x => rankItem(x.b, signed(x.diff))),
            both.length ? 'Ingen. Vi var altid gladere end Untappd.' : `Ingen øl med begge ratings${where}.`);

        var valued = list.filter(b => hasRating(b) && hasPrice(b));
        fillList('#bestValue', valued.map(b => ({ b, v: b.rating / b.price * 100 }))
            .sort((a, b) => b.v - a.v).slice(0, 5)
            .map(x => rankItem(x.b, num(x.v, 1), `${kr(x.b.price)} · rating ${rating(x.b.rating)}`)),
            `Ingen øl med både pris og rating${where}.`);
        fillList('#worstValue', valued.filter(b => b.rating < 3).sort((a, b) => b.price - a.price).slice(0, 5)
            .map(b => rankItem(b, kr(b.price), `${esc(b.breweries.join(' & '))} · rating ${rating(b.rating)}`)),
            valued.length ? 'Ingen dyre skuffelser.' : `Ingen øl med både pris og rating${where}.`);

        var breweries = new Map();
        list.forEach(b => b.breweries.forEach(name => {
            var e = breweries.get(name) || { name, count: 0, ratings: [] };
            e.count++;
            if (hasRating(b)) e.ratings.push(b.rating);
            breweries.set(name, e);
        }));
        var brew = [...breweries.values()];
        var brewItem = (e, value, meta) => `<li><div class="rank-item static">
            <span class="rank-name">${esc(e.name)}<small>${meta}</small></span><span class="rank-value">${value}</span></div></li>`;
        fillList('#breweryCount', brew.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da')).slice(0, 5)
            .map(e => brewItem(e, e.count, e.ratings.length ? `snit ${num(mean(e.ratings), 1)}` : 'ingen ratings')),
            'Ingen bryggerier.');
        fillList('#breweryBest', brew.filter(e => e.ratings.length >= 2)
            .map(e => ({ ...e, avg: mean(e.ratings) })).sort((a, b) => b.avg - a.avg).slice(0, 5)
            .map(e => brewItem(e, num(e.avg, 2), plural(e.ratings.length, 'bedømt øl', 'bedømte øl'))),
            `Intet bryggeri har mindst 2 bedømte øl${where}.`);

        $('#winnersTable').html(`<thead><tr><th>År</th><th>Vinder</th><th class="num">Rating</th><th>Taber</th><th class="num">Rating</th></tr></thead><tbody>` +
            years.map(y => {
                var r = inYear(y).filter(hasRating).sort((a, b) => b.rating - a.rating);
                if (!r.length) return `<tr><th scope="row">${y}</th><td colspan="4" class="muted">Ingen Røverne-ratings i arket</td></tr>`;
                var best = r[0], worst = r[r.length - 1];
                var cell = b => `<button type="button" class="link" data-id="${b.beerId}">${esc(b.name)}</button>`;
                return `<tr><th scope="row">${y}</th><td>${cell(best)}</td><td class="num">${rating(best.rating)}</td>` +
                    `<td>${cell(worst)}</td><td class="num">${rating(worst.rating)}</td></tr>`;
            }).join('') + '</tbody>');
    }

    $('#stats').on('click', '[data-id]', function () {
        var b = byId.get(Number($(this).data('id')));
        if (b) openBeer(b);
    });

    // ---------- Grafer ----------

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.Chart) {
        Chart.defaults.font.family = "'Instrument Sans', system-ui, sans-serif";
        Chart.defaults.font.size = 13;
        Chart.defaults.color = color.muted;
        Chart.defaults.borderColor = color.line;
        Chart.defaults.maintainAspectRatio = false;
        if (reduceMotion) Chart.defaults.animation = false;
        Object.assign(Chart.defaults.plugins.tooltip, {
            backgroundColor: color.bottle, borderColor: color.line, borderWidth: 1,
            titleColor: color.ink, bodyColor: color.ink, footerColor: color.muted,
            padding: 10, cornerRadius: 4, boxPadding: 4, usePointStyle: true
        });
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.color = color.ink;
    }

    var axisGrid = { color: color.line, drawTicks: false };
    var noGrid = { display: false };
    // Et år uden data får "ingen data" under årstallet, så et manglende punkt ikke ligner et fald.
    // Et år med under 3 øl bag gennemsnittet får antallet med, så en enkelt øl ikke læses som årets niveau.
    var yearLabels = (values, counts) => years.map((y, i) =>
        values.every(v => v[i] == null) ? [String(y), 'ingen data']
            : counts && counts[i] < 3 ? [String(y), `kun ${plural(counts[i], 'øl', 'øl')}`]
                : String(y));

    function buildYearCharts() {
        var ys = yearStats();
        buildYearTable(ys);
        if (!window.Chart) return;

        var r = ys.map(y => y.rating), u = ys.map(y => y.untappd);
        charts.rating = new Chart(document.getElementById('chartRating'), {
            type: 'line',
            data: {
                labels: yearLabels([r, u]),
                datasets: [
                    { label: 'Røverne', data: r, n: ys.map(y => y.ratingN), borderColor: color.roverne, backgroundColor: color.roverne },
                    { label: 'Untappd', data: u, n: ys.map(y => y.untappdN), borderColor: color.untappd, backgroundColor: color.untappd }
                ].map(d => ({ ...d, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: color.surface, pointBorderWidth: 2, spanGaps: false }))
            },
            options: {
                interaction: { mode: 'index', intersect: false },
                scales: { y: { min: 1, max: 5, ticks: { stepSize: 1, padding: 8 }, grid: axisGrid, border: { display: false } }, x: { grid: noGrid, ticks: { maxRotation: 0, autoSkip: false } } },
                plugins: {
                    legend: { position: 'top', align: 'start' },
                    tooltip: {
                        callbacks: {
                            title: items => String(years[items[0].dataIndex]),
                            label: c => `${c.dataset.label}: ${num(c.parsed.y, 2)} (${plural(c.dataset.n[c.dataIndex], 'øl', 'øl')})`
                        }
                    }
                }
            }
        });

        charts.price = barChart('chartPrice', ys.map(y => y.price), ys.map(y => y.priceN), v => kr(Math.round(v)),
            i => [`fra ${kr(ys[i].priceMin)} til ${kr(ys[i].priceMax)}`, `baseret på ${plural(ys[i].priceN, 'øl', 'øl')}`]);
        charts.abv = barChart('chartAbv', ys.map(y => y.abv), ys.map(y => y.abvN), v => pct(v),
            i => [`baseret på ${plural(ys[i].abvN, 'øl', 'øl')}`]);
        charts.count = barChart('chartCount', ys.map(y => y.count), null, v => plural(v, 'øl', 'øl'), () => []);
    }

    function barChart(id, values, counts, fmt, footer) {
        return new Chart(document.getElementById(id), {
            type: 'bar',
            data: {
                labels: yearLabels([values], counts),
                datasets: [{ data: values, backgroundColor: color.roverne, hoverBackgroundColor: color.roverne, borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: 'bottom', maxBarThickness: 44 }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, ticks: { padding: 8, callback: v => v === 0 ? '0' : fmt(v) }, grid: axisGrid, border: { display: false } },
                    x: { grid: noGrid, ticks: { maxRotation: 0, autoSkip: false } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: items => String(years[items[0].dataIndex]),
                            label: c => fmt(c.parsed.y),
                            footer: items => footer(items[0].dataIndex)
                        }
                    }
                }
            }
        });
    }

    function buildYearTable(ys) {
        var all = { year: 'Alle', ...summarize(beers) };
        var cell = (v, fmt) => `<td class="num">${v == null ? '–' : fmt(v)}</td>`;
        var row = (y, tag) => `<tr${tag ? ' class="total"' : ''}><th scope="row">${y.year}</th><td class="num">${y.count}</td>` +
            cell(y.rating, v => num(v, 2)) + cell(y.untappd, v => num(v, 2)) +
            cell(y.price, v => kr(Math.round(v))) + cell(y.total, v => kr(Math.round(v))) + cell(y.abv, pct) + '</tr>';
        $('#yearTable').html('<thead><tr><th>År</th><th class="num">Øl</th><th class="num">Røverne</th><th class="num">Untappd</th>' +
            '<th class="num">Snitpris</th><th class="num">Samlet</th><th class="num">ABV</th></tr></thead><tbody>' +
            ys.map(y => row(y)).join('') + row(all, true) + '</tbody>');
    }

    function scatter(id, points, xAxis, yAxis, label, extraDatasets) {
        return new Chart(document.getElementById(id), {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        data: points, backgroundColor: color.roverne, borderColor: color.surface, borderWidth: 2,
                        pointRadius: 6, pointHoverRadius: 8, pointHitRadius: 10
                    },
                    ...(extraDatasets || [])
                ]
            },
            options: {
                scales: {
                    x: { ...xAxis, grid: axisGrid, border: { display: false }, ticks: { padding: 8, ...(xAxis.ticks || {}) } },
                    y: { ...yAxis, grid: axisGrid, border: { display: false }, ticks: { padding: 8, ...(yAxis.ticks || {}) } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        filter: c => c.datasetIndex === 0,
                        callbacks: {
                            title: items => items[0].raw.beer.name,
                            label: c => label(c.raw.beer)
                        }
                    }
                },
                onClick: (e, els) => {
                    var el = els.find(x => x.datasetIndex === 0);
                    if (el) openBeer(charts[id].data.datasets[0].data[el.index].beer);
                },
                onHover: (e, els) => { e.native.target.style.cursor = els.some(x => x.datasetIndex === 0) ? 'pointer' : ''; }
            }
        });
    }

    function buildScatters() {
        var both = beers.filter(b => hasRating(b) && hasUntappd(b));
        charts.chartWorld = scatter('chartWorld',
            both.map(b => ({ x: b.untappdRating, y: b.rating, beer: b })),
            { min: 1, max: 5, title: { display: true, text: 'Untappd', color: color.muted } },
            { min: 1, max: 5, title: { display: true, text: 'Røverne', color: color.muted } },
            b => [`Røverne ${rating(b.rating)} · Untappd ${rating(b.untappdRating)}`, `${b.drinkingYear}`],
            [{
                type: 'line', data: [{ x: 1, y: 1 }, { x: 5, y: 5 }], borderColor: color.muted, borderWidth: 1,
                borderDash: [4, 4], pointRadius: 0, pointHitRadius: 0, pointHoverRadius: 0
            }]);

        var valued = beers.filter(b => hasRating(b) && hasPrice(b));
        charts.chartValue = scatter('chartValue',
            valued.map(b => ({ x: b.price, y: b.rating, beer: b })),
            { beginAtZero: true, title: { display: true, text: 'Pris', color: color.muted }, ticks: { callback: v => kr(v) } },
            { min: 1, max: 5, title: { display: true, text: 'Røverne', color: color.muted } },
            b => [`${kr(b.price)} · rating ${rating(b.rating)}`, `${b.drinkingYear}`]);
    }

    // Valgt år står frem i scatterplottene; resten tones ned men bliver.
    function highlightScatters() {
        ['chartWorld', 'chartValue'].forEach(id => {
            var chart = charts[id];
            if (!chart) return;
            var ds = chart.data.datasets[0];
            ds.backgroundColor = ds.data.map(p => selected === 'all' || p.beer.drinkingYear === selected ? color.roverne : color.line);
            chart.update();
        });
    }

    function buildTypeCharts() {
        buildScatters();

        var types = new Map();
        beers.forEach(b => b.types.forEach(t => {
            var e = types.get(t) || { name: t, count: 0, ratings: [], perYear: new Map() };
            e.count++;
            e.perYear.set(b.drinkingYear, (e.perYear.get(b.drinkingYear) || 0) + 1);
            if (hasRating(b)) e.ratings.push(b.rating);
            types.set(t, e);
        }));
        var all = [...types.values()];

        if (window.Chart) {
            var rated = all.filter(e => e.ratings.length >= 3).map(e => ({ ...e, avg: mean(e.ratings) })).sort((a, b) => b.avg - a.avg);
            var box = document.getElementById('chartTypes').parentElement;
            box.style.height = Math.max(200, rated.length * 34 + 40) + 'px';
            charts.types = new Chart(document.getElementById('chartTypes'), {
                type: 'bar',
                data: {
                    labels: rated.map(e => e.name),
                    datasets: [{
                        data: rated.map(e => e.avg), n: rated.map(e => e.ratings.length),
                        backgroundColor: color.roverne, hoverBackgroundColor: color.roverne,
                        borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: 'left', barPercentage: .7
                    }]
                },
                options: {
                    indexAxis: 'y',
                    scales: {
                        x: { min: 0, max: 5, ticks: { stepSize: 1, padding: 8 }, grid: axisGrid, border: { display: false } },
                        y: { grid: noGrid, ticks: { color: color.ink } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: c => `Snit ${num(c.parsed.x, 2)}`,
                                footer: items => `${plural(rated[items[0].dataIndex].ratings.length, 'bedømt øl', 'bedømte øl')}`
                            }
                        }
                    }
                }
            });
        }

        var top = all.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da')).slice(0, 10);
        var max = Math.max(...top.flatMap(e => years.map(y => e.perYear.get(y) || 0)));
        $('#typeHeat').html(`<thead><tr><th>Type</th>${years.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">I alt</th></tr></thead><tbody>` +
            top.map(e => `<tr><th scope="row">${esc(e.name)}</th>` +
                years.map(y => heatCell(e.perYear.get(y) || 0, max, v => v || '·')).join('') +
                `<td class="num strong">${e.count}</td></tr>`).join('') + '</tbody>');
    }

    function heatCell(v, max, fmt, title) {
        var a = max ? v / max : 0;
        return `<td class="num heat-cell" style="--a:${(a * .85).toFixed(2)}"${title ? ` title="${title}"` : ''}>${fmt(v)}</td>`;
    }

    function buildCoverage() {
        var fields = [
            ['Røverne-rating', hasRating], ['Untappd', hasUntappd], ['Pris', hasPrice], ['ABV', hasAbv],
            ['Beskrivelse', b => !!b.description], ['Gæring', b => !!b.fermentation]
        ];
        $('#coverage').html(`<thead><tr><th>Felt</th>${years.map(y => `<th class="num">${y}</th>`).join('')}</tr></thead><tbody>` +
            fields.map(([name, has]) => `<tr><th scope="row">${name}</th>` + years.map(y => {
                var list = inYear(y), n = list.filter(has).length, share = list.length ? n / list.length : 0;
                return heatCell(share, 1, v => Math.round(v * 100) + ' %', `${n} af ${list.length} øl`);
            }).join('') + '</tr>').join('') + '</tbody>');
    }
});
