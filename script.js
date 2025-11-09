/* ============================
  Calendrier TPL - script.js (version publique)
  - Lecture / écriture (Google Apps Script)
  - Cache local (localStorage)
  - Ajout / Édition / Suppression via modales
  - Drag/drop & resize sauvegardés
  - Catégories + couleurs
  ============================ */

/* === CONFIGURATION === */
const API_URL = "https://script.google.com/macros/s/AKfycbx5XjXx-sQfFZoClN8PuYAK9g7-g10i5kqgJxEdLI7W4gOA0aRNRPHcs1DLM5qitGuf/exec";

// Couleurs par catégorie
const CATEGORY_COLORS = {
  "Réunion": "#007bff",
  "Vacances": "#28a745",
  "Perso": "#6f42c1",
  "Anniversaire": "#ff8c00",
  "Autre": "#6c757d",
};

/* === UTILITAIRES === */
function uid() {
  return String(Date.now()) + "-" + Math.floor(Math.random() * 10000);
}

/* === MODALES === */
function createModals() {
  const container = document.createElement("div");
  container.id = "tpl-modals";
  container.innerHTML = `
  <style>
    .tpl-modal { display:none; position:fixed; z-index:2000; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; }
    .tpl-modal .card { background:#fff; color:#111; padding:16px; border-radius:12px; width:92%; max-width:420px; box-shadow:0 8px 24px rgba(0,0,0,0.12); }
    .tpl-modal h3 { margin:0 0 12px 0; font-size:1.1rem; }
    .tpl-modal label { display:block; font-size:0.9rem; margin-top:8px; color:#333; }
    .tpl-modal input, .tpl-modal select { width:100%; padding:8px 10px; margin-top:6px; border-radius:8px; border:1px solid #ccc; }
    .tpl-modal .row { display:flex; gap:8px; margin-top:12px; }
    .tpl-modal .row button { flex:1; padding:10px; border-radius:8px; border:none; cursor:pointer; font-weight:600; }
    .tpl-btn-primary { background:#007bff; color:white; }
    .tpl-btn-danger { background:#dc3545; color:white; }
    .tpl-btn-muted { background:#e9ecef; color:#333; }
  </style>

  <div class="tpl-modal" id="tpl-event-modal">
    <div class="card">
      <h3 id="tpl-modal-title">Nouvel événement</h3>

      <label>Titre
        <input type="text" id="tpl-input-title" placeholder="Titre de l'événement">
      </label>

      <label>Catégorie
        <select id="tpl-input-category">
          ${Object.keys(CATEGORY_COLORS).map(cat => `<option value="${cat}">${cat}</option>`).join("")}
        </select>
      </label>

      <label>Début
        <input type="datetime-local" id="tpl-input-start">
      </label>

      <label>Fin (optionnel)
        <input type="datetime-local" id="tpl-input-end">
      </label>

      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <input type="checkbox" id="tpl-input-allday"> <span>Journée entière</span>
      </label>

      <div class="row">
        <button id="tpl-save-btn" class="tpl-btn-primary">Enregistrer</button>
        <button id="tpl-delete-btn" class="tpl-btn-danger">Supprimer</button>
        <button id="tpl-cancel-btn" class="tpl-btn-muted">Annuler</button>
      </div>
    </div>
  </div>
  `;
  document.body.appendChild(container);

  return {
    eventModal: document.getElementById("tpl-event-modal"),
    inputs: {
      title: document.getElementById("tpl-input-title"),
      category: document.getElementById("tpl-input-category"),
      start: document.getElementById("tpl-input-start"),
      end: document.getElementById("tpl-input-end"),
      allDay: document.getElementById("tpl-input-allday")
    },
    buttons: {
      save: document.getElementById("tpl-save-btn"),
      delete: document.getElementById("tpl-delete-btn"),
      cancel: document.getElementById("tpl-cancel-btn")
    }
  };
}

/* === MAIN === */
document.addEventListener("DOMContentLoaded", async () => {
  const ui = createModals();
  const calendarEl = document.getElementById("calendar");
  const loader = document.getElementById("loader");

  function eventColorForCategory(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Autre"];
  }

  async function loadEventsFromServer() {
    const res = await fetch(API_URL);
    const data = await res.json();
    const normalized = data.map(ev => ({
      id: ev.id || uid(),
      title: ev.title || "",
      start: ev.start || null,
      end: ev.end || null,
      allDay: ev.allDay === "TRUE" || ev.allDay === true,
      category: ev.category || "Autre"
    }));
    localStorage.setItem("tplEvents", JSON.stringify(normalized));
    return normalized;
  }

  async function loadEvents() {
    try {
      return await loadEventsFromServer();
    } catch {
      const cached = localStorage.getItem("tplEvents");
      return cached ? JSON.parse(cached) : [];
    }
  }

  async function saveAllEventsToServer(eventsArray) {
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(eventsArray),
        headers: { "Content-Type": "application/json" }
      });
      localStorage.setItem("tplEvents", JSON.stringify(eventsArray));
      console.log("✅ Planning sauvegardé !");
    } catch (e) {
      console.warn("⚠️ Échec de sauvegarde :", e);
      localStorage.setItem("tplEvents", JSON.stringify(eventsArray));
    }
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 768 ? "listWeek" : "dayGridMonth",
    locale: "fr",
    selectable: true,
    editable: true,
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },
    eventDidMount(info) {
      const cat = info.event.extendedProps.category;
      info.el.style.backgroundColor = eventColorForCategory(cat);
      info.el.style.borderColor = eventColorForCategory(cat);
    },
    select(info) {
      openEventModal({ start: info.startStr, end: info.endStr, allDay: info.allDay });
      calendar.unselect();
    },
    eventClick(clickInfo) {
      const ev = clickInfo.event;
      openEventModal({
        id: ev.id,
        title: ev.title,
        category: ev.extendedProps.category || "Autre",
        start: ev.start ? ev.start.toISOString().slice(0, 16) : "",
        end: ev.end ? ev.end.toISOString().slice(0, 16) : "",
        allDay: ev.allDay
      });
    },
    eventDrop() {
      scheduleSaveAll();
    },
    eventResize() {
      scheduleSaveAll();
    },
    windowResize() {
      if (window.innerWidth < 768) calendar.changeView("listWeek");
      else calendar.changeView("dayGridMonth");
    }
  });

  calendar.render();

  async function initialLoad() {
    loader && (loader.style.display = "block");
    calendarEl.style.display = "none";
    const events = await loadEvents();
    calendar.removeAllEvents();
    events.forEach(ev => calendar.addEvent(ev));
    loader && (loader.style.display = "none");
    calendarEl.style.display = "block";
  }

  await initialLoad();

  /* === MODALE LOGIC === */
  const eventModal = ui.eventModal;
  const inputs = ui.inputs;
  const buttons = ui.buttons;
  let editingEventId = null;

  function openEventModal(data = {}) {
    editingEventId = data.id || null;
    inputs.title.value = data.title || "";
    inputs.category.value = data.category || "Autre";
    inputs.start.value = data.start || "";
    inputs.end.value = data.end || "";
    inputs.allDay.checked = !!data.allDay;
    buttons.delete.style.display = editingEventId ? "inline-block" : "none";
    document.getElementById("tpl-modal-title").textContent = editingEventId ? "Modifier l'événement" : "Nouvel événement";
    eventModal.style.display = "flex";
  }

  function closeEventModal() {
    eventModal.style.display = "none";
    editingEventId = null;
  }

  buttons.save.addEventListener("click", async () => {
    const title = inputs.title.value.trim();
    if (!title) return alert("Le titre est requis.");
    const newEvent = {
      id: editingEventId || uid(),
      title,
      start: inputs.start.value ? new Date(inputs.start.value).toISOString() : null,
      end: inputs.end.value ? new Date(inputs.end.value).toISOString() : null,
      allDay: !!inputs.allDay.checked,
      category: inputs.category.value || "Autre"
    };

    if (editingEventId) {
      const ev = calendar.getEventById(editingEventId);
      if (ev) {
        ev.setProp("title", newEvent.title);
        ev.setExtendedProp("category", newEvent.category);
        ev.setAllDay(newEvent.allDay);
        ev.setStart(newEvent.start);
        ev.setEnd(newEvent.end);
      }
    } else {
      calendar.addEvent(newEvent);
    }

    await saveAllEvents();
    closeEventModal();
  });

  buttons.delete.addEventListener("click", async () => {
    if (!editingEventId) return closeEventModal();
    if (!confirm("Supprimer cet événement ?")) return;
    const ev = calendar.getEventById(editingEventId);
    if (ev) ev.remove();
    await saveAllEvents();
    closeEventModal();
  });

  buttons.cancel.addEventListener("click", closeEventModal);
  window.addEventListener("click", (e) => { if (e.target === eventModal) closeEventModal(); });

  async function saveAllEvents() {
    const events = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start ? ev.start.toISOString() : "",
      end: ev.end ? ev.end.toISOString() : "",
      allDay: ev.allDay,
      category: ev.extendedProps.category || "Autre"
    }));
    await saveAllEventsToServer(events);
  }

  let saveTimeout = null;
  function scheduleSaveAll() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => { saveAllEvents(); saveTimeout = null; }, 700);
  }

  window.addEventListener("beforeunload", () => saveAllEvents());
});
