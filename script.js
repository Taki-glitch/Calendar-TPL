// ✅ Chargement du calendrier après le chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('calendar');

  // Charger les événements sauvegardés dans le localStorage
  const savedEvents = JSON.parse(localStorage.getItem('tplEvents')) || [];

  // Initialiser le calendrier FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'fr',
    height: 'auto',
    selectable: true,
    editable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    events: savedEvents,

    // 📅 Quand on clique sur un jour vide → ouvrir la modale d’ajout
    dateClick: function(info) {
      openModal({ start: info.dateStr });
    },

    // ✏️ Quand on clique sur un événement → ouvrir la modale d’édition
    eventClick: function(info) {
      const event = info.event;
      openModal({
        id: event.id,
        title: event.title,
        start: event.startStr
      });
    },

    // 🧩 Quand on déplace un événement → sauvegarder automatiquement
    eventDrop: saveAllEvents,
    eventResize: saveAllEvents
  });

  calendar.render();

  // 🪶 Sélection des éléments de la modale
  const modal = document.getElementById('eventModal');
  const eventTitleInput = document.getElementById('eventTitle');
  const saveBtn = document.getElementById('saveEvent');
  const deleteBtn = document.getElementById('deleteEvent');
  const cancelBtn = document.getElementById('cancelEvent');
  const modalTitle = document.getElementById('modalTitle');

  let currentEvent = null; // événement en cours d’édition

  // 🪟 Ouvrir la modale (création ou édition)
  function openModal(eventData = {}) {
    currentEvent = eventData;
    modal.style.display = 'flex';
    eventTitleInput.value = eventData.title || '';
    deleteBtn.style.display = eventData.id ? 'inline-block' : 'none';
    modalTitle.textContent = eventData.id ? 'Modifier l’événement' : 'Nouvel événement';
    eventTitleInput.focus();
  }

  // ❌ Fermer la modale
  function closeModal() {
    modal.style.display = 'none';
    eventTitleInput.value = '';
    currentEvent = null;
  }

  // 💾 Sauvegarder un nouvel événement ou modification
  saveBtn.addEventListener('click', function() {
    const title = eventTitleInput.value.trim();
    if (!title) {
      alert("Veuillez entrer un titre d'événement.");
      return;
    }

    if (currentEvent.id) {
      // Modifier un événement existant
      const event = calendar.getEventById(currentEvent.id);
      event.setProp('title', title);
    } else {
      // Créer un nouvel événement
      const newId = Date.now().toString();
      calendar.addEvent({
        id: newId,
        title: title,
        start: currentEvent.start,
        allDay: true
      });
    }

    saveAllEvents();
    closeModal();
  });

  // 🗑️ Supprimer un événement
  deleteBtn.addEventListener('click', function() {
    if (currentEvent && currentEvent.id) {
      const event = calendar.getEventById(currentEvent.id);
      if (event) event.remove();
      saveAllEvents();
    }
    closeModal();
  });

  // ❎ Annuler
  cancelBtn.addEventListener('click', closeModal);

  // 🔄 Sauvegarder tous les événements dans le localStorage
  function saveAllEvents() {
    const allEvents = calendar.getEvents().map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr,
      allDay: ev.allDay
    }));
    localStorage.setItem('tplEvents', JSON.stringify(allEvents));
  }

  // Fermer la modale en cliquant à l’extérieur (mobile-friendly)
  window.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
  });
});
