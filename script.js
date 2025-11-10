/**************************************************************
 * 📅 script.js — Planning TPL (Cloudflare Proxy + Offline)
 * ------------------------------------------------------------
 * - Charge les données via ton proxy Cloudflare Workers
 * - Sauvegarde via le même proxy
 * - Stocke localement en cas de déconnexion
 * - Gère automatiquement les erreurs CORS et réseau
 **************************************************************/

// 🌐 URLs
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
let isOffline = !navigator.onLine;

// Variable globale pour le calendrier
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
    if (!res.ok) throw new Error(`Erreur HTTP du proxy: ${res.status} ${res.statusText}`);

    const data = await res.json();
    if (data.status === "error") throw new Error(`Erreur Apps Script: ${data.message || 'Erreur inconnue de GAS'}`);
    events = data;
    localStorage.setItem("tplEvents", JSON.stringify(events));

  } catch (err) {
    console.error("❌ ERREUR FATALE DE CHARGEMENT DU CALENDRIER:", err);
    const displayMessage = err.message.includes("JSON") 
        ? `Erreur de données (JSON invalide/vide). Vérifiez la réponse du proxy.` 
        : err.message;
    loader.textContent = `❌ ÉCHEC DU CHARGEMENT. Cause : ${displayMessage}`;
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    if (events.length > 0) loader.textContent += " (Affichage des données locales en dernier recours.)";
    else return;
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu FullCalendar
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return console.error("Erreur: Élément #planning introuvable.");

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
    events: events.map(event => ({
        id: String(event.id),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay === true,
        backgroundColor: getCategoryColor(event.category)
    })),

    eventClick: function (info) {
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

    eventDrop: function (info) {
        saveEvent(eventToData(info.event));
    },

    eventResize: function (info) {
        saveEvent(eventToData(info.event));
    },

    select: function (info) {
        const newTitle = prompt("Ajouter un nouvel événement (laisser vide pour annuler):");
        if (newTitle) {
            const newId = crypto.randomUUID();
            const newEvent = {
                id: newId,
                title: newTitle,
                start: info.startStr,
                end: info.endStr,
                allDay: info.allDay,
                category: "Autre"
            };
            calendar.addEvent(newEvent);
            saveEvent(newEvent);
        }
        calendar.unselect();
    },
  });

  /**************************************************************
   * 🗓️ Vue responsive (jour/semaine/mois selon taille écran)
   **************************************************************/
  const screenWidth = window.innerWidth;
  let initialView = "dayGridMonth";
  if (screenWidth < 600) initialView = "timeGridDay";
  else if (screenWidth < 900) initialView = "timeGridWeek";
  calendar.setOption("initialView", initialView);

  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    let newView = "dayGridMonth";
    if (w < 600) newView = "timeGridDay";
    else if (w < 900) newView = "timeGridWeek";
    if (calendar.view.type !== newView) calendar.changeView(newView);
  });

  calendar.render();
}

/**************************************************************
 * 💾 Sauvegarde des données
 **************************************************************/
function eventToData(event) {
  const data = {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.end ? event.end.toISOString().substring(0, 10) : event.endStr,
    allDay: event.allDay,
    category: event.extendedProps.category || "Autre"
  };
  if (!data.end) delete data.end;
  return data;
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const index = saved.findIndex(e => e.id === event.id);
  if (index >= 0) saved[index] = event; else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) return console.log("📦 Événement stocké localement :", event.title);

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const result = await res.json();
    if (result.status === "error") throw new Error(`Erreur Apps Script: ${result.message}`);
    console.log("✅ Sauvegardé :", event.title);
  } catch (err) {
    console.warn("⚠️ Sauvegarde reportée (erreur proxy/API) :", err);
  }
}

async function deleteEvent(id) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter(e => e.id !== id);
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
    if (result.status === "error") throw new Error(`Erreur Apps Script: ${result.message}`);
    console.log("✅ Événement supprimé à distance :", id);
  } catch (err) {
    console.warn("⚠️ Suppression reportée (erreur proxy/API) :", err);
  }
}

/**************************************************************
 * 🎨 Styles & Couleurs
 **************************************************************/
function getCategoryColor(category) {
  switch(category) {
    case 'Réunion': return '#007bff';
    case 'Projet': return '#28a745';
    case 'Formation': return '#ffc107';
    default: return '#6c757d';
  }
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  chargerPlanning();
});

// Bannière offline au démarrage
if (isOffline) OFFLINE_BANNER?.classList.remove("hidden");

// Variables globales
window.eventToData = eventToData;
window.saveEvent = saveEvent;
window.deleteEvent = deleteEvent;
window.chargerPlanning = chargerPlanning;
window.getCategoryColor = getCategoryColor;

/**************************************************************
 * 🌗 Gestion du thème clair/sombre
 **************************************************************/
const themeToggle = document.getElementById("theme-toggle");

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  document.body.classList.remove("light", "dark");
  document.body.classList.add(theme);
  updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
  if (themeToggle) themeToggle.textContent = theme === "dark" ? "🌞" : "🌙";
}

themeToggle?.addEventListener("click", () => {
  const current = document.body.classList.contains("dark") ? "dark" : "light";
  const newTheme = current === "dark" ? "light" : "dark";
  document.body.classList.replace(current, newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
});

initTheme();
