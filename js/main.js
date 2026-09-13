document.getElementById('year').textContent = new Date().getFullYear();

const header = document.getElementById('site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  header.classList.toggle('is-nav-open', isOpen);
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
      header.classList.remove('is-nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Ouvrir le menu');
    }

    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 16;
    window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    history.pushState(null, '', id);
  });
});

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

const statCount = document.getElementById('stat-count');
if (statCount) statCount.textContent = '4,9';

// Événements : chargés depuis data/events.json (géré via admin.html)
const eventsList = document.getElementById('events-list');
if (eventsList) {
  const eventsNavGroup = document.querySelector('.events-nav-group');
  const eventsPrevBtn = document.querySelector('.events-prev');
  const eventsNextBtn = document.querySelector('.events-next');

  const monthNames = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const CATEGORY_COLORS = {
    'Soirée à thème': '#d49653',
    'Concert / Live': '#8a5a3b',
    'DJ Set': '#6e7358',
    'Happy Hour': '#b5643f',
    'Spécial': '#7a5566',
  };
  const DEFAULT_CATEGORY_COLOR = '#978e81';
  const PLACEHOLDER_ICON = '<svg class="event-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 4h12l-1.4 15.2a1.6 1.6 0 0 1-1.6 1.4H9a1.6 1.6 0 0 1-1.6-1.4L6 4z" stroke-linejoin="round" stroke-linecap="round"/><path d="M7.3 10.5h9.4" stroke-linecap="round"/></svg>';
  const emptyStateHtml = eventsList.innerHTML;

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  function updateEventsNavState() {
    if (!eventsNavGroup) return;
    const canScroll = eventsList.scrollWidth > eventsList.clientWidth + 4;
    eventsNavGroup.hidden = !canScroll;
    if (!canScroll) return;
    const maxScroll = eventsList.scrollWidth - eventsList.clientWidth;
    eventsPrevBtn.disabled = eventsList.scrollLeft <= 4;
    eventsNextBtn.disabled = eventsList.scrollLeft >= maxScroll - 4;
  }

  if (eventsPrevBtn && eventsNextBtn) {
    const scrollByCard = (dir) => {
      const card = eventsList.querySelector('.event-card');
      const amount = card ? card.getBoundingClientRect().width + 22 : 300;
      eventsList.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };
    eventsPrevBtn.addEventListener('click', () => scrollByCard(-1));
    eventsNextBtn.addEventListener('click', () => scrollByCard(1));
    eventsList.addEventListener('scroll', updateEventsNavState, { passive: true });
    window.addEventListener('resize', updateEventsNavState);
  }

  eventsList.innerHTML = '<p class="events-loading">Chargement des événements...</p>';

  fetch('data/events.json', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : []))
    .then((events) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = events
        .filter((ev) => ev.date && new Date(`${ev.date}T00:00:00`) >= today)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (upcoming.length === 0) {
        eventsList.innerHTML = emptyStateHtml;
        return;
      }

      eventsList.innerHTML = upcoming.map((ev, index) => {
        const d = new Date(`${ev.date}T00:00:00`);
        const accent = CATEGORY_COLORS[ev.tag] || DEFAULT_CATEGORY_COLOR;
        const meta = `${d.getDate()} ${monthNames[d.getMonth()]}${ev.time ? ` · ${escapeHtml(ev.time)}` : ''}`;
        const media = ev.photo
          ? `<img src="${escapeHtml(ev.photo)}" alt="${escapeHtml(ev.title || '')}" loading="lazy">`
          : `<div class="event-media-placeholder"><span class="event-placeholder-mark">CDC</span>${PLACEHOLDER_ICON}</div>`;
        return `
          <article class="event-card" style="--accent:${accent}">
            <div class="event-media">${media}</div>
            <div class="event-body">
              <div class="event-label-row">
                ${ev.tag ? `<span class="event-tag">${escapeHtml(ev.tag)}</span>` : '<span></span>'}
                ${index === 0 ? '<span class="event-featured-label">Bientôt</span>' : ''}
              </div>
              <p class="event-meta">${meta}</p>
              <h3>${escapeHtml(ev.title || '')}</h3>
              ${ev.description ? `<p class="event-desc">${escapeHtml(ev.description)}</p>` : ''}
            </div>
          </article>`;
      }).join('');

      requestAnimationFrame(updateEventsNavState);
    })
    .catch(() => {
      eventsList.innerHTML = emptyStateHtml;
    });
}
