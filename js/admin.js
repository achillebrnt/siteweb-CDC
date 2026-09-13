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

const evIdInput = document.getElementById('ev-id');
const evDateInput = document.getElementById('ev-date');
const evTimeInput = document.getElementById('ev-time');
const evTagInput = document.getElementById('ev-tag');
const evTitleInput = document.getElementById('ev-title');
const evDescInput = document.getElementById('ev-desc');
const evPhotoInput = document.getElementById('ev-photo');
const currentPhotoBlock = document.getElementById('ev-current-photo');
const currentPhotoImg = document.getElementById('ev-current-photo-img');
const removePhotoCheckbox = document.getElementById('ev-remove-photo');
const submitBtn = document.getElementById('event-submit-btn');
const cancelBtn = document.getElementById('event-cancel-btn');

let currentEvents = [];

const monthNames = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const CATEGORY_COLORS = {
  'Soirée à thème': 'var(--gold)',
  'Concert / Live': 'var(--teal)',
  'DJ Set': '#d6588f',
  'Happy Hour': '#e2733f',
  'Spécial': '#9b7fd4',
};
const DEFAULT_CATEGORY_COLOR = '#8a7a68';

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

function resizeImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format d'image non pris en charge."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadEventPhoto(token, file, eventId) {
  const base64 = await resizeImage(file);
  const path = `images/evenements/${eventId}.jpg`;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

  let sha;
  const getRes = await fetch(`${url}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (getRes.ok) { sha = (await getRes.json()).sha; }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Ajoute/remplace la photo de l'événement ${eventId}`, content: base64, sha, branch: BRANCH }),
  });
  if (!res.ok) throw new Error("L'envoi de la photo a échoué.");
  return path;
}

async function deleteEventPhoto(token, path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const getRes = await fetch(`${url}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!getRes.ok) return;
  const { sha } = await getRes.json();
  await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Supprime la photo ${path}`, sha, branch: BRANCH }),
  });
}

function renderAdminEvents(events) {
  currentEvents = events;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    adminEventsList.innerHTML = '<p class="admin-empty">Aucun événement publié pour l’instant.</p>';
    return;
  }
  adminEventsList.innerHTML = sorted.map((ev) => {
    const d = new Date(`${ev.date}T00:00:00`);
    const accent = CATEGORY_COLORS[ev.tag] || DEFAULT_CATEGORY_COLOR;
    const meta = [ev.time, ev.tag].filter(Boolean).map(escapeHtml).join(' — ');
    const thumb = ev.photo
      ? `<img class="admin-event-thumb" src="${escapeHtml(ev.photo)}" alt="">`
      : `<span class="admin-event-thumb admin-event-thumb-empty" style="--accent:${accent}"></span>`;
    return `
      <div class="admin-event-row" style="--accent:${accent}">
        ${thumb}
        <div class="event-date"><span class="event-day">${d.getDate()}</span><span class="event-month">${monthNames[d.getMonth()]}</span></div>
        <div class="admin-event-info">
          <strong>${escapeHtml(ev.title)}</strong>
          <span><span class="admin-category-dot"></span>${meta}</span>
        </div>
        <div class="admin-event-actions">
          <button type="button" class="btn btn-ghost admin-edit" data-id="${ev.id}">Modifier</button>
          <button type="button" class="btn btn-danger admin-delete" data-id="${ev.id}">Supprimer</button>
        </div>
      </div>`;
  }).join('');
}

function resetFormToAddMode() {
  eventForm.reset();
  evIdInput.value = '';
  currentPhotoBlock.hidden = true;
  submitBtn.textContent = "Publier l'événement";
  cancelBtn.hidden = true;
}

function enterEditMode(ev) {
  evIdInput.value = ev.id;
  evDateInput.value = ev.date || '';
  evTimeInput.value = ev.time || '';
  evTagInput.value = ev.tag || 'Autre';
  evTitleInput.value = ev.title || '';
  evDescInput.value = ev.description || '';
  evPhotoInput.value = '';
  removePhotoCheckbox.checked = false;
  if (ev.photo) {
    currentPhotoImg.src = ev.photo;
    currentPhotoBlock.hidden = false;
  } else {
    currentPhotoBlock.hidden = true;
  }
  submitBtn.textContent = 'Enregistrer les modifications';
  cancelBtn.hidden = false;
  eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

cancelBtn.addEventListener('click', resetFormToAddMode);

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

  const editingId = evIdInput.value;
  submitBtn.disabled = true;
  eventStatus.hidden = true;

  const formData = {
    date: evDateInput.value,
    time: evTimeInput.value.trim(),
    tag: evTagInput.value,
    title: evTitleInput.value.trim(),
    description: evDescInput.value.trim(),
  };
  const photoFile = evPhotoInput.files[0];
  const removePhoto = removePhotoCheckbox.checked;

  try {
    const { events, sha } = await fetchEventsFile(token);

    if (editingId) {
      const idx = events.findIndex((ev) => ev.id === editingId);
      if (idx === -1) throw new Error("Cet événement n'existe plus — recharge la page.");
      const updated = { ...events[idx], ...formData, id: editingId };

      if (photoFile) {
        eventStatus.textContent = 'Envoi de la photo...';
        eventStatus.className = 'admin-status';
        eventStatus.hidden = false;
        updated.photo = await uploadEventPhoto(token, photoFile, editingId);
      } else if (removePhoto && events[idx].photo) {
        await deleteEventPhoto(token, events[idx].photo).catch(() => {});
        delete updated.photo;
      }

      events[idx] = updated;
      eventStatus.textContent = 'Mise à jour en cours...';
      eventStatus.hidden = false;
      await saveEventsFile(token, events, sha, `Modifie l'événement : ${updated.title}`);
      renderAdminEvents(events);
      resetFormToAddMode();
      eventStatus.textContent = 'Modifications enregistrées !';
      eventStatus.className = 'admin-status';
    } else {
      const newEvent = { id: Date.now().toString(36), ...formData };

      if (photoFile) {
        eventStatus.textContent = 'Envoi de la photo...';
        eventStatus.className = 'admin-status';
        eventStatus.hidden = false;
        newEvent.photo = await uploadEventPhoto(token, photoFile, newEvent.id);
      }

      events.push(newEvent);
      eventStatus.textContent = "Publication de l'événement...";
      eventStatus.hidden = false;
      await saveEventsFile(token, events, sha, `Ajoute l'événement : ${newEvent.title}`);
      renderAdminEvents(events);
      resetFormToAddMode();
      eventStatus.textContent = 'Publié ! Il sera visible sur le site dans une minute environ.';
      eventStatus.className = 'admin-status';
    }
  } catch (err) {
    eventStatus.textContent = err.message || 'Erreur lors de la publication.';
    eventStatus.className = 'admin-error';
  } finally {
    eventStatus.hidden = false;
    submitBtn.disabled = false;
  }
});

adminEventsList.addEventListener('click', async (e) => {
  const editBtn = e.target.closest('.admin-edit');
  if (editBtn) {
    const ev = currentEvents.find((item) => item.id === editBtn.dataset.id);
    if (ev) enterEditMode(ev);
    return;
  }

  const btn = e.target.closest('.admin-delete');
  if (!btn) return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (!confirm('Supprimer cet événement ?')) return;

  if (btn.dataset.id === evIdInput.value) resetFormToAddMode();

  btn.disabled = true;
  try {
    const { events, sha } = await fetchEventsFile(token);
    const removed = events.find((ev) => ev.id === btn.dataset.id);
    const filtered = events.filter((ev) => ev.id !== btn.dataset.id);
    await saveEventsFile(token, filtered, sha, `Supprime l'événement : ${removed ? removed.title : btn.dataset.id}`);
    renderAdminEvents(filtered);
    if (removed && removed.photo) {
      deleteEventPhoto(token, removed.photo).catch(() => {});
    }
  } catch (err) {
    alert(err.message || 'Erreur lors de la suppression.');
    btn.disabled = false;
  }
});

const savedToken = localStorage.getItem(TOKEN_KEY);
if (savedToken) {
  loadPanel(savedToken).catch(() => localStorage.removeItem(TOKEN_KEY));
}
