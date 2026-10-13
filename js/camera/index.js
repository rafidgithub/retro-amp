// Retro camera: desktop icons and Start menu entries. The Camera and Gallery
// windows (js/camera/app.js) load the first time one opens, so nothing asks
// for the camera, or even lists cameras, before someone opens it.
import { $, h } from '../core/util.js';
import { registerKind } from '../core/trash.js';

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `
  <symbol id="c-camera" viewBox="0 0 32 32"><path d="M4 6h6v3H4z" fill="#d23c3c" stroke="#111"/><path d="M11 9l2-4h7l2 4z" fill="#6a6a72" stroke="#111"/><rect x="2" y="9" width="28" height="19" rx="3" fill="#3a3a44" stroke="#111"/><path d="M2.5 13h27v10h-27z" fill="#b07f48"/><path d="M2.5 14h27M2.5 22h27" stroke="#7a4f1c" stroke-dasharray="1 1"/><circle cx="16" cy="18.5" r="7.5" fill="#222" stroke="#d8d8e0" stroke-width="1.6"/><circle cx="16" cy="18.5" r="4.2" fill="#2f6fe0"/><circle cx="14.4" cy="16.9" r="1.4" fill="#cfe3ff"/><rect x="24" y="10.5" width="4.5" height="2.5" fill="#ffe274" stroke="#111" stroke-width=".8"/></symbol>
  <symbol id="c-gallery" viewBox="0 0 32 32"><g transform="rotate(-11 13 16)"><rect x="3" y="5" width="18" height="21" fill="#f4f1e8" stroke="#333"/><rect x="5" y="7" width="14" height="13" fill="#e88a2a"/></g><g transform="rotate(7 19 17)"><rect x="9" y="5" width="20" height="23" fill="#fff" stroke="#333"/><rect x="11" y="7" width="16" height="15" fill="#5aa0ff"/><path d="M11 22l5-6 3 3 3-4 5 7z" fill="#2f9e44"/><circle cx="23" cy="11" r="2" fill="#ffd23c"/></g></symbol>
  <symbol id="c-flip" viewBox="0 0 16 16"><path d="M2.6 7.2A5.5 5.5 0 0 1 12.4 4.4M13.4 8.8A5.5 5.5 0 0 1 3.6 11.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M14.6 1.4v5h-5zM1.4 14.6v-5h5z"/></symbol>
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
async function open(which) {
  document.documentElement.classList.add('cam-wait');
  try {
    app ||= import('./app.js');
    const m = await app;
    if (which === 'gallery') m.openGallery();
    else m.openCamera();
  } catch (err) {
    app = null;
    console.error('Couldn’t start the camera', err);
  } finally {
    document.documentElement.classList.remove('cam-wait');
  }
}

// Photos in the Recycle Bin stay in IndexedDB, marked trashed, until restored or
// deleted for good. store.js loads only when the bin needs it.
registerKind('photo', {
  noun: 'photo',
  plural: 'photos',
  async restore({ data }) {
    await (await import('./store.js')).untrash(data.id);
    if (app) (await app).reloadPhotos();
  },
  purge: async ({ data }) => (await import('./store.js')).remove(data.id),
});

const ENTRIES = [
  ['camera', 'Camera', 'c-camera'],
  ['gallery', 'Gallery', 'c-gallery'],
];

// Desktop icons. main.js highlights any .dicon on click; opening is ours.
for (const [id, label, ico] of ENTRIES) {
  const desk = h('button', 'dicon');
  desk.dataset.open = id;
  desk.append(icon(ico), h('span', '', label));
  desk.firstChild.removeAttribute('class');
  $('#icons')?.append(desk);
  desk.addEventListener('click', e => {
    if (e.pointerType === 'touch' || e.detail === 0) open(id);
  });
  desk.addEventListener('dblclick', () => open(id));
}

// Start menu, after Games and before the first separator.
const smItems = $('#start-menu .sm-items');
if (smItems) {
  const hr = smItems.querySelector('hr');
  for (const [id, label, ico] of ENTRIES) {
    const b = h('button');
    b.append(icon(ico), label);
    b.addEventListener('click', () => open(id));
    smItems.insertBefore(b, hr);
  }
}
