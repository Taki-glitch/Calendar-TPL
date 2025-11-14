// script.js — version intégrale et robuste
console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
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

/* --- Calendrier / état --- */
let isOffline = !navigator.onLine;
let calendar = null;
let currentLang = localStorage.getItem("lang") || "fr";

/**************************************************************
 * 🗺️ CONFIG UMAP (choix : clair par défaut)
 **************************************************************/
const UMAP_BASE = "//umap.openstreetmap.fr/fr/map/points-tpl-nantes-russe_1315005";
function getUmapUrl(theme = "light") {
  // On utilise à la fois theme et layer pour meilleure compatibilité
  // clair -> layer=OSM, sombre -> layer=jawg-dark (choix recommandé)
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
  // Récupération des éléments (safe queries)
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

  // UMAP elements (may exist only on instructions.html)
  const MAP_WRAPPER = document.getElementById("map-wrapper");
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_BTN = document.getElementById("toggle-map-btn");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");

  // Lecture thème + appli (clair par défaut)
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme); // this will also update uMap if present

  // Theme toggle listeners
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
  if (LANG_TOGGLE) LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  LANG_TOGGLE?.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
    if (LANG_TOGGLE) LANG_TOGGLE.textContent = newLang === "fr" ? "🇫🇷" : "🇷🇺";
    location.reload();
  });

  SIDE_LANG_TOGGLE?.addEventListener("click", () => {
    const newLang = currentLang === "fr" ? "ru" : "fr";
    changerLangue(newLang);
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

  // Bouton + pour ouvrir la modale (peut être absent sur instructions)
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  // Synchronisation visuelle toggles langue
  if (SIDE_LANG_TOGGLE && LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;

  // === UMAP : initialisation et bouton afficher/masquer ===
  // Setup initial iframe src only if wrapper exists and iframe exists
  if (MAP_IFRAME) {
    // If the map wrapper is present but hidden, load iframe lazily when shown.
    // We'll set iframe.src now only if the wrapper is visible, else set when user opens map.
    const mapInitiallyVisible = localStorage.getItem("mapVisible") === "true";
    if (MAP_WRAPPER) {
      if (mapInitiallyVisible) {
        MAP_WRAPPER.classList.remove("hidden");
        MAP_BTN && (MAP_BTN.textContent = "Masquer la carte");
        MAP_IFRAME.src = getUmapUrl(savedTheme);
      } else {
        MAP_WRAPPER.classList.add("hidden");
        MAP_BTN && (MAP_BTN.textContent = "Afficher la carte");
        // don't set src yet (lazy load)
      }
    } else {
      // If wrapper is absent but iframe exists, set it
      MAP_IFRAME.src = getUmapUrl(savedTheme);
    }

    // Fullscreen link
    if (MAP_FULLSCREEN) {
      MAP_FULLSCREEN.href = getUmapUrl(savedTheme).replace("scrollWheelZoom=false", "scrollWheelZoom=true");
    }

    // Toggle button behavior
    MAP_BTN?.addEventListener("click", () => {
      if (!MAP_WRAPPER) return;
      const nowVisible = MAP_WRAPPER.classList.toggle("hidden") === false;
      // Lazy load iframe when shown
      if (nowVisible && MAP_IFRAME && !MAP_IFRAME.src) {
        MAP_IFRAME.src = getUmapUrl(localStorage.getItem("theme") || savedTheme);
      }
      MAP_BTN.textContent = nowVisible ? "Masquer la carte" : "Afficher la carte";
      localStorage.setItem("mapVisible", nowVisible ? "true" : "false");
    });
  }

  // Charger planning (si page a un planning)
  chargerPlanning();
});

/***********************
 * Fonctions menu
 ***********************/
function openMenu() {
  document.body.classList.add("menu-open");
  const overlay = document.getElementById("overlay");
  const side = document.getElementById("side-menu");
  overlay?.setAttribute("aria-hidden", "false");
  side?.setAttribute("aria-hidden", "false");
  // lock scroll on body (simple)
  document.documentElement.style.overflow = "hidden";
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  const overlay = document.getElementById("overlay");
  const side = document.getElementById("side-menu");
  overlay?.setAttribute("aria-hidden", "true");
  side?.setAttribute("aria-hidden", "true");
  document.documentElement.style.overflow = "";
}

/**************************************************************
 * 🌗 THÈME SOMBRE / CLAIR (met à jour aussi la carte uMap si présente)
 **************************************************************/
function appliquerTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark");
    const tgl = document.getElementById("theme-toggle");
    const stgl = document.getElementById("side-theme-toggle");
    if (tgl) tgl.textContent = "☀️";
    if (stgl) stgl.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    const tgl = document.getElementById("theme-toggle");
    const stgl = document.getElementById("side-theme-toggle");
    if (tgl) tgl.textContent = "🌙";
    if (stgl) stgl.textContent = "🌙";
  }

  // Mettre à jour la carte uMap si présente
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");
  if (MAP_IFRAME) {
    // Remap URL to match theme
    // If iframe has been lazy-loaded, update its src accordingly
    const newSrc = getUmapUrl(theme);
    // If iframe has no src (not loaded yet), don't force load unless map visible
    const wrapper = document.getElementById("map-wrapper");
    if (!MAP_IFRAME.src || wrapper && !wrapper.classList.contains("hidden")) {
      MAP_IFRAME.src = newSrc;
    } else {
      // update href for fullscreen in any case
      // Some browsers may not allow changing src when cross-origin; but setting is fine
      // We still update src to ensure theme correctness when user opens map next time
      MAP_IFRAME.src = newSrc;
    }
    if (MAP_FULLSCREEN) {
      MAP_FULLSCREEN.href = newSrc.replace("scrollWheelZoom=false", "scrollWheelZoom=true");
    }
  }

  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 GESTION MULTILINGUE (FR / RU)
 **************************************************************/
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
  document.getElementById("offline-banner")?.classList.add("hidden");
  chargerPlanning();
});

window.addEventListener("offline", () => {
  isOffline = true;
  document.getElementById("offline-banner")?.classList.remove("hidden");
});

/**************************************************************
 * 🔁 CHARGEMENT DU PLANNING
 **************************************************************/
async function chargerPlanning() {
  // if no loader on page, safe-exit
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
 * 📅 AFFICHAGE DU CALENDRIER
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return; // safe: page may not have calendar

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
    category: event.extendedProps?.category || "Autre",
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
 * 🗑️ SUPPRESSION D’ÉVÉNEMENT (commentée — utilitaire)
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
  if (!modal) return; // safe: no modal on some pages
  const modalContent = modal.querySelector(".modal-content");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
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

  // Apply texts (safe)
  if (labelTitle) labelTitle.textContent = t.titleLabel;
  if (labelStart) labelStart.textContent = t.startLabel;
  if (labelEnd) labelEnd.textContent = t.endLabel;
  if (labelCategory) labelCategory.textContent = t.categoryLabel;
  if (titleInput) titleInput.placeholder = t.titlePlaceholder;
  if (startInput) startInput.placeholder = t.startPlaceholder;
  if (endInput) endInput.placeholder = t.endPlaceholder;
  if (saveBtn) saveBtn.textContent = t.save;
  if (cancelBtn) cancelBtn.textContent = t.cancel;

  modal.classList.remove("hidden");

  // Focus mobile (gives time for animation)
  setTimeout(() => {
    titleInput?.focus();
  }, 300);

  if (!event) {
    modalTitle && (modalTitle.textContent = t.newEvent);
    if (titleInput) titleInput.value = "";
    if (startInput) startInput.value = info?.startStr?.slice(0, 16) || "";
    if (endInput) endInput.value = info?.endStr ? info.endStr.slice(0, 16) : "";
    if (categorySelect) categorySelect.value = "Hôtel-Dieu";
    cancelBtn?.classList.remove("hidden");
  } else {
    modalTitle && (modalTitle.textContent = t.editEvent);
    if (titleInput) titleInput.value = event.title || "";
    if (startInput) startInput.value = event.startStr ? event.startStr.slice(0, 16) : "";
    if (endInput) endInput.value = event.endStr ? event.endStr.slice(0, 16) : event.startStr ? event.startStr.slice(0, 16) : "";
    cancelBtn?.classList.add("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = (e) => {
    if (modalContent && !modalContent.contains(e.target)) closeModal();
  };

  if (saveBtn) {
    saveBtn.onclick = () => {
      const newEvent = {
        id: event ? event.id : (crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
        title: (titleInput && titleInput.value.trim()) || "(Sans titre)",
        start: startInput ? startInput.value : "",
        end: endInput ? (endInput.value || (startInput ? startInput.value : "")) : "",
        category: categorySelect ? categorySelect.value : "Autre",
      };

      if (event && typeof event.remove === "function") event.remove();

      calendar && calendar.addEvent({
        ...newEvent,
        backgroundColor: getCategoryColor(newEvent.category),
        extendedProps: { category: newEvent.category },
      });

      saveEvent(newEvent);
      closeModal();
    };
  }

  if (cancelBtn) cancelBtn.onclick = closeModal;
}

/* End of script.js */