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
  // bind toggles
  document.getElementById('lang-toggle')?.addEventListener('click', toggleLang);
  document.getElementById('side-lang-toggle')?.addEventListener('click', toggleLang);
  applyLangToUI();
}

export function toggleLang() {
  currentLang = currentLang === 'fr' ? 'ru' : 'fr';
  localStorage.setItem(LANG_KEY, currentLang);
  applyLangToUI();
  // simple full reload to let FullCalendar change locale easily
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
  // value may be key or label; prefer key
  if (CATEGORY_LABELS[value]) return value;
  // try find matching label
  for (const k of Object.keys(CATEGORY_LABELS)) {
    if (CATEGORY_LABELS[k].fr === value || CATEGORY_LABELS[k].ru === value) return k;
  }
  return 'autre';
}

// expose labels (for rendering)
export function getCategoryMapping() {
  const map = {};
  for (const k of Object.keys(CATEGORY_LABELS)) {
    map[k] = CATEGORY_LABELS[k][currentLang];
  }
  return map;
}
