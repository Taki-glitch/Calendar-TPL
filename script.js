// =========================
// 📅 PLANNING TPL - script.js
// =========================

// 🔗 URL de ton API Google Apps Script (via ton proxy Cloudflare)
const API_URL = "https://tpl-proxy.tsqdevin.workers.dev/?url=" +
  encodeURIComponent("https://script.google.com/macros/s/AKfycbySRUailaKz0w_hRizFPOyUV79h5OUsLjdmb8S2WENKfAKm1rcfCq7Jn_W5uLGp2Jck/exec");

// =========================
// ⚙️ Initialisation du calendrier
// =========================
let calendar;
let selectedEvent = null;

document.addEventListener("DOMContentLoaded", async function () {
  const calendarEl = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 768 ? "timeGridWeek" : "dayGridMonth",
    locale: "fr",
    firstDay: 1,
    allDaySlot: false,
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    buttonText: {
      today: "Aujourd’hui",
      month: "Mois",
      week: "Semaine",
      day: "Jour"
    },
    events: await chargerEvenements(),
    editable: true,
    selectable: true,
    eventClick: handleEventClick,
    select: handleSelect,
  });

  calendar.render();

  // 🔄 Adapter la vue si on change de taille d’écran
  window.addEventListener("resize", () => {
    const view = window.innerWidth < 768 ? "timeGridWeek" : "dayGridMonth";
    if (calendar.view.type !== view) calendar.changeView(view);
  });

  // 🖱️ Gestion des boutons
  document.getElementById("btn-enregistrer").addEventListener("click", enregistrerEvenement);
  document.getElementById("btn-annuler").addEventListener("click", annulerAction);
  document.getElementById("btn-supprimer").addEventListener("click", supprimerEvenement);
  document.getElementById("btn-ajouter").addEventListener("click", nouveauEvenement);
});

// =========================
// 📡 Chargement des événements
// =========================
async function chargerEvenements() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    return data.map(e => ({
      id: e.id,
      title: e.titre,
      start: e.debut,
      end: e.fin,
      color: e.couleur || "#2196F3"
    }));
  } catch (err) {
    console.error("Erreur de chargement :", err);
    return [];
  }
}

// =========================
// 🆕 Création d’un nouvel événement
// =========================
function nouveauEvenement() {
  selectedEvent = null;
  document.getElementById("btn-enregistrer").style.display = "inline-block";
  document.getElementById("btn-annuler").style.display = "inline-block";
  document.getElementById("btn-supprimer").style.display = "none";
  document.getElementById("event-modal").classList.add("visible");
}

// =========================
// ✏️ Sélection ou clic sur un événement existant
// =========================
function handleEventClick(info) {
  selectedEvent = info.event;
  document.getElementById("titre").value = selectedEvent.title;
  document.getElementById("debut").value = selectedEvent.startStr.slice(0, 16);
  document.getElementById("fin").value = selectedEvent.endStr.slice(0, 16);
  document.getElementById("event-modal").classList.add("visible");

  // Afficher uniquement Enregistrer + Supprimer
  document.getElementById("btn-enregistrer").style.display = "inline-block";
  document.getElementById("btn-supprimer").style.display = "inline-block";
  document.getElementById("btn-annuler").style.display = "none";
}

// =========================
// 📅 Sélection d’un créneau libre
// =========================
function handleSelect(info) {
  selectedEvent = null;
  document.getElementById("titre").value = "";
  document.getElementById("debut").value = info.startStr.slice(0, 16);
  document.getElementById("fin").value = info.endStr.slice(0, 16);
  document.getElementById("event-modal").classList.add("visible");

  // Afficher Enregistrer + Annuler uniquement
  document.getElementById("btn-enregistrer").style.display = "inline-block";
  document.getElementById("btn-annuler").style.display = "inline-block";
  document.getElementById("btn-supprimer").style.display = "none";
}

// =========================
// 💾 Enregistrer un événement
// =========================
async function enregistrerEvenement() {
  const titre = document.getElementById("titre").value;
  const debut = document.getElementById("debut").value;
  const fin = document.getElementById("fin").value;

  if (!titre || !debut || !fin) {
    alert("Merci de remplir tous les champs.");
    return;
  }

  const payload = {
    action: selectedEvent ? "modifier" : "ajouter",
    id: selectedEvent ? selectedEvent.id : null,
    titre,
    debut,
    fin
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      alert("✅ Événement enregistré !");
      calendar.refetchEvents();
      fermerModal();
    } else {
      alert("❌ Erreur lors de l’enregistrement.");
    }
  } catch (err) {
    console.error(err);
    alert("Erreur réseau.");
  }
}

// =========================
// 🗑️ Supprimer un événement
// =========================
async function supprimerEvenement() {
  if (!selectedEvent) return;
  if (!confirm("Supprimer cet événement ?")) return;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "supprimer", id: selectedEvent.id })
    });
    const result = await res.json();

    if (result.success) {
      alert("🗑️ Événement supprimé !");
      selectedEvent.remove();
      fermerModal();
    } else {
      alert("❌ Erreur lors de la suppression.");
    }
  } catch (err) {
    console.error(err);
    alert("Erreur réseau.");
  }
}

// =========================
// ❌ Annuler et fermer la modale
// =========================
function annulerAction() {
  fermerModal();
}

function fermerModal() {
  document.getElementById("event-modal").classList.remove("visible");
  selectedEvent = null;
}