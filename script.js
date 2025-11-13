console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

let OFFLINE_BANNER = null;
let ADD_EVENT_BTN = null;
let THEME_TOGGLE = null;
let LANG_TOGGLE = null;
let MENU_BTN = null;
let SIDE_MENU = null;
let OVERLAY = null;
let SIDE_THEME_TOGGLE = null;
let SIDE_LANG_TOGGLE = null;
let MENU_CLOSE = null;

let isOffline = !navigator.onLine;
let calendar = null;

/**************************************************************
 * 🌐 Éléments DOM & initialisations (après DOMContentLoaded)
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Query les éléments maintenant (plus sûr)
  OFFLINE_BANNER = document.getElementById("offline-banner");
  ADD_EVENT_BTN = document.getElementById("add-event-btn");
  THEME_TOGGLE = document.getElementById("theme-toggle");
  LANG_TOGGLE = document.getElementById("lang-toggle");
  MENU_BTN = document.getElementById("menu-btn");
  SIDE_MENU = document.getElementById("side-menu");
  OVERLAY = document.getElementById("overlay");
  SIDE_THEME_TOGGLE = document.getElementById("side-theme-toggle");
  SIDE_LANG_TOGGLE = document.getElementById("side-lang-toggle");
  MENU_CLOSE = document.getElementById("menu-close");

  // Thème
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  THEME_TOGGLE?.addEventListener("click", () => {
    const nouveauTheme = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nouveauTheme);
  });

  SIDE_THEME_TOGGLE?.addEventListener("click", () => {
    const nouveauTheme = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nouveauTheme);
  });

  // Langue
  const savedLang = localStorage.getItem("lang") || "fr";
  currentLang = savedLang;
  LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  LANG_TOGGLE.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
    LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    // On laisse la page se recharger si nécessaire (car textes statiques)
    location.reload();
  });

  SIDE_LANG_TOGGLE?.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
    // Met à jour les deux toggles visuels
    if (LANG_TOGGLE) LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    if (SIDE_LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    location.reload();
  });

  // Menu latéral
  MENU_BTN?.addEventListener("click", openMenu);
  OVERLAY?.addEventListener("click", closeMenu);
  MENU_CLOSE?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu();
  });

  // Bouton + pour ouvrir la modale
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  // Lang toggle initial visual for side
  if (SIDE_LANG_TOGGLE && LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;

  // Charger planning
  chargerPlanning();
});

/***********************
 * Fonctions menu
 ***********************/
function openMenu() {
  document.body.classList.add("menu-open");
  if (OVERLAY) OVERLAY.setAttribute("aria-hidden", "false");
  if (SIDE_MENU) SIDE_MENU.setAttribute("aria-hidden", "false");
  // lock scroll on body (simple)
  document.documentElement.style.overflow = "hidden";
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  if (OVERLAY) OVERLAY.setAttribute("aria-hidden", "true");
  if (SIDE_MENU) SIDE_MENU.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

/**************************************************************
 * 🌗 THÈME SOMBRE / CLAIR
 **************************************************************/
function appliquerTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    // update toggles if available
    if (THEME_TOGGLE) THEME_TOGGLE.textContent = "☀️";
    if (SIDE_THEME_TOGGLE) SIDE_THEME_TOGGLE.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    if (THEME_TOGGLE) THEME_TOGGLE.textContent = "🌙";
    if (SIDE_THEME_TOGGLE) SIDE_THEME_TOGGLE.textContent = "🌙";
  }
  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 GESTION MULTILINGUE (FR / RU)
 **************************************************************/
let currentLang = localStorage.getItem("lang") || "fr";

function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

function changerLangue(langue) {
  currentLang = langue;
  localStorage.setItem("lang", langue);
  // Si le calendrier est déjà initialisé, recharger
  if (calendar) {
    chargerPlanning();
  }
}

/**************************************************************
 * 🔌 CONNEXION RÉSEAU
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
 * 🔁 CHARGEMENT DU PLANNING
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");
  loader.textContent = isOffline
    ? traduireTexte("Mode hors ligne — données locales...", "Автономный режим — локальные данные...")
    : traduireTexte("Chargement du calendrier...", "Загрузка календаря...");

  let events = [];

  if (isOffline) {
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    loader.classList.add("hidden");
    return renderCalendar(events);
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    const text = await res.text();
    events = JSON.parse(text);
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.warn("⚠️ Erreur de chargement, mode local :", err);
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 AFFICHAGE DU CALENDRIER
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth <= 900;

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: currentLang,
    firstDay: 1,
    nowIndicator: true,
    initialView: isMobile ? "timeGridWeek" : "dayGridMonth",
    headerToolbar: isMobile
      ? { left: "prev,next", center: "title", right: "" }
      : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },
    buttonText: {
      today: traduireTexte("Aujourd’hui", "Сегодня"),
      month: traduireTexte("Mois", "Месяц"),
      week: traduireTexte("Semaine", "Неделя"),
      day: traduireTexte("Jour", "День"),
      list: traduireTexte("Liste", "Список")
    },
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    allDaySlot: false,
    selectable: true,
    editable: true,
    height: "auto",

    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category },
    })),

    select: (info) => openEventModal(null, info),
    eventClick: (info) => openEventModal(info.event),
    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event)),
  });

  calendar.render();
}

/**************************************************************
 * 🎨 COULEURS DES CATÉGORIES
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
    "Autre": "#6c757d",
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * 💾 SAUVEGARDE LOCALE + SERVEUR
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps.category,
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = saved.findIndex((e) => e.id === event.id);
  if (i >= 0) saved[i] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "patch", data: [event] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur réseau, enregistrement local uniquement :", err);
    }
  }
}

/**************************************************************
 * 🗑️ SUPPRESSION D’ÉVÉNEMENT
 **************************************************************/
/*async function deleteEvent(event) {
  if (!confirm(traduireTexte("Supprimer cet événement ?", "Удалить это событие?"))) return;
  event.remove();

  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter((e) => e.id !== event.id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delete", data: [event.id] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur de suppression :", err);
    }
  }
}*/

/**************************************************************
 * 🪟 MODALE D’ÉVÉNEMENT (avec focus mobile)
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  const modalContent = document.querySelector(".modal-content");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  //const deleteBtn = document.getElementById("delete-event");
  const modalTitle = document.getElementById("modal-title");

  // Labels
  const labelTitle = document.querySelector('label[for="event-title"]');
  const labelStart = document.querySelector('label[for="event-start"]');
  const labelEnd = document.querySelector('label[for="event-end"]');
  const labelCategory = document.querySelector('label[for="event-category"]');

  // Translations
  const texts = {
    fr: {
      newEvent: "Nouvel événement",
      editEvent: "Modifier l’événement",
      save: "💾 Enregistrer",
      cancel: "Annuler",
      //delete: "🗑️ Supprimer",
      titleLabel: "Titre",
      startLabel: "Début",
      endLabel: "Fin",
      categoryLabel: "Catégorie",
      titlePlaceholder: "Entrez un titre",
      startPlaceholder: "Sélectionnez la date de début",
      endPlaceholder: "Sélectionnez la date de fin"
    },
    ru: {
      newEvent: "Новое событие",
      editEvent: "Редактировать событие",
      save: "💾 Сохранить",
      cancel: "Отмена",
      //delete: "🗑️ Удалить",
      titleLabel: "Название",
      startLabel: "Начало",
      endLabel: "Конец",
      categoryLabel: "Категория",
      titlePlaceholder: "Введите название",
      startPlaceholder: "Выберите дату начала",
      endPlaceholder: "Выберите дату окончания"
    }
  };

  const t = texts[currentLang];

  // Apply texts
  if (labelTitle) labelTitle.textContent = t.titleLabel;
  if (labelStart) labelStart.textContent = t.startLabel;
  if (labelEnd) labelEnd.textContent = t.endLabel;
  if (labelCategory) labelCategory.textContent = t.categoryLabel;
  if (titleInput) titleInput.placeholder = t.titlePlaceholder;
  if (startInput) startInput.placeholder = t.startPlaceholder;
  if (endInput) endInput.placeholder = t.endPlaceholder;
  if (saveBtn) saveBtn.textContent = t.save;
  if (cancelBtn) cancelBtn.textContent = t.cancel;
  //if (deleteBtn) deleteBtn.textContent = t.delete;

  modal.classList.remove("hidden");

  // Focus mobile (gives time for animation)
  setTimeout(() => {
    titleInput?.focus();
  }, 300);

  if (!event) {
    modalTitle.textContent = t.newEvent;
    titleInput.value = "";
    startInput.value = info?.startStr?.slice(0, 16) || "";
    endInput.value = info?.endStr ? info.endStr.slice(0, 16) : "";
    categorySelect.value = "Hôtel-Dieu";
    cancelBtn.classList.remove("hidden");
    //deleteBtn.classList.add("hidden");
  } else {
    modalTitle.textContent = t.editEvent;
    titleInput.value = event.title;
    startInput.value = event.startStr.slice(0, 16);
    endInput.value = event.endStr ? event.endStr.slice(0, 16) : event.startStr.slice(0, 16);
    categorySelect.value = event.extendedProps.category || "Autre";
    cancelBtn.classList.add("hidden");
    //deleteBtn.classList.remove("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = (e) => {
    if (!modalContent.contains(e.target)) closeModal();
  };

  saveBtn.onclick = () => {
    const newEvent = {
      id: event ? event.id : crypto.randomUUID(),
      title: titleInput.value.trim() || "(Sans titre)",
      start: startInput.value,
      end: endInput.value || startInput.value,
      category: categorySelect.value,
    };

    if (event) event.remove();

    calendar.addEvent({
      ...newEvent,
      backgroundColor: getCategoryColor(newEvent.category),
      extendedProps: { category: newEvent.category },
    });

    saveEvent(newEvent);
    closeModal();
  };

  cancelBtn.onclick = closeModal;
  //deleteBtn.onclick = () => {
    //deleteEvent(event);
    //closeModal();
  //};
} 