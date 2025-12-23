# 📅 Planning TPL

**Planning TPL** est une application web progressive (PWA) permettant de consulter, gérer et exporter un planning de manière simple, moderne et responsive.  
Elle fonctionne **en ligne et hors ligne**, s’adapte à tous les écrans, et propose une **interface multilingue** avec un mode clair/sombre automatique.

---

## 🚀 Fonctionnalités principales

- 📆 Affichage du planning avec **FullCalendar**
- 🌍 Interface **multilingue** (français, russe, etc.)
- 🌗 **Mode clair / sombre** automatique et manuel
- 📄 **Export PDF optimisé** du planning
- ✏️ **Édition locale** des événements
- 📱 **Responsive** (mobile, tablette, ordinateur)
- 🔌 **Fonctionnement hors ligne** (Service Worker)
- 📲 **PWA installable** (ajout à l’écran d’accueil)
- 🛡️ Gestion robuste des erreurs et fallback hors ligne

---

## 🧱 Technologies utilisées

- **HTML5**
- **CSS3**
- **JavaScript (Vanilla)**
- **FullCalendar**
- **Service Workers**
- **Web App Manifest (PWA)**
- **LocalStorage**
- **Google Apps Script** (backend pour certaines fonctionnalités)

---

## 📁 Structure du projet

```text
📦 planning-tpl
├── index.html
├── instructions.html
├── offline.html
├── style.css
├── script.js
├── service-worker.js
├── manifest.json
├── planning.json
├── tpl-logo.png
├── tpl-logo-blue.svg
├── favicon.ico
└── icons/


⚙️ Installation
	1.	Cloner le dépôt :

git clone https://github.com/ton-utilisateur/planning-tpl.git
	2.	Ouvrir le projet :

Ouvrir le fichier index.html dans un navigateur moderne
ou lancer un serveur local pour un fonctionnement optimal des Service Workers.

⸻

📲 Installation PWA

L’application peut être installée sur ordinateur ou mobile via l’option
« Ajouter à l’écran d’accueil » proposée par le navigateur.

⸻

🌍 Langues

La langue est gérée dynamiquement et mémorisée dans le navigateur via le localStorage.
Le changement de langue est immédiat et ne nécessite pas de rechargement de page.

⸻

📄 Export PDF

Le planning peut être exporté en PDF avec une mise en page optimisée, compatible avec le mode clair et le mode sombre.

⸻

📴 Mode hors ligne

Les fichiers essentiels sont mis en cache afin de permettre la consultation du planning sans connexion internet.
Une page dédiée s’affiche automatiquement en cas d’absence de réseau.

⸻

✅ État du projet

Projet terminé, stable et entièrement fonctionnel.
Prêt à être utilisé et déployé.

⸻

👤 Auteur

Timothé Devin

⸻

📄 Licence

Ce projet est distribué sous licence MIT.
Il peut être librement utilisé, modifié et redistribué.

