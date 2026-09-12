const OWNER = 'achillebrnt';
const REPO = 'siteweb-CDC';
const BRANCH = 'claude/bar-website-dtj23s';
const FILE_PATH = 'data/events.json';
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
const TOKEN_KEY = 'cdc_admin_token';

const loginSection = document.getElementById('admin-login');
const panelSection = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const tokenInput = document.getElementById('token-input');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const eventForm = document.getElementById('event-form');
const eventStatus = document.getElementById('event-status');
const adminEventsList = document.getElementById('admin-events-list');

const monthNames = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64)));
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function fetchEventsFile(token) {
  const res = await fetch(`${API_URL}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('Jeton invalide ou droits insuffisants sur le dépôt.');
  const data = await res.json();
  const events = data.content ? JSON.parse(base64ToUtf8(data.content)) : [];
  return { events, sha: data.sha };
}

async function saveEventsFile(token, events, sha, message) {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(`${JSON.stringify(events, null, 2)}\n`),
      sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) throw new Error("La publication a échoué. Vérifie ta connexion et réessaie.");
  return res.json();
}

function renderAdminEvents(events) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    adminEventsList.innerHTML = '<p class="admin-empty">Aucun événement publié pour l’instant.</p>';
    return;
  }
  adminEventsList.innerHTML = sorted.map((ev) => {
    const d = new Date(`${ev.date}T00:00:00`);
    const meta = [ev.time, ev.tag].filter(Boolean).map(escapeHtml).join(' — ');
    return `
      <div class="admin-event-row">
        <div class="event-date"><span class="event-day">${d.getDate()}</span><span class="event-month">${monthNames[d.getMonth()]}</span></div>
        <div class="admin-event-info">
          <strong>${escapeHtml(ev.title)}</strong>
          <span>${meta}</span>
        </div>
        <button type="button" class="btn btn-danger admin-delete" data-id="${ev.id}">Supprimer</button>
      </div>`;
  }).join('');
}

async function loadPanel(token) {
  const { events } = await fetchEventsFile(token);
  loginSection.hidden = true;
  panelSection.hidden = false;
  renderAdminEvents(events);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) return;
  loginError.hidden = true;
  try {
    await loadPanel(token);
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    loginError.textContent = err.message || 'Connexion impossible.';
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  panelSection.hidden = true;
  loginSection.hidden = false;
  tokenInput.value = '';
});

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const submitBtn = eventForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  eventStatus.hidden = true;

  const newEvent = {
    id: Date.now().toString(36),
    date: document.getElementById('ev-date').value,
    time: document.getElementById('ev-time').value.trim(),
    tag: document.getElementById('ev-tag').value.trim(),
    title: document.getElementById('ev-title').value.trim(),
    description: document.getElementById('ev-desc').value.trim(),
  };

  try {
    const { events, sha } = await fetchEventsFile(token);
    events.push(newEvent);
    await saveEventsFile(token, events, sha, `Ajoute l'événement : ${newEvent.title}`);
    renderAdminEvents(events);
    eventForm.reset();
    eventStatus.textContent = 'Publié ! Il sera visible sur le site dans une minute environ.';
    eventStatus.className = 'admin-status';
  } catch (err) {
    eventStatus.textContent = err.message || 'Erreur lors de la publication.';
    eventStatus.className = 'admin-error';
  } finally {
    eventStatus.hidden = false;
    submitBtn.disabled = false;
  }
});

adminEventsList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.admin-delete');
  if (!btn) return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (!confirm('Supprimer cet événement ?')) return;

  btn.disabled = true;
  try {
    const { events, sha } = await fetchEventsFile(token);
    const removed = events.find((ev) => ev.id === btn.dataset.id);
    const filtered = events.filter((ev) => ev.id !== btn.dataset.id);
    await saveEventsFile(token, filtered, sha, `Supprime l'événement : ${removed ? removed.title : btn.dataset.id}`);
    renderAdminEvents(filtered);
  } catch (err) {
    alert(err.message || 'Erreur lors de la suppression.');
    btn.disabled = false;
  }
});

const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken) {
  loadPanel(savedToken).catch(() => localStorage.removeItem(TOKEN_KEY));
}
