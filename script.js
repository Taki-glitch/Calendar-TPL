// URL de ton script Google Apps (ne pas modifier sauf si tu le redéploies)
const API_URL = "https://script.google.com/macros/s/AKfycbyTA-TjsPcl5n-rG14La4ZYCmI--K0cbCIqt4OSXE_Kqsle0EBWX9u5fUZ6slL53-11/exec";

document.addEventListener("DOMContentLoaded", async function () {
  const calendarEl = document.getElementById("calendar");

  // Charger les événements depuis Google Sheets
  async function loadEvents() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      return data.map(ev => ({
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end || null,
        allDay: ev.allDay === "TRUE" || ev.allDay === true
      }));
    } catch (e) {
      console.error("Erreur de chargement des événements :", e);
      return [];
    }
  }

  // Sauvegarder tous les événements sur Google Sheets
  async function saveAllEvents() {
    const allEvents = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr,
      allDay: ev.allDay
    }));

    localStorage.setItem("tplEvents", JSON.stringify(allEvents)); // sauvegarde locale

    try {
      await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(allEvents),
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("Erreur de sauvegarde :", e);
    }
  }

  // Configuration du calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    editable: true,
    selectable: true,
    locale: "fr",
    height: "auto",
    aspectRatio: 1,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
    },
    // Adaptation mobile
    windowResize: function (view) {
      if (window.innerWidth < 768) {
        calendar.changeView("listWeek");
      } else {
        calendar.changeView("dayGridMonth");
      }
    },

    // Ajout d'événement
    select: function (info) {
      const title = prompt("Nom de l'événement :");
      if (title) {
        const event = calendar.addEvent({
          id: String(Date.now()),
          title: title,
          start: info.startStr,
          end: info.endStr,
          allDay: info.allDay
        });
        saveAllEvents();
      }
      calendar.unselect();
    },

    // Modification de l'événement (clic)
    eventClick: function (info) {
      const newTitle = prompt("Modifier le titre :", info.event.title);
      if (newTitle === null) return; // Annulé
      if (newTitle === "") {
        if (confirm("Supprimer cet événement ?")) {
          info.event.remove();
        }
      } else {
        info.event.setProp("title", newTitle);
      }
      saveAllEvents();
    },

    // Déplacement ou redimensionnement
    eventDrop: saveAllEvents,
    eventResize: saveAllEvents,
  });

  // Charger et afficher les événements
  const events = await loadEvents();
  calendar.addEventSource(events);
  calendar.render();
});
