// modules/umap.js
import { getTheme } from './theme.js';

const UMAP_BASE = "//umap.openstreetmap.fr/fr/map/points-tpl-nantes-russe_1315005";

export function init(initialTheme = 'light') {
  // On instructions page, update iframe src to include theme param (if exists)
  const iframe = document.querySelector('.map-container iframe') || document.getElementById('umap-frame');
  if (!iframe) return;

  const theme = localStorage.getItem('theme') || initialTheme;
  iframe.src = getUmapUrl(theme);

  // react to theme changes
  window.addEventListener('tpl:theme:changed', (e) => {
    const t = e.detail.theme || 'light';
    iframe.src = getUmapUrl(t);
  });
}

export function getUmapUrl(theme = 'light') {
  const layer = theme === 'dark' ? 'jawg-dark' : 'OSM';
  const themeParam = theme === 'dark' ? 'dark' : 'light';
  const params =
    "?scaleControl=false&miniMap=false&scrollWheelZoom=false&zoomControl=true&editMode=disabled&moreControl=true" +
    "&searchControl=null&tilelayersControl=null&embedControl=null&datalayersControl=true&onLoadPanel=none" +
    "&captionBar=false&captionMenus=true";
  return `${UMAP_BASE}${params}&theme=${themeParam}&layer=${layer}`;
}
