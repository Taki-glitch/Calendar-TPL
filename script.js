document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");

  // Modale "ajout"
  const modal = document.getElementById("eventModal");
  const eventTitleInput = document.getElementById("eventTitle");
  const saveBtn = document.getElementById("saveEvent");
  const cancelBtn = document.getElementById("cancelEvent");

  // Modale "édition"
  const editModal = document.getElementById("editModal");
  const editTitleInput = document.getElementById("editTitle");
  const updateBtn = document.getElementById("updateEvent");
  const deleteBtn = document.getElementById("deleteEvent");
  const cancelEditBtn = document.getElementById("cancelEdit");

  let selectedDate = null;
  let selectedEvent = null;

  // 🔹 Charger / sauvegarder localStorage
  function chargerEvenements() {
    const data = localStorage.getItem("evenements");
    return data ? JSON.parse(data) : [];
  }

  function sauvegarderEvenements(events) {
    localStorage.setItem("evenements", JSON.stringify(events));
  }

  let evenements = chargerEvenements();

  // 🔹 Créer le calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    selectable: true,
    editable: true,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: evenements,

    // ➕ Clic sur une date → ouvrir modale ajout
    dateClick: function (info) {
      selectedDate = info.dateStr;
      modal.style.display = "block";
      eventTitleInput.value = "";
      eventTitleInput.focus();
    },

    // ✏️ Clic sur un événement → ouvrir modale édition
    eventClick: function (info) {
      selectedEvent = info.event;
      editTitleInput.value = selectedEvent.title;
      editModal.style.display = "block";
    },
  });

  calendar.render();

  // ➕ Enregistrer un nouvel événement
  saveBtn.addEventListener("click", () => {
    const title = eventTitleInput.value.trim();
    if (title) {
      const newEvent = { title, start: selectedDate };
      evenements.push(newEvent);
      calendar.addEvent(newEvent);
      sauvegarderEvenements(evenements);
      modal.style.display = "none";
    } else {
      alert("Veuillez entrer un titre d'événement !");
    }
  });

  cancelBtn.addEventListener("click", () => (modal.style.display = "none"));

  // ✏️ Mettre à jour un événement existant
  updateBtn.addEventListener("click", () => {
    const newTitle = editTitleInput.value.trim();
    if (newTitle && selectedEvent) {
      selectedEvent.setProp("title", newTitle);

      // mettre à jour dans localStorage
      const idx = evenements.findIndex(
        (ev) => ev.start === selectedEvent.startStr && ev.title === selectedEvent.title
      );
      if (idx !== -1) {
        evenements[idx].title = newTitle;
        sauvegarderEvenements(evenements);
      }

      editModal.style.display = "none";
    }
  });

  // ❌ Supprimer un événement
  deleteBtn.addEventListener("click", () => {
    if (selectedEvent) {
      // Supprimer de FullCalendar
      selectedEvent.remove();

      // Supprimer du localStorage
      evenements = evenements.filter(
        (ev) =>
          !(ev.start === selectedEvent.startStr && ev.title === selectedEvent.title)
      );
      sauvegarderEvenements(evenements);

      editModal.style.display = "none";
    }
  });

  cancelEditBtn.addEventListener("click", () => {
    editModal.style.display = "none";
  });

  // Fermer les modales si on clique à l’extérieur
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
    if (e.target === editModal) editModal.style.display = "none";
  });
});
