document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("planning");
  const modal = document.getElementById("event-modal");
  const modalTitle = document.getElementById("modal-title");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const deleteBtn = document.getElementById("delete-event");
  const addBtn = document.getElementById("add-event-btn");
  const loader = document.getElementById("loader");
  const offlineBanner = document.getElementById("offline-banner");

  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categoryInput = document.getElementById("event-category");

  let isEditing = false;
  let currentEvent = null;

  // 🌐 URL de ton API Google Apps Script (à personnaliser)
  const API_URL = "https://tpl-proxy.tsqdevin.workers.dev/?url=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FAKfycbySRUailaKz0w_hRizFPOyUV79h5OUsLjdmb8S2WENKfAKm1rcfCq7Jn_W5uLGp2Jck%2Fexec";

  // 🌙 Thème clair/sombre
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // 📱 Vue par défaut selon appareil
  const isMobile = window.innerWidth <= 900;
  const initialView = isMobile ? "timeGridWeek" : "dayGridMonth";

  // 📅 Initialisation du calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView,
    locale: "fr",
    firstDay: 1,
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    allDaySlot: false,
    nowIndicator: true,
    editable: true,
    selectable: true,
    headerToolbar: isMobile
      ? { left: "prev,next", center: "title", right: "" }
      : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },

    // 🎨 Couleurs selon catégorie
    eventDidMount: (info) => {
      const cat = info.event.extendedProps.category;
      if (cat) info.el.classList.add(cat.toLowerCase().replace(/\s+/g, "-"));
    },

    // 📤 Clic sur un créneau libre → nouvelle entrée
    select: (info) => {
      isEditing = false;
      currentEvent = null;
      modalTitle.textContent = "Nouvel événement";
      deleteBtn.classList.add("hidden");
      cancelBtn.classList.remove("hidden");
      saveBtn.textContent = "💾 Enregistrer";

      titleInput.value = "";
      startInput.value = info.startStr.slice(0, 16);
      endInput.value = info.endStr ? info.endStr.slice(0, 16) : "";
      categoryInput.value = "Hôtel-Dieu";

      modal.classList.remove("hidden");
    },

    // ✏️ Clic sur un événement → édition
    eventClick: (info) => {
      isEditing = true;
      currentEvent = info.event;

      modalTitle.textContent = "Modifier l’événement";
      titleInput.value = currentEvent.title;
      startInput.value = currentEvent.start.toISOString().slice(0, 16);
      endInput.value = currentEvent.end ? currentEvent.end.toISOString().slice(0, 16) : "";
      categoryInput.value = currentEvent.extendedProps.category || "Autre";

      // Masquer "Annuler", montrer "Supprimer"
      cancelBtn.classList.add("hidden");
      deleteBtn.classList.remove("hidden");
      saveBtn.textContent = "💾 Enregistrer";

      modal.classList.remove("hidden");
    },

    // 🔁 Charger les événements
    events: async (fetchInfo, successCallback, failureCallback) => {
      try {
        loader.classList.remove("hidden");
        const res = await fetch(API_URL);
        const data = await res.json();
        successCallback(data);
      } catch (err) {
        console.error("Erreur de chargement :", err);
        failureCallback(err);
        offlineBanner.classList.remove("hidden");
      } finally {
        loader.classList.add("hidden");
      }
    },
  });

  calendar.render();

  // ➕ Bouton "Ajouter"
  addBtn.addEventListener("click", () => {
    isEditing = false;
    currentEvent = null;
    modalTitle.textContent = "Nouvel événement";

    titleInput.value = "";
    startInput.value = "";
    endInput.value = "";
    categoryInput.value = "Hôtel-Dieu";

    deleteBtn.classList.add("hidden");
    cancelBtn.classList.remove("hidden");
    saveBtn.textContent = "💾 Enregistrer";
    modal.classList.remove("hidden");
  });

  // 💾 Enregistrer
  saveBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const start = startInput.value;
    const end = endInput.value;
    const category = categoryInput.value;

    if (!title || !start || !end) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const newEvent = {
      title,
      start,
      end,
      category,
    };

    try {
      if (isEditing && currentEvent) {
        currentEvent.setProp("title", title);
        currentEvent.setStart(start);
        currentEvent.setEnd(end);
        currentEvent.setExtendedProp("category", category);
      } else {
        calendar.addEvent(newEvent);
      }
      modal.classList.add("hidden");
    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
    }
  });

  // ❌ Annuler (création uniquement)
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // 🗑️ Supprimer (modification uniquement)
  deleteBtn.addEventListener("click", () => {
    if (currentEvent && confirm("Voulez-vous vraiment supprimer cet événement ?")) {
      currentEvent.remove();
      modal.classList.add("hidden");
    }
  });

  // 🧭 Gestion hors ligne
  window.addEventListener("online", () => offlineBanner.classList.add("hidden"));
  window.addEventListener("offline", () => offlineBanner.classList.remove("hidden"));
});