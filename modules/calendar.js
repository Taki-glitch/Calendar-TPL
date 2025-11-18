// modules/calendar.js
import { t, translateCategory, getCategoryMapping, categoryKeyFromValue } from './i18n.js';
import * as Storage from './storage.js';
import { PROXY_URL } from '../app.js'; // note: circular import handled by value

let calendar = null;
let isOffline = !navigator.onLine;
let currentLang = localStorage.getItem('lang') || 'fr';
let lastSelectedCategory = 'hotel';

export function init({ PROXY_URL: proxy, Storage: storageModule, Theme, I18n }) {
  // bind UI
  document.getElementById('menu-btn')?.addEventListener('click', openMenu);
  document.getElementById('overlay')?.addEventListener('click', closeMenu);
  document.getElementById('menu-close')?.addEventListener('click', closeMenu);

  document.getElementById('add-event-btn')?.addEventListener('click', () => openEventModal(null));

  // export buttons handled elsewhere

  // modal buttons
  const saveBtn = document.getElementById('save-event');
  const cancelBtn = document.getElementById('cancel-event');
  const deleteBtn = document.getElementById('delete-event');

  // Delete behavior
  deleteBtn?.addEventListener('click', () => {
    const id = deleteBtn.dataset.eventId;
    if (!id) return;
    if (!confirm(t('Supprimer cet événement ?', 'Удалить это событие?'))) return;
    // remove from calendar and local storage
    const ev = calendar.getEventById(id);
    ev && ev.remove();
    let saved = JSON.parse(localStorage.getItem('tplEvents') || '[]');
    saved = saved.filter(e => e.id !== id);
    localStorage.setItem('tplEvents', JSON.stringify(saved));
    // send delete or queue
    if (!navigator.onLine) {
      Storage.pushPending('delete', id);
    } else {
      fetch(proxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'delete', data: [id] }),
      }).catch(() => Storage.pushPending('delete', id));
    }
    document.getElementById('event-modal')?.classList.add('hidden');
  });

  // Save behavior (with validation)
  saveBtn?.addEventListener('click', () => {
    const idInput = saveBtn.dataset.eventId;
    const titleInput = document.getElementById('event-title');
    const startInput = document.getElementById('event-start');
    const endInput = document.getElementById('event-end');
    const catSelect = document.getElementById('event-category');

    // Validation
    const title = titleInput.value.trim();
    if (!title) {
      alert(t('Le titre est requis.', 'Требуется название.'));
      titleInput.focus();
      return;
    }
    if (!startInput.value) {
      alert(t('La date de début est requise.', 'Требуется дата начала.'));
      startInput.focus();
      return;
    }
    const start = new Date(startInput.value);
    let end = endInput.value ? new Date(endInput.value) : new Date(start);
    if (end < start) {
      alert(t('La date de fin doit être après la date de début.', 'Дата окончания должна быть позже даты начала.'));
      endInput.focus();
      return;
    }

    // Build event object (use category key)
    const catKey = categoryKeyFromValue(catSelect.value);
    const payload = {
      id: idInput || (crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      category: catKey
    };

    // update local storage
    let saved = JSON.parse(localStorage.getItem('tplEvents') || '[]');
    const i = saved.findIndex(e => e.id === payload.id);
    if (i >= 0) saved[i] = payload; else saved.push(payload);
    localStorage.setItem('tplEvents', JSON.stringify(saved));

    // update calendar
    if (calendar) {
      const existing = calendar.getEventById(payload.id);
      existing && existing.remove();
      calendar.addEvent({
        id: payload.id,
        title: payload.title,
        start: payload.start,
        end: payload.end,
        backgroundColor: getCategoryColor(payload.category),
        extendedProps: { category: payload.category },
      });
    }

    // sync to server
    if (!navigator.onLine) {
      Storage.pushPending('patch', payload);
    } else {
      fetch(proxy, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'patch', data: [payload] }),
      }).catch(() => Storage.pushPending('patch', payload));
    }

    document.getElementById('event-modal')?.classList.add('hidden');
  });

  // Cancel
  cancelBtn?.addEventListener('click', () => document.getElementById('event-modal')?.classList.add('hidden'));

  // load initial data
  loadAndRender(proxy);
}

export async function reload() {
  const proxy = window.PROXY_URL || new URLSearchParams(window.location.search).get('proxy') || '';
  await loadAndRender(proxy);
}

async function loadAndRender(proxy) {
  const loader = document.getElementById('loader');
  loader && (loader.classList.remove('hidden'), loader.textContent = 'Chargement du calendrier...');
  let events = [];

  if (!navigator.onLine) {
    events = Storage.readLocal();
    loader && loader.classList.add('hidden');
    renderCalendar(events);
    return;
  }

  try {
    const res = await fetch(proxy, { method: 'GET', mode: 'cors' });
    const text = await res.text();
    events = JSON.parse(text);
    Storage.writeLocal(events);
  } catch (err) {
    console.warn('Erreur fetch, fallback local', err);
    events = Storage.readLocal();
  }
  loader && loader.classList.add('hidden');
  renderCalendar(events);
}

function renderCalendar(events) {
  const calendarEl = document.getElementById('planning');
  if (!calendarEl) return;
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth <= 900;
  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: localStorage.getItem('lang') || 'fr',
    firstDay: 1,
    nowIndicator: true,
    initialView: isMobile ? 'timeGridWeek' : 'dayGridMonth',
    headerToolbar: isMobile ? { left: 'prev,next', center: 'title', right: '' } : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    slotMinTime: '08:00:00',
    slotMaxTime: '18:00:00',
    allDaySlot: false,
    selectable: true,
    editable: true,
    height: 'auto',
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category }
    })),
    select: (info) => openEventModal(null, info),
    eventClick: (info) => openEventModal(info.event),
    eventDrop: (info) => handleEventChange(info.event),
    eventResize: (info) => handleEventChange(info.event),
  });

  calendar.render();
  applyLegendTranslations();
}

function handleEventChange(event) {
  const data = {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps?.category || 'autre'
  };
  // save local + attempt send
  let saved = JSON.parse(localStorage.getItem('tplEvents') || '[]');
  const i = saved.findIndex(e => e.id === data.id);
  if (i >= 0) saved[i] = data; else saved.push(data);
  localStorage.setItem('tplEvents', JSON.stringify(saved));

  if (!navigator.onLine) {
    Storage.pushPending('patch', data);
  } else {
    fetch(window.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'patch', data: [data] }),
    }).catch(() => Storage.pushPending('patch', data));
  }
}

function openMenu() { document.body.classList.add('menu-open'); document.documentElement.style.overflow = 'hidden'; }
function closeMenu() { document.body.classList.remove('menu-open'); document.documentElement.style.overflow = ''; }

function openEventModal(event = null, info = null) {
  const modal = document.getElementById('event-modal');
  if (!modal) return;
  const titleInput = document.getElementById('event-title');
  const startInput = document.getElementById('event-start');
  const endInput = document.getElementById('event-end');
  const categorySelect = document.getElementById('event-category');
  const saveBtn = document.getElementById('save-event');
  const deleteBtn = document.getElementById('delete-event');

  // When selecting range (info), prefill end to +1h if empty
  if (!event && info) {
    titleInput.value = '';
    startInput.value = info.startStr ? info.startStr.slice(0,16) : '';
    endInput.value = info.endStr ? info.endStr.slice(0,16) : (info.startStr ? new Date(info.startStr).toISOString().slice(0,16) : '');
    // default category
    categorySelect.value = lastSelectedCategory || 'hotel';
    deleteBtn.classList.add('hidden');
    saveBtn.dataset.eventId = '';
  } else if (event) {
    titleInput.value = event.title || '';
    startInput.value = event.startStr ? event.startStr.slice(0,16) : '';
    endInput.value = event.endStr ? event.endStr.slice(0,16) : '';
    categorySelect.value = event.extendedProps?.category || 'autre';
    deleteBtn.classList.remove('hidden');
    saveBtn.dataset.eventId = event.id;
    deleteBtn.dataset.eventId = event.id;
  } else {
    // blank
    titleInput.value = '';
    startInput.value = '';
    endInput.value = '';
    categorySelect.value = 'hotel';
    deleteBtn.classList.add('hidden');
    saveBtn.dataset.eventId = '';
  }

  modal.classList.remove('hidden');
  setTimeout(() => titleInput.focus(), 200);
}

function getCategoryColor(categoryKey) {
  const colors = {
    hotel: '#FFD43B',
    greneraie: '#2ECC71',
    pref: '#E74C3C',
    tour: '#3498DB',
    fta: '#9B59B6',
  };
  return colors[categoryKey] || '#6c757d';
}

function applyLegendTranslations() {
  const mapping = getCategoryMapping();
  document.querySelectorAll('[data-i18n-cat]').forEach(el => {
    const key = el.getAttribute('data-i18n-cat');
    el.textContent = mapping[key] || el.textContent;
  });
}
