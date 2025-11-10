/******************************************************************
 * 📅 PLANNING TPL — Script principal
 * - Gère l'affichage du calendrier
 * - Synchronise avec Google Apps Script via proxy Cloudflare
 * - Supporte le mode hors ligne et les ajouts d’événements
 ******************************************************************/

const API_URL =
  "https://fancy-band-a66d.tsqdevin.workers.dev/?url=https://script.google.com/macros/s/AKfycbySRUailaKz0w_hRizFPOyUV79h5OUsLjdmb8S2WENKfAKm1rcfCq7Jn_W5uLGp2Jck/exec";

const planningEl = document.getElementById("planning");
const loader = document.getElementById("loader");
const offlineBanner = document.getElementById("offline-banner");
const addEventBtn = document.getElementById("add-event-btn");
const eventModal = document.getElementById("event-modal");
const modalTitle = document.getElementById("modal-title");
const eventTitle = document.getElementById("event-title");
const eventStart = document.getElementById("event-start");
const eventEnd = document.getElementById("event-end");
const eventCategory = document.getElementById("event-category");
const saveEventBtn = document.getElementById("save-event");
const cancelEventBtn = document.getElementById("cancel-event");

let calendar;
let isOffline = !navigator.onLine;

/******************************************************************
 * 🌐 GESTION DU MODE HORS LIGNE
 ******************************************************************/
function updateOnlineStatus() {
  if (navigator.onLine) {
    isOffline = false;
    offlineBanner.classList.add("hidden");
  } else {
    isOffline = true;
    offlineBanner.classList.remove("hidden");
  }
}

// Détection immédiate + vérification retardée (pour iPhone/Safari)
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
setTimeout(updateOnlineStatus, 800);

/******************************************************************
 * 🔄 CHARGEMENT DES ÉVÉNEMENTS
 ******************************************************************/
async function chargerPlanning() {
  loader.classList.remove("hidden");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Erreur réseau");
    const data = await response.json();

    afficherPlanning(data);
    loader.classList.add("hidden");
  } catch (err) {
    console.error("❌ Échec du chargement du planning :", err);
    loader.classList.add("hidden");
    if (!isOffline) {
      alert("Erreur de chargement du planning. Vérifie ta connexion.");
    }
  }
}

/******************************************************************
 * 🗓️ AFFICHAGE DU CALENDRIER
 ******************************************************************/
function afficherPlanning(data) {
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth < 768;
  const views = isMobile
    ? { default: "timeGridWeek", fallback: "listWeek" }
    : { default: "dayGridMonth", fallback: "timeGridWeek" };

  calendar = new FullCalendar.Calendar(planningEl, {
    locale: "fr",
    height: "auto",
    initialView: views.default,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: isMobile
        ? "timeGridWeek,listWeek"
        : "dayGridMonth,timeGridWeek,listWeek",
    },
    buttonText: {
      today: "Aujourd’hui",
      month: "Mois",
      week: "Semaine",
      list: "Planning",
    },
    events: data.map((evt) => ({
      title: evt.title,
      start: evt.start,
      end: evt.end,
      backgroundColor: getCategoryColor(evt.category),
      borderColor: getCategoryColor(evt.category),
    })),
    dateClick(info) {
      openEventModal(info.dateStr);
    },
  });

  calendar.render();
}

/******************************************************************
 * 🎨 COULEURS DES CATÉGORIES
 ******************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    Préfecture: "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
  };
  return colors[category] || "#7f8c8d";
}

/******************************************************************
 * 🪟 MODALE D’AJOUT D’ÉVÉNEMENT
 ******************************************************************/
function openEventModal(dateStr) {
  modalTitle.textContent = "Nouvel événement";
  eventTitle.value = "";
  eventStart.value = dateStr ? dateStr.slice(0, 16) : "";
  eventEnd.value = "";
  eventCategory.value = "Hôtel-Dieu";
  eventModal.classList.remove("hidden");
}

function closeEventModal() {
  eventModal.classList.add("hidden");
}

saveEventBtn.addEventListener("click", async () => {
  const title = eventTitle.value.trim();
  const start = eventStart.value;
  const end = eventEnd.value;
  const category = eventCategory.value;

  if (!title || !start) {
    alert("Veuillez remplir au moins le titre et la date de début.");
    return;
  }

  const newEvent = {
    title,
    start,
    end,
    category,
    backgroundColor: getCategoryColor(category),
  };

  calendar.addEvent(newEvent);
  closeEventModal();

  if (!isOffline) {
    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(newEvent),
        headers: { "Content-Type": "application/json" },
      });
      console.log("✅ Événement enregistré sur le serveur");
    } catch (e) {
      console.warn("⚠️ Échec de l’envoi au serveur, stocké localement");
    }
  } else {
    console.log("📦 Événement enregistré localement (offline)");
  }
});

cancelEventBtn.addEventListener("click", closeEventModal);

/******************************************************************
 * ⚡ INITIALISATION
 ******************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  chargerPlanning();
  addEventBtn.addEventListener("click", () => openEventModal());
  updateOnlineStatus();
});
