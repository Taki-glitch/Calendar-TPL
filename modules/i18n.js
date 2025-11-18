// modules/i18n.js
export let currentLang = "fr";
const LANG_KEY = "lang";

/* -----------------------------------------------------
   📌 Dictionnaire des catégories (FR + RU)
----------------------------------------------------- */
const CATEGORY_LABELS = {
  hotel: { fr: "Hôtel-Dieu", ru: "Отель-Дьё" },
  greneraie: { fr: "Gréneraie / Resto du Cœur", ru: "Гренерэ" },
  pref: { fr: "Préfecture", ru: "Префектура" },
  tour: { fr: "Tour de Bretagne", ru: "Башня Брета́ния" },
  fta: { fr: "France Terre d’Asile", ru: "France Terre d’Asile" },
  autre: { fr: "Autre", ru: "Другое" }
};

/* -----------------------------------------------------
   🔧 Fonction principale d'initialisation
----------------------------------------------------- */
export function init() {
  currentLang = localStorage.getItem(LANG_KEY) || "fr";

  // Boutons langue
  document.getElementById("lang-toggle")?.addEventListener("click", toggleLang);
  document.getElementById("side-lang-toggle")?.addEventListener("click", toggleLang);

  // 🔥 ICI la fonction existe vraiment
  applyLangToUI();
}

/* -----------------------------------------------------
   🔄 Basculer FR/RU
----------------------------------------------------- */
export function toggleLang() {
  currentLang = currentLang === "fr" ? "ru" : "fr";
  localStorage.setItem(LANG_KEY, currentLang);

  applyLangToUI();

  // 🔁 Rechargement nécessaire pour FullCalendar
  location.reload();
}

/* -----------------------------------------------------
   🏷 Utilitaire simple pour les textes courts
----------------------------------------------------- */
export function t(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

/* -----------------------------------------------------
   🔄 Conversion catégorie → libellé
----------------------------------------------------- */
export function translateCategory(key) {
  if (!CATEGORY_LABELS[key]) return key;
  return CATEGORY_LABELS[key][currentLang] || CATEGORY_LABELS[key].fr;
}

/* -----------------------------------------------------
   🔄 Conversion libellé → catégorie (inverse)
----------------------------------------------------- */
export function categoryKeyFromValue(value) {
  if (CATEGORY_LABELS[value]) return value;

  for (const k of Object.keys(CATEGORY_LABELS)) {
    if (
      CATEGORY_LABELS[k].fr === value ||
      CATEGORY_LABELS[k].ru === value
    ) {
      return k;
    }
  }
  return "autre";
}

/* -----------------------------------------------------
   📦 Obtenir toutes les catégories traduites
----------------------------------------------------- */
export function getCategoryMapping() {
  const map = {};
  for (const key of Object.keys(CATEGORY_LABELS)) {
    map[key] = CATEGORY_LABELS[key][currentLang];
  }
  return map;
}

/* -----------------------------------------------------
   🌐 Fonction manquante ➜ REQUIRED
   (C’est celle qui causait l’erreur)
----------------------------------------------------- */
export function applyLangToUI() {
  // Bouton principal
  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) langBtn.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";

  // Bouton menu
  const sideBtn = document.getElementById("side-lang-toggle");
  if (sideBtn) sideBtn.textContent = langBtn?.textContent;

  // Traduction du <h1>
  const h1 = document.querySelector("header h1");
  if (h1) {
    if (h1.textContent.includes("Planning")) {
      h1.textContent = t("Planning", "Планирование");
    }
    if (h1.textContent.includes("Instructions")) {
      h1.textContent = t("Instructions", "Инструкции");
    }
  }
}