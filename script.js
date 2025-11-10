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
  loader.classList.remove("hidden"); // Assurer que le loader est visible au départ

  let events = [];

  if (isOffline) {
    // 1. Mode hors ligne : charge depuis localStorage
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

  // 2. Mode en ligne : charge via Cloudflare Proxy
  try {
    const res = await fetch(PROXY_URL, {
      method: "GET",
      mode: "cors",
    });
    
    // Vérification stricte du statut HTTP (le proxy doit retourner 200)
    if (!res.ok) {
        throw new Error(`Erreur HTTP du proxy: ${res.status} ${res.statusText}`);
    }

    // Tenter de lire le JSON
    const data = await res.json();
    
    if (data.status === "error") {
        // Erreur retournée par Google Apps Script (voir le doGet corrigé)
        throw new Error(`Erreur Apps Script: ${data.message || 'Erreur inconnue de GAS'}`);
    }

    events = data;

    // Sauvegarde en cache local
    localStorage.setItem("tplEvents", JSON.stringify(events));

  } catch (err) {
    // ❌ ERREUR CAPTURÉE : Affichage explicite de l'échec
    console.error("❌ ERREUR FATALE DE CHARGEMENT DU CALENDRIER:", err);
    
    // On vérifie si l'erreur est liée au JSON (souvent un corps de réponse vide ou HTML)
    const displayMessage = err.message.includes("JSON") 
        ? `Erreur de données (JSON invalide/vide). Vérifiez la réponse du proxy.` 
        : err.message;
        
    loader.textContent = `❌ ÉCHEC DU CHARGEMENT. Cause : ${displayMessage}`;
    
    // Tente de charger les données locales en cas d'erreur
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    if (events.length > 0) {
      loader.textContent += " (Affichage des données locales en dernier recours.)";
    } else {
      // Si aucune donnée locale, on sort sans afficher le calendrier
      return; 
    }
  }

  // 3. Affichage (si events.length > 0 ou si le chargement a réussi)
  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 Rendu FullCalendar
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  const loaderEl = document.getElementById("loader");

  if (!calendarEl) {
    console.error("Erreur: Élément #planning introuvable.");
    return;
  }

  // S'assurer que le calendrier n'est pas déjà initialisé
  if (calendar) {
      calendar.destroy();
  }

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
        // Assure que les clés FullCalendar sont bien typées
        id: String(event.id),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay === true, 
        backgroundColor: getCategoryColor(event.category)
    })),

    // ➡️ Gestion du clic sur un événement
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

    // ➡️ Gestion du déplacement/redimensionnement (drag & drop)
    eventDrop: function (info) {
        const event = info.event;
        saveEvent(eventToData(event));
    },

    eventResize: function (info) {
        const event = info.event;
        saveEvent(eventToData(event));
    },

    // ➡️ Gestion de la sélection de date (ajout d'un nouvel événement)
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
        // FullCalendar ne fournit pas event.endStr si c'est allDay, donc on utilise event.end
        end: event.end ? event.end.toISOString().substring(0, 10) : event.endStr, 
        allDay: event.allDay,
        category: event.extendedProps.category || "Autre"
    };
    
    // Gérer le cas où end est null/undefined
    if (!data.end) {
        delete data.end;
    }

    return data;
}


async function saveEvent(event) {
  // Sauvegarde toujours la nouvelle version dans le cache local
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const index = saved.findIndex(e => e.id === event.id);

  if (index >= 0) saved[index] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (isOffline) {
    console.log("📦 Événement stocké localement :", event.title);
    return;
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [event] }),
      mode: "cors",
    });
    
    // Vérification stricte de la réponse du serveur
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const result = await res.json();
    if (result.status === "error") throw new Error(`Erreur Apps Script: ${result.message}`);

    console.log("✅ Sauvegardé :", event.title);
  } catch (err) {
    console.warn("⚠️ Sauvegarde reportée (erreur proxy/API) :", err);
    // Notification utilisateur pour la sauvegarde reportée (si possible)
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
    
    // Vérification stricte de la réponse du serveur
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
        case 'Formation': return '#ffc107'; // Jaune (attention au contraste)
        default: return '#6c757d'; // Autre
    }
}

/**************************************************************
 * 🚀 Initialisation
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Démarre le chargement (qui inclut le rendu ou l'affichage de l'erreur)
  chargerPlanning(); 
});

// Gérer la bannière au chargement initial
if (isOffline) {
    OFFLINE_BANNER?.classList.remove("hidden");
}

// Nettoyage de la variable globale au cas où
window.eventToData = eventToData;
window.saveEvent = saveEvent;
window.deleteEvent = deleteEvent;
window.chargerPlanning = chargerPlanning;
window.getCategoryColor = getCategoryColor;
