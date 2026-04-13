/* ============================================
   BOOT SEQUENCE
   ============================================ */
const bootLines = document.querySelectorAll('#boot-screen .boot-line');
const bootScreen = document.getElementById('boot-screen');
const mainSite = document.getElementById('main-site');

let bootDelay = 400;

bootLines.forEach((line, i) => {
    const delay = bootDelay + i * 250 + Math.random() * 80;
    setTimeout(() => line.classList.add('visible'), delay);
});

const totalBootTime = bootDelay + bootLines.length * 300 + 900;

setTimeout(() => {
    bootScreen.classList.add('done');
    mainSite.classList.add('visible');
    initReveals();
    startTypewriter();
}, totalBootTime);


/* ============================================
   TYPEWRITER (with drone cursor)
   ============================================ */
const line1El = document.getElementById('line1');
const line2El = document.getElementById('line2');
const text1 = line1El.textContent;
const text2 = line2El.textContent;

line1El.textContent = '';
line2El.textContent = '';

const textSpan1 = document.createElement('span');
const cursor1 = document.createElement('span');
cursor1.textContent = '|';
cursor1.classList.add('typewriter-cursor');
line1El.appendChild(textSpan1);
line1El.appendChild(cursor1);

const textSpan2 = document.createElement('span');
const cursor2 = document.createElement('span');
cursor2.innerHTML = '<svg class="drone-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="17" y="2" width="5" height="5" rx="1"/><rect x="2" y="17" width="5" height="5" rx="1"/><rect x="17" y="17" width="5" height="5" rx="1"/><path d="M7 7l10 10"/><path d="M17 7L7 17"/><circle cx="12" cy="12" r="2"/></svg>';
cursor2.style.display = 'none';
line2El.appendChild(textSpan2);
line2El.appendChild(cursor2);

let charIndex1 = 0;
let charIndex2 = 0;
const typingSpeed = 35;

function typeLine1() {
    if (charIndex1 < text1.length) {
        textSpan1.textContent += text1.charAt(charIndex1);
        charIndex1++;
        setTimeout(typeLine1, typingSpeed);
    } else {
        cursor2.style.display = 'inline-block';
        setTimeout(typeLine2, 300);
    }
}

function typeLine2() {
    if (charIndex2 < text2.length) {
        textSpan2.textContent += text2.charAt(charIndex2);
        charIndex2++;
        setTimeout(typeLine2, typingSpeed);
    } else {
        cursor2.classList.add('hovering-drone');
    }
}

function startTypewriter() {
    setTimeout(typeLine1, 600);
}


/* ============================================
   NAVIGATION
   ============================================ */
const navLinks = document.querySelectorAll('nav a');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.page;

        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        pages.forEach(p => {
            p.classList.remove('active');
            if (p.id === 'page-' + target) {
                p.classList.add('active');
                setTimeout(() => {
                    p.querySelectorAll('.reveal').forEach(el => {
                        el.classList.remove('visible');
                        void el.offsetWidth;
                        initSingleReveal(el);
                    });
                    initCarousels(p);
                }, 50);
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});


/* ============================================
   SCROLL REVEAL
   ============================================ */
function initSingleReveal(el) {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    obs.observe(el);
}

function initReveals() {
    document.querySelectorAll('.page.active .reveal').forEach((el, i) => {
        setTimeout(() => initSingleReveal(el), i * 120);
    });
}


/* ============================================
   CAROUSEL SYSTEM
   ============================================ */
function initCarousels(container) {
    const root = container || document;
    root.querySelectorAll('.carousel').forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const cards = track.querySelectorAll('.carousel-card');
        const prevBtn = carousel.querySelector('.carousel-btn.prev');
        const nextBtn = carousel.querySelector('.carousel-btn.next');
        const dotsContainer = carousel.querySelector('.carousel-dots');

        if (!cards.length) return;

        /* Build dots */
        dotsContainer.innerHTML = '';
        cards.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => scrollToCard(i));
            dotsContainer.appendChild(dot);
        });

        function scrollToCard(index) {
            const card = cards[index];
            if (!card) return;
            track.scrollTo({ left: card.offsetLeft - 24, behavior: 'smooth' });
        }

        function updateDots() {
            const scrollLeft = track.scrollLeft;
            let closest = 0;
            let minDist = Infinity;

            cards.forEach((card, i) => {
                const dist = Math.abs(card.offsetLeft - 24 - scrollLeft);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            });

            dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
                dot.classList.toggle('active', i === closest);
            });

            return closest;
        }

        prevBtn.addEventListener('click', () => {
            const current = updateDots();
            if (current > 0) scrollToCard(current - 1);
        });

        nextBtn.addEventListener('click', () => {
            const current = updateDots();
            if (current < cards.length - 1) scrollToCard(current + 1);
        });

        let scrollTimeout;
        track.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateDots, 50);
        });
    });
}

/* Init carousels on the active page after boot */
setTimeout(() => {
    const activePage = document.querySelector('.page.active');
    if (activePage) initCarousels(activePage);
}, totalBootTime + 200);