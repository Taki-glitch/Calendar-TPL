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

  const MAP_WRAPPER = document.getElementById("map-wrapper");
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_BTN = document.getElementById("toggle-map-btn");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");

  // Lecture thème + appli
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  // Toggle thème
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

  // Bouton + pour ouvrir la modale
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  // Synchronisation visuelle toggles langue
  if (SIDE_LANG_TOGGLE && LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;

  // === UMAP ===
  if (MAP_IFRAME) {
    const mapInitiallyVisible = localStorage.getItem("mapVisible") === "true";
    if (MAP_WRAPPER) {
      if (mapInitiallyVisible) {
        MAP_WRAPPER.classList.remove("hidden");
        MAP_BTN && (MAP_BTN.textContent = "Masquer la carte");
        MAP_IFRAME.src = getUmapUrl(savedTheme);
      } else {
        MAP_WRAPPER.classList.add("hidden");
        MAP_BTN && (MAP_BTN.textContent = "Afficher la carte");
      }
    } else {
      MAP_IFRAME.src = getUmapUrl(savedTheme);
    }

    if (MAP_FULLSCREEN) {
      MAP_FULLSCREEN.href = getUmapUrl(savedTheme).replace("scrollWheelZoom=false", "scrollWheelZoom=true");
    }

    MAP_BTN?.addEventListener("click", () => {
      if (!MAP_WRAPPER) return;
      const nowVisible = MAP_WRAPPER.classList.toggle("hidden") === false;
      if (nowVisible && MAP_IFRAME && !MAP_IFRAME.src) {
        MAP_IFRAME.src = getUmapUrl(localStorage.getItem("theme") || savedTheme);
      }
      MAP_BTN.textContent = nowVisible ? "Masquer la carte" : "Afficher la carte";
      localStorage.setItem("mapVisible", nowVisible ? "true" : "false");
    });
  }

  // Charger planning
  chargerPlanning();

  /**************************************************************
   * --- Consentement données utilisateurs ---
   **************************************************************/
  const consentModal = document.getElementById("consent-modal");
  const acceptBtn = document.getElementById("accept-consent");

  if (!localStorage.getItem("consentGiven") && consentModal) {
    consentModal.style.display = "flex";
  }

  acceptBtn?.addEventListener("click", () => {
    localStorage.setItem("consentGiven", "true");
    consentModal.style.display = "none";
  });
});

/**************************************************************
 * Fonctions menu
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
 * 🌗 THÈME SOMBRE / CLAIR
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
    const newSrc = getUmapUrl(theme);
    const wrapper = document.getElementById("map-wrapper");
    if (!MAP_IFRAME.src || (wrapper && !wrapper.classList.contains("hidden"))) {
      MAP_IFRAME.src = newSrc;
    } else {
      MAP_IFRAME.src = newSrc;
    }
    if (MAP_FULLSCREEN) {
      MAP_FULLSCREEN.href = newSrc.replace("scrollWheelZoom=false", "scrollWheelZoom=true");
    }
  }

  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 GESTION MULTILINGUE
 **************************************************************/
function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

function changerLangue(langue) {
  currentLang = langue;
  localStorage.setItem("lang", langue);
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

// ... le reste de tes fonctions (renderCalendar, getCategoryColor, openEventModal, saveEvent, etc.) reste inchangé