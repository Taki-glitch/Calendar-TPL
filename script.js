/**************************************************************
 * 📅 script.js — Planning TPL (Cloudflare Proxy + Offline + Modale)
 * ------------------------------------------------------------
 * - Charge les données via ton proxy Cloudflare Workers
 * - Sauvegarde via le même proxy
 * - Stocke localement en cas de déconnexion
 * - Affiche un message doux “🔄 Mise à jour du calendrier…”
 * - Permet d’ajouter des événements depuis mobile/tablette via une modale
 **************************************************************/

// 🌐 URLs
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
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
 * 🔁 Chargement du planning (avec message doux)
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");

  // Si le calendrier est déjà affiché → petit message temporaire
  if (calendar && !isOffline) {
    loader.textContent = "🔄 Mise à jour du calendrier…";
    loader.classList.remove("hidden");
    setTimeout(() => loader.classList.add("hidden"), 1500);
  } else {
    // Affichage normal au tout premier chargement
    loader.textContent = isOffline
      ? "Mode hors ligne — affichage des données locales..."
      : "Chargement du calendrier...";
    loader.classList.remove("hidden");
  }

  let events = [];

  if (isOffline) {
    // 1️⃣ Mode hors ligne — données locales
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

  // 2️⃣ Mode en ligne — récupération via proxy
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
 * 📅 Rendu FullCalendar
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return;

  if (calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "fr",
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    editable: true,
    selectable: true,
    height: "auto",
    aspectRatio: 0.8,
    events: events.map((event) => ({
      id: String(event.id),
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay === true,
      backgroundColor: getCategoryColor(event.category),
    })),

    // ✏️ Clic sur un événement → modification ou suppression
    eventClick(info) {
      const event = info.event;
      const newTitle = prompt("Modifier le titre de l'événement:", event.title);
      if (newTitle === null) return;

      if (newTitle.trim() === "") {
        if (confirm("Voulez-vous supprimer cet événement ?")) {
          event.remove();
          deleteEvent(event.id);
        }
        return;
      }

      event.setProp("title", newTitle);
      event.setProp("backgroundColor", getCategoryColor(event.extendedProps.category));
      saveEvent(eventToData(event));
    },

    // ⤴️ Déplacement ou redimensionnement
    eventDrop(info) {
      saveEvent(eventToData(info.event));
    },
    eventResize(info) {
      saveEvent(eventToData(info.event));
    },

    // ➕ Sélection pour créer un nouvel événement
    select(info) {
      openEventModal(info.startStr, info.endStr);
      calendar.unselect();
    },
  });

  calendar.render();
}

/**************************************************************
 * 💾 Sauvegarde des données
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.end ? event.end.toISOString().substring(0, 10) : event.endStr,
    allDay: event.allDay,
    category: event.extendedProps.category || "Autre",
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
    case "Réunion": return "#007bff";
    case "Projet": return "#28a745";
    case "Formation": return "#ffc107";
    default: return "#6c757d";
  }
}

/**************************************************************
 * 🪟 Modale tactile d’ajout d’événement
 **************************************************************/
function openEventModal(start, end) {
  const modal = document.getElementById("event-modal");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");

  // Pré-remplissage
  titleInput.value = "";
  startInput.value = start.slice(0, 16);
  endInput.value = end.slice(0, 16);
  categorySelect.value = "Autre";

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

    calendar.addEvent(newEvent);
    saveEvent(newEvent);
    modal.classList.add("hidden");
  };

  document.getElementById("cancel-event").onclick = () => {
    modal.classList.add("hidden");
  };
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  chargerPlanning();
});

if (isOffline) OFFLINE_BANNER?.classList.remove("hidden");
