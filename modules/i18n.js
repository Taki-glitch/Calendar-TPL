// modules/i18n.js
export let currentLang = 'fr';
const LANG_KEY = 'lang';

const CATEGORY_LABELS = {
  hotel: { fr: 'Hôtel-Dieu', ru: 'Отель-Дьё' },
  greneraie: { fr: 'Gréneraie / Resto du Cœur', ru: 'Гренерая / Ресторан' },
  pref: { fr: 'Préfecture', ru: 'Префектура' },
  tour: { fr: 'Tour de Bretagne', ru: 'Башня Брета́ни' },
  fta: { fr: 'France Terre d’Asile', ru: 'France Terre d’Asile' },
  autre: { fr: 'Autre', ru: 'Другое' }
};

export function init() {
  currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  // écouter boutons
  document.getElementById('lang-toggle')?.addEventListener('click', toggleLang);
  document.getElementById('side-lang-toggle')?.addEventListener('click', toggleLang);

  applyLangToUI();
}

export function toggleLang() {
  currentLang = currentLang === 'fr' ? 'ru' : 'fr';
  localStorage.setItem(LANG_KEY, currentLang);

  applyLangToUI();

  // Recharger pour FullCalendar
  location.reload();
}

export function t(fr, ru) {
  return currentLang === 'ru' ? ru : fr;
}

export function translateCategory(key) {
  if (!CATEGORY_LABELS[key]) return key;
  return CATEGORY_LABELS[key][currentLang] || CATEGORY_LABELS[key].fr;
}

export function categoryKeyFromValue(value) {
  if (CATEGORY_LABELS[value]) return value;
  for (const k of Object.keys(CATEGORY_LABELS)) {
    if (CATEGORY_LABELS[k].fr === value || CATEGORY_LABELS[k].ru === value) return k;
  }
  return 'autre';
}

export function getCategoryMapping() {
  const map = {};
  for (const k of Object.keys(CATEGORY_LABELS)) {
    map[k] = CATEGORY_LABELS[k][currentLang];
  }
  return map;
}

/* -------------------------------------------------------
   🔧 Correction : fonction manquante
   Apply translations to static UI texts
------------------------------------------------------- */
export function applyLangToUI() {
  const langBtn = document.getElementById('lang-toggle');
  const sideLangBtn = document.getElementById('side-lang-toggle');

  if (langBtn) langBtn.textContent = currentLang === 'fr' ? '🇫🇷' : '🇷🇺';
  if (sideLangBtn) sideLangBtn.textContent = langBtn.textContent;

  // Traduction du titre de page Instructions / Planning si besoin
  const h1 = document.querySelector('header h1');
  if (h1) {
    if (h1.textContent.includes('Planning')) {
      h1.textContent = t('Planning', 'Планирование');
    }
    if (h1.textContent.includes('Instructions')) {
      h1.textContent = t('Instructions', 'Инструкции');
    }
  }

  // Traduire textes statiques portant data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (STATIC_LABELS[key]) el.textContent = STATIC_LABELS[key][currentLang];
  });
}

// (optionnel) dictionnaire pour messages statiques si tu veux ajouter plus tard
const STATIC_LABELS = {};
