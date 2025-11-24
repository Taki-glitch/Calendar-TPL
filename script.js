// script.js — version intégrale et robuste
console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION GÉNÉRALE
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

let OFFLINE_BANNER, ADD_EVENT_BTN, THEME_TOGGLE, LANG_TOGGLE;
let MENU_BTN, SIDE_MENU, OVERLAY, SIDE_THEME_TOGGLE, SIDE_LANG_TOGGLE, MENU_CLOSE;
let calendar = null;
let currentLang = localStorage.getItem("lang") || "fr";
let isOffline = !navigator.onLine;

/**************************************************************
 * 🗺️ CONFIG uMap
 **************************************************************/
const UMAP_BASE = "//umap.openstreetmap.fr/fr/map/points-tpl-nantes-russe_1315005";
function getUmapUrl(theme = "light") {
  const layer = theme === "dark" ? "jawg-dark" : "OSM";
  const themeParam = theme === "dark" ? "dark" : "light";
  const params =
    "?scaleControl=false&miniMap=false&scrollWheelZoom=false&zoomControl=true&editMode=disabled&moreControl=true" +
    "&searchControl=null&tilelayersControl=null&embedControl=null&datalayersControl=true&onLoadPanel=none" +
    "&captionBar=false&captionMenus=true";
  return `${UMAP_BASE}${params}&theme=${themeParam}&layer=${layer}`;
}

/**************************************************************
 * 🌐 INITIALISATION DU DOM
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Éléments DOM principaux
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

  // uMap (instructions.html)
  const MAP_WRAPPER = document.getElementById("map-wrapper");
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_BTN = document.getElementById("toggle-map-btn");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");

  // Thème
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  // Boutons thème
  [THEME_TOGGLE, SIDE_THEME_TOGGLE].forEach(btn => {
    btn?.addEventListener("click", () => {
      const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
      appliquerTheme(newTheme);
    });
  });

  // Langue
  if (LANG_TOGGLE) LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  [LANG_TOGGLE, SIDE_LANG_TOGGLE].forEach(btn => {
    btn?.addEventListener("click", () => {
      const newLang = currentLang === "fr" ? "ru" : "fr";
      changerLangue(newLang);
      LANG_TOGGLE && (LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺");
      SIDE_LANG_TOGGLE && (SIDE_LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺");
      location.reload();
    });
  });

  // Menu latéral
  MENU_BTN?.addEventListener("click", openMenu);
  OVERLAY?.addEventListener("click", closeMenu);
  MENU_CLOSE?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => e.key === "Escape" && document.body.classList.contains("menu-open") && closeMenu());

  // Bouton ajouter événement
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  // uMap initialisation
  if (MAP_IFRAME) {
    const mapVisible = localStorage.getItem("mapVisible") === "true";
    if (MAP_WRAPPER) {
      MAP_WRAPPER.classList.toggle("hidden", !mapVisible);
      MAP_BTN && (MAP_BTN.textContent = mapVisible ? "Masquer la carte" : "Afficher la carte");
      if (mapVisible) MAP_IFRAME.src = getUmapUrl(savedTheme);
    } else {
      MAP_IFRAME.src = getUmapUrl(savedTheme);
    }
    MAP_FULLSCREEN && (MAP_FULLSCREEN.href = getUmapUrl(savedTheme).replace("scrollWheelZoom=false", "scrollWheelZoom=true"));

    MAP_BTN?.addEventListener("click", () => {
      if (!MAP_WRAPPER) return;
      const nowVisible = !MAP_WRAPPER.classList.contains("hidden");
      MAP_WRAPPER.classList.toggle("hidden");
      if (nowVisible && !MAP_IFRAME.src) MAP_IFRAME.src = getUmapUrl(localStorage.getItem("theme") || savedTheme);
      MAP_BTN.textContent = nowVisible ? "Masquer la carte" : "Afficher la carte";
      localStorage.setItem("mapVisible", nowVisible ? "true" : "false");
    });
  }

  // Charger le planning
  chargerPlanning();
});

/**************************************************************
 * MENU LATÉRAL
 **************************************************************/
function openMenu() {
  document.body.classList.add("menu-open");
  OVERLAY?.setAttribute("aria-hidden", "false");
  SIDE_MENU?.setAttribute("aria-hidden", "false");
  document.documentElement.style.overflow = "hidden";
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  OVERLAY?.setAttribute("aria-hidden", "true");
  SIDE_MENU?.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

/**************************************************************
 * THÈME CLAIR / SOMBRE
 **************************************************************/
function appliquerTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    THEME_TOGGLE && (THEME_TOGGLE.textContent = "☀️");
    SIDE_THEME_TOGGLE && (SIDE_THEME_TOGGLE.textContent = "☀️");
  } else {
    document.body.classList.remove("dark");
    THEME_TOGGLE && (THEME_TOGGLE.textContent = "🌙");
    SIDE_THEME_TOGGLE && (SIDE_THEME_TOGGLE.textContent = "🌙");
  }

  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");
  if (MAP_IFRAME) {
    MAP_IFRAME.src = getUmapUrl(theme);
    MAP_FULLSCREEN && (MAP_FULLSCREEN.href = MAP_IFRAME.src.replace("scrollWheelZoom=false", "scrollWheelZoom=true"));
  }

  localStorage.setItem("theme", theme);
}

/**************************************************************
 * MULTILINGUE
 **************************************************************/
function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

function changerLangue(langue) {
  currentLang = langue;
  localStorage.setItem("lang", langue);
  calendar && chargerPlanning();
}

/**************************************************************
 * GESTION OFFLINE / ONLINE
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
 * CHARGEMENT DU PLANNING
 **************************************************************/
async function chargerPlanning() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.remove("hidden");
    loader.textContent = isOffline
      ? traduireTexte("Mode hors ligne — données locales...", "Автономный режим — локальные данные...")
      : traduireTexte("Chargement du calendrier...", "Загрузка календаря...");
  }

  let events = [];
  if (isOffline) {
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
    loader?.classList.add("hidden");
    return renderCalendar(events);
  }

  try {
    const res = await fetch(PROXY_URL, { method: "GET", mode: "cors" });
    const text = await res.text();
    events = JSON.parse(text);
    localStorage.setItem("tplEvents", JSON.stringify(events));
  } catch (err) {
    console.warn("⚠️ Erreur réseau, utilisation locale :", err);
    events = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  loader?.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * CALENDRIER FULLCALENDAR
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return;

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
      list: traduireTexte("Liste", "Список"),
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
      extendedProps: { category: e.category },
    })),
    select: info => openEventModal(null, info),
    eventClick: info => openEventModal(info.event),
    eventDrop: info => saveEvent(eventToData(info.event)),
    eventResize: info => saveEvent(eventToData(info.event)),
  });

  calendar.render();
}

/**************************************************************
 * COULEURS CATÉGORIES
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * SAUVEGARDE LOCALE + SERVEUR
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps?.category || "Autre",
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = saved.findIndex(e => e.id === event.id);
  i >= 0 ? saved[i] = event : saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "patch", data: [event] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur réseau, sauvegarde locale uniquement :", err);
    }
  }
}

/**************************************************************
 * MODALE ÉVÉNEMENT
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  if (!modal) return;

  const modalContent = modal.querySelector(".modal-content");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const modalTitle = document.getElementById("modal-title");

  // Traductions
  const texts = {
    fr: {
      newEvent: "Nouvel événement", editEvent: "Modifier l’événement",
      save: "💾 Enregistrer", cancel: "Annuler",
      titleLabel: "Titre", startLabel: "Début", endLabel: "Fin", categoryLabel: "Catégorie",
      titlePlaceholder: "Entrez un titre", startPlaceholder: "Sélectionnez la date de début", endPlaceholder: "Sélectionnez la date de fin"
    },
    ru: {
      newEvent: "Новое событие", editEvent: "Редактировать событие",
      save: "💾 Сохранить", cancel: "Отмена",
      titleLabel: "Название", startLabel: "Начало", endLabel: "Конец", categoryLabel: "Категория",
      titlePlaceholder: "Введите название", startPlaceholder: "Выберите дату начала", endPlaceholder: "Выберите дату окончания"
    }
  };
  const t = texts[currentLang] || texts.fr;

  // Appliquer textes
  document.querySelector('label[for="event-title"]')?.textContent = t.titleLabel;
  document.querySelector('label[for="event-start"]')?.textContent = t.startLabel;
  document.querySelector('label[for="event-end"]')?.textContent = t.endLabel;
  document.querySelector('label[for="event-category"]')?.textContent = t.categoryLabel;
  titleInput && (titleInput.placeholder = t.titlePlaceholder);
  startInput && (startInput.placeholder = t.startPlaceholder);
  endInput && (endInput.placeholder = t.endPlaceholder);
  saveBtn && (saveBtn.textContent = t.save);
  cancelBtn && (cancelBtn.textContent = t.cancel);

  modal.classList.remove("hidden");
  setTimeout(() => titleInput?.focus(), 300);

  if (!event) {
    modalTitle && (modalTitle.textContent = t.newEvent);
    titleInput && (titleInput.value = "");
    startInput && (startInput.value = info?.startStr?.slice(0,16) || "");
    endInput && (endInput.value = info?.endStr?.slice(0,16) || "");
    categorySelect && (categorySelect.value = "Hôtel-Dieu");
    cancelBtn?.classList.remove("hidden");
  } else {
    modalTitle && (modalTitle.textContent = t.editEvent);
    titleInput && (titleInput.value = event.title || "");
    startInput && (startInput.value = event.startStr?.slice(0,16) || "");
    endInput && (endInput.value = event.endStr?.slice(0,16) || event.startStr?.slice(0,16) || "");
    cancelBtn?.classList.add("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = e => modalContent && !modalContent.contains(e.target) && closeModal();

  saveBtn && (saveBtn.onclick = () => {
    const newEvent = {
      id: event?.id || (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      title: titleInput?.value.trim() || "(Sans titre)",
      start: startInput?.value || "",
      end: endInput?.value || startInput?.value || "",
      category: categorySelect?.value || "Autre"
    };

    event?.remove?.();
    calendar?.addEvent({ ...newEvent, backgroundColor: getCategoryColor(newEvent.category), extendedProps: { category: newEvent.category } });
    saveEvent(newEvent);
    closeModal();
  });

  cancelBtn && (cancelBtn.onclick = closeModal);
}