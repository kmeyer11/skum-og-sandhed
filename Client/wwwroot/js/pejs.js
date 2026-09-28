// Pejsen: en pixelart-pejs til storskærmen. Scenen tegnes i 192×108 pixels (16:9) og skaleres op af CSS.
// Ilden er den klassiske Doom-ild: varme spreder sig op gennem et gitter og køler lidt af for hver række.
(function () {
    var W = 192, H = 108;
    var canvas = document.getElementById('fire');
    var ctx = canvas.getContext('2d');
    var image = ctx.createImageData(W, H);
    var px = image.data;

    // Den faste scene: grundfarver pr. pixel plus hvor meget lys den får fra stuen og fra ilden.
    var R = new Uint8ClampedArray(W * H), G = new Uint8ClampedArray(W * H), B = new Uint8ClampedArray(W * H);
    var ambient = new Float32Array(W * H), firelight = new Float32Array(W * H);

    // Fast frø, så murstenene ser ens ud hver gang siden åbnes.
    var seed = 11;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

    function put(x, y, c) {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        var i = y * W + x;
        R[i] = c[0]; G[i] = c[1]; B[i] = c[2];
    }
    function rect(x, y, w, h, c) {
        for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) put(xx, yy, c);
    }
    function vary(c, amount) {
        var f = 1 + (rnd() - .5) * amount;
        return [c[0] * f, c[1] * f, c[2] * f];
    }

    // Scenens mål. Ildstedet er åbningen i pejsen, og ilden fylder præcis det felt.
    var BREAST = { x: 48, w: 96 }, MANTLE_Y = 30;
    var BOX = { x: 64, y: 46, w: 64, h: 44 };

    function paintScene() {
        // Træpanel på væggen.
        for (var y = 0; y < 96; y++) for (var x = 0; x < W; x++)
            put(x, y, x % 12 === 0 ? [34, 21, 14] : vary([58, 36, 24], .12));

        // Gulvbrædder.
        for (y = 96; y < H; y++) for (x = 0; x < W; x++) {
            var plank = (y - 96) % 4 === 3 || (x + ((y - 96) >> 2) * 29) % 41 === 0;
            put(x, y, plank ? [30, 19, 12] : vary([74, 46, 28], .1));
        }

        // Murstenene på skorstenen, forskudt en halv sten for hver række.
        var brickColors = [[122, 52, 36], [134, 60, 40], [108, 46, 32], [142, 72, 46], [116, 58, 42]];
        var bricks = {};
        for (y = 0; y < 96; y++) for (x = BREAST.x; x < BREAST.x + BREAST.w; x++) {
            var row = y >> 2, bx = x - BREAST.x + (row & 1) * 4, col = bx >> 3;
            if ((y & 3) === 3 || (bx & 7) === 7) { put(x, y, [66, 54, 46]); continue; }
            var key = row + ':' + col;
            bricks[key] = bricks[key] || brickColors[(rnd() * brickColors.length) | 0];
            put(x, y, vary(bricks[key], .08));
        }

        // Kaminhylden af egetræ, med skygge nedenunder.
        for (y = MANTLE_Y; y < MANTLE_Y + 6; y++) for (x = 42; x < 150; x++) {
            var c = y === MANTLE_Y ? [138, 90, 52] : y === MANTLE_Y + 5 ? [48, 29, 17] : vary([94, 58, 33], .15);
            put(x, y, rnd() < .06 ? [70, 42, 24] : c);
        }
        for (x = 44; x < 148; x++) { var s = (MANTLE_Y + 6) * W + x; R[s] *= .55; G[s] *= .55; B[s] *= .55; }

        // Stenindfatning om ildstedet: overligger og to sider.
        for (y = 40; y < 90; y++) for (x = 60; x < 132; x++) {
            var inOpening = x >= BOX.x && x < BOX.x + BOX.w && y >= BOX.y;
            if (inOpening) continue;
            var joint = (y < BOX.y && (x - 60) % 12 === 11) || (y >= BOX.y && (y - 46) % 7 === 6) || y === 45;
            put(x, y, joint ? [70, 64, 58] : vary([112, 102, 92], .08));
        }

        // Selve ildstedet: sodet loft, skrå sider og en bagvæg af mørke sten.
        for (y = BOX.y; y < BOX.y + BOX.h; y++) for (x = BOX.x; x < BOX.x + BOX.w; x++) {
            var lx = x - BOX.x, ly = y - BOX.y;
            if (ly < 4) put(x, y, [12, 8, 6]);
            else if (lx < 8 || lx >= BOX.w - 8) put(x, y, ((lx + ly) % 5 === 0) ? [20, 13, 10] : vary([34, 22, 16], .1));
            else {
                var brow = ly >> 2, bcol = (lx + (brow & 1) * 3) % 6;
                put(x, y, (ly & 3) === 3 || bcol === 5 ? [16, 10, 8] : vary([30, 19, 14], .12));
            }
        }
        rect(BOX.x + 6, BOX.y + BOX.h - 2, BOX.w - 12, 2, [24, 24, 26]); // ristens bund

        // Ildfast stenplade foran pejsen.
        for (y = 90; y < 96; y++) for (x = 52; x < 140; x++) {
            var hc = y === 90 ? [152, 140, 126] : y === 95 ? [58, 52, 46] : (x - 52) % 11 === 10 ? [74, 68, 60] : vary([112, 102, 92], .06);
            put(x, y, hc);
        }

        paintBottle(54, [72, 40, 18]);
        paintBottle(60, [30, 68, 36]);
        paintGlass(134);
    }

    function paintBottle(x, glass) {
        var top = MANTLE_Y - 14;
        put(x + 1, top, [206, 164, 64]); put(x + 2, top, [206, 164, 64]);         // kapsel
        rect(x + 1, top + 1, 2, 4, glass);                                           // hals
        rect(x, top + 5, 4, 9, glass);                                               // krop
        rect(x, top + 8, 4, 3, [222, 204, 164]);                                     // etiket
        var shine = [glass[0] * 1.8, glass[1] * 1.8, glass[2] * 1.8];
        rect(x + 1, top + 1, 1, 4, shine); rect(x, top + 5, 1, 3, shine); rect(x, top + 11, 1, 3, shine);
    }

    function paintGlass(x) {
        var top = MANTLE_Y - 10;
        rect(x, top, 6, 2, [242, 232, 212]);                                         // skum
        rect(x, top + 2, 6, 3, [224, 152, 40]);
        rect(x + 1, top + 5, 4, 2, [196, 122, 28]);
        put(x + 2, top + 7, [180, 170, 160]); put(x + 3, top + 7, [180, 170, 160]); // stilk
        put(x + 2, top + 8, [180, 170, 160]); put(x + 3, top + 8, [180, 170, 160]);
        rect(x + 1, top + 9, 4, 1, [180, 170, 160]);                                // fod
        put(x, top + 2, [250, 200, 110]);
    }

    // Røvernes mærke hænger over kaminhylden. Det tegnes ned i lav opløsning, så det bliver pixelart som resten.
    function paintBadge() {
        var img = new Image(200, 200);
        img.onload = function () {
            var size = 26, off = document.createElement('canvas');
            off.width = off.height = size;
            var octx = off.getContext('2d');
            octx.drawImage(img, 0, 0, size, size);
            var d = octx.getImageData(0, 0, size, size).data;
            var x0 = (W - size) >> 1, y0 = 2;
            for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
                var a = d[(y * size + x) * 4 + 3] / 255, i = (y0 + y) * W + x0 + x;
                if (a < .3) continue;
                R[i] = R[i] * (1 - a) + d[(y * size + x) * 4] * a;
                G[i] = G[i] * (1 - a) + d[(y * size + x) * 4 + 1] * a;
                B[i] = B[i] * (1 - a) + d[(y * size + x) * 4 + 2] * a;
            }
        };
        img.src = canvas.dataset.badge;
    }

    // Lys: en svag grundbelysning med mørke hjørner, plus skæret fra ilden som falder af med afstanden.
    function paintLight() {
        var fx = W / 2, fy = 76;
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
            var i = y * W + x;
            var nx = (x - W / 2) / (W / 2), ny = (y - H * .6) / H;
            ambient[i] = Math.max(.08, .3 * (1 - .75 * (nx * nx + ny * ny)));
            var dx = x - fx, dy = (y - fy) * 1.4;
            var l = 1.1 / (1 + (dx * dx + dy * dy) / 900);
            // Kaminhylden skygger for væggen ovenover.
            if (y < MANTLE_Y) l *= .45;
            // Inde i ildstedet er man helt tæt på flammerne.
            if (x >= BOX.x && x < BOX.x + BOX.w && y >= BOX.y) l *= 1.6;
            firelight[i] = l;
        }
    }

    // Brændestykker, tegnet som et lag oven på ilden. Maske 2 er gløder i barken.
    var logR = new Uint8ClampedArray(W * H), logG = new Uint8ClampedArray(W * H), logB = new Uint8ClampedArray(W * H);
    var logMask = new Uint8Array(W * H), emberPhase = new Float32Array(W * H);

    function paintLog(x0, y0, len, endLeft) {
        for (var y = 0; y < 5; y++) for (var x = 0; x < len; x++) {
            if ((y === 0 || y === 4) && (x === 0 || x === len - 1)) continue; // runde ender
            var i = (y0 + y) * W + x0 + x;
            var end = endLeft ? x < 3 : x >= len - 3;
            var c;
            if (end) c = (y === 2 && (x === 1 || x === len - 2)) ? [110, 70, 40] : [160, 118, 74];
            else if (y === 0) c = [96, 60, 34];
            else c = rnd() < .3 ? [42, 25, 15] : vary([68, 42, 25], .15);
            logR[i] = c[0]; logG[i] = c[1]; logB[i] = c[2];
            logMask[i] = !end && (y === 0 || y === 4 || rnd() < .12) ? 2 : 1;
            emberPhase[i] = rnd() * Math.PI * 2;
        }
    }

    paintScene();
    paintLight();
    paintBadge();
    paintLog(70, 79, 46, true);
    paintLog(78, 84, 46, false);

    // Doom-ildens farver, fra sort over rød og orange til hvid.
    var PALETTE = [
        [7, 7, 7], [31, 7, 7], [47, 15, 7], [71, 15, 7], [87, 23, 7], [103, 31, 7], [119, 31, 7], [143, 39, 7],
        [159, 47, 7], [175, 63, 7], [191, 71, 7], [199, 71, 7], [223, 79, 7], [223, 87, 7], [223, 87, 7], [215, 95, 7],
        [215, 95, 7], [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15], [207, 135, 23], [199, 135, 23],
        [199, 143, 23], [199, 151, 31], [191, 159, 31], [191, 159, 31], [191, 167, 39], [191, 167, 39], [191, 175, 47],
        [183, 175, 47], [183, 183, 47], [183, 183, 55], [207, 207, 111], [223, 223, 159], [239, 239, 199], [255, 255, 255]
    ];
    var MAX = PALETTE.length - 1;
    var heat = new Uint8Array(BOX.w * BOX.h);
    var wind = 0, glow = .7, sparks = [];

    // Varmekilden er hedest midt under brændet og dør ud mod siderne.
    function feed() {
        var base = (BOX.h - 1) * BOX.w;
        for (var x = 0; x < BOX.w; x++) {
            var d = (x - BOX.w / 2) / 19;
            var h = MAX * Math.exp(-d * d) * (.85 + Math.random() * .3);
            if (Math.random() < .15) h *= Math.random();
            heat[base + x] = Math.min(MAX, h);
        }
    }

    function spread() {
        if (Math.random() < .02) wind = Math.random() < .5 ? -1 : Math.random() < .5 ? 1 : 0;
        for (var x = 0; x < BOX.w; x++) for (var y = 1; y < BOX.h; y++) {
            var src = y * BOX.w + x, h = heat[src];
            var dx = x + ((Math.random() * 3) | 0) - 1 + (Math.random() < .12 ? wind : 0);
            if (dx < 0 || dx >= BOX.w) continue;
            var cool = (Math.random() * 2.6) | 0;
            heat[(y - 1) * BOX.w + dx] = h > cool ? h - cool : 0;
        }
    }

    function moveSparks() {
        if (sparks.length < 14 && Math.random() < .12)
            sparks.push({ x: BOX.x + 20 + Math.random() * 24, y: 78, vy: .4 + Math.random() * .8, life: 20 + Math.random() * 40 });
        sparks = sparks.filter(function (s) {
            s.y -= s.vy; s.x += (Math.random() - .5) * .8; s.life--;
            return s.life > 0 && s.y > BOX.y;
        });
    }

    function render(t) {
        // Ildens samlede styrke styrer, hvor meget skæret blafrer på væggene.
        var sum = 0, rowStart = (BOX.h - 16) * BOX.w;
        for (var k = rowStart; k < rowStart + BOX.w * 8; k++) sum += heat[k];
        glow = glow * .8 + (sum / (BOX.w * 8 * MAX)) * 2.2 * .2;

        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
            var i = y * W + x, o = i * 4;
            var lit = firelight[i] * glow, amb = ambient[i];
            var r = R[i] * (amb + lit * 1.2), g = G[i] * (amb + lit * .95), b = B[i] * (amb + lit * .65);

            var fxl = x - BOX.x, fyl = y - BOX.y;
            if (fxl >= 0 && fxl < BOX.w && fyl >= 0 && fyl < BOX.h) {
                var h = heat[fyl * BOX.w + fxl];
                if (h > 1) {
                    var a = h > 6 ? 1 : h / 6, p = PALETTE[h];
                    r += (p[0] - r) * a; g += (p[1] - g) * a; b += (p[2] - b) * a;
                }
            }

            if (logMask[i]) {
                var ll = .35 + lit * 1.4;
                r = logR[i] * ll; g = logG[i] * ll * .85; b = logB[i] * ll * .7;
                if (logMask[i] === 2) {
                    var e = (.5 + .5 * Math.sin(t / 400 + emberPhase[i])) * glow;
                    r += 230 * e; g += 70 * e; b += 10 * e;
                }
            }

            px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
        }

        sparks.forEach(function (s) {
            var o = ((s.y | 0) * W + (s.x | 0)) * 4, f = Math.min(1, s.life / 20);
            px[o] = 255; px[o + 1] = 150 + 90 * f; px[o + 2] = 60 * f;
        });

        ctx.putImageData(image, 0, 0);
    }

    // Retro-tempo: 24 billeder i sekundet ligner en ægte flamme og skåner storskærmens computer.
    var last = 0, STEP = 1000 / 24, painted = false;
    function frame(t) {
        requestAnimationFrame(frame);
        if (t - last < STEP) return;
        last = t;
        feed(); spread(); moveSparks(); render(t);
        if (!painted) {
            // Stuen uden for lærredet får samme farve som scenens kant, så der ikke ses en ramme.
            painted = true;
            var o = (H >> 1) * W * 4;
            canvas.parentNode.style.background = 'rgb(' + px[o] + ',' + px[o + 1] + ',' + px[o + 2] + ')';
        }
    }
    requestAnimationFrame(frame);

    // Storskærm: fuld skærm, skjul knapper og markør når ingen rører musen, og hold skærmen vågen.
    var room = document.getElementById('hearth');
    var fullscreenBtn = document.getElementById('fullscreenBtn');
    function toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (room.requestFullscreen) room.requestFullscreen();
    }
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', function () {
        fullscreenBtn.textContent = document.fullscreenElement ? 'Afslut fuld skærm' : 'Fuld skærm';
    });

    var idleTimer;
    function wake() {
        room.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(function () { room.classList.add('idle'); }, 3000);
    }
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, wake, { passive: true }); });
    wake();

    function keepAwake() {
        if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () { });
    }
    keepAwake();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') keepAwake(); });

    // Knitren: brun støj som ildens brusen og korte, filtrerede smæld ovenpå. Lyden laves i browseren, så der er ingen lydfil.
    var soundBtn = document.getElementById('soundBtn');
    var audio = null;

    function startSound() {
        var ac = new (window.AudioContext || window.webkitAudioContext)();
        var master = ac.createGain();
        master.gain.value = .6;
        master.connect(ac.destination);

        var len = ac.sampleRate * 4, roarBuf = ac.createBuffer(1, len, ac.sampleRate), rd = roarBuf.getChannelData(0), prev = 0;
        for (var i = 0; i < len; i++) { prev = (prev + .02 * (Math.random() * 2 - 1)) / 1.02; rd[i] = prev * 3.5; }
        var roar = ac.createBufferSource(), lowpass = ac.createBiquadFilter(), roarGain = ac.createGain();
        roar.buffer = roarBuf; roar.loop = true;
        lowpass.type = 'lowpass'; lowpass.frequency.value = 500;
        roarGain.gain.value = .35;
        roar.connect(lowpass).connect(roarGain).connect(master);
        roar.start();

        var noise = ac.createBuffer(1, ac.sampleRate * .2, ac.sampleRate), nd = noise.getChannelData(0);
        for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

        function pop() {
            var src = ac.createBufferSource(), band = ac.createBiquadFilter(), env = ac.createGain();
            var now = ac.currentTime, dur = .004 + Math.random() * .03;
            src.buffer = noise;
            band.type = 'bandpass'; band.frequency.value = 900 + Math.random() * 3500; band.Q.value = 1 + Math.random() * 5;
            env.gain.setValueAtTime(.2 + Math.random() * .8, now);
            env.gain.exponentialRampToValueAtTime(.001, now + dur);
            src.connect(band).connect(env).connect(master);
            src.start(now, Math.random() * .15, dur + .01);
        }
        (function crackle() {
            if (ac.state === 'running') pop();
            // Smældene kommer i små salver med pauser imellem.
            setTimeout(crackle, Math.random() < .2 ? 15 + Math.random() * 60 : 120 + Math.random() * 700);
        })();
        return ac;
    }

    function toggleSound() {
        var on = soundBtn.getAttribute('aria-pressed') !== 'true';
        if (on && !audio) audio = startSound();
        else if (audio) on ? audio.resume() : audio.suspend();
        soundBtn.setAttribute('aria-pressed', on);
        soundBtn.textContent = on ? 'Sluk knitren' : 'Tænd knitren';
    }
    soundBtn.addEventListener('click', toggleSound);

    // F for fuld skærm og L for lyd, så man kan styre storskærmen fra et trådløst tastatur.
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        if (e.key === 'l' || e.key === 'L') toggleSound();
    });
})();
