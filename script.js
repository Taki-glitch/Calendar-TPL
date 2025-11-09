document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("eventModal");
  const eventTitleInput = document.getElementById("eventTitle");
  const saveBtn = document.getElementById("saveEvent");
  const cancelBtn = document.getElementById("cancelEvent");

  let selectedDate = null;

  // Créer le calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    selectable: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: [
      { title: "Réunion équipe", start: "2025-11-10T10:00:00" },
      { title: "Vacances", start: "2025-11-20", end: "2025-11-25" },
    ],
    dateClick: function (info) {
      selectedDate = info.dateStr;
      modal.style.display = "block";
      eventTitleInput.value = "";
      eventTitleInput.focus();
    },
  });

  calendar.render();

  // Bouton "Enregistrer"
  saveBtn.addEventListener("click", () => {
    const title = eventTitleInput.value.trim();
    if (title) {
      calendar.addEvent({ title: title, start: selectedDate });
      modal.style.display = "none";
    } else {
      alert("Veuillez entrer un titre d'événement !");
    }
  });

  // Bouton "Annuler"
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Fermer si on clique en dehors
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});
