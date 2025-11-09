document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("eventModal");
  const modalTitle = document.getElementById("modalTitle");
  const eventTitleInput = document.getElementById("eventTitle");
  const saveBtn = document.getElementById("saveEvent");
  const deleteBtn = document.getElementById("deleteEvent");
  const cancelBtn = document.getElementById("cancelEvent");

  let selectedDate = null;
  let selectedEvent = null;

  // 🔹 Charger les événements depuis le localStorage
  function chargerEvenements() {
    const data = localStorage.getItem("evenements");
    return data ? JSON.parse(data) : [];
  }

  // 🔹 Sauvegarder les événements dans le localStorage
  function sauvegarderEvenements(events) {
    localStorage.setItem("evenements", JSON.stringify(events));
  }

  let evenements = chargerEvenements();

  // 🔹 Créer le calendrier
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fr",
    selectable: true,
    editable: false,
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    events: evenements,

    // 🔸 Clic sur une date : ajouter un événement
    dateClick: function (info) {
      selectedDate = info.dateStr;
      selectedEvent = null;
      modalTitle.textContent = "Nouvel événement";
      eventTitleInput.value = "";
      deleteBtn.style.display = "none";
      modal.style.display = "block";
      eventTitleInput.focus();
    },

    // 🔸 Clic sur un événement : le modifier ou supprimer
    eventClick: function (info) {
      selectedEvent = info.event;
      selectedDate = info.event.startStr;
      modalTitle.textContent = "Modifier l'événement";
      eventTitleInput.value = info.event.title;
      deleteBtn.style.display = "inline-block";
      modal.style.display = "block";
    },
  });

  calendar.render();

  // 🔹 Enregistrer ou modifier un événement
  saveBtn.addEventListener("click", () => {
    const title = eventTitleInput.value.trim();
    if (!title) {
      alert("Veuillez entrer un titre d'événement !");
      return;
    }

    if (selectedEvent) {
      // ✏️ Modification d’un événement existant
      selectedEvent.setProp("title", title);
      evenements = evenements.map((e) =>
        e.start === selectedEvent.startStr ? { ...e, title } : e
      );
    } else {
      // ➕ Ajout d’un nouvel événement
      const newEvent = { title: title, start: selectedDate };
      calendar.addEvent(newEvent);
      evenements.push(newEvent);
    }

    sauvegarderEvenements(evenements);
    modal.style.display = "none";
  });

  // 🔹 Supprimer un événement
  deleteBtn.addEventListener("click", () => {
    if (selectedEvent && confirm("Supprimer cet événement ?")) {
      selectedEvent.remove();
      evenements = evenements.filter(
        (e) => e.start !== selectedEvent.startStr || e.title !== selectedEvent.title
      );
      sauvegarderEvenements(evenements);
      modal.style.display = "none";
    }
  });

  // 🔹 Annuler
  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // 🔹 Fermer la modale si on clique dehors
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
});
