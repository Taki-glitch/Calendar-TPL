/**************************************************************
 * 📅 script.js — Planning TPL (Catégories colorées + Responsive)
 **************************************************************/

const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
let isOffline = !navigator.onLine;
let calendar = null;
let currentEditingEvent = null;

/**************************************************************
 * 🔌 Connexion
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

  if (calendar && !isOffline) {
    loader.textContent = "🔄 Mise à jour du calendrier…";
    loader.classList.remove("hidden");
    setTimeout(() => loader.classList.add("hidden"), 1500);
  } else {
    loader.textContent = isOffline
      ? "Mode hors ligne — affichage des données locales..."
      : "Chargement du calendrier...";
    loader.classList.remove("hidden");
  }

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
    if (!res.ok) throw new Error(`Erreur HTTP du proxy: ${res.status}`);
    const data = await res.json();
    if (data.status === "error")
      throw new Error(`Erreur Apps Script: ${data.message || "Erreur inconnue"}`);
    events = data;
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.error("❌ ERREUR DE CHARGEMENT:", err);
    const displayMessage = err.message.includes("JSON")
      ? `Erreur de données (JSON invalide/vide). Vérifiez la réponse du proxy.`
      : err.message;
    loader.textContent = `❌ ÉCHEC DU CHARGEMENT. Cause : ${displayMessage}`;
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    if (events.length === 0) return;
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu FullCalendar (vue adaptative mobile/desktop)
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return;
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth < 768;
  const headerToolbar = {
    left: "prev,next today",
    center: "title",
    right: isMobile
      ? "timeGridWeek,listWeek"
      : "dayGridMonth,timeGridWeek,listWeek",
  };
  const initialView = isMobile ? "timeGridWeek" : "dayGridMonth";

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView,
    headerToolbar,
    editable: true,
    selectable: true,
    height: "auto",
    aspectRatio: isMobile ? 0.7 : 1.2,
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

    eventClick(info) {
      openEditModal(info.event);
    },
    eventDrop(info) {
      saveEvent(eventToData(info.event));
    },
    eventResize(info) {
      saveEvent(eventToData(info.event));
    },
    select(info) {
      openEventModal(info.startStr, info.endStr);
      calendar.unselect();
    },
  });

  calendar.render();

  window.addEventListener("resize", () => {
    const nowMobile = window.innerWidth < 768;
    const currentView = calendar.view.type;
    if (nowMobile && currentView === "dayGridMonth") {
      calendar.changeView("timeGridWeek");
      calendar.setOption("headerToolbar", {
        left: "prev,next today",
        center: "title",
        right: "timeGridWeek,listWeek",
      });
    } else if (!nowMobile && currentView !== "dayGridMonth") {
      calendar.changeView("dayGridMonth");
      calendar.setOption("headerToolbar", {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listWeek",
      });
    }
  });
}

/**************************************************************
 * 💾 Données
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
  const index = saved.findIndex((e) => e.id === event.id);
  if (index >= 0) saved[index] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) return;

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const result = await res.json();
    if (result.status === "error") throw new Error(result.message);
    console.log("✅ Sauvegardé :", event.title);
  } catch (err) {
    console.warn("⚠️ Sauvegarde reportée :", err);
  }
}

async function deleteEvent(id) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter((e) => e.id !== id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));
  if (isOffline) return;

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [{ id, title: "" }] }),
      mode: "cors",
    });
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const result = await res.json();
    if (result.status === "error") throw new Error(result.message);
    console.log("✅ Événement supprimé :", id);
  } catch (err) {
    console.warn("⚠️ Suppression reportée :", err);
  }
}

/**************************************************************
 * 🎨 Couleurs par catégorie
 **************************************************************/
function getCategoryColor(category) {
  switch (category) {
    case "Hôtel-Dieu": return "#FFD43B"; // Jaune
    case "Gréneraie/Resto du Cœur": return "#2ECC71"; // Vert
    case "Préfecture": return "#E74C3C"; // Rouge
    case "Tour de Bretagne": return "#3498DB"; // Bleu
    case "France Terre d’Asile": return "#9B59B6"; // Violet
    default: return "#7f8c8d"; // Gris neutre
  }
}

/**************************************************************
 * 🪟 Modales
 **************************************************************/
function openEventModal(start, end) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const modalTitle = document.getElementById("modal-title");

  modalTitle.textContent = "Nouvel événement";
  currentEditingEvent = null;

  titleInput.value = "";
  startInput.value = start.slice(0, 16);
  endInput.value = end.slice(0, 16);
  categorySelect.value = "Hôtel-Dieu";

  modal.classList.remove("hidden");

  document.getElementById("save-event").onclick = () => {
    const title = titleInput.value.trim();
    if (!title) return modal.classList.add("hidden");

    const newEvent = {
      id: crypto.randomUUID(),
      title,
      start: startInput.value,
      end: endInput.value,
      allDay: false,
      category: categorySelect.value,
    };

    const color = getCategoryColor(newEvent.category);
    newEvent.backgroundColor = color;
    newEvent.borderColor = color;
    newEvent.textColor = "#fff";

    calendar.addEvent(newEvent);
    saveEvent(newEvent);
    modal.classList.add("hidden");
  };

  document.getElementById("cancel-event").onclick = () => {
    modal.classList.add("hidden");
  };
}

function openEditModal(event) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const modalTitle = document.getElementById("modal-title");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");

  currentEditingEvent = event;
  modalTitle.textContent = "Modifier l'événement";

  titleInput.value = event.title;
  startInput.value = event.startStr?.slice(0, 16) || "";
  endInput.value = event.endStr?.slice(0, 16) || "";
  categorySelect.value = event.extendedProps.category || "Hôtel-Dieu";

  modal.classList.remove("hidden");

  saveBtn.textContent = "💾 Enregistrer";
  cancelBtn.textContent = "🗑️ Supprimer";

  saveBtn.onclick = () => {
    const title = titleInput.value.trim();
    if (!title) return;
    event.setProp("title", title);
    event.setExtendedProp("category", categorySelect.value);

    const color = getCategoryColor(categorySelect.value);
    event.setProp("backgroundColor", color);
    event.setProp("borderColor", color);
    event.setProp("textColor", "#fff");

    event.setStart(startInput.value);
    event.setEnd(endInput.value);
    saveEvent(eventToData(event));
    modal.classList.add("hidden");
  };

  cancelBtn.onclick = () => {
    if (confirm("Supprimer cet événement ?")) {
      event.remove();
      deleteEvent(event.id);
    }
    modal.classList.add("hidden");
    cancelBtn.textContent = "Annuler";
  };
}

/**************************************************************
 * ➕ Bouton flottant
 **************************************************************/
document.getElementById("add-event-btn").addEventListener("click", () => {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  openEventModal(now.toISOString(), later.toISOString());
});

/**************************************************************
 * 🚀 Init
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  chargerPlanning();
});
if (isOffline) OFFLINE_BANNER?.classList.remove("hidden");
