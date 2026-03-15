const subtitle = document.querySelector('.subtitle');
const textToType = subtitle.textContent;
subtitle.textContent = '';

const textSpan = document.createElement('span');
subtitle.appendChild(textSpan);

const cursorSpan = document.createElement('span');
cursorSpan.textContent = '|'; 
cursorSpan.classList.add('cursor');
subtitle.appendChild(cursorSpan);

let charIndex = 0;
const typingSpeed = 40; 

function typeText() {
    if (charIndex < textToType.length) {
        textSpan.textContent += textToType.charAt(charIndex);
        charIndex++;
        setTimeout(typeText, typingSpeed);
    }
}

setTimeout(typeText, 500);

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