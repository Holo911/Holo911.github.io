/* ============================================
   FEATURE DETECTION
   ============================================ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
const isMobile = window.matchMedia('(max-width: 48rem)').matches;
const isPortraitPhone = window.matchMedia('(orientation: portrait) and (max-width: 50rem)').matches;
const cinematicEnabled = !prefersReducedMotion && !isMobile && !isPortraitPhone;

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
        if (window.gsap && window.ScrollTrigger) initLenisAndGSAP();
        startHeroTypewriter();
        /* These don't need GSAP - run regardless */
        initHeroGlow();
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
    gsap.from(['.hero-name', '.hero-corner', '.scroll-cue'], {
        opacity: 0,
        y: 16,
        duration: 0.9,
        stagger: 0.08,
        delay: 0.2,
        ease: 'power2.out',
    });
}

/* ============================================
   HERO TYPEWRITER
   ============================================ */
function startHeroTypewriter() {
    const target = document.getElementById('hero-typed');
    if (!target) return;

    const phrase = "./holo911 --offensive_security --ai --robots";
    const speed = prefersReducedMotion ? 0 : 28;

    if (prefersReducedMotion) {
        target.textContent = phrase;
        return;
    }

    let i = 0;
    function tick() {
        if (i < phrase.length) {
            target.textContent += phrase.charAt(i);
            i++;
            setTimeout(tick, speed + Math.random() * 25);
        }
    }
    setTimeout(tick, 900);
}


/* ============================================
   GSAP (no Lenis - native scroll is smoother)
   ============================================ */
const lenis = null; /* kept for compatibility with code that checks `if (lenis)` */

function initLenisAndGSAP() {
    if (window.gsap) gsap.registerPlugin(ScrollTrigger);
    initActiveNav();
    initSectionIndicator();
    initTilesPin();
    initTileVideoAutoplay();
}

/* ============================================
   HERO GLOW - viewport-wide lime spotlight
   Desktop: follows the cursor while the hero is on screen.
   Touch: drag a finger on the hero to position the glow, it stays put.
   ============================================ */
function initHeroGlow() {
    const glow = document.getElementById('hero-glow');
    const hero = document.querySelector('.hero');
    if (!glow || !hero) return;

    let inHero = false;

    /* Only run the glow while the hero is on screen - no work during scroll past */
    const obs = new IntersectionObserver(([entry]) => {
        inHero = entry.isIntersecting;
        if (!inHero) document.body.classList.remove('hero-glow-on');
    }, { threshold: 0.2 });
    obs.observe(hero);

    function move(x, y) {
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    if (isTouch || prefersReducedMotion) {
        /* Touch: drag finger across the hero. Glow follows during the gesture
           and stays at the last position after release. */
        hero.addEventListener('touchstart', (e) => {
            if (!inHero) return;
            const t = e.touches[0];
            move(t.clientX, t.clientY);
            document.body.classList.add('hero-glow-on');
        }, { passive: true });
        hero.addEventListener('touchmove', (e) => {
            if (!inHero) return;
            const t = e.touches[0];
            move(t.clientX, t.clientY);
        }, { passive: true });
        return;
    }

    /* Desktop: cursor-driven, instant follow (no rAF or smoothing) */
    window.addEventListener('pointermove', (e) => {
        if (!inHero) return;
        move(e.clientX, e.clientY);
        if (!document.body.classList.contains('hero-glow-on')) {
            document.body.classList.add('hero-glow-on');
        }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        document.body.classList.remove('hero-glow-on');
    });
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

/* Mandatory horizontal pin: vertical scroll advances through tiles one-by-one.
   Snap is locked - user can't get stuck between tiles. */
function initTilesPin() {
    if (isMobile || isTouch || prefersReducedMotion) return;
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
            scrub: true,  /* direct 1:1 mapping - no smoothing layer, no jitter */
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

    window.addEventListener('load', () => ScrollTrigger.refresh());
    setTimeout(() => ScrollTrigger.refresh(), 400);
}

/* ============================================
   ACTIVE NAV + SECTION INDICATOR
   Single scroll-based active state for both the masthead nav links and
   right-edge indicator dots. Previously two separate ScrollTrigger
   pipelines could race and end up showing the wrong section as active
   (e.g. clicking dot 3 landed at section 3 but marked section 5 active).
   ============================================ */
function initActiveNav() {
    /* Combined initialization happens in initSectionIndicator now */
}

function initSectionIndicator() {
    const dots = document.querySelectorAll('.indicator-dot');
    const navLinks = document.querySelectorAll('.mast-nav a[href^="#"]');
    const sectionIds = ['hero', 'work', 'hackathons', 'profile', 'contact'];
    let lockedActive = null;
    let lockTimer = null;

    function setActive(id) {
        dots.forEach((d) => d.classList.toggle('active', d.dataset.target === id));
        navLinks.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    }

    /* Find the LAST section whose top has crossed the viewport center.
       The section IDs point to small intro headings, not full content blocks
       (e.g. #profile is just the "The story." heading, then .profile-shell
       has the actual content with no ID). So "is center inside this element"
       fails for everything when you land mid-content and defaults to first.
       Instead, treat each ID as a marker that "this section's territory
       starts here" and pick the most recently crossed one. */
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

    function update() { setActive(detectActive()); }

    /* Click handler: immediate visual feedback + lock the active state during the
       scroll animation so passing-through sections don't briefly flicker active.
       Without the lock, scrolling fast past sections 2-3-4 to land at 5 caused
       transient active states ending on the wrong one. */
    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const id = dot.dataset.target;
            const target = document.getElementById(id);
            if (!target) return;

            lockedActive = id;
            setActive(id);
            if (lockTimer) clearTimeout(lockTimer);

            if (lenis) lenis.scrollTo(target, { duration: 1.4, lock: true });
            else target.scrollIntoView({ behavior: 'smooth' });

            /* Release lock after scroll likely settled */
            lockTimer = setTimeout(() => { lockedActive = null; update(); }, 1700);
        });
    });

    /* Throttled native scroll listener - batch detection to one rAF tick
       max so we never do more than one set of layout reads per frame. */
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
   ANCHOR NAV
   ============================================ */
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
});

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
