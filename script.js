// ===============================
// 📅 Script principal Planning TPL
// ===============================

const API_URL = "https://tpl-proxy.tsqdevin.workers.dev/?url=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FAKfycbySRUailaKz0w_hRizFPOyUV79h5OUsLjdmb8S2WENKfAKm1rcfCq7Jn_W5uLGp2Jck%2Fexec";
let calendrier;
let evenementActif = null;

// ===============================
// 🔄 Chargement du planning
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ Initialisation du planning...");
  await chargerPlanning();
  initialiserBoutonAjout();
});

// ===============================
// 📥 Charger les événements depuis l’API
// ===============================
async function chargerPlanning() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const calendarEl = document.getElementById("calendar");
    calendrier = new FullCalendar.Calendar(calendarEl, {
      initialView: "timeGridWeek",
      locale: "fr",
      editable: true,
      selectable: true,
      eventClick: handleEventClick,
      select: handleSelect,
      events: data.map(evt => ({
        id: evt.id,
        title: evt.titre,
        start: evt.debut,
        end: evt.fin,
        backgroundColor: evt.couleur || "#2196F3",
        extendedProps: { categorie: evt.categorie }
      }))
    });

    calendrier.render();
    console.log("✅ Planning chargé avec succès !");
  } catch (err) {
    console.error("❌ Erreur lors du chargement du planning :", err);
  }
}

// ===============================
// ➕ Gestion du bouton +
 // ===============================
function initialiserBoutonAjout() {
  const btn = document.getElementById("add-event-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    evenementActif = null;
    ouvrirPopup("Créer un événement");
  });
}

// ===============================
// 🧩 Clic sur un événement existant
// ===============================
function handleEventClick(info) {
  evenementActif = info.event;
  ouvrirPopup("Modifier l’événement", evenementActif);
}

// ===============================
// 🕓 Sélection d’un créneau vide
// ===============================
function handleSelect(selectionInfo) {
  evenementActif = null;
  ouvrirPopup("Créer un événement", {
    start: selectionInfo.startStr,
    end: selectionInfo.endStr
  });
}

// ===============================
// 🪟 Ouvrir le popup de création/modification
// ===============================
function ouvrirPopup(titre, evt = null) {
  const modal = document.getElementById("event-modal");
  const titreEl = document.getElementById("modal-title");
  const inputTitre = document.getElementById("event-title");
  const inputDebut = document.getElementById("event-start");
  const inputFin = document.getElementById("event-end");
  const selectCategorie = document.getElementById("event-category");
  const btnEnregistrer = document.getElementById("save-btn");
  const btnSupprimer = document.getElementById("delete-btn");
  const btnAnnuler = document.getElementById("cancel-btn");

  titreEl.textContent = titre;

  if (evt && evt.id) {
    // Mode modification
    inputTitre.value = evt.title || "";
    inputDebut.value = evt.startStr || evt.start;
    inputFin.value = evt.endStr || evt.end;
    selectCategorie.value = evt.extendedProps?.categorie || "";

    btnSupprimer.style.display = "inline-block";
    btnAnnuler.style.display = "none"; // 🔹 On masque Annuler ici
  } else {
    // Mode création
    inputTitre.value = "";
    inputDebut.value = evt?.start || "";
    inputFin.value = evt?.end || "";
    selectCategorie.value = "";
    btnSupprimer.style.display = "none";
    btnAnnuler.style.display = "inline-block";
  }

  modal.showModal();

  // Nettoyage des anciens écouteurs
  btnEnregistrer.onclick = async () => await enregistrerEvenement();
  btnSupprimer.onclick = async () => await supprimerEvenement();
  btnAnnuler.onclick = () => modal.close();
}

// ===============================
// 💾 Enregistrer un événement
// ===============================
async function enregistrerEvenement() {
  const titre = document.getElementById("event-title").value;
  const debut = document.getElementById("event-start").value;
  const fin = document.getElementById("event-end").value;
  const categorie = document.getElementById("event-category").value;
  const modal = document.getElementById("event-modal");

  if (!titre || !debut || !fin) return alert("Veuillez remplir tous les champs.");

  const data = {
    id: evenementActif ? evenementActif.id : null,
    titre,
    debut,
    fin,
    categorie
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: evenementActif ? "modifier" : "ajouter",
        ...data
      })
    });

    modal.close();
    calendrier.refetchEvents();
  } catch (err) {
    console.error("❌ Erreur lors de l’enregistrement :", err);
  }
}

// ===============================
// 🗑️ Supprimer un événement
// ===============================
async function supprimerEvenement() {
  if (!evenementActif) return;
  if (!confirm("Supprimer cet événement ?")) return;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "supprimer", id: evenementActif.id })
    });

    document.getElementById("event-modal").close();
    calendrier.refetchEvents();
  } catch (err) {
    console.error("❌ Erreur lors de la suppression :", err);
  }
}