// modules/app.js
import { initI18n, currentLang } from "./i18n.js";
import { initUI } from "./ui.js";
import { loadEvents } from "./events.js";
import { renderCalendar } from "./calendar.js";

export async function initApp() {
  console.log("🚀 Initialisation de l'application…");

  // Initialisation de la langue
  initI18n();

  // UI (thème, menu, boutons…)
  initUI();

  // Charger les événements (Offline → LocalStorage ; Online → GAS)
  const events = await loadEvents();

  // Afficher calendrier
  renderCalendar(events, currentLang);
}