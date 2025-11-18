// modules/export.js
import { readLocal } from './storage.js';
import { translateCategory } from './i18n.js';

export function init({ Storage, I18n }) {
  document.getElementById('export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('export-ics')?.addEventListener('click', exportICS);
  document.getElementById('export-print')?.addEventListener('click', exportPrint);
}

function exportCSV() {
  const events = readLocal();
  const rows = [['id','title','start','end','category']];
  for (const e of events) {
    rows.push([e.id, `"${e.title.replace(/"/g,'""')}"`, e.start, e.end, translateCategory(e.category)]);
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'tpl-events.csv');
}

function exportICS() {
  const events = readLocal();
  const icsRows = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TPL//Planning//FR'
  ];
  for (const e of events) {
    icsRows.push('BEGIN:VEVENT');
    icsRows.push(`UID:${e.id}`);
    icsRows.push(`DTSTAMP:${toICalDate(new Date())}`);
    icsRows.push(`DTSTART:${toICalDate(new Date(e.start))}`);
    icsRows.push(`DTEND:${toICalDate(new Date(e.end))}`);
    icsRows.push(`SUMMARY:${escapeICalText(e.title)}`);
    icsRows.push(`DESCRIPTION:${escapeICalText(translateCategory(e.category))}`);
    icsRows.push('END:VEVENT');
  }
  icsRows.push('END:VCALENDAR');
  const blob = new Blob([icsRows.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  downloadBlob(blob, 'tpl-events.ics');
}

function exportPrint() {
  const events = readLocal();
  // build simple printable HTML
  const rows = events.map(e => `<tr><td>${e.title}</td><td>${new Date(e.start).toLocaleString()}</td><td>${new Date(e.end).toLocaleString()}</td><td>${translateCategory(e.category)}</td></tr>`).join('');
  const html = `
    <html><head><title>Planning TPL</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head>
    <body><h1>Planning TPL</h1><table><thead><tr><th>Titre</th><th>Début</th><th>Fin</th><th>Catégorie</th></tr></thead><tbody>${rows}</tbody></table></body></html>
  `;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toICalDate(d) {
  // UTC basic format YYYYMMDDTHHMMSSZ
  const YYYY = d.getUTCFullYear();
  const MM = String(d.getUTCMonth()+1).padStart(2,'0');
  const DD = String(d.getUTCDate()).padStart(2,'0');
  const hh = String(d.getUTCHours()).padStart(2,'0');
  const mm = String(d.getUTCMinutes()).padStart(2,'0');
  const ss = String(d.getUTCSeconds()).padStart(2,'0');
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`;
}

function escapeICalText(s) {
  return (s || '').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
}
