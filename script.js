console.log("✅ script.js chargé correctement !");

const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
const ADD_EVENT_BTN = document.getElementById("add-event-btn");
let isOffline = !navigator.onLine;
let calendar = null;

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
  loader.textContent = isOffline
    ? "Mode hors ligne — données locales..."
    : "Chargement du calendrier...";
  loader.classList.remove("hidden");

  let events = [];

  if (isOffline) {
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    loader.classList.add("hidden");
    renderCalendar(events);
    return;
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    const text = await res.text();
    let data = JSON.parse(text);
    events = data;
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.error("❌ Échec du chargement :", err);
    loader.textContent = "⚠️ Erreur, affichage local";
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu du calendrier
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    height: "auto",
    editable: true,
    selectable: true,
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    selectAllow: (sel) => isInAllowedHours(sel.start, sel.end),
    eventAllow: (drop) => isInAllowedHours(drop.start, drop.end),

    events: events.map(event => ({
      id: String(event.id),
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: false,
      backgroundColor: getCategoryColor(event.category),
      extendedProps: { category: event.category }
    })),

    eventClick: (info) => openEventModal(info.event),
    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event)),
    select: (info) => openEventModal(null, info),
  });

  calendar.render();
}

/**************************************************************
 * ⏰ Vérif heures autorisées
 **************************************************************/
function isInAllowedHours(start, end) {
  return start.getHours() >= 8 && end.getHours() <= 18;
}

/**************************************************************
 * 🎨 Couleurs catégories
 **************************************************************/
function getCategoryColor(category) {
  switch (category) {
    case "Hôtel-Dieu": return "#FFD43B";
    case "Gréneraie/Resto du Cœur": return "#2ECC71";
    case "Préfecture": return "#E74C3C";
    case "Tour de Bretagne": return "#3498DB";
    case "France Terre d’Asile": return "#9B59B6";
    default: return "#6c757d";
  }
}

/**************************************************************
 * 💾 Sauvegarde
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps.category,
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const idx = saved.findIndex(e => e.id === event.id);
  if (idx >= 0) saved[idx] = event; else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));
  if (isOffline) return;

  try {
    await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
    });
  } catch (err) {
    console.warn("⚠️ Sauvegarde offline :", err);
  }
}

/**************************************************************
 * 🗑️ Suppression
 **************************************************************/
async function deleteEvent(event) {
  if (!confirm("Supprimer cet événement ?")) return;
  event.remove();

  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter(e => e.id !== event.id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delete", data: [event.id] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur suppression :", err);
    }
  }
}

/**************************************************************
 * 🪟 Modale corrigée
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const deleteBtn = document.getElementById("delete-event");
  const modalTitle = document.getElementById("modal-title");

  modal.classList.remove("hidden");

  if (event) {
    modalTitle.textContent = "Modifier l’événement";
    titleInput.value = event.title;
    startInput.value = event.startStr.slice(0, 16);
    endInput.value = event.endStr ? event.endStr.slice(0, 16) : startInput.value;
    categorySelect.value = event.extendedProps.category || "Autre";
    deleteBtn.classList.remove("hidden");
  } else {
    modalTitle.textContent = "Nouvel événement";
    titleInput.value = "";
    startInput.value = info.startStr.slice(0, 16);
    endInput.value = info.endStr ? info.endStr.slice(0, 16) : "";
    categorySelect.value = "Hôtel-Dieu";
    deleteBtn.classList.add("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");

  saveBtn.onclick = () => {
    const newEvent = {
      id: event ? event.id : crypto.randomUUID(),
      title: titleInput.value.trim() || "(Sans titre)",
      start: startInput.value,
      end: endInput.value || startInput.value,
      category: categorySelect.value,
    };

    if (event) event.remove();
    calendar.addEvent({
      ...newEvent,
      backgroundColor: getCategoryColor(newEvent.category),
      extendedProps: { category: newEvent.category },
    });
    saveEvent(newEvent);
    closeModal();
  };

  cancelBtn.onclick = closeModal;
  deleteBtn.onclick = () => { deleteEvent(event); closeModal(); };
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  ADD_EVENT_BTN.addEventListener("click", () => openEventModal());
  chargerPlanning();
});