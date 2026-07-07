/* ============================================
   FEATURE DETECTION
   ============================================ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const isMobile = window.matchMedia('(max-width: 48rem)').matches;
const isPortraitPhone = window.matchMedia('(orientation: portrait) and (max-width: 50rem)').matches;

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
   LOADER
   ============================================ */
const loader = document.getElementById('loader');
let loaderDone = false;

function completeLoader() {
    if (loaderDone) return;
    loaderDone = true;
    document.body.classList.remove('loading');
    loader.classList.add('done');
    window.scrollTo(0, 0);
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
    }, 60);
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
    if (!window.gsap || prefersReducedMotion) return;
    gsap.from(['.hero-name', '.hero-terminal', '.scroll-cue'], {
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
   On load the full name resolves out of random glyphs as one staggered
   composition (runs for everyone - unlike the old hover-only glow).
   After that, each word re-scrambles independently: hover a word on
   desktop, tap the name on touch. No time cooldown - a scramble simply
   won't restart while it's already running on that element, so every
   deliberate hover/tap gets a response (no confusing "dead" hovers).
   ============================================ */
const SCRAMBLE_GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01';

function scrambleTo(el, finalText, duration) {
    if (prefersReducedMotion) {
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
    if (!parts.length || !name || prefersReducedMotion) return;

    if (isTouch) {
        /* phones/tablets: tapping the name replays the full decode */
        name.addEventListener('click', runHeroScramble);
        return;
    }

    /* desktop: only the hovered word scrambles, slightly snappier than load */
    parts.forEach((el) => {
        el.addEventListener('mouseenter', () => {
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
        'nmap -sV holo911.github.io',
        'ros2 run drone follow_target',
        'ctf{curiosity_never_stops}',
    ];

    if (prefersReducedMotion) {
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
   Lenis provides the momentum "glide" scroll on desktop pointer devices.
   Touch devices keep native scrolling (already momentum-based, and Lenis
   touch smoothing fights the OS). GSAP ticker drives Lenis's rAF.
   ============================================ */
let lenis = null;

function initGsapFeatures() {
    gsap.registerPlugin(ScrollTrigger);
    initSmoothScroll();
    initTilesPin();
}

function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;
    if (prefersReducedMotion || isTouch || isMobile || isPortraitPhone) return;

    lenis = new Lenis({
        lerp: 0.09,       /* lower = longer glide after the wheel stops */
        smoothWheel: true,
    });

    /* Keep ScrollTrigger in sync with Lenis-driven scroll */
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
}

/* ============================================
   TILES - pinned horizontal scroll (desktop only)
   Vertical scroll advances through tiles one-by-one, snap locked.
   Every environment that can't run the pin gets the vertical stack
   fallback so no tile is ever trapped off-screen (see ensureTilesStacked).
   ============================================ */
function ensureTilesStacked() {
    document.body.classList.add('tiles-stacked');
}

function initTilesPin() {
    if (isMobile || isTouch || prefersReducedMotion) {
        ensureTilesStacked();
        return;
    }
    const section = document.getElementById('tiles-shell');
    const track = document.getElementById('tiles-track');
    const tiles = document.querySelectorAll('.tile');
    if (!section || !track || tiles.length === 0) return;

    const getDistance = () => track.scrollWidth - window.innerWidth;
    /* Less vertical scroll required to traverse all tiles - 0.55x ratio means
       roughly half as many wheel ticks needed to go through all 7 projects. */
    const getPinLength = () => getDistance() * 0.55;

    gsap.to(track, {
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
        },
    });

    setTimeout(() => ScrollTrigger.refresh(), 400);
}

/* ============================================
   REVEAL ON SCROLL (IntersectionObserver - lightweight)
   Only used on vertical-flow content. Tiles are skipped.
   ============================================ */
function initRevealOnScroll() {
    const els = document.querySelectorAll('.hk-card, .profile-row, .contact-card, .display-xl');
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
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    els.forEach((el) => obs.observe(el));
}

/* ============================================
   TILE VIDEO AUTOPLAY (on intersection)
   Plays muted video loops only when the tile is in viewport.
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
   HERO BACKGROUND - generative contour field
   Layered-sine "terrain" lines drawn on a <canvas>. No assets, no libs.
   Reacts to the page: scroll position shifts the wave phase (the background
   visibly flows as you scroll), scroll velocity pumps energy into the wave
   amplitude, and on desktop the field leans slightly toward the pointer.
   A slow scanning band sweeps vertically and brightens lines it passes.
   Perf guards: DPR capped at 1.5, fewer/coarser lines on mobile, animation
   paused whenever the hero is off-screen, static single frame for
   prefers-reduced-motion.
   ============================================ */
function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    const hero = document.getElementById('hero');
    if (!canvas || !hero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lite = isMobile || isPortraitPhone;
    const ROWS = lite ? 26 : 42;
    const STEP = lite ? 22 : 14;

    let w = 0, h = 0;
    let running = false;
    let rafId = null;

    const phase = Math.random() * 100; /* different opening frame every visit */
    let energy = 0;
    let lastScrollY = window.scrollY;
    let pointerX = 0.5, pointerY = 0.5;
    let targetPX = 0.5, targetPY = 0.5;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = canvas.clientWidth;
        h = canvas.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* Three incommensurate sine octaves; per-row phase offsets kill visible
       repetition. Cheap stand-in for real noise - good enough at these alphas. */
    function wave(x, row, t) {
        return (
            Math.sin(x * 0.0042 + row * 0.65 + t) +
            Math.sin(x * 0.0091 - row * 1.31 + t * 1.7) * 0.45 +
            Math.sin(x * 0.0177 + row * 2.42 - t * 0.8) * 0.22
        );
    }

    function draw(now) {
        const t = now * 0.00022 + phase;

        /* scroll → flow + energy */
        const sy = window.scrollY;
        const dy = sy - lastScrollY;
        lastScrollY = sy;
        energy = Math.min((energy + Math.min(Math.abs(dy), 60) * 0.012) * 0.94, 1.6);
        const scrollPhase = sy * 0.0022;

        pointerX += (targetPX - pointerX) * 0.04;
        pointerY += (targetPY - pointerY) * 0.04;

        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 1;

        const scanY = (Math.sin(t * 0.9) * 0.5 + 0.5) * h; /* sweeping band */

        for (let r = 0; r < ROWS; r++) {
            const rowT = r / (ROWS - 1);
            const baseY = h * (0.06 + rowT * 0.9);

            /* amplitude grows toward the bottom (terrain feel) + scroll energy */
            const amp = h * 0.028 * (0.45 + rowT) * (1 + energy)
                      * (1 + (pointerY - 0.5) * 0.35);

            /* fade rows near vertical center so the name stays readable */
            const centerFade = 0.35 + 0.65 * Math.min(1, Math.abs(rowT - 0.5) * 2.6);
            const scanBoost = Math.max(0, 1 - Math.abs(baseY - scanY) / (h * 0.13));

            const isAccent = r % 7 === 3;
            const alpha = (isAccent ? 0.11 : 0.07) * centerFade + scanBoost * 0.06;
            ctx.strokeStyle = isAccent
                ? 'rgba(204, 255, 0, ' + alpha.toFixed(3) + ')'
                : 'rgba(160, 165, 175, ' + alpha.toFixed(3) + ')';

            ctx.beginPath();
            for (let x = -STEP; x <= w + STEP; x += STEP) {
                const n = wave(x + (pointerX - 0.5) * 60 * rowT, r, t * 4 + scrollPhase);
                const yy = baseY + n * amp;
                if (x === -STEP) ctx.moveTo(x, yy);
                else ctx.lineTo(x, yy);
            }
            ctx.stroke();
        }
    }

    function loop(now) {
        if (!running) return;
        draw(now);
        rafId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', () => {
        resize();
        if (!running) draw(performance.now());
    });

    if (prefersReducedMotion) {
        draw(0); /* one static frame, no animation */
        return;
    }

    if (!isTouch) {
        window.addEventListener('pointermove', (e) => {
            targetPX = e.clientX / window.innerWidth;
            targetPY = e.clientY / window.innerHeight;
        }, { passive: true });
    }

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
   NAVIGATION
   One place owns: anchor smooth-scrolling, active-pill tracking, and the
   masthead auto-hide (GTA-VI style: bar tucks away scrolling down, returns
   scrolling up; the hamburger stays fixed and always reachable).
   ============================================ */
function initNavTracking() {
    const mast = document.getElementById('mast');
    const navLinks = document.querySelectorAll('.mast-nav a[href^="#"]');
    const sectionIds = ['hero', 'work', 'hackathons', 'profile', 'contact'];
    let lockedActive = null;
    let lockTimer = null;
    let lastY = window.scrollY;

    function setActive(id) {
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }

    /* Find the LAST section whose top has crossed the viewport center.
       The section IDs point to small intro headings, not full content blocks
       (e.g. #profile is just the "The story." heading, then .profile-shell
       has the actual content with no ID). So each ID is treated as a marker
       that "this section's territory starts here" - pick the most recently
       crossed one. */
    function detectActive() {
        if (lockedActive) return lockedActive;
        const center = window.innerHeight / 2;
        let active = sectionIds[0];
        for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top <= center) {
                active = id;
            }
        }
        return active;
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
        setActive(detectActive());
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
        if (sectionIds.includes(id)) {
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
            target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
    });

    /* Throttled scroll listener - batch all detection to one rAF tick max */
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                update();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    update();
}

/* ============================================
   SIDE MENU (right pane)
   Hamburger toggles body.menu-open; CSS handles the = → X morph, the
   pane slide-in and the staggered link reveal.
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
   PROJECT MODAL
   ============================================ */
const modal = document.getElementById('project-modal');
const modalBody = document.getElementById('modal-body');

function openModal(projectId) {
    const template = document.getElementById('project-data-' + projectId);
    if (!template) return;

    modalBody.innerHTML = '';
    modalBody.appendChild(template.content.cloneNode(true));

    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    if (lenis) lenis.stop();
}

function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open');
    if (lenis) lenis.start();

    setTimeout(() => {
        modal.hidden = true;
        modalBody.innerHTML = '';
    }, 400);
}

/* Tile click - opens modal from anywhere on the tile (button included).
   stopPropagation on the inner button prevents double-handling. */
document.querySelectorAll('.tile').forEach((tile) => {
    tile.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const id = tile.dataset.projectId;
        if (id) openModal(id);
    });
});

document.querySelectorAll('.tile-open').forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tile = btn.closest('.tile');
        if (tile && tile.dataset.projectId) openModal(tile.dataset.projectId);
    });
});

modal.addEventListener('click', (e) => {
    if (e.target.matches('[data-modal-close]') || e.target.closest('[data-modal-close]')) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
});

/* ============================================
   BOOT - things that don't depend on GSAP/loader
   ============================================ */
initMenu();
initNavTracking();
initTileVideoAutoplay();
initHeroCanvas();
initHeroScrambleTriggers();
