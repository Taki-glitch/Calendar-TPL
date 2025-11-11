console.log("✅ script.js chargé correctement !");

const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
const ADD_EVENT_BTN = document.getElementById("add-event-btn");
let isOffline = !navigator.onLine;
let calendar = null;

/**************************************************************
 * 🔌 Connexion réseau
 **************************************************************/
window.addEventListener("online", () => {
  isOffline = false;
  OFFLINE_BANNER.classList.add("hidden");
  chargerPlanning();
});
window.addEventListener("offline", () => {
  isOffline = true;
  OFFLINE_BANNER.classList.remove("hidden");
});

/**************************************************************
 * 🔁 Chargement du planning
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");
  loader.textContent = isOffline ? "Mode hors ligne — données locales..." : "Chargement du calendrier...";

  let events = [];

  if (isOffline) {
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    loader.classList.add("hidden");
    return renderCalendar(events);
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    const text = await res.text();
    events = JSON.parse(text);
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.warn("⚠️ Erreur de chargement, mode local :", err);
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Affichage du calendrier
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
    selectable: true,
    editable: true,
    height: "auto",

    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category },
    })),

    select: (info) => openEventModal(null, info), // Création
    eventClick: (info) => openEventModal(info.event), // Modification
    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event)),
  });

  calendar.render();
}

/**************************************************************
 * 🎨 Couleurs des catégories
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
    "Autre": "#6c757d",
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * 💾 Sauvegarde locale + serveur
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
  const i = saved.findIndex((e) => e.id === event.id);
  if (i >= 0) saved[i] = event; else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "patch", data: [event] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur réseau, enregistrement local uniquement :", err);
    }
  }
}

/**************************************************************
 * 🗑️ Suppression d’un événement
 **************************************************************/
async function deleteEvent(event) {
  if (!confirm("Supprimer cet événement ?")) return;
  event.remove();

  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter((e) => e.id !== event.id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delete", data: [event.id] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur de suppression :", err);
    }
  }
}

/**************************************************************
 * 🪟 Modale améliorée (création / modification)
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  const modalContent = document.querySelector(".modal-content");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const deleteBtn = document.getElementById("delete-event");
  const modalTitle = document.getElementById("modal-title");

  modal.classList.remove("hidden");

  // --- Création ---
  if (!event) {
    modalTitle.textContent = "Nouvel événement";
    titleInput.value = "";
    startInput.value = info?.startStr.slice(0, 16);
    endInput.value = info?.endStr ? info.endStr.slice(0, 16) : "";
    categorySelect.value = "Hôtel-Dieu";
    cancelBtn.classList.remove("hidden");
    deleteBtn.classList.add("hidden");
  }
  // --- Modification ---
  else {
    modalTitle.textContent = "Modifier l’événement";
    titleInput.value = event.title;
    startInput.value = event.startStr.slice(0, 16);
    endInput.value = event.endStr ? event.endStr.slice(0, 16) : event.startStr.slice(0, 16);
    categorySelect.value = event.extendedProps.category || "Autre";
    cancelBtn.classList.add("hidden");
    deleteBtn.classList.remove("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");

  // Fermeture par clic extérieur
  modal.onclick = (e) => {
    if (!modalContent.contains(e.target)) closeModal();
  };

  // Bouton "Enregistrer"
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

  // Bouton "Annuler"
  cancelBtn.onclick = closeModal;

  // Bouton "Supprimer"
  deleteBtn.onclick = () => {
    deleteEvent(event);
    closeModal();
  };
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  ADD_EVENT_BTN.addEventListener("click", () => openEventModal());
  chargerPlanning();
});