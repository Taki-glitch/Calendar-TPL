// modules/events.js
import { normalizeCategory } from "./colors.js";

const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

export async function loadEvents() {
  const isOffline = !navigator.onLine;

  if (isOffline) {
    console.log("📴 Mode hors ligne — chargement LocalStorage");
    return JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }

  try {
    const res = await fetch(PROXY_URL);
    const raw = JSON.parse(await res.text());
    localStorage.setItem("tplEvents", JSON.stringify(raw));
    return raw;
  } catch (e) {
    console.warn("⚠️ Erreur réseau, fallback local :", e);
    return JSON.parse(localStorage.getItem("tplEvents") || "[]");
  }
}

export function saveEvent(evt) {
  let list = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const idx = list.findIndex((e) => e.id === evt.id);

  if (idx >= 0) list[idx] = evt;
  else list.push(evt);

  localStorage.setItem("tplEvents", JSON.stringify(list));

  // Tentative réseau (non bloquante)
  if (navigator.onLine) {
    fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patch", data: [evt] })
    }).catch(() => {
      console.warn("⚠️ Sync échouée, données locales conservées");
    });
  }
}