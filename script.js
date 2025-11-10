/**************************************************************
 * 📅 script.js — Planning TPL (Cloudflare Proxy + Offline)
 * ------------------------------------------------------------
 * - Charge les données via ton proxy Cloudflare Workers
 * - Sauvegarde via le même proxy
 * - Stocke localement en cas de déconnexion
 * - Gère les thèmes clair/sombre et le bouton d’ajout mobile
 **************************************************************/

// 🌐 URLs
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL =
  "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" +
  encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
const ADD_EVENT_BTN = document.getElementById("add-event-btn");
let isOffline = !navigator.onLine;
let calendar = null;

/**************************************************************
 * 🔌 Gestion de la connexion
 **************************************************************/
window.addEventListener("online", () => {
  isOffline = false;
  OFFLINE_BANNER?.classList.add("hidden");
  chargerPlanning();
});

window.addEventListener("offline", () => {
  isOffline = true;
  OFFLINE_BANNER?.classList.remove("hidden");
});

/**************************************************************
 * 🔁 Chargement du planning
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.textContent = isOffline
    ? "Mode hors ligne — affichage des données locales..."
    : "Chargement du calendrier...";
  loader.classList.remove("hidden");

  let events = [];

  if (isOffline) {
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    loader.classList.add("hidden");
    if (calendar) {
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    } else {
      renderCalendar(events);
    }
    return;
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (data.status === "error") throw new Error(`Erreur Apps Script: ${data.message}`);
    events = data;
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.error("❌ Erreur de chargement:", err);
    loader.textContent = `❌ Échec du chargement (${err.message})`;
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu FullCalendar
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return;

  if (calendar) calendar.destroy();

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView: isMobile ? "timeGridWeek" : "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: isMobile ? "timeGridWeek,listWeek" : "dayGridMonth,timeGridWeek,listWeek",
    },
    height: "auto",
    selectable: true,
    editable: true,
    events: events.map((event) => {
      const color = getCategoryColor(event.category);
      return {
        id: String(event.id),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay === true,
        backgroundColor: color,
        borderColor: color,
        textColor: "#fff",
        extendedProps: { category: event.category },
      };
    }),

    // Sélection d’un créneau vide
    select: (info) => openEventModal(null, info.startStr, info.endStr),

    // Clic sur un événement existant
    eventClick: (info) => {
      const ev = info.event;
      openEventModal({
        id: ev.id,
        title: ev.title,
        start: ev.startStr,
        end: ev.endStr,
        category: ev.extendedProps.category,
        allDay: ev.allDay,
      });
    },

    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event)),
  });

  calendar.render();
}

/**************************************************************
 * 🪟 Modale d’ajout / édition
 **************************************************************/
function openEventModal(event = null, start = null, end = null) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");

  modal.classList.remove("hidden");
  document.getElementById("modal-title").textContent = event ? "Modifier l’événement" : "Nouvel événement";

  titleInput.value = event?.title || "";
  startInput.value = event?.start || start || "";
  endInput.value = event?.end || end || "";
  categorySelect.value = event?.category || "Hôtel-Dieu";

  saveBtn.onclick = () => {
    const newEvent = {
      id: event?.id || crypto.randomUUID(),
      title: titleInput.value.trim() || "Sans titre",
      start: startInput.value,
      end: endInput.value,
      allDay: false,
      category: categorySelect.value,
    };

    if (calendar) {
      const existing = calendar.getEventById(newEvent.id);
      if (existing) existing.remove();
      calendar.addEvent({
        ...newEvent,
        backgroundColor: getCategoryColor(newEvent.category),
        borderColor: getCategoryColor(newEvent.category),
        textColor: "#fff",
      });
    }

    saveEvent(newEvent);
    modal.classList.add("hidden");
  };

  cancelBtn.onclick = () => modal.classList.add("hidden");
}

/**************************************************************
 * 💾 Sauvegarde / suppression
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.end ? event.end.toISOString().substring(0, 10) : event.endStr,
    allDay: event.allDay,
    category: event.extendedProps.category || "Hôtel-Dieu",
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = saved.findIndex((e) => e.id === event.id);
  if (i >= 0) saved[i] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) return;

  try {
    await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
  } catch (err) {
    console.warn("⚠️ Sauvegarde différée (hors ligne ou erreur proxy)");
  }
}

/**************************************************************
 * 🎨 Couleurs par catégorie
 **************************************************************/
function getCategoryColor(category) {
  switch (category) {
    case "Hôtel-Dieu": return "#FFD43B";
    case "Gréneraie/Resto du Cœur": return "#2ECC71";
    case "Préfecture": return "#E74C3C";
    case "Tour de Bretagne": return "#3498DB";
    case "France Terre d’Asile": return "#9B59B6";
    default: return "#7f8c8d";
  }
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  chargerPlanning();

  ADD_EVENT_BTN.addEventListener("click", () => openEventModal());

  if (isOffline) OFFLINE_BANNER?.classList.remove("hidden");
});
