// ---- HERO CANVAS — PARTICLE NETWORK ---- //
(function() {
  const canvas = document.getElementById('heroCanvas');
  const hero = document.getElementById('hero');
  const ctx = canvas.getContext('2d');
  let w, h, particles, mouse = { x: null, y: null };
  const PARTICLE_COUNT = 90;
  const CONNECTION_DIST = 160;
  const MOUSE_DIST = 200;

  function resize() {
    const nw = hero.offsetWidth;
    const nh = hero.offsetHeight;
    w = canvas.width = nw;
    h = canvas.height = nh;
  }

  function initParticles() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  window.addEventListener('resize', () => {
    const oldW = w, oldH = h;
    resize();
    if (oldW && oldH) {
      particles.forEach(p => {
        p.x = (p.x / oldW) * w;
        p.y = (p.y / oldH) * h;
      });
    }
  });

  class Particle {
    constructor() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r = Math.random() * 1.5 + 0.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST * 0.008;
          this.vx += dx * force;
          this.vy += dy * force;
        }
      }
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > 1.5) {
        this.vx *= 0.98;
        this.vy *= 0.98;
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,158,11,0.6)';
      ctx.fill();
    }
  }

  initParticles();

  let isHeroVisible = true;
  const heroObserver = new IntersectionObserver(([entry]) => {
    isHeroVisible = entry.isIntersecting;
  }, { threshold: 0 });
  heroObserver.observe(hero);

  function animate() {
    if (isHeroVisible) {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => { p.update(); p.draw(); });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();

  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });
})();

// ---- KINETIC HERO TEXT ---- //
(function() {
  const firstName = 'Vineet';
  const lastName = 'Vora';
  const firstEl = document.getElementById('heroFirstName');
  const lastEl = document.getElementById('heroLastName');

  function buildChars(text, container, baseDelay) {
    text.split('').forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char;
      span.style.animationDelay = `${baseDelay + i * 0.05}s`;
      container.appendChild(span);
    });
  }
  buildChars(firstName, firstEl, 0.3);
  buildChars(lastName, lastEl, 0.3 + firstName.length * 0.05 + 0.1);
})();

// ---- CUSTOM CURSOR ---- //
(function() {
  if (window.innerWidth <= 768) return;
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  function followRing() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(followRing);
  }
  followRing();

  document.querySelectorAll('a, button, .magnetic').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
})();

// ---- MAGNETIC HOVER ---- //
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

// ---- HEADER SCROLL ---- //
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
});

// ---- ACTIVE NAV ---- //
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('#headerNav a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === id);
      });
    }
  });
}, { rootMargin: '-30% 0px -50% 0px', threshold: 0 });

sections.forEach(s => navObserver.observe(s));

// ---- SCROLL REVEAL ---- //
const reveals = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const parent = entry.target.parentElement;
      const siblings = parent ? parent.querySelectorAll('.reveal') : [];
      const idx = Array.from(siblings).indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 0.1}s`;
      entry.target.classList.add('visible');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -50px 0px' });
reveals.forEach(el => revealObs.observe(el));

// ---- SMOOTH SCROLL ---- //
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const href = a.getAttribute('href');
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', href);
    }
  });
});

// ---- MOBILE MENU ---- //
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  const isOpen = mobileMenu.classList.contains('open');
  hamburger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

function closeMobile() {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ---- THEME TOGGLE ---- //
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? null : 'light';
  if (next) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
  }
});
