# Calendar-TPL
index.html — Interface principale avec FullCalendar, modale d’ajout, PWA et bouton de thème.

style.css — Thème clair/sombre, modale, bouton flottant et légende.

script.js — Gestion complète du calendrier (chargement, ajout/édition, sauvegarde, mode hors ligne, proxy Cloudflare).

service-worker.js — PWA v3.3 : cache optimisé, fallback offline.html.

offline.html — Page hors ligne stylisée.

manifest.json — Configuration PWA (icônes, couleurs, etc.).

code cloudflare.txt — Worker Cloudflare qui fait office de proxy CORS universel vers Google Apps Script.

code google app script.txt — Script GAS de gestion du planning (GET = lecture, POST = mise à jour).
