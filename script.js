document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("eventModal");
  const eventTitleInput = document.getElementById("eventTitle");
  const saveBtn = document.getElementById("saveEvent");
  const cancelBtn = document.getElementById("cancelEvent");

  let selectedDate = null;

  // 🔹 Charger les événements depuis le localStorage
  function chargerEvenements() {
    const data = localStorage.getItem("evenements");
    return data ? JSON.parse(data) : [];
  }

  // 🔹 Sauvegarder les événements dans le localStorage
  function sauvegarderEvenements(events) {
    localStorage.setItem("evenements", JSON.stringify(events));
  }

  // 🔹 Liste initiale
  let evenements = chargerEvenements();

  // 🔹 Créer le calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    selectable: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: evenements, // Charger les événements sauvegardés
    dateClick: function (info) {
      selectedDate = info.dateStr;
      modal.style.display = "block";
      eventTitleInput.value = "";
      eventTitleInput.focus();
    },
  });

  calendar.render();

  // 🔹 Ajouter un nouvel événement
  saveBtn.addEventListener("click", () => {
    const title = eventTitleInput.value.trim();
    if (title) {
      const newEvent = { title: title, start: selectedDate };
      evenements.push(newEvent);
      calendar.addEvent(newEvent);
      sauvegarderEvenements(evenements);
      modal.style.display = "none";
    } else {
      alert("Veuillez entrer un titre d'événement !");
    }
  });

  // 🔹 Annuler
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // 🔹 Fermer la fenêtre si on clique dehors
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});
