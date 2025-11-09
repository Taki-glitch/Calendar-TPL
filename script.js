/**************************************************************
 * 📅 script.js — version GitHub Pages compatible
 * ------------------------------------------------------------
 * - Appels à Google Apps Script via proxy AllOrigins
 * - CORS géré automatiquement
 **************************************************************/

const GAS_URL = "https://script.google.com/macros/s/AKfycbyU6zF4eMA2uPd76CxR3qSYv69uS9eTCd5Yo25KU9ZbXCLLP7E5Wf44FJ2M2_K5VTw_/exec";
const API_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(GAS_URL);

async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.textContent = "Chargement du planning...";

  try {
    const res = await fetch(API_URL, { mode: "cors" });
    const text = await res.text();

    let data = [];
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("Réponse non JSON :", text);
    }

    afficherPlanning(data);
    localStorage.setItem("tplEvents", JSON.stringify(data));
    loader.textContent = "Planning chargé ✅";
  } catch (err) {
    console.error("Erreur de chargement :", err);
    loader.textContent = "⚠️ Erreur de connexion au serveur";
    const saved = localStorage.getItem("tplEvents");
    if (saved) afficherPlanning(JSON.parse(saved));
  }
}

let calendar;

function afficherPlanning(events) {
  const el = document.getElementById("planning");

  if (typeof FullCalendar === "undefined") {
    console.error("❌ FullCalendar non chargé !");
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
      right: "dayGridMonth,timeGridWeek,listWeek"
    },
    selectable: true,
    editable: true,
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay === "TRUE" || e.allDay === true,
      category: e.category || "Autre",
    })),

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
      const ev = info.event;
      const updated = {
        id: ev.id,
        title: ev.title,
        start: ev.startStr,
        end: ev.endStr,
        allDay: ev.allDay,
        category: ev.extendedProps.category,
      };
      saveEvent(updated);
    },

    eventClick: info => {
      if (confirm(`Supprimer "${info.event.title}" ?`)) {
        info.event.remove();
        deleteEvent(info.event.id);
      }
    }
  });

  calendar.render();
}

/**************************************************************
 * 💾 SAUVEGARDE (via AllOrigins proxy)
 **************************************************************/
async function saveEvent(event) {
  try {
    const body = { mode: "patch", data: [event] };
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors",
    });
    console.log("✅ Sauvegardé :", event.title);
  } catch (err) {
    console.error("⚠️ Erreur de sauvegarde :", err);
  }
}

async function deleteEvent(id) {
  try {
    const body = {
      mode: "patch",
      data: [{ id, title: "", start: "", end: "", allDay: false, category: "" }],
    };
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors",
    });
    console.log(`🗑️ Événement ${id} supprimé`);
  } catch (err) {
    console.error("Erreur suppression :", err);
  }
}

/**************************************************************
 * 🚀 Lancement
 **************************************************************/
document.addEventListener("DOMContentLoaded", chargerPlanning);
