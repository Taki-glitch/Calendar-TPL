/**************************************************************
 * 📅 script.js — Planning TPL (Cloudflare Proxy + Offline)
 **************************************************************/

const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

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
    renderCalendar(events);
    return;
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Réponse non JSON :", text.slice(0, 200));
      throw new Error("Réponse non JSON reçue (probablement HTML ou erreur proxy)");
    }

    if (data.status === "error") {
      throw new Error(`Erreur Apps Script : ${data.message || "Erreur inconnue"}`);
    }

    events = data;
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.error("❌ Échec du chargement du planning :", err);
    loader.textContent = `❌ Échec du chargement. Cause : ${err.message}`;
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    if (!events.length) return;
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu FullCalendar
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView: window.innerWidth < 768 ? "timeGridWeek" : "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: window.innerWidth < 768 ? "timeGridWeek,listWeek" : "dayGridMonth,timeGridWeek,listWeek",
    },
    height: "auto",
    editable: true,
    selectable: true,

    // 🕗 Affiche seulement 8h–18h
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    scrollTime: "08:00:00",

    // Bloque la création/déplacement d’événements hors des heures autorisées
    selectAllow: (sel) => isInAllowedHours(sel.start, sel.end),
    eventAllow: (drop) => isInAllowedHours(drop.start, drop.end),

    views: {
      timeGridWeek: { slotMinTime: "08:00:00", slotMaxTime: "18:00:00" },
      timeGridDay: { slotMinTime: "08:00:00", slotMaxTime: "18:00:00" },
    },

    events: events.map(event => ({
      id: String(event.id),
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay === true,
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
 * ⏰ Vérification des heures autorisées
 **************************************************************/
function isInAllowedHours(start, end) {
  const s = start.getHours(), e = end.getHours();
  return s >= 8 && e <= 18;
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
    end: event.end ? event.end.toISOString() : null,
    allDay: event.allDay,
    category: event.extendedProps.category || "Autre",
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const idx = saved.findIndex(e => e.id === event.id);
  if (idx >= 0) saved[idx] = event; else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) return console.log("📦 Événement stocké localement :", event.title);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
    const text = await res.text();
    const result = JSON.parse(text);
    if (result.status === "error") throw new Error(result.message);
    console.log("✅ Événement sauvegardé :", event.title);
  } catch (err) {
    console.warn("⚠️ Sauvegarde reportée :", err.message);
  }
}

/**************************************************************
 * 🪟 Modale (corrigée mobile)
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const modalTitle = document.getElementById("modal-title");

  modal.classList.remove("hidden");

  if (event) {
    modalTitle.textContent = "Modifier l’événement";
    titleInput.value = event.title;
    startInput.value = event.startStr.slice(0, 16);
    endInput.value = event.end ? event.end.toISOString().slice(0, 16) : "";
    categorySelect.value = event.extendedProps.category || "Autre";
  } else {
    modalTitle.textContent = "Nouvel événement";
    titleInput.value = "";
    startInput.value = info.startStr.slice(0, 16);
    endInput.value = info.endStr ? info.endStr.slice(0, 16) : "";
    categorySelect.value = "Hôtel-Dieu";
  }

  // ✅ Annuler
  cancelBtn.onclick = () => {
    document.activeElement.blur(); // ferme le clavier mobile
    modal.classList.add("hidden");
    setTimeout(() => modal.classList.add("hidden"), 100);
  };

  // ✅ Enregistrer
  saveBtn.onclick = () => {
    document.activeElement.blur(); // ferme le clavier mobile

    const newEvent = {
      id: event ? event.id : crypto.randomUUID(),
      title: titleInput.value.trim() || "(Sans titre)",
      start: startInput.value,
      end: endInput.value || startInput.value,
      allDay: false,
      category: categorySelect.value,
    };

    const s = new Date(newEvent.start);
    const e = new Date(newEvent.end);
    if (!isInAllowedHours(s, e)) {
      alert("❌ Les événements doivent être entre 8h00 et 18h00.");
      return;
    }

    modal.classList.add("hidden");
    setTimeout(() => modal.classList.add("hidden"), 150);

    if (event) event.remove();

    calendar.addEvent({
      id: newEvent.id,
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      allDay: newEvent.allDay,
      backgroundColor: getCategoryColor(newEvent.category),
      extendedProps: { category: newEvent.category },
    });

    saveEvent(newEvent);
  };
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  ADD_EVENT_BTN.addEventListener("click", () => openEventModal());
  chargerPlanning();

  setTimeout(() => {
    if (navigator.onLine) OFFLINE_BANNER?.classList.add("hidden");
    else OFFLINE_BANNER?.classList.remove("hidden");
  }, 500);

  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");
});
