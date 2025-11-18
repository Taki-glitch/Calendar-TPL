// modules/theme.js
const THEME_KEY = 'theme';

export function init() {
  // detect system preference on first visit if not set
  let saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    saved = prefersDark ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, saved);
  }
  appliquerTheme(saved);

  // bind toggles
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('side-theme-toggle')?.addEventListener('click', toggleTheme);
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

export function toggleTheme() {
  const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
  appliquerTheme(newTheme);
}

export function appliquerTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('theme-toggle') && (document.getElementById('theme-toggle').textContent = '☀️');
    document.getElementById('side-theme-toggle') && (document.getElementById('side-theme-toggle').textContent = '☀️');
  } else {
    document.body.classList.remove('dark');
    document.getElementById('theme-toggle') && (document.getElementById('theme-toggle').textContent = '🌙');
    document.getElementById('side-theme-toggle') && (document.getElementById('side-theme-toggle').textContent = '🌙');
  }
  localStorage.setItem(THEME_KEY, theme);

  // dispatch event so other modules (uMap) can react
  window.dispatchEvent(new CustomEvent('tpl:theme:changed', { detail: { theme } }));
}
