// modules/colors.js
export const CATEGORY_COLORS = {
  hotel:    { bg: "#007bff", border: "#0056b3" },
  greneraie:{ bg: "#28a745", border: "#1e7e34" },
  pref:     { bg: "#e67e22", border: "#d35400" },
  tour:     { bg: "#9b59b6", border: "#8e44ad" },
  fta:      { bg: "#16a085", border: "#0e6655" },
  autre:    { bg: "#95a5a6", border: "#7f8c8d" }
};

// Catégorie FR/RU → clé interne
export function normalizeCategory(raw) {
  const map = {
    "Hôtel-Dieu": "hotel",
    "Госпиталь": "hotel",
    "Gréneraie/Resto du Cœur": "greneraie",
    "Préfecture": "pref",
    "Tour de Bretagne": "tour",
    "France Terre d’Asile": "fta",
    "Autre": "autre",
  };
  return map[raw] || raw || "autre";
}

export function getCategoryColor(categoryKey) {
  return CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.autre;
}