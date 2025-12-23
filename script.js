// script.js — version intégrale, robuste et multilingue unifié
console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxe6BC6lG4yEg4wUbuVlyVMSwytU6YKLvO7RA6uSDSKE2O3ke5y6ooTy3hSRnAPMAXn/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

/**************************************************************
 * 🌐 ÉTAT GLOBAL
 **************************************************************/
let currentLang = localStorage.getItem("lang") || "fr";
let isOffline = !navigator.onLine;
let calendar = null;

/**************************************************************
 * 🌍 UMAP
 **************************************************************/
const UMAP_BASE = "//umap.openstreetmap.fr/fr/map/points-tpl-nantes-russe_1315005";
function getUmapUrl(theme = "light") {
  const layer = theme === "dark" ? "jawg-dark" : "OSM";
  const themeParam = theme === "dark" ? "dark" : "light";
  const params =
    "?scaleControl=false&miniMap=false&scrollWheelZoom=false&zoomControl=true&editMode=disabled" +
    "&moreControl=true&searchControl=null&tilelayersControl=null&embedControl=null" +
    "&datalayersControl=true&onLoadPanel=none&captionBar=false&captionMenus=true";
  return `${UMAP_BASE}${params}&theme=${themeParam}&layer=${layer}`;
}

/**************************************************************
 * 🌐 DOM
 **************************************************************/
let OFFLINE_BANNER, ADD_EVENT_BTN, THEME_TOGGLE, LANG_TOGGLE;
let MENU_BTN, SIDE_MENU, OVERLAY, SIDE_THEME_TOGGLE, SIDE_LANG_TOGGLE, MENU_CLOSE;
let CONSENT_TEXT;

/**************************************************************
 * 📘 TRADUCTIONS — INSTRUCTIONS
 **************************************************************/
const INSTRUCTIONS_TRANSLATIONS = {
  fr: {
    instructionsTitle: "📋 Instructions TPL",
    instructionsWelcome: "Bienvenue dans la section Instructions pour le TPL.",
    step1Title: "🔹 Étape 1 — Préparation",
    step1Items: [
      "Avant de placer votre créneau, vérifiez sa disponibilité",
      "Utilisez le bouton + pour ajouter un événement si nécessaire",
      "Indiquez votre nom et prénom (exemple : DUPONT Jean)",
      "Ne modifiez pas les créneaux des autres compagnons",
      "Pour annuler un créneau, contactez frère Timothé DEVIN",
      "Choisissez une affiche disponible lors du retrait du présentoir"
    ],
    step2Title: "🔹 Étape 2 — Sur place",
    step2Items: [
      "Respectez les emplacements indiqués sur la carte",
      "Restez dans une zone sécurisée",
      "En cas de danger, quittez le lieu si nécessaire"
    ],
    step3Title: "🔹 Étape 3 — Après le service",
    step3Items: [
      "Remontez les remarques importantes à frère Timothé DEVIN",
      "Inscrivez-vous sur d’autres créneaux si possible"
    ],
    mapTitle: "🗺️ Carte des points TPL",
    mapText: "Voici la carte des différents lieux utilisés pour le projet TPL :",
    fullscreenMap: "🔎 Ouvrir la carte en plein écran",
    tipsTitle: "ℹ️ Conseils",
    tipsText: "Le site fonctionne hors ligne grâce à la PWA.",
    rgpdTitle: "🔒 Protection des données personnelles (RGPD)",
    rgpdText: "Seuls le nom et le prénom sont collectés pour l’organisation."
  },
  ru: {
    instructionsTitle: "📋 Инструкции стенда",
    instructionsWelcome: "Добро пожаловать в раздел инструкций.",
    step1Title: "🔹 Шаг 1 — Подготовка",
    step1Items: [
      "Перед выбором времени проверьте его доступность",
      "Используйте кнопку + при необходимости",
      "Укажите имя и фамилию (пример: ИВАНОВ Иван)",
      "Не изменяйте события других участников",
      "Для отмены свяжитесь с братом Тимотэ ДЕВИН",
      "Выберите доступный плакат при получении стенда"
    ],
    step2Title: "🔹 Шаг 2 — На месте",
    step2Items: [
      "Соблюдайте места, указанные на карте",
      "Оставайтесь в безопасной зоне",
      "При опасности покиньте место"
    ],
    step3Title: "🔹 Шаг 3 — После служения",
    step3Items: [
      "Передайте важные замечания брату Тимотэ ДЕВИН",
      "Записывайтесь на другие смены"
    ],
    mapTitle: "🗺️ Карта точек стенда",
    mapText: "Ниже показаны места служения:",
    fullscreenMap: "🔎 Открыть карту на весь экран",
    tipsTitle: "ℹ️ Советы",
    tipsText: "Сайт работает офлайн благодаря PWA.",
    rgpdTitle: "🔒 Защита персональных данных (RGPD)",
    rgpdText: "Собираются только имя и фамилия."
  }
};

/**************************************************************
 * 🌍 LANGUE
 **************************************************************/
function changerLangue(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  applyInstructionsLanguage();
  if (calendar) calendar.setOption("locale", lang);
}

function traduireTexte(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

/**************************************************************
 * 📘 APPLICATION DES TRADUCTIONS INSTRUCTIONS
 **************************************************************/
function applyInstructionsLanguage() {
  const t = INSTRUCTIONS_TRANSLATIONS[currentLang];
  if (!t) return;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) el.textContent = t[key];
  });

  ["step1", "step2", "step3"].forEach(step => {
    const ul = document.getElementById(`${step}-items`);
    if (!ul) return;
    ul.innerHTML = "";
    t[`${step}Items`].forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
  });

  const iframe = document.getElementById("umap-frame");
  const fullscreen = document.getElementById("umap-fullscreen");
  if (iframe) iframe.src = getUmapUrl(localStorage.getItem("theme") || "light");
  if (fullscreen) fullscreen.href = getUmapUrl("light").replace("scrollWheelZoom=false", "scrollWheelZoom=true");
}

/**************************************************************
 * 🎨 THÈME
 **************************************************************/
function appliquerTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);

  const icon = theme === "dark" ? "☀️" : "🌙";
  THEME_TOGGLE && (THEME_TOGGLE.textContent = icon);
  SIDE_THEME_TOGGLE && (SIDE_THEME_TOGGLE.textContent = icon);

  applyInstructionsLanguage();
}

/**************************************************************
 * 📡 DOMContentLoaded
 **************************************************************/
document.addEventListener("DOMContentLoaded", () => {
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

  appliquerTheme(localStorage.getItem("theme") || "light");
  changerLangue(currentLang);

  THEME_TOGGLE?.addEventListener("click", () =>
    appliquerTheme(document.body.classList.contains("dark") ? "light" : "dark")
  );
  SIDE_THEME_TOGGLE?.addEventListener("click", () =>
    appliquerTheme(document.body.classList.contains("dark") ? "light" : "dark")
  );

  LANG_TOGGLE?.addEventListener("click", () =>
    changerLangue(currentLang === "fr" ? "ru" : "fr")
  );
  SIDE_LANG_TOGGLE?.addEventListener("click", () =>
    changerLangue(currentLang === "fr" ? "ru" : "fr")
  );
});

/**************************************************************
 * 📡 OFFLINE
 **************************************************************/
window.addEventListener("online", () => location.reload());
window.addEventListener("offline", () => OFFLINE_BANNER?.classList.remove("hidden"));