/* ============================================
   ENVIRONMENT
   Read live, never cached at boot. Every layout decision that depends on
   viewport size or input type re-runs on resize, so rotating a tablet or
   dragging a desktop window across the breakpoint can't strand the page in
   a half-applied mode (the old code sampled these once and never again).

   NARROW_Q matches the CSS breakpoint where .tiles-track becomes a vertical
   block exactly. Media-query rem resolves against the *initial* font size
   (16px), not html{font-size}, so 56.25rem here == 900px there.
   ============================================ */
const NARROW_Q = window.matchMedia('(max-width: 56.25rem)');
const COARSE_Q = window.matchMedia('(hover: none), (pointer: coarse)');
const FINE_Q = window.matchMedia('(hover: hover) and (pointer: fine)');
const REDUCED_Q = window.matchMedia('(prefers-reduced-motion: reduce)');

const env = {
    get narrow() { return NARROW_Q.matches; },
    get coarse() { return COARSE_Q.matches; },
    get fine() { return FINE_Q.matches; },
    get reduced() { return REDUCED_Q.matches; },
    /* the pinned horizontal track only makes sense on a wide pointer device */
    get canPin() { return !this.narrow && !this.coarse && !this.reduced; },
};

const SECTION_IDS = ['hero', 'work', 'research', 'hackathons', 'credentials', 'profile', 'contact'];

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

/* ============================================
   HIDDEN CONSOLE MESSAGE
   For curious people who open DevTools. On-brand callout for security folk.
   ============================================ */
console.log(
    '%c HOLO911 ',
    'background:#ccff00;color:#000;font-weight:700;padding:6px 14px;font-family:monospace;font-size:16px;border-radius:2px;letter-spacing:2px;'
);
console.log(
    '%cwelcome operator.\nlooking for vulnerabilities? find any, message me.\n\nszymond200555@gmail.com\nhttps://github.com/holo911',
    'color:#ccff00;font-family:monospace;font-size:12px;line-height:1.7;'
);

/* ============================================
   SMALL SHARED HELPERS
   ============================================ */
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function debounce(fn, wait) {
    let id = null;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), wait);
    };
}

/* rAF-throttled scroll subscribers - one shared listener for the whole page.
   frameToken increments once per flush so per-frame work (section detection)
   can be computed once and reused by every subscriber. */
const scrollSubs = [];
let frameToken = 0;
function onScroll(fn) { scrollSubs.push(fn); }
(function initScrollBus() {
    let ticking = false;
    function flush() {
        ticking = false;
        frameToken++;
        for (const fn of scrollSubs) fn();
    }
    window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(flush); }
    }, { passive: true });
})();

/* ============================================
   LOADER
   ============================================ */
const loader = document.getElementById('loader');
let loaderDone = false;

function completeLoader() {
    if (loaderDone) return;
    loaderDone = true;
    document.body.classList.remove('loading');
    loader.classList.add('done');

    /* Honour deep links. The old code always forced scrollTo(0,0), which
       silently broke every shared /#research style URL. */
    const hash = window.location.hash;
    const target = hash && hash.length > 1 ? document.querySelector(hash) : null;

    initHeroEntrance();
    setTimeout(() => {
        if (window.gsap && window.ScrollTrigger) {
            initGsapFeatures();
        } else {
            /* CDN blocked / offline: no pin possible, stack tiles vertically */
            ensureTilesStacked();
        }
        runHeroScramble();
        startHeroTypewriter();
        initRevealOnScroll();
        initSplitReveals();
        initCounters();
        initCharts();

        if (target) {
            target.scrollIntoView({ behavior: 'auto' });
        }
    }, 60);

    if (!target) window.scrollTo(0, 0);
}

window.addEventListener('load', () => {
    requestAnimationFrame(() => loader.classList.add('starting'));
    setTimeout(completeLoader, 1700);
});

setTimeout(() => {
    if (!loaderDone) {
        loader.classList.add('starting');
        setTimeout(completeLoader, 1700);
    }
}, 200);

function initHeroEntrance() {
    if (!window.gsap || env.reduced) return;
    gsap.from(['.hero-name', '.hero-terminal', '.hero-sub', '.scroll-cue'], {
        opacity: 0,
        y: 16,
        duration: 0.9,
        stagger: 0.08,
        delay: 0.2,
        ease: 'power2.out',
    });
}

/* ============================================
   HERO NAME - SCRAMBLE / DECODE
   ============================================ */
const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01';

function scrambleTo(el, finalText, duration) {
    if (env.reduced) {
        el.textContent = finalText;
        return;
    }
    if (el._scrambling) return; /* let the current run finish */
    el._scrambling = true;
    const start = performance.now();
    function frame(now) {
        const t = (now - start) / duration;
        if (t >= 1) {
            el.textContent = finalText;
            el._scrambling = false;
            return;
        }
        let out = '';
        for (let i = 0; i < finalText.length; i++) {
            /* chars lock in left-to-right across the animation */
            const lockAt = 0.2 + (i / finalText.length) * 0.75;
            out += t >= lockAt
                ? finalText[i]
                : SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
        }
        el.textContent = out;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function runHeroScramble() {
    document.querySelectorAll('.scramble-text').forEach((el, idx) => {
        const finalText = el.dataset.final || el.textContent;
        setTimeout(() => scrambleTo(el, finalText, 950), idx * 200);
    });
}

function initHeroScrambleTriggers() {
    const parts = document.querySelectorAll('.scramble-text');
    const name = document.querySelector('.hero-name');
    if (!parts.length || !name || env.reduced) return;

    /* phones/tablets: tapping the name replays the full decode */
    name.addEventListener('click', () => { if (env.coarse) runHeroScramble(); });

    /* desktop: only the hovered word scrambles, slightly snappier than load */
    parts.forEach((el) => {
        el.addEventListener('mouseenter', () => {
            if (env.coarse) return;
            scrambleTo(el, el.dataset.final || el.textContent, 700);
        });
    });
}

/* ============================================
   HERO TYPEWRITER - cycles through phrases
   ============================================ */
function startHeroTypewriter() {
    const target = document.getElementById('hero-typed');
    if (!target) return;

    const phrases = [
        './holo911 sec / ai / robots',
        'yolov8n @ 110.3 fps on the npu',
        'nmap -sV holo911.github.io',
        'ros2 run drone follow_target',
        'ctf{curiosity_never_stops}',
    ];

    if (env.reduced) {
        target.textContent = phrases[0];
        return;
    }

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function tick() {
        const phrase = phrases[phraseIdx];
        if (!deleting) {
            charIdx++;
            target.textContent = phrase.slice(0, charIdx);
            if (charIdx === phrase.length) {
                deleting = true;
                setTimeout(tick, 3400); /* hold the finished phrase */
                return;
            }
            setTimeout(tick, 28 + Math.random() * 25);
        } else {
            charIdx--;
            target.textContent = phrase.slice(0, charIdx);
            if (charIdx === 0) {
                deleting = false;
                phraseIdx = (phraseIdx + 1) % phrases.length;
                setTimeout(tick, 500);
                return;
            }
            setTimeout(tick, 12);
        }
    }
    setTimeout(tick, 900);
}

/* ============================================
   GSAP + LENIS
   ============================================ */
let lenis = null;

function initGsapFeatures() {
    gsap.registerPlugin(ScrollTrigger);
    initSmoothScroll();
    initTilesMode();
    watchViewportMode();
}

function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;
    /* Deliberately not width-dependent: momentum wheel scrolling is about the
       input device, not the window size, so resizing never has to touch it. */
    if (env.reduced || env.coarse) return;

    lenis = new Lenis({
        lerp: 0.09,       /* lower = longer glide after the wheel stops */
        smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/* ============================================
   TILES - pinned horizontal scroll (wide pointer devices only)
   Vertical scroll advances through tiles one-by-one, snap locked.
   Any environment that can't run the pin gets the vertical stack fallback so
   no tile is ever trapped off-screen.
   ============================================ */
let tilesTween = null;

function ensureTilesStacked() {
    document.body.classList.add('tiles-stacked');
}

function teardownTilesPin() {
    if (tilesTween) {
        if (tilesTween.scrollTrigger) tilesTween.scrollTrigger.kill(true);
        tilesTween.kill();
        tilesTween = null;
    }
    const track = document.getElementById('tiles-track');
    if (track) gsap.set(track, { clearProps: 'transform,x' });
    document.querySelectorAll('.tile-media').forEach((m) => m.style.removeProperty('--par'));
}

function buildTilesPin() {
    const section = document.getElementById('tiles-shell');
    const track = document.getElementById('tiles-track');
    const tiles = [...document.querySelectorAll('.tile')];
    if (!section || !track || tiles.length === 0) return;

    /* Fallback guard for engines without overflow:clip - never let the shell
       hold a scroll offset, or it fights the pin transform. */
    section.addEventListener('scroll', () => {
        if (section.scrollLeft) section.scrollLeft = 0;
        if (section.scrollTop) section.scrollTop = 0;
    });

    /* Keyboard access to the horizontal track: tabbing into a tile that is
       off-screen advances the pin until that tile is actually visible.
       Skipped when the tile is already on screen, so the focus restore after
       closing a modal doesn't yank the page around. */
    section.addEventListener('focusin', (e) => {
        if (!tilesTween || !tilesTween.scrollTrigger) return;
        const tile = e.target.closest('.tile');
        if (!tile) return;
        const rect = tile.getBoundingClientRect();
        if (rect.left > -20 && rect.right < window.innerWidth + 20) return;
        const idx = tiles.indexOf(tile);
        if (idx < 0) return;
        const st = tilesTween.scrollTrigger;
        const to = st.start + (idx / (tiles.length - 1)) * (st.end - st.start);
        if (lenis) lenis.scrollTo(to, { duration: 0.6 });
        else window.scrollTo({ top: to, behavior: env.reduced ? 'auto' : 'smooth' });
    });

    /* Tiles are sized in vw. With scrollbar-gutter:stable, 100vw resolves to
       the *content* width, not window.innerWidth - measuring against innerWidth
       left the final tile short by the scrollbar width. */
    const viewport = () => section.clientWidth;
    const getDistance = () => Math.max(0, track.scrollWidth - viewport());
    /* 0.55x ratio: roughly half as many wheel ticks to cross all 7 projects. */
    const getPinLength = () => getDistance() * 0.55;

    tilesTween = gsap.to(track, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: true,
            snap: {
                snapTo: 1 / (tiles.length - 1),
                duration: { min: 0.15, max: 0.3 },
                ease: 'power2.out',
                delay: 0.05,
            },
            start: 'top top',
            end: () => `+=${getPinLength()}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: updateTileParallax,
        },
    });

    setTimeout(() => ScrollTrigger.refresh(), 400);
}

/* Media drifts against its tile as the tile crosses the viewport. Cheap:
   one custom property per tile, the transform lives in CSS. The tile list is
   cached - this runs on every scrub frame, and re-querying the DOM 60x a
   second for a list that never changes is pure waste. */
let parallaxTiles = null;

function updateTileParallax() {
    const vw = window.innerWidth;
    if (!parallaxTiles) parallaxTiles = [...document.querySelectorAll('.tile')];
    parallaxTiles.forEach((tile) => {
        const rect = tile.getBoundingClientRect();
        if (rect.right < -100 || rect.left > vw + 100) return;
        const media = tile.querySelector('.tile-media');
        if (!media) return;
        const centre = (rect.left + rect.width / 2) / vw; /* 0.5 == dead centre */
        media.style.setProperty('--par', (centre - 0.5) * -44);
    });
}

function initTilesMode() {
    if (!window.gsap || !window.ScrollTrigger) {
        ensureTilesStacked();
        return;
    }
    if (env.canPin) {
        document.body.classList.remove('tiles-stacked');
        buildTilesPin();
    } else {
        teardownTilesPin();
        ensureTilesStacked();
    }
}

/* Re-evaluate the layout mode whenever the viewport crosses a breakpoint or
   the pointer type changes. Without this, a resize leaves an orphaned pin
   spacer behind and the page overflows horizontally. */
function watchViewportMode() {
    let mode = env.canPin;

    const reevaluate = () => {
        const next = env.canPin;
        if (next === mode) {
            ScrollTrigger.refresh();
            return;
        }
        mode = next;
        initTilesMode();
        ScrollTrigger.refresh();
    };

    const debounced = debounce(reevaluate, 160);
    window.addEventListener('resize', debounced);
    window.addEventListener('orientationchange', debounced);
    [NARROW_Q, COARSE_Q, REDUCED_Q].forEach((q) => {
        if (q.addEventListener) q.addEventListener('change', debounced);
    });
}

/* ============================================
   REVEAL ON SCROLL (IntersectionObserver - lightweight)
   ============================================ */
function initRevealOnScroll() {
    const els = document.querySelectorAll(
        '.hk-card, .profile-row, .contact-card, .cred-card, .stat, .research-head, ' +
        '.chart, .research-artifacts, .expo-shot'
    );
    if (els.length === 0) return;

    /* Mark elements + body together so the hidden state only kicks in when
       JS is alive. If JS fails, content stays visible (no broken-looking page). */
    els.forEach((el) => el.classList.add('reveal-up'));
    document.body.classList.add('reveal-ready');

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                o.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach((el) => obs.observe(el));
}

/* ============================================
   SPLIT WORD REVEAL
   Headings resolve word by word out of a clipped mask. Walks the DOM instead
   of touching innerHTML so nested markup (<br>, .accent-em, <em>) survives.
   ============================================ */
function splitWords(root) {
    if (root.dataset.split === 'done') return;

    (function walk(node) {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                if (!child.textContent.trim()) return;
                const frag = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                        return;
                    }
                    const outer = document.createElement('span');
                    outer.className = 'rv-w';
                    const inner = document.createElement('span');
                    inner.className = 'rv-i';
                    inner.textContent = part;
                    outer.appendChild(inner);
                    frag.appendChild(outer);
                });
                node.replaceChild(frag, child);
            } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
                walk(child);
            }
        });
    })(root);

    root.querySelectorAll('.rv-i').forEach((el, i) => {
        el.style.transitionDelay = (i * 0.055).toFixed(3) + 's';
    });
    root.dataset.split = 'done';
}

function initSplitReveals() {
    const heads = document.querySelectorAll('.split-reveal, .contact-cta, .research-title, .expo-title');
    if (!heads.length) return;

    if (env.reduced) {
        heads.forEach((h) => h.classList.add('rv-on'));
        return;
    }

    heads.forEach(splitWords);
    document.body.classList.add('split-ready');

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('rv-on');
                o.unobserve(entry.target);
            }
        });
    }, { threshold: 0.25, rootMargin: '0px 0px -10% 0px' });

    heads.forEach((h) => obs.observe(h));
}

/* ============================================
   COUNT-UP STATS
   ============================================ */
function initCounters() {
    const nodes = document.querySelectorAll('[data-count-to]');
    if (!nodes.length) return;

    if (env.reduced) return; /* markup already holds the final value */

    const run = (el) => {
        const to = parseFloat(el.dataset.countTo);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = 1500;
        const start = performance.now();
        function frame(now) {
            const t = clamp((now - start) / duration, 0, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = (to * eased).toFixed(decimals);
            if (t < 1) requestAnimationFrame(frame);
        }
        el.textContent = (0).toFixed(decimals);
        requestAnimationFrame(frame);
    };

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                run(entry.target);
                o.unobserve(entry.target);
            }
        });
    }, { threshold: 0.6 });

    nodes.forEach((n) => obs.observe(n));
}

/* ============================================
   BENCHMARK CHARTS
   Bars grow from zero to their --pct width when the chart scrolls in.
   Widths live in the markup so the chart is correct with JS disabled.
   ============================================ */
function initCharts() {
    const charts = document.querySelectorAll('[data-chart]');
    if (!charts.length) return;

    if (env.reduced) {
        charts.forEach((c) => c.classList.add('chart-in'));
        return;
    }

    document.body.classList.add('charts-ready');
    charts.forEach((chart) => {
        chart.querySelectorAll('.chart-bar > i').forEach((bar, i) => {
            bar.style.transitionDelay = (0.08 + i * 0.075).toFixed(3) + 's';
        });
    });

    const obs = new IntersectionObserver((entries, o) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('chart-in');
                o.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    charts.forEach((c) => obs.observe(c));
}

/* ============================================
   TILE VIDEO AUTOPLAY (on intersection)
   ============================================ */
function initTileVideoAutoplay() {
    const videos = document.querySelectorAll('.tile-media-video');
    if (videos.length === 0) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.3 });

    videos.forEach((v) => obs.observe(v));
}

/* ============================================
   HERO BACKGROUND - live detection field
   A synthetic camera feed: drifting targets get acquired and dropped by an
   imaginary detector, each framed with corner brackets and a confidence
   label, while a sensor band sweeps down the frame. The pointer is treated
   as one more target and tracked with lag.

   This is the same thing the drone does, rendered as wallpaper.

   Perf guards: DPR capped at 1.5, fewer targets on small screens, animation
   paused whenever the hero is off-screen, one static frame for reduced motion.
   ============================================ */
const COCO_LABELS = [
    'person', 'drone', 'laptop', 'monitor', 'keyboard',
    'backpack', 'bottle', 'chair', 'cell phone', 'book',
];

function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    const hero = document.getElementById('hero');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    let running = false;
    let rafId = null;

    let targets = [];
    let energy = 0;
    let lastScrollY = window.scrollY;
    let pointerX = 0.5, pointerY = 0.45;
    let lockX = 0.5, lockY = 0.45;
    let pointerSeen = false;

    function buildTargets() {
        const count = env.narrow ? 5 : 9;
        targets = Array.from({ length: count }, (_, i) => ({
            cx: 0.12 + Math.random() * 0.76,
            cy: 0.1 + Math.random() * 0.8,
            rx: 0.03 + Math.random() * 0.1,
            ry: 0.02 + Math.random() * 0.07,
            sx: 0.06 + Math.random() * 0.12,
            sy: 0.05 + Math.random() * 0.11,
            px: Math.random() * 6.28,
            py: Math.random() * 6.28,
            bw: 0.06 + Math.random() * 0.09,   /* box size, fraction of width */
            bh: 0.08 + Math.random() * 0.13,
            label: COCO_LABELS[i % COCO_LABELS.length],
            conf: 0.62 + Math.random() * 0.36,
            /* each target fades in and out on its own slow cycle */
            lifeSpeed: 0.08 + Math.random() * 0.13,
            lifePhase: Math.random() * 6.28,
        }));
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* One corner-bracket frame: four L shapes, never a closed rectangle. */
    function bracket(x, y, bw, bh, arm, alpha, colour, lineWidth) {
        ctx.strokeStyle = colour.replace('$A', alpha.toFixed(3));
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        /* top-left */
        ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y);
        /* top-right */
        ctx.moveTo(x + bw - arm, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + arm);
        /* bottom-right */
        ctx.moveTo(x + bw, y + bh - arm); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw - arm, y + bh);
        /* bottom-left */
        ctx.moveTo(x + arm, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh - arm);
        ctx.stroke();
    }

    const LIME = 'rgba(204,255,0,$A)';
    const GREY = 'rgba(170,176,188,$A)';

    function draw(now) {
        const t = now * 0.001;

        /* scroll feeds the field: position shifts phase, velocity adds energy */
        const sy = window.scrollY;
        const dy = sy - lastScrollY;
        lastScrollY = sy;
        energy = Math.min((energy + Math.min(Math.abs(dy), 60) * 0.011) * 0.94, 1.4);
        const drift = sy * 0.0012;

        lockX = lerp(lockX, pointerX, 0.055);
        lockY = lerp(lockY, pointerY, 0.055);

        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = 'square';
        ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textBaseline = 'alphabetic';

        /* sensor band sweeping top to bottom */
        const scanY = ((t * 0.055 + drift) % 1) * h;
        const grad = ctx.createLinearGradient(0, scanY - h * 0.09, 0, scanY + h * 0.02);
        grad.addColorStop(0, 'rgba(204,255,0,0)');
        grad.addColorStop(1, 'rgba(204,255,0,0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - h * 0.09, w, h * 0.11);
        ctx.strokeStyle = 'rgba(204,255,0,0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();

        /* drifting detections */
        for (const d of targets) {
            const life = Math.sin(t * d.lifeSpeed + d.lifePhase);
            if (life < -0.15) continue;                      /* lock dropped */
            const fade = clamp((life + 0.15) / 0.5, 0, 1);   /* acquire / lose */

            const x = (d.cx + Math.sin(t * d.sx + d.px + drift) * d.rx) * w;
            const y = (d.cy + Math.cos(t * d.sy + d.py) * d.ry) * h;
            const bw = d.bw * w * (1 + energy * 0.06);
            const bh = d.bh * h;
            const bx = x - bw / 2;
            const by = y - bh / 2;

            /* the sweep brightens whatever it is passing over */
            const scanBoost = Math.max(0, 1 - Math.abs(y - scanY) / (h * 0.16));
            const alpha = (0.10 + scanBoost * 0.20) * fade;
            const arm = Math.min(bw, bh) * 0.24;

            bracket(bx, by, bw, bh, arm, alpha, GREY, 1);

            const conf = d.conf + Math.sin(t * 1.7 + d.px) * 0.02;
            ctx.fillStyle = LIME.replace('$A', (alpha * 1.5).toFixed(3));
            ctx.fillText(`${d.label} ${conf.toFixed(2)}`, bx, by - 6);
        }

        /* the pointer is just another target - tracked, never quite caught */
        if (pointerSeen && !env.coarse) {
            const bw = w * 0.075;
            const bh = h * 0.115;
            const bx = lockX * w - bw / 2;
            const by = lockY * h - bh / 2;
            const pulse = 0.18 + Math.sin(t * 2.4) * 0.04;
            bracket(bx, by, bw, bh, Math.min(bw, bh) * 0.26, pulse, LIME, 1.2);
            ctx.fillStyle = LIME.replace('$A', '0.34');
            ctx.fillText('operator 0.99', bx, by - 6);
        }
    }

    function loop(now) {
        if (!running) return;
        draw(now);
        rafId = requestAnimationFrame(loop);
    }

    buildTargets();
    resize();

    const onResize = debounce(() => {
        resize();
        buildTargets();
        if (!running) draw(performance.now());
    }, 150);
    window.addEventListener('resize', onResize);

    if (env.reduced) {
        draw(0); /* one static frame, no animation */
        return;
    }

    window.addEventListener('pointermove', (e) => {
        if (env.coarse) return;
        pointerSeen = true;
        pointerX = e.clientX / window.innerWidth;
        pointerY = e.clientY / window.innerHeight;
    }, { passive: true });

    /* only burn frames while the hero is actually on screen */
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                if (!running) {
                    running = true;
                    lastScrollY = window.scrollY; /* don't count off-screen travel as energy */
                    rafId = requestAnimationFrame(loop);
                }
            } else {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
            }
        });
    }, { threshold: 0.02 });
    obs.observe(hero);
}

/* ============================================
   CURSOR RETICLE
   An autofocus box rather than a trailing blob: it sits on the pointer with
   zero lag while free, and *locks* onto whatever is hoverable, animating to
   that element's box. Only ever enabled on fine-pointer devices, and only
   after the element exists - so `cursor:none` can never strand a visitor
   with no cursor if this script fails to run.
   ============================================ */
function initReticle() {
    const el = document.getElementById('reticle');
    if (!el || !env.fine || env.coarse || env.reduced) return;

    const label = document.getElementById('reticle-label');
    const dot = document.getElementById('cursor-dot');

    /* Only things that can actually be activated. Cards and decorative pills
       used to be in here, which was misleading (a lock reads as "clickable")
       and, worse, boxing a whole card hid the pointer exactly when you needed
       to aim at the button inside it. */
    const LOCK_SELECTOR = 'a[href], button';
    let locked = null;

    function place(x, y, w, h, instant) {
        el.classList.toggle('reticle-snap', !instant);
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        el.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
    }

    function free(x, y) {
        if (locked) {
            locked = null;
            el.classList.remove('reticle-locked');
            label.textContent = '';
        }
        place(x, y, 30, 30, true);
    }

    function lock(node) {
        if (locked === node) return;
        locked = node;
        el.classList.add('reticle-locked');
        label.textContent = node.dataset.reticle
            || (node.hasAttribute('data-lightbox') ? 'zoom'
            : node.classList.contains('tile-open') ? 'open case'
            : node.tagName === 'A' ? (node.target === '_blank' ? 'external' : 'link')
            : 'select');
    }

    function follow(node) {
        /* A locked node can be torn out from under us - modal content is
           replaced wholesale on close. A detached node reports a zero rect,
           which would collapse the reticle into the top-left corner. */
        if (!node.isConnected) { locked = null; el.classList.remove('reticle-locked'); return; }
        const r = node.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const pad = 8;
        place(r.left + r.width / 2, r.top + r.height / 2, r.width + pad * 2, r.height + pad * 2, false);
    }

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        /* cursor:none only once the reticle is actually on screen - otherwise a
           visitor who hasn't touched the mouse yet has no pointer at all */
        document.body.classList.add('has-reticle');
        el.classList.add('reticle-on');

        /* The precision dot is pinned to the real pointer on every move,
           regardless of what the brackets are doing. */
        dot.classList.add('cursor-on');
        dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

        const hit = e.target.closest ? e.target.closest(LOCK_SELECTOR) : null;
        const lockable = hit
            /* never box a container that holds its own targets - the brackets
               would frame the wrapper while you are trying to hit the child */
            && !hit.querySelector(LOCK_SELECTOR)
            /* nor anything near full-width, which reads as a broken overlay */
            && hit.getBoundingClientRect().width < window.innerWidth * 0.7;

        if (lockable) {
            lock(hit);
            follow(hit);
        } else {
            free(e.clientX, e.clientY);
        }
        dot.classList.toggle('cursor-aim', !!locked);
    }, { passive: true });

    /* keep the box glued to a locked element while the page moves under it */
    onScroll(() => { if (locked) follow(locked); });

    const hideCursor = () => {
        el.classList.remove('reticle-on');
        dot.classList.remove('cursor-on');
    };

    window.addEventListener('pointerdown', () => el.classList.add('reticle-press'));
    window.addEventListener('pointerup', () => el.classList.remove('reticle-press'));
    document.addEventListener('mouseleave', hideCursor);
    window.addEventListener('blur', hideCursor);
}

/* ============================================
   MAGNETIC ELEMENTS
   Buttons lean toward the pointer as it approaches, then spring back.
   ============================================ */
function initMagnetic() {
    if (!env.fine || env.coarse || env.reduced) return;
    const pull = 0.28;
    const maxShift = 9;

    document.querySelectorAll('[data-magnetic]').forEach((node) => {
        node.addEventListener('pointermove', (e) => {
            const r = node.getBoundingClientRect();
            const dx = clamp((e.clientX - (r.left + r.width / 2)) * pull, -maxShift, maxShift);
            const dy = clamp((e.clientY - (r.top + r.height / 2)) * pull, -maxShift, maxShift);
            node.style.setProperty('--mag-x', dx.toFixed(2) + 'px');
            node.style.setProperty('--mag-y', dy.toFixed(2) + 'px');
        });
        node.addEventListener('pointerleave', () => {
            node.style.setProperty('--mag-x', '0px');
            node.style.setProperty('--mag-y', '0px');
        });
    });
}

/* ============================================
   CARD SPOTLIGHT
   A soft lime wash tracks the pointer across card surfaces. Pure CSS paint -
   JS only writes two custom properties.
   ============================================ */
function initSpotlight() {
    if (!env.fine || env.coarse) return;
    document.querySelectorAll('[data-spotlight]').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--sx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
            card.style.setProperty('--sy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
            card.style.setProperty('--slit', '1');
        });
        card.addEventListener('pointerleave', () => card.style.setProperty('--slit', '0'));
    });
}

/* ============================================
   SCROLL RAIL
   Thin progress line down the left edge with a live percentage and the name
   of the section you are standing in.
   ============================================ */
function initRail() {
    const rail = document.getElementById('rail');
    const fill = document.getElementById('rail-fill');
    const pct = document.getElementById('rail-pct');
    const name = document.getElementById('rail-section');
    if (!rail || !fill) return;

    let lastLabel = '';

    function update() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
        fill.style.transform = `scaleY(${p.toFixed(4)})`;
        pct.textContent = String(Math.round(p * 100)).padStart(2, '0');
        rail.classList.toggle('rail-visible', window.scrollY > 140);

        const label = currentSection();
        if (label !== lastLabel) {
            lastLabel = label;
            name.textContent = label === 'hero' ? 'index' : label;
        }
    }

    onScroll(update);
    update();
}

/* Last section whose top has crossed the viewport centre. Section IDs mark
   small intro headings rather than whole content blocks, so each one is
   treated as "this section's territory starts here".

   Both the rail and the nav ask for this on every scroll frame; the result is
   memoised per frame so seven getBoundingClientRect() reads don't happen twice
   in a row. */
let sectionCacheFrame = -1;
let sectionCacheValue = SECTION_IDS[0];

function currentSection() {
    if (sectionCacheFrame === frameToken) return sectionCacheValue;
    const centre = window.innerHeight / 2;
    let active = SECTION_IDS[0];
    for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= centre) active = id;
    }
    sectionCacheFrame = frameToken;
    sectionCacheValue = active;
    return active;
}

/* ============================================
   NAVIGATION
   Anchor smooth-scrolling, active-pill tracking, and the masthead auto-hide
   (bar tucks away scrolling down, returns scrolling up; the hamburger stays
   fixed and always reachable).
   ============================================ */
function initNavTracking() {
    const mast = document.getElementById('mast');
    const navLinks = document.querySelectorAll('.mast-nav a[href^="#"]');
    let lockedActive = null;
    let lockTimer = null;
    let lastY = window.scrollY;

    function setActive(id) {
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }

    function updateMast() {
        if (!mast) return;
        const y = window.scrollY;
        if (y < 120) {
            mast.classList.remove('mast-hidden');
        } else if (y > lastY + 4) {
            mast.classList.add('mast-hidden');
        } else if (y < lastY - 4) {
            mast.classList.remove('mast-hidden');
        }
        lastY = y;
    }

    function update() {
        setActive(lockedActive || currentSection());
        updateMast();
    }

    /* Anchor navigation: smooth scroll (Lenis glide on desktop, native smooth
       elsewhere) + lock the active state during the animation so sections
       passed on the way don't flicker active. */
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();

        const id = href.slice(1);
        if (SECTION_IDS.includes(id)) {
            lockedActive = id;
            setActive(id);
            if (lockTimer) clearTimeout(lockTimer);
            lockTimer = setTimeout(() => { lockedActive = null; update(); }, 1700);
        }

        if (lenis) {
            /* Land just below the fixed masthead (scroll-margin-top does the
               same for the native path) */
            lenis.scrollTo(target, { duration: 1.4, offset: -(mast ? mast.offsetHeight : 0) });
        } else {
            target.scrollIntoView({ behavior: env.reduced ? 'auto' : 'smooth' });
        }
    });

    onScroll(update);
    update();
}

/* ============================================
   SIDE MENU (right pane)
   ============================================ */
function initMenu() {
    const toggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('menu-overlay');
    const menu = document.getElementById('side-menu');
    if (!toggle || !overlay || !menu) return;

    const isOpen = () => document.body.classList.contains('menu-open');

    function openMenu() {
        document.body.classList.add('menu-open');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-label', 'Close menu');
        menu.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
        if (lenis) lenis.stop();
    }

    function closeMenu() {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open menu');
        menu.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        if (lenis) lenis.start();
    }

    toggle.addEventListener('click', () => (isOpen() ? closeMenu() : openMenu()));
    overlay.addEventListener('click', closeMenu);

    /* Menu link clicks close the pane first, then the document-level anchor
       handler (bubble phase) performs the smooth scroll with Lenis restarted. */
    menu.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) closeMenu();
    });
}

/* ============================================
   DIALOG PLUMBING - shared by the project modal and the image lightbox
   Moves focus in, keeps Tab inside the dialog while it is open, and hands
   focus back to whatever opened it. Without this a keyboard user tabs
   straight out of an open dialog into the page behind it.
   ============================================ */
const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/* Guarantee a dialog ends up visible.

   The entrance is a keyframe animation over a visible resting state, but an
   animation that never gets a start time (a throttled/non-compositing tab, an
   extension that disables animations, a browser that holds the first keyframe
   while pending) would park the dialog on its `from` frame - opacity 0 - and
   the visitor sees nothing but a backdrop that closes on the next click.

   `.settled` sets `animation: none`, dropping the element back to its resting
   style. Fired by animationend in the healthy case, by a timer otherwise, so
   the dialog is always visible within ~500ms no matter what. */
let settleToken = 0;

function settleDialog(root, shell, maxWait) {
    /* Token guards against a stale timer from a previously-opened dialog
       settling this one early and cutting its entrance short. */
    const mine = ++settleToken;
    let done = false;
    const settle = () => {
        if (done || mine !== settleToken) return;
        done = true;
        root.classList.add('settled');
        shell.removeEventListener('animationend', settle);
    };
    shell.addEventListener('animationend', settle);
    setTimeout(settle, maxWait);
}

function trapFocus(shell) {
    function onKey(e) {
        if (e.key !== 'Tab') return;
        const items = [...shell.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
    shell.addEventListener('keydown', onKey);
    return () => shell.removeEventListener('keydown', onKey);
}

/* ============================================
   PROJECT MODAL
   ============================================ */
const modal = document.getElementById('project-modal');
const modalBody = document.getElementById('modal-body');
let modalReturnFocus = null;
let modalReleaseTrap = null;

function openModal(projectId, opener) {
    const template = document.getElementById('project-data-' + projectId);
    if (!template) return;

    modalBody.innerHTML = '';
    modalBody.appendChild(template.content.cloneNode(true));

    modalReturnFocus = opener || document.activeElement;
    modal.hidden = false;
    modal.classList.remove('closing', 'settled');
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    if (lenis) lenis.stop();

    const shell = modal.querySelector('.modal-shell');
    settleDialog(modal, shell, 600);
    modalReleaseTrap = trapFocus(shell);
    modal.querySelector('.modal-close').focus();
}

function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove('open', 'settled');
    modal.classList.add('closing');
    document.body.classList.remove('modal-open');
    if (lenis) lenis.start();
    if (modalReleaseTrap) { modalReleaseTrap(); modalReleaseTrap = null; }

    /* Stop any playing media immediately - the node is not removed until the
       close transition finishes. */
    modalBody.querySelectorAll('video').forEach((v) => v.pause());

    setTimeout(() => {
        modal.hidden = true;
        modal.classList.remove('closing');
        modalBody.innerHTML = '';
    }, 320);

    /* preventScroll: the opener may live inside the pinned horizontal track,
       and a scrolling focus() would fight any anchor jump the click triggered */
    if (modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus({ preventScroll: true });
    modalReturnFocus = null;
}

function initModal() {
    document.querySelectorAll('.tile').forEach((tile) => {
        tile.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const id = tile.dataset.projectId;
            if (id) openModal(id, tile.querySelector('.tile-open'));
        });
    });

    document.querySelectorAll('.tile-open').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tile = btn.closest('.tile');
            if (tile && tile.dataset.projectId) openModal(tile.dataset.projectId, btn);
        });
    });

    modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-modal-close]')) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
    });
}

/* ============================================
   IMAGE LIGHTBOX - poster and certificate scans
   ============================================ */
function initLightbox() {
    const box = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    if (!box || !img) return;

    let returnFocus = null;
    let releaseTrap = null;

    function open(trigger) {
        img.src = trigger.dataset.lightbox;
        img.alt = trigger.dataset.lightboxCaption || '';
        caption.textContent = trigger.dataset.lightboxCaption || '';
        returnFocus = trigger;

        box.hidden = false;
        box.classList.remove('closing', 'settled');
        void box.offsetWidth;
        box.classList.add('open');
        document.body.classList.add('modal-open');
        if (lenis) lenis.stop();

        settleDialog(box, box.querySelector('.lightbox-shell'), 500);

        /* trap on the whole lightbox, not the shell - the close button is a
           sibling of the shell so that it can be fixed to the viewport */
        releaseTrap = trapFocus(box);
        box.querySelector('.lightbox-close').focus();
    }

    function close() {
        if (box.hidden) return;
        box.classList.remove('open', 'settled');
        box.classList.add('closing');
        document.body.classList.remove('modal-open');
        if (lenis) lenis.start();
        if (releaseTrap) { releaseTrap(); releaseTrap = null; }
        setTimeout(() => {
            box.hidden = true;
            box.classList.remove('closing');
            img.removeAttribute('src');
        }, 300);
        if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
        returnFocus = null;
    }

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-lightbox]');
        if (trigger) { e.preventDefault(); open(trigger); }
    });

    box.addEventListener('click', (e) => {
        if (e.target.closest('[data-lightbox-close]')) close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !box.hidden) close();
    });
}

/* ============================================
   BOOT - things that don't depend on GSAP/loader
   ============================================ */
initMenu();
initNavTracking();
initRail();
initModal();
initLightbox();
initTileVideoAutoplay();
initHeroCanvas();
initHeroScrambleTriggers();
initReticle();
initMagnetic();
initSpotlight();
