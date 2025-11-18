// modules/i18n.js
export let currentLang = localStorage.getItem("lang") || "fr";
const LANG_KEY = "lang";

export function initI18n() {
  currentLang = localStorage.getItem(LANG_KEY) || "fr";
  applyLangToUI();

  document.getElementById("lang-toggle")?.addEventListener("click", toggleLang);
  document.getElementById("side-lang-toggle")?.addEventListener("click", toggleLang);
}

export function toggleLang() {
  currentLang = currentLang === "fr" ? "ru" : "fr";
  localStorage.setItem(LANG_KEY, currentLang);
  applyLangToUI();
  location.reload(); // nécessaire pour FullCalendar
}

// Simple helper (texte court)
export function t(fr, ru) {
  return currentLang === "ru" ? ru : fr;
}

/* -------------------------------------------------------
   Traduction statique UI
------------------------------------------------------- */
export function applyLangToUI() {
  const flag = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  const btn = document.getElementById("lang-toggle");
  const side = document.getElementById("side-lang-toggle");

  if (btn) btn.textContent = flag;
  if (side) side.textContent = flag;

  // Traduction du titre <h1>
  const h1 = document.querySelector("header h1");
  if (h1) {
    if (h1.textContent.includes("Planning")) {
      h1.textContent = t("Planning TPL", "Планирование TPL");
    } else if (h1.textContent.includes("Instructions")) {
      h1.textContent = t("Instructions", "Инструкции");
    }
  }
}