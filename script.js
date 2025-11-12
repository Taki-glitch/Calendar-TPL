console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

let calendar;
let isOffline = !navigator.onLine;
let currentLang = localStorage.getItem("lang") || "fr";

/**************************************************************
 * 🌐 DOMContentLoaded
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const OFFLINE_BANNER = document.getElementById("offline-banner");
  const ADD_EVENT_BTN = document.getElementById("add-event-btn");
  const THEME_TOGGLE = document.getElementById("theme-toggle");
  const LANG_TOGGLE = document.getElementById("lang-toggle");
  const MENU_BTN = document.getElementById("menu-btn");
  const SIDE_MENU = document.getElementById("side-menu");
  const OVERLAY = document.getElementById("overlay");
  const SIDE_THEME_TOGGLE = document.getElementById("side-theme-toggle");
  const SIDE_LANG_TOGGLE = document.getElementById("side-lang-toggle");
  const MENU_CLOSE = document.getElementById("menu-close");

  /********** Thème **********/
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  const toggleTheme = () => {
    const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nextTheme);
  };
  THEME_TOGGLE?.addEventListener("click", toggleTheme);
  SIDE_THEME_TOGGLE?.addEventListener("click", toggleTheme);

  /********** Langue **********/
  LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;

  const toggleLang = () => {
    currentLang = currentLang === "fr" ? "ru" : "fr";
    localStorage.setItem("lang", currentLang);
    LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
    SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;
    majTraductionGlobale();
    chargerPlanning(); // recharge la vue sans reload
  };
  LANG_TOGGLE.addEventListener("click", toggleLang);
  SIDE_LANG_TOGGLE.addEventListener("click", toggleLang);

  /********** Menu latéral **********/
  MENU_BTN?.addEventListener("click", () => openMenu(SIDE_MENU, OVERLAY));
  MENU_CLOSE?.addEventListener("click", () => closeMenu(SIDE_MENU, OVERLAY));
  OVERLAY?.addEventListener("click", () => closeMenu(SIDE_MENU, OVERLAY));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu(SIDE_MENU, OVERLAY);
  });

  /********** Bouton + **********/
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  /********** Réseau **********/
  window.addEventListener("online", () => {
    isOffline = false;
    OFFLINE_BANNER.classList.add("hidden");
    chargerPlanning();
  });
  window.addEventListener("offline", () => {
    isOffline = true;
    OFFLINE_BANNER.classList.remove("hidden");
  });

  /********** Chargement **********/
  chargerPlanning();
});

/**************************************************************
 * 🌗 THÈME
 **************************************************************/
function appliquerTheme(theme) {
  const body = document.body;
  const THEME_TOGGLE = document.getElementById("theme-toggle");
  const SIDE_THEME_TOGGLE = document.getElementById("side-theme-toggle");

  if (theme === "dark") {
    body.classList.add("dark");
    THEME_TOGGLE.textContent = "☀️";
    SIDE_THEME_TOGGLE.textContent = "☀️";
  } else {
    body.classList.remove("dark");
    THEME_TOGGLE.textContent = "🌙";
    SIDE_THEME_TOGGLE.textContent = "🌙";
  }
  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 MULTILINGUE
 **************************************************************/
function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

function majTraductionGlobale() {
  // Traduction du bandeau offline + loader + modal
  document.getElementById("offline-banner").textContent = traduireTexte(
    "🚫 Vous êtes hors ligne — mode local activé",
    "🚫 Вы не в сети — автономный режим активирован"
  );

  const loader = document.getElementById("loader");
  loader.textContent = traduireTexte("Chargement du calendrier...", "Загрузка календаря...");
}

/**************************************************************
 * 🧭 MENU LATÉRAL
 **************************************************************/
function openMenu(SIDE_MENU, OVERLAY) {
  document.body.classList.add("menu-open");
  SIDE_MENU?.setAttribute("aria-hidden", "false");
  OVERLAY?.setAttribute("aria-hidden", "false");
  document.documentElement.style.overflow = "hidden";
}

function closeMenu(SIDE_MENU, OVERLAY) {
  document.body.classList.remove("menu-open");
  SIDE_MENU?.setAttribute("aria-hidden", "true");
  OVERLAY?.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

/**************************************************************
 * 🔁 CHARGEMENT DES ÉVÉNEMENTS
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  loader.classList.remove("hidden");
  loader.textContent = traduireTexte("Chargement du calendrier...", "Загрузка календаря...");

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
  } catch (e) {
    console.warn("⚠️ Erreur de chargement, utilisation du cache local :", e);
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * 📅 FULLCALENDAR
 **************************************************************/
function renderCalendar(events) {
  const el = document.getElementById("planning");
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth <= 900;
  calendar = new FullCalendar.Calendar(el, {
    locale: currentLang === "fr" ? "fr" : "ru",
    firstDay: 1,
    nowIndicator: true,
    initialView: isMobile ? "timeGridWeek" : "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: isMobile ? "" : "dayGridMonth,timeGridWeek,timeGridDay"
    },
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
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category }
    })),
    select: (info) => openEventModal(null, info),
    eventClick: (info) => openEventModal(info.event),
    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event))
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
    "Autre": "#6c757d"
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * 💾 SAUVEGARDE / SUPPRESSION
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps.category
  };
}

async function saveEvent(event) {
  let data = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = data.findIndex(e => e.id === event.id);
  if (i >= 0) data[i] = event;
  else data.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(data));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "patch", data: [event] })
      });
    } catch (e) {
      console.warn("⚠️ Sauvegarde réseau échouée :", e);
    }
  }
}

async function deleteEvent(event) {
  if (!confirm(traduireTexte("Supprimer cet événement ?", "Удалить это событие?"))) return;
  event.remove();
  let data = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  data = data.filter(e => e.id !== event.id);
  localStorage.setItem("tplEvents", JSON.stringify(data));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delete", data: [event.id] })
      });
    } catch (e) {
      console.warn("⚠️ Erreur suppression serveur :", e);
    }
  }
}

/**************************************************************
 * 🪟 MODALE D’ÉVÉNEMENT (labels traduits)
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  const content = document.querySelector(".modal-content");
  const title = document.getElementById("event-title");
  const start = document.getElementById("event-start");
  const end = document.getElementById("event-end");
  const cat = document.getElementById("event-category");
  const save = document.getElementById("save-event");
  const cancel = document.getElementById("cancel-event");
  const del = document.getElementById("delete-event");
  const modalTitle = document.getElementById("modal-title");

  const texts = {
    fr: {
      newEvent: "Nouvel événement",
      editEvent: "Modifier l’événement",
      save: "💾 Enregistrer",
      cancel: "Annuler",
      delete: "🗑️ Supprimer",
      title: "Titre",
      start: "Début",
      end: "Fin",
      category: "Catégorie",
      placeholder: "Entrez un titre"
    },
    ru: {
      newEvent: "Новое событие",
      editEvent: "Редактировать событие",
      save: "💾 Сохранить",
      cancel: "Отмена",
      delete: "🗑️ Удалить",
      title: "Название",
      start: "Начало",
      end: "Конец",
      category: "Категория",
      placeholder: "Введите название"
    }
  };

  const t = texts[currentLang];
  document.querySelector('label[for="event-title"]').textContent = t.title;
  document.querySelector('label[for="event-start"]').textContent = t.start;
  document.querySelector('label[for="event-end"]').textContent = t.end;
  document.querySelector('label[for="event-category"]').textContent = t.category;
  title.placeholder = t.placeholder;
  save.textContent = t.save;
  cancel.textContent = t.cancel;
  del.textContent = t.delete;

  modal.classList.remove("hidden");
  setTimeout(() => title.focus(), 300);

  if (!event) {
    modalTitle.textContent = t.newEvent;
    title.value = "";
    start.value = info?.startStr?.slice(0, 16) || "";
    end.value = info?.endStr?.slice(0, 16) || "";
    del.classList.add("hidden");
  } else {
    modalTitle.textContent = t.editEvent;
    title.value = event.title;
    start.value = event.startStr.slice(0, 16);
    end.value = event.endStr ? event.endStr.slice(0, 16) : "";
    del.classList.remove("hidden");
  }

  const close = () => modal.classList.add("hidden");
  modal.onclick = (e) => { if (!content.contains(e.target)) close(); };
  cancel.onclick = close;
  del.onclick = () => { deleteEvent(event); close(); };

  save.onclick = () => {
    const newEvt = {
      id: event ? event.id : crypto.randomUUID(),
      title: title.value.trim() || "(Sans titre)",
      start: start.value,
      end: end.value || start.value,
      category: cat.value
    };
    if (event) event.remove();
    calendar.addEvent({
      ...newEvt,
      backgroundColor: getCategoryColor(newEvt.category),
      extendedProps: { category: newEvt.category }
    });
    saveEvent(newEvt);
    close();
  };
}