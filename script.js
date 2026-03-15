/* TERMINAL TYPEWRITER & FLYING DRONE */ 

const line1 = document.getElementById('line1');
const line2 = document.getElementById('line2');

const text1 = line1.textContent;
const text2 = line2.textContent;
line1.textContent = '';
line2.textContent = '';

const textSpan1 = document.createElement('span');
const cursor1 = document.createElement('span');
cursor1.textContent = '|';
cursor1.classList.add('cursor');
line1.appendChild(textSpan1);
line1.appendChild(cursor1);

const textSpan2 = document.createElement('span');
const cursor2 = document.createElement('span');

cursor2.innerHTML = '<svg class="drone-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="17" y="2" width="5" height="5" rx="1"/><rect x="2" y="17" width="5" height="5" rx="1"/><rect x="17" y="17" width="5" height="5" rx="1"/><path d="M7 7l10 10"/><path d="M17 7L7 17"/><circle cx="12" cy="12" r="2"/></svg>';

cursor2.style.display = 'none';
line2.appendChild(textSpan2);
line2.appendChild(cursor2);

let charIndex1 = 0;
let charIndex2 = 0;
const typingSpeed = 40; 

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

setTimeout(typeLine1, 500);

/* SCROLL REVEAL */

const cards = document.querySelectorAll('.card');

cards.forEach(card => card.classList.add('hidden'));

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

cards.forEach(card => observer.observe(card));