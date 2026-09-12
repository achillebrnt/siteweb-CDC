document.getElementById('year').textContent = new Date().getFullYear();

requestAnimationFrame(() => document.body.classList.remove('is-loading'));

// Titre du hero lettre par lettre
const heroLetters = document.getElementById('hero-letters');
if (heroLetters) {
  const text = heroLetters.textContent;
  heroLetters.innerHTML = text
    .split('')
    .map((ch, i) => `<span class="letter" style="animation-delay:${300 + i * 60}ms">${ch === ' ' ? '&nbsp;' : ch}</span>`)
    .join('');
}

const header = document.getElementById('site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
});

// Défilement fluide vers les ancres internes, décalé pour ne pas passer sous le header fixe
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();

    if (mainNav.classList.contains('is-open')) {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Ouvrir le menu');
    }

    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 16;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    history.pushState(null, '', id);
  });
});

// Scroll progress bar
const progressBar = document.getElementById('scroll-progress');
const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
};
updateProgress();
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);

// Reveal on scroll, staggered per parent group
const revealGroups = new Map();
document.querySelectorAll('.reveal').forEach((el) => {
  const parent = el.parentElement;
  const index = revealGroups.get(parent) || 0;
  el.style.transitionDelay = `${Math.min(index, 5) * 80}ms`;
  revealGroups.set(parent, index + 1);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// Lightbox gallery (uniquement présent sur galerie.html)
const galleryTiles = Array.from(document.querySelectorAll('.gallery-tile'));
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  let currentIndex = 0;
  let lastFocused = null;

  const openLightbox = (index) => {
    currentIndex = index;
    const img = galleryTiles[currentIndex].querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lastFocused = document.activeElement;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lightboxClose.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  const showRelative = (offset) => {
    currentIndex = (currentIndex + offset + galleryTiles.length) % galleryTiles.length;
    const img = galleryTiles[currentIndex].querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
  };

  galleryTiles.forEach((tile, index) => {
    tile.addEventListener('click', () => openLightbox(index));
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => showRelative(-1));
  lightboxNext.addEventListener('click', () => showRelative(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showRelative(-1);
    if (e.key === 'ArrowRight') showRelative(1);
  });
}

// Compteur animé pour la note Google
const statCount = document.getElementById('stat-count');
const statBand = document.querySelector('.stat-band');
if (statCount && statBand && !prefersReducedMotion) {
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      statObserver.unobserve(entry.target);
      const duration = 1200;
      const targetValue = 4.9;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        statCount.textContent = (targetValue * eased).toFixed(1).replace('.', ',');
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  statObserver.observe(statBand);
} else if (statCount) {
  statCount.textContent = '4,9';
}

// Effet magnétique léger sur les boutons principaux
if (!prefersReducedMotion) {
  document.querySelectorAll('.btn-primary, .btn-outline').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transition = 'transform .05s linear';
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1.3)';
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// Événements : chargés depuis data/events.json (géré via admin.html)
const eventsList = document.getElementById('events-list');
if (eventsList) {
  const monthNames = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  fetch('data/events.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : []))
    .then((events) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = events
        .filter((ev) => ev.date && new Date(`${ev.date}T00:00:00`) >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (upcoming.length === 0) return;

      eventsList.innerHTML = upcoming.map((ev) => {
        const d = new Date(`${ev.date}T00:00:00`);
        return `
          <article class="event-card reveal is-visible">
            <div class="event-date"><span class="event-day">${d.getDate()}</span><span class="event-month">${monthNames[d.getMonth()]}</span></div>
            <div class="event-body">
              ${ev.tag ? `<span class="event-tag">${escapeHtml(ev.tag)}</span>` : ''}
              <h3>${escapeHtml(ev.title || '')}</h3>
              ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ''}
              ${ev.time ? `<span class="event-time">${escapeHtml(ev.time)}</span>` : ''}
            </div>
          </article>`;
      }).join('');
    })
    .catch(() => {});
}
