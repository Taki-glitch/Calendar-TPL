// app.js - entrée principale (module)
import * as Theme from './modules/theme.js';
import * as I18n from './modules/i18n.js';
import * as Storage from './modules/storage.js';
import * as CalendarApp from './modules/calendar.js';
import * as Um from './modules/umap.js';
import * as Exporter from './modules/export.js';

// configuration part (constants)
export const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
export const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

document.addEventListener('DOMContentLoaded', async () => {
  // init theme (detect system by default)
  Theme.init();

  // init i18n (reads localStorage or default)
  I18n.init();

  // init UI bindings, menu
  CalendarApp.init({ PROXY_URL, Storage, Theme, I18n });

  // init uMap if present
  Um.init(Theme.getTheme());

  // Exports
  Exporter.init({ Storage, I18n });

  // register online/offline handlers to sync pending
  window.addEventListener('online', async () => {
    document.getElementById('offline-banner')?.classList.add('hidden');
    await Storage.syncPending(PROXY_URL);
    CalendarApp.reload();
  });
  window.addEventListener('offline', () => {
    document.getElementById('offline-banner')?.classList.remove('hidden');
  });
});
