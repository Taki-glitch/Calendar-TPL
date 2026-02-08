// script.js — version intégrale, robuste et avec consentement multilingue
console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxe6BC6lG4yEg4wUbuVlyVMSwytU6YKLvO7RA6uSDSKE2O3ke5y6ooTy3hSRnAPMAXn/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

/* --- Variables DOM générales (assignées après DOMContentLoaded) --- */
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
let CONSENT_TEXT = null;

/* --- Calendrier / état --- */
let isOffline = !navigator.onLine;
let calendar = null;
let currentLang = localStorage.getItem("lang") || "fr";

/**************************************************************
 * 🗺️ CONFIG UMAP
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
 * 🌐 Éléments DOM & initialisations (après DOMContentLoaded)
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  // Récupération des éléments
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
  CONSENT_TEXT = document.getElementById("consent-text");

  // Lecture thème + appli
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  // Toggle thème
  THEME_TOGGLE?.addEventListener("click", () => {
    appliquerTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });
  SIDE_THEME_TOGGLE?.addEventListener("click", () => {
    appliquerTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });

  // Langue
  currentLang = localStorage.getItem("lang") || "fr";
  if (LANG_TOGGLE) LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  if (CONSENT_TEXT) updateConsentText();

  LANG_TOGGLE?.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
    if (LANG_TOGGLE) LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    if (SIDE_LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;
    updateConsentText();
    chargerPlanning();
  });

  SIDE_LANG_TOGGLE?.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
    if (LANG_TOGGLE) LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    if (SIDE_LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;
    updateConsentText();
    chargerPlanning();
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

    /* ==============================
     Gestion du consentement RGPD
  ============================== */
  const consentModal = document.getElementById("consent-modal");
  const acceptConsentBtn = document.getElementById("accept-consent");

  const consentGiven = localStorage.getItem("tplConsentAccepted");

  if (!consentGiven && consentModal) {
    consentModal.classList.remove("hidden");
  }

  acceptConsentBtn?.addEventListener("click", () => {
    localStorage.setItem("tplConsentAccepted", "true");
    consentModal.classList.add("hidden");
  });

  // Charger planning
  chargerPlanning();
});

/***********************
 * Menu
 ***********************/
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
 * Thème
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

  // Mise à jour carte uMap si présente
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");
  if (MAP_IFRAME) {
    const newSrc = getUmapUrl(theme);
    MAP_IFRAME.src = newSrc;
    if (MAP_FULLSCREEN) MAP_FULLSCREEN.href = newSrc.replace("scrollWheelZoom=false", "scrollWheelZoom=true");
  }

  localStorage.setItem("theme", theme);
}

/**************************************************************
 * Multilingue + consentement
 **************************************************************/
function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

function changerLangue(langue) {
  currentLang = langue;
  localStorage.setItem("lang", langue);

  // 🔔 Notifier les pages ouvertes
  document.dispatchEvent(
    new CustomEvent("langChanged", { detail: langue })
  );
}



function updateConsentText() {
  if (!CONSENT_TEXT) return;
  const texts = {
    fr: "En utilisant ce planning, vous acceptez d’écrire vos noms et prénoms. Aucune autre donnée personnelle n’est enregistrée.",
    ru: "Используя это расписание, вы соглашаетесь указать свои имя и фамилию. Другие персональные данные не сохраняются."
  };
  CONSENT_TEXT.textContent = texts[currentLang] || texts.fr;
}

/**************************************************************
 * Connexion réseau
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
 * Charger planning
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
    loader && loader.classList.add("hidden");
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

  loader && loader.classList.add("hidden");
  renderCalendar(events);
}

/**************************************************************
 * Calendrier
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
      // on ajoute la propriété category également au niveau racine (pour robustesse)
      category: e.category,
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
 * Couleurs catégories
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
    "Pirmil": "#E67E22"
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * Sauvegarde locale + serveur
 **************************************************************/
function eventToData(event) {
  // event peut être un objet FullCalendar EventApi
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    // On vérifie extendedProps puis une propriété category possible
    category: event.extendedProps?.category || event.category || "Autre"
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
 * Modale événement
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

  const labels = {
    titleLabel: document.querySelector('label[for="event-title"]'),
    startLabel: document.querySelector('label[for="event-start"]'),
    endLabel: document.querySelector('label[for="event-end"]'),
    categoryLabel: document.querySelector('label[for="event-category"]')
  };

  const texts = {
    fr: {
      newEvent: "Nouvel événement",
      editEvent: "Modifier l’événement",
      save: "💾 Enregistrer",
      cancel: "Annuler",
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
      titleLabel: "Название",
      startLabel: "Начало",
      endLabel: "Конец",
      categoryLabel: "Категория",
      titlePlaceholder: "Введите название",
      startPlaceholder: "Выберите дату начала",
      endPlaceholder: "Выберите дату окончания"
    }
  };

  const t = texts[currentLang] || texts.fr;

  if (labels.titleLabel) labels.titleLabel.textContent = t.titleLabel;
  if (labels.startLabel) labels.startLabel.textContent = t.startLabel;
  if (labels.endLabel) labels.endLabel.textContent = t.endLabel;
  if (labels.categoryLabel) labels.categoryLabel.textContent = t.categoryLabel;
  if (titleInput) titleInput.placeholder = t.titlePlaceholder;
  if (startInput) startInput.placeholder = t.startPlaceholder;
  if (endInput) endInput.placeholder = t.endPlaceholder;
  if (saveBtn) saveBtn.textContent = t.save;
  if (cancelBtn) cancelBtn.textContent = t.cancel;
  modalTitle && (modalTitle.textContent = event ? t.editEvent : t.newEvent);

  modal.classList.remove("hidden");
  setTimeout(() => titleInput?.focus(), 300);

  if (!event) {
    // Création : valeurs par défaut
    titleInput.value = "";
    startInput.value = info?.startStr?.slice(0, 16) || "";
    endInput.value = info?.endStr?.slice(0, 16) || "";
    categorySelect.value = "Hôtel-Dieu";
    cancelBtn?.classList.remove("hidden");
  } else {
    // Édition : on restaure correctement la catégorie depuis extendedProps ou event.category
    titleInput.value = event.title || "";
    startInput.value = event.startStr ? event.startStr.slice(0, 16) : "";
    endInput.value = event.endStr ? event.endStr.slice(0, 16) : startInput.value;
    categorySelect.value = event.extendedProps?.category || event.category || "Autre";
    cancelBtn?.classList.add("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = (e) => { if (!modalContent.contains(e.target)) closeModal(); };

  if (saveBtn) {
    // on retire tout gestionnaire précédent pour éviter doublons si modal réutilisée
    saveBtn.onclick = null;
    saveBtn.onclick = () => {
      const newEvent = {
        id: event ? event.id : (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString()),
        title: titleInput.value.trim() || "(Sans titre)",
        start: startInput.value,
        end: endInput.value || startInput.value,
        category: categorySelect.value || "Autre"
      };

      // Si on est en édition, retirer l'ancienne instance du calendrier
      if (event?.remove) {
        try { event.remove(); } catch (e) { /* ignore */ }
      }

      // Ajouter dans FullCalendar avec extendedProps et couleur
      calendar?.addEvent({
        id: newEvent.id,
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end,
        category: newEvent.category,
        backgroundColor: getCategoryColor(newEvent.category),
        extendedProps: { category: newEvent.category }
      });

      // Sauvegarde (local + serveur si disponible)
      saveEvent(newEvent);
      closeModal();
    };
  }

  cancelBtn?.addEventListener("click", closeModal);
}
