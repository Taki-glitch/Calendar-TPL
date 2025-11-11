console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

const OFFLINE_BANNER = document.getElementById("offline-banner");
const ADD_EVENT_BTN = document.getElementById("add-event-btn");
const THEME_TOGGLE = document.getElementById("theme-toggle");
const LANG_TOGGLE = document.getElementById("lang-toggle");

let isOffline = !navigator.onLine;
let calendar = null;

/**************************************************************
 * 🌗 THÈME SOMBRE / CLAIR
 **************************************************************/
function appliquerTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    THEME_TOGGLE.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    THEME_TOGGLE.textContent = "🌙";
  }
  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 GESTION MULTILINGUE (FR / RU)
 **************************************************************/
let currentLang = localStorage.getItem("lang") || "fr";

const traductions = {
  fr: {
    offline: "⚠️ Vous êtes hors ligne",
    loading: "Chargement du calendrier...",
    offlineMode: "Mode hors ligne — données locales...",
    today: "Aujourd’hui",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    list: "Liste",
    newEvent: "Nouvel événement",
    editEvent: "Modifier l’événement",
    title: "Titre",
    start: "Début",
    end: "Fin",
    category: "Catégorie",
    save: "💾 Enregistrer",
    cancel: "Annuler",
    delete: "🗑️ Supprimer",
    deleteConfirm: "Supprimer cet événement ?",
  },
  ru: {
    offline: "⚠️ Вы не в сети",
    loading: "Загрузка календаря...",
    offlineMode: "Автономный режим — локальные данные...",
    today: "Сегодня",
    month: "Месяц",
    week: "Неделя",
    day: "День",
    list: "Список",
    newEvent: "Новое событие",
    editEvent: "Редактировать событие",
    title: "Название",
    start: "Начало",
    end: "Конец",
    category: "Категория",
    save: "💾 Сохранить",
    cancel: "Отмена",
    delete: "🗑️ Удалить",
    deleteConfirm: "Удалить это событие?",
  }
};

function t(key) {
  return traductions[currentLang][key] || key;
}

function appliquerLangue() {
  LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  document.documentElement.lang = currentLang;

  // Traduire les éléments HTML ayant data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t(key)) el.textContent = t(key);
  });

  // Traduire les placeholders
  const titleInput = document.getElementById("event-title");
  if (titleInput)
    titleInput.placeholder =
      currentLang === "fr" ? "Ex : Réunion équipe" : "Напр.: собрание команды";

  // Recharger le calendrier avec la bonne locale
  chargerPlanning();
}

LANG_TOGGLE.addEventListener("click", () => {
  currentLang = currentLang === "fr" ? "ru" : "fr";
  localStorage.setItem("lang", currentLang);
  appliquerLangue();
});

/**************************************************************
 * 🔌 CONNEXION RÉSEAU
 **************************************************************/
window.addEventListener("online", () => {
  isOffline = false;
  OFFLINE_BANNER.classList.add("hidden");
  chargerPlanning();
});

window.addEventListener("offline", () => {
  isOffline = true;
  OFFLINE_BANNER.textContent = t("offline");
  OFFLINE_BANNER.classList.remove("hidden");
});

/**************************************************************
 * 🔁 CHARGEMENT DU PLANNING
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");
  loader.textContent = isOffline ? t("offlineMode") : t("loading");

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
      today: t("today"),
      month: t("month"),
      week: t("week"),
      day: t("day"),
      list: t("list")
    },
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category },
    })),
    selectable: true,
    editable: true,
    eventClick: (info) => openEventModal(info.event),
    select: (info) => openEventModal(null, info),
  });

  calendar.render();
}

/**************************************************************
 * 🎨 COULEURS DES CATÉGORIES
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie / Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
    "Autre": "#6c757d",
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * 🪟 MODALE
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
  const deleteBtn = document.getElementById("delete-event");
  const modalTitle = document.getElementById("modal-title");

  modal.classList.remove("hidden");

  if (!event) {
    modalTitle.textContent = t("newEvent");
    titleInput.value = "";
    startInput.value = info?.startStr?.slice(0, 16) || "";
    endInput.value = info?.endStr ? info.endStr.slice(0, 16) : "";
    categorySelect.value = "Hôtel-Dieu";
    cancelBtn.classList.remove("hidden");
    deleteBtn.classList.add("hidden");
  } else {
    modalTitle.textContent = t("editEvent");
    titleInput.value = event.title;
    startInput.value = event.startStr.slice(0, 16);
    endInput.value = event.endStr ? event.endStr.slice(0, 16) : event.startStr.slice(0, 16);
    categorySelect.value = event.extendedProps.category || "Autre";
    cancelBtn.classList.add("hidden");
    deleteBtn.classList.remove("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = (e) => { if (!modalContent.contains(e.target)) closeModal(); };

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
  deleteBtn.onclick = () => {
    if (confirm(t("deleteConfirm"))) {
      deleteEvent(event);
      closeModal();
    }
  };
}

/**************************************************************
 * 💾 SAUVEGARDE LOCALE
 **************************************************************/
function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = saved.findIndex((e) => e.id === event.id);
  if (i >= 0) saved[i] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));
}

/**************************************************************
 * 🗑️ SUPPRESSION
 **************************************************************/
function deleteEvent(event) {
  event.remove();
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  saved = saved.filter((e) => e.id !== event.id);
  localStorage.setItem("tplEvents", JSON.stringify(saved));
}

/**************************************************************
 * 🚀 INITIALISATION
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);
  THEME_TOGGLE.addEventListener("click", () => {
    const nouveau = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nouveau);
  });

  ADD_EVENT_BTN.addEventListener("click", () => openEventModal());
  appliquerLangue();
});