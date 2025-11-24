// script.js — version intégrale avec consentement utilisateurs
console.log("✅ script.js chargé correctement !");

/**************************************************************
 * 🌍 CONFIGURATION
 **************************************************************/
const GAS_URL = "https://script.google.com/macros/s/AKfycbxtWnKvuNhaawyd_0z8J_YVl5ZyX4qk8LVNP8oNXNCDMKWtgdzwm-oavdFrzEAufRVz/exec";
const PROXY_URL = "https://fancy-band-a66d.tsqdevin.workers.dev/?url=" + encodeURIComponent(GAS_URL);

/* --- Variables DOM générales --- */
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
 * 🌐 DOM & INITIALISATIONS
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

  // UMAP elements
  const MAP_WRAPPER = document.getElementById("map-wrapper");
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_BTN = document.getElementById("toggle-map-btn");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");

  // --- Thème ---
  const savedTheme = localStorage.getItem("theme") || "light";
  appliquerTheme(savedTheme);

  THEME_TOGGLE?.addEventListener("click", () => {
    const nouveauTheme = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nouveauTheme);
  });
  SIDE_THEME_TOGGLE?.addEventListener("click", () => {
    const nouveauTheme = document.body.classList.contains("dark") ? "light" : "dark";
    appliquerTheme(nouveauTheme);
  });

  // --- Langue ---
  currentLang = localStorage.getItem("lang") || "fr";
  if (LANG_TOGGLE) LANG_TOGGLE.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
  LANG_TOGGLE?.addEventListener("click", () => {
    changerLangue(currentLang === "fr" ? "ru" : "fr");
    location.reload();
  });
  SIDE_LANG_TOGGLE?.addEventListener("click", () => {
    changerLangue(currentLang === "fr" ? "ru" : "fr");
    location.reload();
  });

  // --- Menu latéral ---
  MENU_BTN?.addEventListener("click", openMenu);
  OVERLAY?.addEventListener("click", closeMenu);
  MENU_CLOSE?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu();
  });

  // --- Bouton ajout événement ---
  ADD_EVENT_BTN?.addEventListener("click", () => openEventModal());

  // --- Synchronisation toggles ---
  if (SIDE_LANG_TOGGLE && LANG_TOGGLE) SIDE_LANG_TOGGLE.textContent = LANG_TOGGLE.textContent;

  // --- UMAP lazy load ---
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

  // --- Charger le planning immédiatement ---
  chargerPlanning();

  // --- Consentement utilisateurs ---
  initConsentement();
});

/**************************************************************
 * 📦 Consentement données utilisateurs
 **************************************************************/
function initConsentement() {
  const consentModal = document.getElementById("consent-modal");
  const acceptBtn = document.getElementById("accept-consent");

  if (!localStorage.getItem("consentGiven") && consentModal) {
    consentModal.style.display = "flex";
  }

  acceptBtn?.addEventListener("click", () => {
    localStorage.setItem("consentGiven", "true");
    consentModal.style.display = "none";
  });
}

/**************************************************************
 * 🌗 Thème complet
 **************************************************************/
function appliquerTheme(theme) {
  if (theme === "dark") document.body.classList.add("dark");
  else document.body.classList.remove("dark");

  // Mettre à jour le toggle
  const tgl = document.getElementById("theme-toggle");
  const stgl = document.getElementById("side-theme-toggle");
  if (tgl) tgl.textContent = theme === "dark" ? "☀️" : "🌙";
  if (stgl) stgl.textContent = theme === "dark" ? "☀️" : "🌙";

  // Mettre à jour la carte uMap
  const MAP_IFRAME = document.getElementById("umap-frame");
  const MAP_FULLSCREEN = document.getElementById("umap-fullscreen");
  if (MAP_IFRAME) {
    const newSrc = getUmapUrl(theme);
    const wrapper = document.getElementById("map-wrapper");
    if (!MAP_IFRAME.src || (wrapper && !wrapper.classList.contains("hidden"))) MAP_IFRAME.src = newSrc;
    if (MAP_FULLSCREEN) MAP_FULLSCREEN.href = newSrc.replace("scrollWheelZoom=false", "scrollWheelZoom=true");
  }

  localStorage.setItem("theme", theme);
}

/**************************************************************
 * 🌐 Langue complète
 **************************************************************/
function traduireTexte(fr, ru) { return currentLang === "ru" ? ru : fr; }
function changerLangue(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  if (calendar) chargerPlanning();
}

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

/**************************************************************
 * 📅 RENDER CALENDRIER complet
 **************************************************************/
function renderCalendar(events) {
  const calendarEl = document.getElementById("planning");
  if (!calendarEl) return;
  if (calendar) calendar.destroy();

  const isMobile = window.innerWidth <= 900;

  calendar = new FullCalendar.Calendar(calendarEl, {
    locale: currentLang,
    firstDay: 1,
    nowIndicator: true,
    initialView: isMobile ? "timeGridWeek" : "dayGridMonth",
    headerToolbar: isMobile
      ? { left: "prev,next", center: "title", right: "" }
      : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },
    buttonText: {
      today: traduireTexte("Aujourd’hui", "Сегодня"),
      month: traduireTexte("Mois", "Месяц"),
      week: traduireTexte("Semaine", "Неделя"),
      day: traduireTexte("Jour", "День"),
      list: traduireTexte("Liste", "Список")
    },
    slotMinTime: "08:00:00",
    slotMaxTime: "18:00:00",
    allDaySlot: false,
    selectable: true,
    editable: true,
    height: "auto",
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: getCategoryColor(e.category),
      extendedProps: { category: e.category },
    })),
    select: (info) => openEventModal(null, info),
    eventClick: (info) => openEventModal(info.event),
    eventDrop: (info) => saveEvent(eventToData(info.event)),
    eventResize: (info) => saveEvent(eventToData(info.event)),
  });

  calendar.render();
}

/**************************************************************
 * 🎨 Couleurs catégories
 **************************************************************/
function getCategoryColor(category) {
  const colors = {
    "Hôtel-Dieu": "#FFD43B",
    "Gréneraie/Resto du Cœur": "#2ECC71",
    "Préfecture": "#E74C3C",
    "Tour de Bretagne": "#3498DB",
    "France Terre d’Asile": "#9B59B6",
  };
  return colors[category] || "#6c757d";
}

/**************************************************************
 * 💾 Sauvegarde locale / serveur
 **************************************************************/
function eventToData(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.startStr,
    end: event.endStr,
    category: event.extendedProps?.category || "Autre",
  };
}

async function saveEvent(event) {
  let saved = JSON.parse(localStorage.getItem("tplEvents") || "[]");
  const i = saved.findIndex((e) => e.id === event.id);
  if (i >= 0) saved[i] = event;
  else saved.push(event);
  localStorage.setItem("tplEvents", JSON.stringify(saved));

  if (!isOffline) {
    try {
      await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "patch", data: [event] }),
      });
    } catch (err) {
      console.warn("⚠️ Erreur réseau, enregistrement local uniquement :", err);
    }
  }
}

/**************************************************************
 * 🪟 Modale événement
 **************************************************************/
function openEventModal(event = null, info = null) {
  const modal = document.getElementById("event-modal");
  if (!modal) return;
  const modalContent = modal.querySelector(".modal-content");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const saveBtn = document.getElementById("save-event");
  const cancelBtn = document.getElementById("cancel-event");
  const modalTitle = document.getElementById("modal-title");

  // Labels & textes
  const texts = {
    fr: { newEvent:"Nouvel événement", editEvent:"Modifier l’événement", save:"💾 Enregistrer", cancel:"Annuler", titleLabel:"Titre", startLabel:"Début", endLabel:"Fin", categoryLabel:"Catégorie", titlePlaceholder:"Entrez un titre", startPlaceholder:"Sélectionnez la date de début", endPlaceholder:"Sélectionnez la date de fin"},
    ru: { newEvent:"Новое событие", editEvent:"Редактировать событие", save:"💾 Сохранить", cancel:"Отмена", titleLabel:"Название", startLabel:"Начало", endLabel:"Конец", categoryLabel:"Категория", titlePlaceholder:"Введите название", startPlaceholder:"Выберите дату начала", endPlaceholder:"Выберите дату окончания"}
  };
  const t = texts[currentLang] || texts.fr;

  // Appliquer labels
  document.querySelector('label[for="event-title"]')?.textContent = t.titleLabel;
  document.querySelector('label[for="event-start"]')?.textContent = t.startLabel;
  document.querySelector('label[for="event-end"]')?.textContent = t.endLabel;
  document.querySelector('label[for="event-category"]')?.textContent = t.categoryLabel;
  if (titleInput) titleInput.placeholder = t.titlePlaceholder;
  if (startInput) startInput.placeholder = t.startPlaceholder;
  if (endInput) endInput.placeholder = t.endPlaceholder;
  if (saveBtn) saveBtn.textContent = t.save;
  if (cancelBtn) cancelBtn.textContent = t.cancel;

  modal.classList.remove("hidden");
  setTimeout(()=>{titleInput?.focus()},300);

  if (!event) {
    modalTitle && (modalTitle.textContent = t.newEvent);
    if (titleInput) titleInput.value = "";
    if (startInput) startInput.value = info?.startStr?.slice(0,16) || "";
    if (endInput) endInput.value = info?.endStr ? info.endStr.slice(0,16) : "";
    if (categorySelect) categorySelect.value = "Hôtel-Dieu";
    cancelBtn?.classList.remove("hidden");
  } else {
    modalTitle && (modalTitle.textContent = t.editEvent);
    if (titleInput) titleInput.value = event.title || "";
    if (startInput) startInput.value = event.startStr ? event.startStr.slice(0,16) : "";
    if (endInput) endInput.value = event.endStr ? event.endStr.slice(0,16) : event.startStr ? event.startStr.slice(0,16) : "";
    cancelBtn?.classList.add("hidden");
  }

  const closeModal = () => modal.classList.add("hidden");
  modal.onclick = (e)=>{if(modalContent && !modalContent.contains(e.target)) closeModal();}
  if(saveBtn){saveBtn.onclick=()=>{
    const newEvent = {
      id:event ? event.id : (crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      title:titleInput?.value.trim()||"(Sans titre)",
      start:startInput?.value||"",
      end:endInput?.value || (startInput ? startInput.value : ""),
      category: categorySelect?.value || "Autre",
    };
    if(event && typeof event.remove==="function") event.remove();
    calendar?.addEvent({...newEvent, backgroundColor:getCategoryColor(newEvent.category), extendedProps:{category:newEvent.category}});
    saveEvent(newEvent);
    closeModal();
  }}
  if(cancelBtn) cancelBtn.onclick = closeModal;
}

/* End of script.js */