document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [
      { title: "Réunion équipe", start: "2025-11-10T10:00:00" },
      { title: "Cours de Yoga", start: "2025-11-13T18:30:00" },
      { title: "Vacances", start: "2025-11-20", end: "2025-11-25" },
    ],
  });

  calendar.render();
});
