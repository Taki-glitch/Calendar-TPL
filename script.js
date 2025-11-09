/**************************************************************
 * 📅 script.js — version stable (TPL + Google Sheets v2.1)
 * ------------------------------------------------------------
 * - Récupère les événements depuis Google Sheets
 * - Enregistre localement (localStorage)
 * - Sauvegarde partielle et complète sur Google Sheets
 * - Compatible avec FullCalendar v6
 **************************************************************/

// ⚙️ URL de ton script Apps Script publié en tant qu'application web :
const API_URL = "https://script.google.com/macros/s/AKfycbwLSO8y-I57ykY4ULeXoCNYCgn_eD39pzKh4b4lhwjOoOs6kSQcwq6MUxN2dPVr4N0/exec";

/**************************************************************
 * 🧠 FONCTIONS PRINCIPALES
 **************************************************************/

async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.textContent = "Chargement du planning...";

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    afficherPlanning(data);
    localStorage.setItem("tplEvents", JSON.stringify(data));
    loader.textContent = "Planning chargé ✅";
  } catch (err) {
    console.error("Erreur de chargement :", err);
    loader.textContent = "⚠️ Erreur de connexion au serveur";
    // 🧭 Fallback local
    const saved = localStorage.getItem("tplEvents");
    if (saved) afficherPlanning(JSON.parse(saved));
  }
}

/**************************************************************
 * 🗓️ AFFICHAGE FULLCALENDAR
 **************************************************************/

let calendar; // déclaré globalement

function afficherPlanning(events) {
  // 🧩 IMPORTANT : l’élément HTML doit être #calendar (et non #planning)
  const calendarEl = document.getElementById("calendar");

  if (!calendarEl) {
    console.error("❌ Élément #calendar introuvable !");
    return;
  }

  // ✅ Initialisation de FullCalendar
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek",
    },
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay === "TRUE" || e.allDay === true,
      category: e.category || "Autre"
    })),
    editable: true,
    selectable: true,
    selectMirror: true,
    eventColor: "#1E40AF",
    eventTextColor: "#fff",

    // 🟢 Création d’un nouvel événement
    select: info => {
      const title = prompt("Nom de l'événement :");
      if (title) {
        const event = {
          id: crypto.randomUUID(),
          title,
          start: info.startStr,
          end: info.endStr,
          allDay: info.allDay,
          category: "Autre"
        };
        calendar.addEvent(event);
        saveEvent(event);
      }
      calendar.unselect();
    },

    // ✏️ Modification d’un événement
    eventChange: info => {
      const ev = info.event;
      const updated = {
        id: ev.id,
        title: ev.title,
        start: ev.startStr,
        end: ev.endStr,
        allDay: ev.allDay,
        category: ev.extendedProps.category
      };
      saveEvent(updated);
    },

    // ❌ Suppression d’un événement
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
 * 💾 SAUVEGARDE SUR GOOGLE SHEETS
 **************************************************************/

async function saveEvent(event) {
  try {
    const body = { mode: "patch", data: [event] };
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("✅ Événement sauvegardé :", event.title);
  } catch (err) {
    console.error("⚠️ Erreur de sauvegarde :", err);
  }
}

async function deleteEvent(id) {
  try {
    const body = { mode: "patch", data: [{ id, title: "", start: "", end: "", allDay: false, category: "" }] };
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log(`🗑️ Événement ${id} supprimé`);
  } catch (err) {
    console.error("Erreur suppression :", err);
  }
}

/**************************************************************
 * 🔁 SAUVEGARDE COMPLÈTE AVANT FERMETURE
 **************************************************************/

window.addEventListener("beforeunload", async () => {
  if (!calendar) return;

  const allEvents = calendar.getEvents().map(ev => ({
    id: ev.id,
    title: ev.title,
    start: ev.startStr,
    end: ev.endStr,
    allDay: ev.allDay,
    category: ev.extendedProps.category
  }));

  try {
    const body = { mode: "replace", data: allEvents };
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("💾 Sauvegarde complète avant fermeture");
  } catch (err) {
    console.warn("⚠️ Impossible de sauvegarder avant fermeture :", err);
  }
});

/**************************************************************
 * 🚀 INITIALISATION DU CALENDRIER
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
  if (typeof FullCalendar === "undefined") {
    console.error("❌ FullCalendar non chargé !");
  } else {
    chargerPlanning();
  }
});
