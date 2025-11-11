/**************************************************************
 * 📅 PLANNING TPL — SCRIPT PRINCIPAL
 **************************************************************/

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("planning");
  const themeToggle = document.getElementById("theme-toggle");
  const langToggle = document.getElementById("lang-toggle");
  const offlineBanner = document.getElementById("offline-banner");
  const loader = document.getElementById("loader");

  /**************************************************************
   * 🌙 GESTION DU THÈME CLAIR / SOMBRE
   **************************************************************/
  const currentTheme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", currentTheme === "dark");
  themeToggle.textContent = currentTheme === "dark" ? "☀️" : "🌙";

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
  });

  /**************************************************************
   * 🌍 GESTION MULTILINGUE (FR / RU)
   **************************************************************/
  const savedLang = localStorage.getItem("lang") || "fr";
  let currentLang = savedLang;
  langToggle.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";

  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "fr" ? "ru" : "fr";
    localStorage.setItem("lang", currentLang);
    langToggle.textContent = currentLang === "fr" ? "🇫🇷" : "🇷🇺";
    location.reload(); // Recharge la page pour appliquer la nouvelle langue
  });

  /**************************************************************
   * ⚡️ GESTION DU MODE HORS LIGNE
   **************************************************************/
  function updateOnlineStatus() {
    if (navigator.onLine) {
      offlineBanner.classList.add("hidden");
    } else {
      offlineBanner.classList.remove("hidden");
    }
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  /**************************************************************
   * ⏳ CHARGEMENT DU CALENDRIER
   **************************************************************/
  loader.classList.remove("hidden");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: currentLang, // ✅ applique automatiquement FR ou RU
    buttonText: {
      today: currentLang === "fr" ? "Aujourd’hui" : "Сегодня",
      month: currentLang === "fr" ? "Mois" : "Месяц",
      week: currentLang === "fr" ? "Semaine" : "Неделя",
      day: currentLang === "fr" ? "Jour" : "День",
      list: currentLang === "fr" ? "Liste" : "Список"
    },
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
    },
    titleFormat: { year: "numeric", month: "long" },
    firstDay: 1,
    height: "auto",
    events: [
      {
        title: currentLang === "fr" ? "Exemple : Hôtel-Dieu" : "Пример: Hôtel-Dieu",
        start: new Date().toISOString().split("T")[0],
        color: "#FFD43B"
      }
    ],
    eventClick(info) {
      alert((currentLang === "fr" ? "Événement : " : "Событие: ") + info.event.title);
    },
    eventDidMount() {
      loader.classList.add("hidden");
    }
  });

  calendar.render();

  /**************************************************************
   * ➕ BOUTON D’AJOUT D’ÉVÉNEMENT
   **************************************************************/
  const addBtn = document.getElementById("add-event-btn");
  const modal = document.getElementById("event-modal");
  const cancelBtn = document.getElementById("cancel-event");
  const saveBtn = document.getElementById("save-event");
  const deleteBtn = document.getElementById("delete-event");
  const titleInput = document.getElementById("event-title");
  const startInput = document.getElementById("event-start");
  const endInput = document.getElementById("event-end");
  const categorySelect = document.getElementById("event-category");
  const modalTitle = document.getElementById("modal-title");

  let selectedEvent = null;

  addBtn.addEventListener("click", () => {
    selectedEvent = null;
    modalTitle.textContent = currentLang === "fr" ? "Nouvel événement" : "Новое событие";
    titleInput.value = "";
    startInput.value = "";
    endInput.value = "";
    categorySelect.value = "Hôtel-Dieu";
    deleteBtn.classList.add("hidden");
    modal.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  saveBtn.addEventListener("click", () => {
    const title = titleInput.value.trim();
    const start = startInput.value;
    const end = endInput.value;
    const category = categorySelect.value;

    if (!title || !start) {
      alert(currentLang === "fr"
        ? "Veuillez remplir au moins le titre et la date de début."
        : "Пожалуйста, заполните название и дату начала."
      );
      return;
    }

    const colorMap = {
      "Hôtel-Dieu": "#FFD43B",
      "Gréneraie/Resto du Cœur": "#2ECC71",
      "Préfecture": "#E74C3C",
      "Tour de Bretagne": "#3498DB",
      "France Terre d’Asile": "#9B59B6",
      "Autre": "#6c757d"
    };

    if (selectedEvent) {
      selectedEvent.setProp("title", title);
      selectedEvent.setStart(start);
      selectedEvent.setEnd(end);
      selectedEvent.setProp("backgroundColor", colorMap[category] || "#6c757d");
    } else {
      calendar.addEvent({
        title,
        start,
        end,
        color: colorMap[category] || "#6c757d"
      });
    }

    modal.classList.add("hidden");
  });
});