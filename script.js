/**************************************************************
 * 📅 CALENDRIER TPL — Version sans code admin (édition libre)
 * - Connexion directe à Google Apps Script
 * - Sauvegarde auto côté serveur et localStorage
 * - Modales d’ajout / édition / suppression
 * - Drag & drop + resize sauvegardés
 **************************************************************/

const API_URL = "https://script.google.com/macros/s/AKfycbyWquxaiULDkNcWMstPXSZw04M7dYe8rCieDSkaVtp-Apfggu_bS1ejwGT6Dgy4gCvD/exec";

const CATEGORY_COLORS = {
  "Réunion": "#007bff",
  "Vacances": "#28a745",
  "Perso": "#6f42c1",
  "Anniversaire": "#ff8c00",
  "Autre": "#6c757d",
};

function uid() {
  return String(Date.now()) + "-" + Math.floor(Math.random() * 10000);
}

function createModals() {
  const container = document.createElement("div");
  container.id = "tpl-modals";
  container.innerHTML = `
  <style>
    .tpl-modal { display:none; position:fixed; z-index:2000; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; }
    .tpl-modal .card { background:var(--card-bg,#fff); color:var(--card-color,#111); padding:16px; border-radius:12px; width:92%; max-width:420px; box-shadow:0 8px 24px rgba(0,0,0,0.12); }
    .tpl-modal h3 { margin:0 0 12px 0; font-size:1.1rem; }
    .tpl-modal label { display:block; font-size:0.9rem; margin-top:8px; color: #333; }
    .tpl-modal input[type="text"], .tpl-modal input[type="datetime-local"], .tpl-modal select { width:100%; padding:8px 10px; margin-top:6px; box-sizing:border-box; border-radius:8px; border:1px solid #ccc; }
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

      <label>Fin
        <input type="datetime-local" id="tpl-input-end">
      </label>

      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <input type="checkbox" id="tpl-input-allday"> Journée entière
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
      cancel: document.getElementById("tpl-cancel-btn"),
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const ui = createModals();
  const calendarEl = document.getElementById("calendar");
  const loader = document.getElementById("loader");

  function eventColorForCategory(cat) {
    return CATEGORY_COLORS[cat] || "#6c757d";
  }

  async function loadEventsFromServer() {
    const res = await fetch(API_URL);
    const data = await res.json();
    const normalized = data.map(ev => ({
      id: ev.id || uid(),
      title: ev.title || "",
      start: ev.start || null,
      end: ev.end || null,
      allDay: ev.allDay === "TRUE" || ev.allDay === true || ev.allDay === "true",
      category: ev.category || ev.cat || ev.categorie || "Autre"
    }));
    localStorage.setItem("tplEvents", JSON.stringify(normalized));
    return normalized;
  }

  async function loadEvents() {
    try {
      const events = await loadEventsFromServer();
      console.log("Events loaded:", events.length);
      return events;
    } catch {
      const cached = localStorage.getItem("tplEvents");
      return cached ? JSON.parse(cached) : [];
    }
  }

  async function saveAllEventsToServer(events) {
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(events),
        headers: { "Content-Type": "application/json" }
      });
      localStorage.setItem("tplEvents", JSON.stringify(events));
      console.log("✅ Sauvegarde réussie :", events.length);
    } catch (e) {
      console.warn("⚠️ Erreur de sauvegarde, cache local utilisé.", e);
      localStorage.setItem("tplEvents", JSON.stringify(events));
    }
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 768 ? "listWeek" : "dayGridMonth",
    locale: "fr",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },
    selectable: true,
    editable: true,
    height: "auto",
    eventDidMount(info) {
      const cat = info.event.extendedProps.category;
      if (cat) {
        const color = eventColorForCategory(cat);
        info.el.style.backgroundColor = color;
        info.el.style.borderColor = color;
      }
    },
    select(selectionInfo) {
      openEventModal({ start: selectionInfo.startStr, end: selectionInfo.endStr, allDay: selectionInfo.allDay });
      calendar.unselect();
    },
    eventClick(clickInfo) {
      const ev = clickInfo.event;
      const ext = ev.extendedProps || {};
      openEventModal({
        id: ev.id,
        title: ev.title,
        category: ext.category || "Autre",
        start: ev.start ? ev.start.toISOString().slice(0, 16) : "",
        end: ev.end ? ev.end.toISOString().slice(0, 16) : "",
        allDay: ev.allDay
      });
    },
    eventDrop: () => scheduleSaveAll(),
    eventResize: () => scheduleSaveAll(),
    windowResize: () => {
      if (window.innerWidth < 768) calendar.changeView("listWeek");
      else calendar.changeView("dayGridMonth");
    }
  });

  calendar.render();

  async function initialLoad() {
    loader && (loader.style.display = "block");
    const events = await loadEvents();
    calendar.removeAllEvents();
    events.forEach(ev => calendar.addEvent(ev));
    loader && (loader.style.display = "none");
  }

  await initialLoad();

  const { eventModal, inputs, buttons } = ui;
  let editingEventId = null;

  function openEventModal(data = {}) {
    editingEventId = data.id || null;
    inputs.title.value = data.title || "";
    inputs.category.value = data.category || Object.keys(CATEGORY_COLORS)[0];
    inputs.start.value = data.start ? normalizeToLocalDatetime(data.start) : "";
    inputs.end.value = data.end ? normalizeToLocalDatetime(data.end) : "";
    inputs.allDay.checked = !!data.allDay;
    buttons.delete.style.display = editingEventId ? "inline-block" : "none";
    document.getElementById("tpl-modal-title").textContent = editingEventId ? "Modifier l'événement" : "Nouvel événement";
    eventModal.style.display = "flex";
  }

  function closeEventModal() {
    editingEventId = null;
    eventModal.style.display = "none";
  }

  function normalizeToLocalDatetime(value) {
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  buttons.save.addEventListener("click", async () => {
    const title = inputs.title.value.trim();
    if (!title) { alert("Le titre est requis."); return; }
    const category = inputs.category.value || "Autre";
    const start = inputs.start.value ? new Date(inputs.start.value).toISOString() : null;
    const end = inputs.end.value ? new Date(inputs.end.value).toISOString() : null;
    const allDay = !!inputs.allDay.checked;

    if (editingEventId) {
      const ev = calendar.getEventById(editingEventId);
      if (ev) {
        ev.setProp("title", title);
        ev.setExtendedProp("category", category);
        ev.setAllDay(allDay);
        ev.setStart(start);
        ev.setEnd(end || null);
      }
    } else {
      calendar.addEvent({ id: uid(), title, start, end, allDay, category });
    }

    await saveAllEvents();
    closeEventModal();
  });

  buttons.delete.addEventListener("click", async () => {
    if (!editingEventId) { closeEventModal(); return; }
    if (!confirm("Supprimer cet événement ?")) return;
    const ev = calendar.getEventById(editingEventId);
    if (ev) ev.remove();
    await saveAllEvents();
    closeEventModal();
  });

  buttons.cancel.addEventListener("click", closeEventModal);
  window.addEventListener("click", e => { if (e.target === eventModal) closeEventModal(); });

  async function saveAllEvents() {
    const events = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start ? ev.start.toISOString() : null,
      end: ev.end ? ev.end.toISOString() : null,
      allDay: ev.allDay,
      category: ev.extendedProps.category || "Autre"
    }));
    await saveAllEventsToServer(events);
  }

  let saveTimeout = null;
  function scheduleSaveAll() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveAllEvents(), 700);
  }

  // Sauvegarde locale avant fermeture
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("tplEvents", JSON.stringify(calendar.getEvents()));
  });
});
