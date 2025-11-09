/**************************************************************
 * 📅 script.js — version offline-ready (GitHub Pages)
 * ------------------------------------------------------------
 * - Charge les données via proxy AllOrigins
 * - Utilise localStorage si offline
 * - Indique visuellement le mode hors ligne
 **************************************************************/

const GAS_URL = "https://script.google.com/macros/s/AKfycbyU6zF4eMA2uPd76CxR3qSYv69uS9eTCd5Yo25KU9ZbXCLLP7E5Wf44FJ2M2_K5VTw_/exec";
const API_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(GAS_URL);
const OFFLINE_BANNER = document.getElementById("offline-banner");

let isOffline = !navigator.onLine;

/**************************************************************
 * 🔁 Gestion connexion
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
  loader.textContent = isOffline
    ? "Mode hors ligne — affichage du cache local"
    : "Chargement du planning...";

  try {
    let data;

    if (isOffline) {
      const cached = localStorage.getItem("tplEvents");
      data = cached ? JSON.parse(cached) : [];
    } else {
      const res = await fetch(API_URL, { mode: "cors" });
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }
      localStorage.setItem("tplEvents", JSON.stringify(data));
    }

    afficherPlanning(data);
    loader.textContent = "Planning prêt ✅";
  } catch (err) {
    console.error("Erreur de chargement :", err);
    loader.textContent = "⚠️ Erreur de connexion";
  }
}

/**************************************************************
 * 🗓️ FullCalendar
 **************************************************************/
let calendar;

function afficherPlanning(events) {
  const el = document.getElementById("planning");

  if (typeof FullCalendar === "undefined") {
    document.getElementById("loader").textContent =
      "Erreur : FullCalendar non chargé.";
    return;
  }

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "fr",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    selectable: true,
    editable: true,
    events: events,
    select: info => {
      const title = prompt("Nom de l'événement :");
      if (title) {
        const event = {
          id: crypto.randomUUID(),
          title,
          start: info.startStr,
          end: info.endStr,
          allDay: info.allDay,
          category: "Autre",
        };
        calendar.addEvent(event);
        saveEvent(event);
      }
      calendar.unselect();
    },
    eventChange: info => {
      saveEvent({
        id: info.event.id,
        title: info.event.title,
        start: info.event.startStr,
        end: info.event.endStr,
        allDay: info.event.allDay,
        category: info.event.extendedProps.category,
      });
    },
    eventClick: info => {
      if (confirm(`Supprimer "${info.event.title}" ?`)) {
        info.event.remove();
        deleteEvent(info.event.id);
      }
    },
  });

  calendar.render();
}

/**************************************************************
 * 💾 Sauvegarde avec cache
 **************************************************************/
async function saveEvent(event) {
  const saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const index = saved.findIndex(e => e.id === event.id);

  if (index >= 0) saved[index] = event;
  else saved.push(event);

  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) {
    console.log("📦 Événement stocké localement :", event.title);
    return;
  }

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
    console.log("✅ Sauvegardé :", event.title);
  } catch (err) {
    console.warn("⚠️ Erreur de sauvegarde (offline probable).");
  }
}

async function deleteEvent(id) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter(e => e.id !== id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) return;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [{ id, title: "" }] }),
      mode: "cors",
    });
  } catch (err) {
    console.warn("⚠️ Suppression locale seulement.");
  }
}

/**************************************************************
 * 🚀 Démarrage
 **************************************************************/
document.addEventListener("DOMContentLoaded", chargerPlanning);
