/* ============================
  Calendrier TPL - script.js
  - Charge / Sauvegarde (Google Apps Script)
  - Cache local (localStorage)
  - Ajout / Édition / Suppression via modales
  - Drag/drop & resize sauvegardés
  - Catégories + couleurs
  - Mode admin (simple, côté client)
  - Modales injectées dynamiquement (pas besoin de changer index.html)
  ============================ */

/* === CONFIGURATION === */
const API_URL = "https://script.google.com/macros/s/AKfycbyTA-TjsPcl5n-rG14La4ZYCmI--K0cbCIqt4OSXE_Kqsle0EBWX9u5fUZ6slL53-11/exec";

// Mot de passe admin (simple, côté client). Change-le ici.
const ADMIN_CODE = "tpl-admin-2025";

// Mapping catégorie -> couleur (personnalisable)
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

function isOnline() {
  return navigator.onLine;
}

/* === UI : Création des modales dynamiquement === */
function createModals() {
  // container
  const container = document.createElement("div");
  container.id = "tpl-modals";
  container.innerHTML = `
  <style>
    /* minimal modal styles (scoped) */
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
    .tpl-small { font-size:0.9rem; padding:8px 10px; }
    @media (prefers-color-scheme: dark) {
      .tpl-modal .card { background:#1f1f1f; color:#eee; border:1px solid rgba(255,255,255,0.04); }
      .tpl-modal label { color:#ddd; }
      .tpl-modal input, .tpl-modal select { background:#2b2b2b; color:#eee; border:1px solid #444; }
    }
  </style>

  <!-- MODALE D'AJOUT / EDIT -->
  <div class="tpl-modal" id="tpl-event-modal" aria-hidden="true">
    <div class="card" role="dialog" aria-modal="true" aria-labelledby="tpl-modal-title">
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
        <input type="checkbox" id="tpl-input-allday"> <span style="font-size:0.95rem;">Journée entière</span>
      </label>

      <div class="row">
        <button id="tpl-save-btn" class="tpl-btn-primary tpl-small">Enregistrer</button>
        <button id="tpl-delete-btn" class="tpl-btn-danger tpl-small">Supprimer</button>
        <button id="tpl-cancel-btn" class="tpl-btn-muted tpl-small">Annuler</button>
      </div>
    </div>
  </div>

  <!-- MODALE ADMIN LOGIN (simple) -->
  <div class="tpl-modal" id="tpl-admin-modal" aria-hidden="true">
    <div class="card">
      <h3>Mode édition</h3>
      <label>Code admin
        <input type="text" id="tpl-admin-code" placeholder="Code admin">
      </label>
      <div class="row">
        <button id="tpl-admin-login" class="tpl-btn-primary tpl-small">Activer édition</button>
        <button id="tpl-admin-cancel" class="tpl-btn-muted tpl-small">Fermer</button>
      </div>
    </div>
  </div>
  `;

  document.body.appendChild(container);

  // return references
  return {
    eventModal: document.getElementById("tpl-event-modal"),
    adminModal: document.getElementById("tpl-admin-modal"),
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
      adminLogin: document.getElementById("tpl-admin-login"),
      adminCancel: document.getElementById("tpl-admin-cancel")
    },
    adminInput: document.getElementById("tpl-admin-code")
  };
}

/* === MAIN === */
document.addEventListener("DOMContentLoaded", async () => {
  // inject modals and get refs
  const ui = createModals();

  const calendarEl = document.getElementById("calendar");
  const loader = document.getElementById("loader");

  // admin state (session)
  const isAdmin = () => sessionStorage.getItem("tpl_is_admin") === "1";

  // utilities for category color
  function eventColorForCategory(cat) {
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Autre"] || "#6c757d";
  }

  /* ----- LOAD / SAVE ----- */
  async function loadEventsFromServer() {
    const res = await fetch(API_URL);
    const data = await res.json();
    // Ensure consistent shape and cache locally
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
      console.log("Events loaded from server:", events.length);
      return events;
    } catch (e) {
      console.warn("Could not load from server, using cache", e);
      const cached = localStorage.getItem("tplEvents");
      return cached ? JSON.parse(cached) : [];
    }
  }

  async function saveAllEventsToServer(eventsArray) {
    // eventsArray: array of plain event objects
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(eventsArray),
        headers: { "Content-Type": "application/json" }
      });
      // update cache
      localStorage.setItem("tplEvents", JSON.stringify(eventsArray));
      console.log("Saved to server, items:", eventsArray.length);
      return true;
    } catch (e) {
      console.warn("Save failed, offline:", e);
      // still update local cache
      localStorage.setItem("tplEvents", JSON.stringify(eventsArray));
      return false;
    }
  }

  /* ----- Calendar init ----- */
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
    eventDidMount: function(info) {
      // apply category color if present
      const cat = info.event.extendedProps.category;
      if (cat) {
        info.el.style.backgroundColor = eventColorForCategory(cat);
        info.el.style.borderColor = eventColorForCategory(cat);
      }
    },
    select: function(selectionInfo) {
      // only allow edit if admin or if editing enabled
      if (!isAdmin()) {
        // prompt for admin or allow quick add if public editing allowed
        if (!confirm("Activer le mode édition pour ajouter un événement ? (code requis)")) {
          calendar.unselect();
          return;
        }
        ui.adminModal.style.display = "flex";
        return;
      }
      openEventModal({ start: selectionInfo.startStr, end: selectionInfo.endStr, allDay: selectionInfo.allDay });
      calendar.unselect();
    },
    eventClick: function(clickInfo) {
      // show edit modal (only if admin)
      const ev = clickInfo.event;
      const ext = ev.extendedProps || {};
      if (!isAdmin()) {
        // show read-only info
        const s = ev.start ? ev.start.toLocaleString() : ev.startStr;
        const e = ev.end ? ev.end.toLocaleString() : (ev.endStr || "");
        alert(`Événement : ${ev.title}\nCatégorie : ${ext.category || "—"}\nDébut : ${s}\nFin : ${e}`);
        return;
      }
      openEventModal({
        id: ev.id,
        title: ev.title,
        category: ext.category || "Autre",
        start: ev.start ? ev.start.toISOString().slice(0,16) : ev.startStr,
        end: ev.end ? ev.end.toISOString().slice(0,16) : (ev.endStr || ""),
        allDay: ev.allDay
      });
    },
    eventDrop: function() {
      scheduleSaveAll();
    },
    eventResize: function() {
      scheduleSaveAll();
    },
    windowResize: function() {
      if (window.innerWidth < 768) calendar.changeView("listWeek");
      else calendar.changeView("dayGridMonth");
    }
  });

  calendar.render();

  /* ----- Loader + initial load ----- */
  async function initialLoad() {
    loader && (loader.style.display = "block");
    calendarEl.style.display = "none";
    const events = await loadEvents();
    calendar.removeAllEvents();
    // Add normalized events to FullCalendar
    events.forEach(ev => {
      calendar.addEvent({
        id: ev.id || uid(),
        title: ev.title,
        start: ev.start,
        end: ev.end || null,
        allDay: !!ev.allDay,
        category: ev.category || "Autre"
      });
    });
    loader && (loader.style.display = "none");
    calendarEl.style.display = "block";
  }

  await initialLoad();

  /* ----- Modal logic (add / edit) ----- */
  const eventModal = ui.eventModal;
  const inputs = ui.inputs;
  const buttons = ui.buttons;

  let editingEventId = null; // null => creating new

  function openEventModal(data = {}) {
    editingEventId = data.id || null;
    // populate inputs
    inputs.title.value = data.title || "";
    inputs.category.value = data.category || Object.keys(CATEGORY_COLORS)[0];
    // handle datetime-local format: browsers expect "YYYY-MM-DDTHH:MM"
    inputs.start.value = data.start ? normalizeToLocalDatetime(data.start) : "";
    inputs.end.value = data.end ? normalizeToLocalDatetime(data.end) : "";
    inputs.allDay.checked = !!data.allDay;
    ui.buttons.delete.style.display = editingEventId ? "inline-block" : "none";
    document.getElementById("tpl-modal-title").textContent = editingEventId ? "Modifier l'événement" : "Nouvel événement";
    eventModal.style.display = "flex";
    inputs.title.focus();
  }

  function closeEventModal() {
    editingEventId = null;
    eventModal.style.display = "none";
  }

  function normalizeToLocalDatetime(value) {
    // value can be ISO string or date-only; produce YYYY-MM-DDTHH:MM
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    const pad = n => String(n).padStart(2,"0");
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth()+1);
    const DD = pad(d.getDate());
    const HH = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  }

  // Save button handler
  buttons.save.addEventListener("click", async () => {
    if (!isAdmin()) {
      alert("Mode édition requis pour enregistrer les modifications.");
      return;
    }
    const title = inputs.title.value.trim();
    if (!title) { alert("Le titre est requis."); return; }
    const category = inputs.category.value || "Autre";
    const start = inputs.start.value ? new Date(inputs.start.value).toISOString() : null;
    const end = inputs.end.value ? new Date(inputs.end.value).toISOString() : null;
    const allDay = !!inputs.allDay.checked;

    if (editingEventId) {
      // update existing event
      const ev = calendar.getEventById(editingEventId);
      if (ev) {
        ev.setProp("title", title);
        ev.setExtendedProp("category", category);
        // set dates
        ev.setAllDay(allDay);
        ev.setStart(start);
        if (end) ev.setEnd(end);
        else ev.setEnd(null);
      }
    } else {
      // create new
      const newId = uid();
      calendar.addEvent({
        id: newId,
        title,
        start: start,
        end: end || null,
        allDay,
        category
      });
    }

    await saveAllEvents();
    closeEventModal();
  });

  // Delete button handler
  buttons.delete.addEventListener("click", async () => {
    if (!isAdmin()) { alert("Mode édition requis."); return; }
    if (!editingEventId) { closeEventModal(); return; }
    if (!confirm("Supprimer cet événement ?")) return;
    const ev = calendar.getEventById(editingEventId);
    if (ev) ev.remove();
    await saveAllEvents();
    closeEventModal();
  });

  // Cancel button
  buttons.cancel.addEventListener("click", () => closeEventModal());

  // Close modal click outside
  window.addEventListener("click", (e) => {
    if (e.target === eventModal) closeEventModal();
    if (e.target === ui.adminModal) ui.adminModal.style.display = "none";
  });

  /* ----- Admin modal behavior ----- */
  ui.buttons.adminLogin.addEventListener("click", () => {
    const code = ui.adminInput.value.trim();
    if (code === ADMIN_CODE) {
      sessionStorage.setItem("tpl_is_admin", "1");
      ui.adminModal.style.display = "none";
      alert("Mode édition activé ✅");
    } else {
      alert("Code incorrect.");
    }
  });
  ui.buttons.adminCancel.addEventListener("click", () => ui.adminModal.style.display = "none");

  /* ----- Save all events: gather, convert to plain objects, POST ----- */
  async function saveAllEvents() {
    // gather events
    const events = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start ? ev.start.toISOString() : ev.startStr,
      end: ev.end ? ev.end.toISOString() : (ev.endStr || ""),
      allDay: !!ev.allDay,
      category: ev.extendedProps ? ev.extendedProps.category || "Autre" : "Autre"
    }));
    // always update local cache
    localStorage.setItem("tplEvents", JSON.stringify(events));
    // try to post to server
    await saveAllEventsToServer(events);
  }

  /* Debounce save calls to avoid too many rapid posts */
  let saveTimeout = null;
  function scheduleSaveAll() {
    if (!isAdmin()) return; // only admin can trigger save
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveAllEvents();
      saveTimeout = null;
    }, 700);
  }

  /* Quick action: small admin toggle in header (inject button) */
  function injectAdminToggle() {
    const header = document.querySelector("header");
    if (!header) return;
    // check if already injected
    if (document.getElementById("tpl-admin-toggle")) return;

    const btn = document.createElement("button");
    btn.id = "tpl-admin-toggle";
    btn.textContent = isAdmin() ? "Édition : ON" : "Activer édition";
    btn.style.marginLeft = "12px";
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "8px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "600";
    btn.style.background = isAdmin() ? "#198754" : "#ffc107";
    btn.style.color = isAdmin() ? "#fff" : "#111";
    btn.addEventListener("click", () => {
      if (isAdmin()) {
        // deactivate
        sessionStorage.removeItem("tpl_is_admin");
        btn.textContent = "Activer édition";
        btn.style.background = "#ffc107"; btn.style.color = "#111";
        alert("Mode édition désactivé.");
      } else {
        // open admin modal
        ui.adminModal.style.display = "flex";
      }
    });
    header.appendChild(btn);
  }
  injectAdminToggle();

  /* Keyboard shortcut (Ctrl+E) to open admin modal quickly */
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
      ui.adminModal.style.display = "flex";
    }
  });

  /* Expose a manual refresh function (useful for debugging) */
  window.tplRefreshEvents = async function() {
    await initialLoad();
    alert("Planning rechargé.");
  };

  /* Autosave on page unload if admin */
  window.addEventListener("beforeunload", (e) => {
    if (isAdmin()) {
      // best-effort save
      saveAllEvents();
    }
  });
});
