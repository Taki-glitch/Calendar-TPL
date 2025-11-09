// URL du script Google Apps
const API_URL = "https://script.google.com/macros/s/AKfycbyTA-TjsPcl5n-rG14La4ZYCmI--K0cbCIqt4OSXE_Kqsle0EBWX9u5fUZ6slL53-11/exec";

document.addEventListener("DOMContentLoaded", async function () {
  const calendarEl = document.getElementById("calendar");

  // 🔹 Charger les événements depuis Google Sheets ou cache local
  async function loadEvents() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      localStorage.setItem("tplEvents", JSON.stringify(data)); // Mise en cache locale
      return data.map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end || null,
        allDay: ev.allDay === "TRUE" || ev.allDay === true
      }));
    } catch (e) {
      console.warn("⚠️ Pas de connexion — chargement depuis le cache local.");
      const cached = localStorage.getItem("tplEvents");
      return cached ? JSON.parse(cached) : [];
    }
  }

  // 🔹 Sauvegarder tous les événements vers Google Sheets
  async function saveAllEvents() {
    const allEvents = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr,
      allDay: ev.allDay
    }));

    localStorage.setItem("tplEvents", JSON.stringify(allEvents)); // cache local

    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(allEvents),
        headers: { "Content-Type": "application/json" }
      });
      console.log("✅ Sauvegarde réussie !");
    } catch (e) {
      console.warn("⚠️ Impossible de sauvegarder (hors ligne). Les changements seront conservés localement.");
    }
  }

  // 🔹 Configuration du calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: window.innerWidth < 768 ? "listWeek" : "dayGridMonth",
    editable: true,
    selectable: true,
    locale: "fr",
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,listWeek"
    },
    // Adaptation automatique mobile / desktop
    windowResize: function () {
      if (window.innerWidth < 768) {
        calendar.changeView("listWeek");
      } else {
        calendar.changeView("dayGridMonth");
      }
    },
    // Ajout d'un événement
    select: function (info) {
      const title = prompt("Nom de l'événement :");
      if (title) {
        calendar.addEvent({
          id: String(Date.now()),
          title,
          start: info.startStr,
          end: info.endStr,
          allDay: info.allDay
        });
        saveAllEvents();
      }
      calendar.unselect();
    },
    // Modification / suppression
    eventClick: function (info) {
      const newTitle = prompt("Modifier le titre :", info.event.title);
      if (newTitle === null) return;
      if (newTitle === "") {
        if (confirm("Supprimer cet événement ?")) {
          info.event.remove();
        }
      } else {
        info.event.setProp("title", newTitle);
      }
      saveAllEvents();
    },
    eventDrop: saveAllEvents,
    eventResize: saveAllEvents
  });

  // 🔹 Charger les événements et afficher le calendrier
  const events = await loadEvents();
  calendar.addEventSource(events);
  calendar.render();
});
