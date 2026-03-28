/* ============================================
   BOOT SEQUENCE
   ============================================ */
const bootLines = document.querySelectorAll('#boot-screen .boot-line');
const bootScreen = document.getElementById('boot-screen');
const mainSite = document.getElementById('main-site');

let bootDelay = 300;

bootLines.forEach((line, i) => {
    /* Stagger each line with slight randomness for realism */
    const delay = bootDelay + i * 200 + Math.random() * 100;
    setTimeout(() => {
        line.classList.add('visible');
    }, delay);
});

/* After all lines have appeared, fade out boot & show site */
const totalBootTime = bootDelay + bootLines.length * 250 + 1200;

setTimeout(() => {
    bootScreen.classList.add('done');
    mainSite.classList.add('visible');
    initReveals();
    startTypewriter();
}, totalBootTime);


/* ============================================
   TYPEWRITER EFFECT (with drone cursor)
   ============================================ */
const line1El = document.getElementById('line1');
const line2El = document.getElementById('line2');

const text1 = line1El.textContent;
const text2 = line2El.textContent;

/* Clear the text - we'll type it back in */
line1El.textContent = '';
line2El.textContent = '';

/* Build DOM structure for line 1: textSpan + blinking cursor */
const textSpan1 = document.createElement('span');
const cursor1 = document.createElement('span');
cursor1.textContent = '|';
cursor1.classList.add('typewriter-cursor');
line1El.appendChild(textSpan1);
line1El.appendChild(cursor1);

/* Build DOM structure for line 2: textSpan + drone icon cursor */
const textSpan2 = document.createElement('span');
const cursor2 = document.createElement('span');
cursor2.innerHTML = `<svg class="drone-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="5" height="5" rx="1"/>
    <rect x="17" y="2" width="5" height="5" rx="1"/>
    <rect x="2" y="17" width="5" height="5" rx="1"/>
    <rect x="17" y="17" width="5" height="5" rx="1"/>
    <path d="M7 7l10 10"/>
    <path d="M17 7L7 17"/>
    <circle cx="12" cy="12" r="2"/>
</svg>`;
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
        /* Line 1 done -- cursor keeps blinking, show drone cursor on line 2 */
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
        /* Done typing - drone starts hovering */
        cursor2.classList.add('hovering-drone');
    }
}

function startTypewriter() {
    /* Small delay after boot finishes so user sees the name first */
    setTimeout(typeLine1, 600);
}


/* ============================================
   NAVIGATION - SPA TAB SWITCHING
   ============================================ */
const navLinks = document.querySelectorAll('nav a');
const pages = document.querySelectorAll('.page');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.page;

        /* Update active tab */
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        /* Switch page */
        pages.forEach(p => {
            p.classList.remove('active');
            if (p.id === `page-${target}`) {
                p.classList.add('active');
                /* Re-trigger scroll reveals for newly visible page */
                setTimeout(() => {
                    p.querySelectorAll('.reveal').forEach(el => {
                        el.classList.remove('visible');
                        void el.offsetWidth; /* force reflow */
                        initSingleReveal(el);
                    });
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