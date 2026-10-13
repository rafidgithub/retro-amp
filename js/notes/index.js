// Notes: desktop icon, Start-menu entry and the reminder clock. The Notes window
// (app.js) loads the first time it opens; the clock (remind.js) runs from launch
// so reminders go off even if the window was never opened.
import { $, h } from '../core/util.js';
import { check, setOpener, handleLaunch } from './remind.js';
import * as store from './store.js';
import { registerKind } from '../core/trash.js';

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `
  <symbol id="n-notes" viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="24" rx="2" fill="#ffe066" stroke="#333"/><path d="M6 10h20" stroke="#333"/><path d="M10 15h12M10 19h12M10 23h8" stroke="#8a7426" stroke-width="1.6"/><path d="M11 3v5M16 3v5M21 3v5" stroke="#555" stroke-width="2" stroke-linecap="round"/></symbol>
`;
document.body.prepend(sprite);

function icon(id) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

let app = null;
async function openNotes(id) {
  try {
    app ||= import('./app.js');
    (await app).open(id);
  } catch (err) {
    app = null;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.warn('[notes]', err);
  }
}
setOpener(openNotes);

// Desktop icon: double-click (tap on touch screens), like the others.
const desk = h('button', 'dicon');
desk.dataset.open = 'notes';
desk.append(icon('n-notes'), h('span', '', 'Notes'));
desk.firstChild.removeAttribute('class');
$('#icons')?.append(desk);
desk.addEventListener('click', e => {
  if (e.pointerType === 'touch' || e.detail === 0) openNotes();
});
desk.addEventListener('dblclick', () => openNotes());

// Start menu, with the other accessories, before the first separator.
const smItems = $('#start-menu .sm-items');
if (smItems) {
  const b = h('button');
  b.append(icon('n-notes'), 'Notes');
  b.addEventListener('click', () => openNotes());
  smItems.insertBefore(b, smItems.querySelector('hr'));
}

// Notes in the Recycle Bin keep their reminder; a past one stays done.
registerKind('note', {
  noun: 'note',
  plural: 'notes',
  restore: ({ data }) => store.restore(data),
  purge: () => {}, // nothing else to delete: the note lived only in the bin
});

check();
handleLaunch();
