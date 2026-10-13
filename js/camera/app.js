// Retro camera + photo gallery windows. js/camera/index.js loads this the first time
// either window opens. The camera runs only while the Camera window is open and
// the tab is visible; photos stay in this browser (store.js).
import { $$, h } from '../core/util.js';
import * as wm from '../core/wm.js';
import { Static } from '../player/viz.js';
import { FILTERS, filterById, render, capture } from './filters.js';
import * as store from './store.js';
import { moveToBin, binName } from '../core/trash.js';

const coarse = matchMedia('(pointer: coarse)');
const devLog = err => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.warn('[camera]', err);
};

// ---------------------------------------------------------------------------
// Settings: filter, preferred camera side, shutter sound

const KEY = 'retroamp:camera';
let prefs = {};
try {
  prefs = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  // storage blocked — defaults every time
}
const P = {
  filter: filterById(prefs.filter).id,
  facing: prefs.facing === 'environment' ? 'environment' : 'user',
  sound: prefs.sound !== false,
};
function savePrefs() {
  try {
    localStorage.setItem(KEY, JSON.stringify(P));
  } catch {
    // private mode or quota
  }
}
const filter = () => filterById(P.filter);

// ---------------------------------------------------------------------------
// Windows: header.titlebar > .tb-icon + .tb-title + .tb-btns, then .win-body

function icon(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function makeWindow(id, title, iconId, cls) {
  const win = h('section', `win dialog ${cls} is-min`);
  win.id = `w-${id}`;
  win.setAttribute('aria-label', title);
  const bar = h('header', 'titlebar');
  const ico = h('span', 'tb-icon');
  ico.append(icon(iconId));
  const btns = h('span', 'tb-btns');
  const close = h('button');
  close.dataset.wm = 'close';
  close.setAttribute('aria-label', 'Close');
  btns.append(close);
  bar.append(ico, h('span', 'tb-title', title), btns);
  const body = h('div', `win-body ${cls}-body`);
  win.append(bar, body);
  document.getElementById('desktop').append(win);
  wm.register(win, { title, icon: iconId, dialog: true });
  return { win, body };
}

function button(cls, label, title) {
  const b = h('button', cls, label);
  if (title) b.title = title;
  return b;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------------------------------------------------------------------------
// Photos (newest first) and their blob: URLs

let photos = [];
try {
  photos = await store.list();
} catch (err) {
  devLog(err);
}
const persistent = await store.isPersistent();

const urls = new Map(); // `${id}:${kind}` -> blob URL
function urlFor(p, kind) {
  const key = `${p.id}:${kind}`;
  let u = urls.get(key);
  if (!u) {
    u = URL.createObjectURL(kind === 'thumb' ? p.thumb : p.blob);
    urls.set(key, u);
  }
  return u;
}
function forget(id) {
  for (const kind of ['thumb', 'full']) {
    const key = `${id}:${kind}`;
    if (urls.has(key)) URL.revokeObjectURL(urls.get(key));
    urls.delete(key);
  }
}

const toBlob = (canvas, type, quality = 0.92) =>
  new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Image encoding failed'))), type, quality));

function thumbnail(src) {
  const k = Math.min(1, 240 / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const longDate = at => new Date(at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const shortDate = at => new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function fileName(p) {
  const d = new Date(p.at);
  const two = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}${two(d.getSeconds())}`;
  return `retroamp-${stamp}-${p.filter}.${p.type === 'image/png' ? 'png' : 'jpg'}`;
}

function photosChanged() {
  syncRoll();
  renderGallery();
}

// ===========================================================================
// Camera window

const cam = makeWindow('camera', 'Camera', 'c-camera', 'cam');
const screen = h('div', 'cam-screen');
const feed = h('video', 'cam-feed');
feed.muted = true;
feed.playsInline = true;
feed.setAttribute('playsinline', '');
feed.setAttribute('aria-hidden', 'true');
const view = h('canvas', 'cam-view');
view.setAttribute('role', 'img');
view.setAttribute('aria-label', 'Camera preview');
const noise = h('canvas', 'cam-noise');
const tv = new Static(noise);
const osd = h('span', 'cam-osd');
const soundBtn = button('cam-sound', '', 'Shutter sound');
soundBtn.append(icon('i-speaker'));
const msg = h('div', 'cam-msg');
const msgTitle = h('b');
const msgText = h('p');
const retryBtn = button('btn', 'Retry');
msg.append(msgTitle, msgText, retryBtn);
const flashEl = h('div', 'cam-flash');
screen.append(feed, view, noise, osd, soundBtn, msg, flashEl);

const strip = h('div', 'cam-filters');
strip.setAttribute('role', 'radiogroup');
strip.setAttribute('aria-label', 'Filter');
for (const f of FILTERS) {
  const b = button('cam-filter', f.name, f.era);
  b.dataset.filter = f.id;
  b.setAttribute('role', 'radio');
  strip.append(b);
}

const controls = h('div', 'cam-controls');
const flipBtn = button('btn cam-flip');
const flipLabel = h('span', '', 'Switch');
flipBtn.append(icon('c-flip'), flipLabel);
const shutter = button('cam-shutter', '', 'Take photo (Space)');
shutter.setAttribute('aria-label', 'Take photo');
const roll = button('cam-roll', '', 'Gallery');
roll.setAttribute('aria-label', 'Open gallery');
const rollImg = h('img');
rollImg.alt = '';
const rollCount = h('span', 'cam-roll-n');
roll.append(rollImg, rollCount);
controls.append(flipBtn, shutter, roll);
const camStatus = h('div', 'cam-status');
cam.body.append(screen, strip, controls, camStatus);

// ---------------------------------------------------------------------------
// Camera states

const MESSAGES = {
  off: ['Camera off', ''],
  checking: ['Looking for a camera…', ''],
  starting: ['Starting camera…', 'Allow camera access if your browser asks.'],
  switching: ['Switching camera…', ''],
  none: ['No camera found', 'Connect a webcam, then press Retry. RetroAmp also checks again when one is plugged in.'],
  denied: ['Camera blocked', 'Allow camera access for this site in your browser’s settings, then press Retry.'],
  busy: ['Camera busy', 'Another app or tab is using the camera. Close it, then press Retry.'],
  lost: ['Camera disconnected', 'Plug it back in, then press Retry.'],
  insecure: ['Camera needs HTTPS', 'Browsers only allow the camera on secure pages: https:// or localhost.'],
  unsupported: ['No camera support', 'This browser can’t use a camera.'],
  error: ['Camera error', 'Couldn’t start the camera. Press Retry to try again.'],
};
const CAN_RETRY = new Set(['none', 'denied', 'busy', 'lost', 'error']);

const C = { stream: null, track: null, state: 'off', facing: '', mirror: true, count: 0, seq: 0 };
const media = () => navigator.mediaDevices;
const wanted = () => wm.isOpen(cam.win) && document.visibilityState === 'visible';

function setCamState(s) {
  C.state = s;
  screen.dataset.state = s;
  const live = s === 'live';
  msg.hidden = live;
  noise.hidden = live || s === 'switching';
  if (!live) {
    const [title, text] = MESSAGES[s];
    msgTitle.textContent = title;
    msgText.textContent = text;
    msgText.hidden = !text;
    retryBtn.hidden = !CAN_RETRY.has(s);
  }
  shutter.disabled = !live;
  syncFlip();
  syncCamStatus();
}

async function cameras() {
  try {
    return (await media().enumerateDevices()).filter(d => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

function stopTracks() {
  for (const t of C.stream?.getTracks() || []) t.stop();
  C.stream = C.track = null;
  feed.srcObject = null;
}

// Turn the camera off (window closed, tab hidden) and cancel a start in flight.
function release() {
  C.seq++;
  stopTracks();
  setCamState('off');
}

function errorState(err) {
  const name = err?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'none';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  devLog(err);
  return 'error';
}

// First check that a camera exists at all, then ask for it.
// `quiet` failures leave the state alone so the caller can try something else.
async function start(video = { facingMode: { ideal: P.facing } }, { quiet = false, label = 'starting' } = {}) {
  const my = ++C.seq;
  const fail = s => {
    if (my !== C.seq) return false;
    setCamState(s);
    run();
    return false;
  };
  stopTracks();
  if (document.visibilityState === 'hidden') return fail('off'); // visibilitychange starts it later
  if (!window.isSecureContext) return fail('insecure');
  if (!media()?.getUserMedia || !media().enumerateDevices) return fail('unsupported');
  watchDevices();
  if (!quiet) setCamState('checking');
  run();
  const found = await cameras();
  if (my !== C.seq) return false;
  if (!found.length) return fail('none');
  C.count = found.length;
  setCamState(label);

  let stream;
  try {
    stream = await media().getUserMedia({ audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...video } });
  } catch (err) {
    return quiet ? false : fail(errorState(err));
  }
  if (my !== C.seq || !wanted()) {
    for (const t of stream.getTracks()) t.stop();
    return false;
  }
  const track = stream.getVideoTracks()[0];
  C.stream = stream;
  C.track = track;
  C.facing = track.getSettings?.().facingMode || '';
  C.mirror = C.facing !== 'environment'; // selfie view, like a mirror
  if (C.facing === 'user' || C.facing === 'environment') {
    P.facing = C.facing;
    savePrefs();
  }
  track.addEventListener('ended', () => {
    if (C.track !== track) return;
    stopTracks();
    setCamState('lost');
  });
  feed.srcObject = stream;
  try {
    await feed.play();
  } catch {
    // muted inline video plays without a gesture; frames arrive either way
  }
  // Every camera shows up only after permission is granted, so count again.
  const all = await cameras();
  if (my !== C.seq) return false;
  C.count = Math.max(1, all.length);
  setCamState('live');
  run();
  return true;
}

// Front ↔ back on phones (facingMode); otherwise step through the cameras.
async function switchCamera() {
  if (C.state !== 'live' || C.count < 2) return;
  const { facingMode, deviceId } = C.track.getSettings?.() || {};
  if (facingMode === 'user' || facingMode === 'environment') {
    const want = facingMode === 'user' ? 'environment' : 'user';
    if (await start({ facingMode: { exact: want } }, { quiet: true, label: 'switching' })) return;
  }
  const list = await cameras();
  const next = list[(list.findIndex(d => d.deviceId === deviceId) + 1) % list.length];
  if (list.length > 1 && next?.deviceId) start({ deviceId: { exact: next.deviceId } }, { label: 'switching' });
  else start();
}

function syncFlip() {
  flipBtn.hidden = !(C.state === 'live' && C.count > 1);
  const side = coarse.matches && { user: 'back', environment: 'front' }[C.facing];
  flipLabel.textContent = side ? (side === 'back' ? 'Back' : 'Front') : 'Switch';
  flipBtn.title = side ? `Switch to the ${side} camera` : `Switch camera (${C.count} found)`;
}

let watching = false;
function watchDevices() {
  if (watching || !media()?.addEventListener) return;
  watching = true;
  media().addEventListener('devicechange', async () => {
    if (!wanted()) return;
    if (C.state === 'none' || C.state === 'lost') return start();
    if (C.state === 'live') {
      C.count = Math.max(1, (await cameras()).length);
      syncFlip();
    }
  });
}

// Window open → camera on; closed → off, so the camera light goes out.
let wasOpen = false;
new MutationObserver(() => {
  const open = wm.isOpen(cam.win);
  if (open === wasOpen) return;
  wasOpen = open;
  if (open) start();
  else release();
}).observe(cam.win, { attributes: true, attributeFilter: ['class'] });

document.addEventListener('visibilitychange', () => {
  if (!wm.isOpen(cam.win)) return;
  if (document.visibilityState === 'hidden') release();
  else start();
});
window.addEventListener('pagehide', release);

// ---------------------------------------------------------------------------
// Live preview: every frame goes through the filter (≈30 fps)

let raf = 0;
let lastDraw = 0;
let frameNo = 0;
let ratio = 0;
function tick(now) {
  raf = 0;
  if (!wm.isOpen(cam.win)) return;
  raf = requestAnimationFrame(tick);
  if (C.state === 'live') {
    if (now - lastDraw < 30 || feed.readyState < 2 || !feed.videoWidth) return;
    lastDraw = now;
    const r = feed.videoWidth / feed.videoHeight;
    if (r !== ratio) screen.style.setProperty('--ar', (ratio = r).toFixed(4));
    render(view, feed, filter(), { mirror: C.mirror, t: now });
  } else if (!noise.hidden && ++frameNo % 3 === 0) tv.frame();
}
const run = () => {
  if (!raf) raf = requestAnimationFrame(tick);
};

function setFilter(id) {
  P.filter = filterById(id).id;
  const f = filter();
  for (const b of strip.children) b.setAttribute('aria-checked', b.dataset.filter === P.filter);
  view.classList.toggle('pixel', !!f.pixel);
  osd.textContent = f.name;
  // keep the chosen chip in view when the strip scrolls sideways (phones)
  const b = strip.querySelector(`[data-filter="${P.filter}"]`);
  if (b.offsetLeft < strip.scrollLeft) strip.scrollLeft = b.offsetLeft - 8;
  else if (b.offsetLeft + b.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = b.offsetLeft + b.offsetWidth - strip.clientWidth + 8;
  savePrefs();
  syncCamStatus();
}
const stepFilter = d => setFilter(FILTERS[(FILTERS.indexOf(filter()) + d + FILTERS.length) % FILTERS.length].id);

let note = '';
let noteTimer = 0;
function syncCamStatus() {
  const f = filter();
  camStatus.textContent = note || (C.state === 'live' ? `${f.name} — ${f.era}` : MESSAGES[C.state]?.[0] || '');
}
function flashNote(text) {
  note = text;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    note = '';
    syncCamStatus();
  }, 2500);
  syncCamStatus();
}

function syncSound() {
  soundBtn.setAttribute('aria-pressed', P.sound);
  soundBtn.title = P.sound ? 'Shutter sound: on' : 'Shutter sound: off';
}

function syncRoll() {
  const p = photos[0];
  rollImg.hidden = !p;
  roll.classList.toggle('empty', !p);
  if (p) rollImg.src = urlFor(p, 'thumb');
  rollCount.textContent = photos.length ? String(photos.length) : '';
  roll.title = photos.length ? `Gallery (${plural(photos.length, 'photo')})` : 'Gallery';
}

// ---------------------------------------------------------------------------
// Taking a photo

let ac = null;
// Two short bursts of filtered noise: the shutter opening and closing.
function shutterSound() {
  try {
    ac ||= new AudioContext();
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + 0.01;
    for (const [at, len, freq, gain] of [[0, 0.03, 2600, 0.5], [0.07, 0.05, 1400, 0.4]]) {
      const n = Math.floor(ac.sampleRate * len);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const band = ac.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = freq;
      band.Q.value = 0.9;
      const g = ac.createGain();
      g.gain.value = gain;
      src.connect(band).connect(g).connect(ac.destination);
      src.start(t0 + at);
    }
  } catch {
    // no Web Audio — silent shutter
  }
}

let snapping = false;
async function snap() {
  if (C.state !== 'live' || snapping || !feed.videoWidth) return;
  snapping = true;
  const f = filter();
  flashEl.classList.remove('go');
  void flashEl.offsetWidth; // restart the flash animation
  flashEl.classList.add('go');
  if (P.sound) shutterSound();
  try {
    const canvas = capture(feed, f, { mirror: C.mirror, t: performance.now() });
    const [blob, thumb] = await Promise.all([toBlob(canvas, f.type), toBlob(thumbnail(canvas), 'image/jpeg', 0.8)]);
    const photo = await store.add({ at: Date.now(), filter: f.id, w: canvas.width, h: canvas.height, type: blob.type, blob, thumb });
    photos.unshift(photo);
    gal.sel = photo.id;
    photosChanged();
    flashNote(persistent ? `Saved to Gallery (${plural(photos.length, 'photo')})` : 'Saved to Gallery until this tab closes (browser storage is off)');
  } catch (err) {
    devLog(err);
    flashNote(err?.name === 'QuotaExceededError' ? 'Gallery is full. Delete some photos, then try again.' : 'Couldn’t save the photo.');
  } finally {
    snapping = false;
  }
}

// ---------------------------------------------------------------------------
// Camera controls

strip.addEventListener('click', e => {
  const b = e.target.closest('.cam-filter');
  if (b) setFilter(b.dataset.filter);
});
shutter.addEventListener('click', snap);
flipBtn.addEventListener('click', switchCamera);
retryBtn.addEventListener('click', () => start());
roll.addEventListener('click', () => openGallery(photos[0]?.id));
soundBtn.addEventListener('click', () => {
  P.sound = !P.sound;
  savePrefs();
  syncSound();
});

// ===========================================================================
// Gallery window: thumbnails, and a viewer for one photo at a time

const gal = { sel: null, viewing: false, placed: false };
const G = makeWindow('gallery', 'Gallery', 'c-gallery', 'gal');
const grid = h('div', 'gal-grid');
grid.setAttribute('role', 'listbox');
grid.setAttribute('aria-label', 'Photos');
const empty = h('div', 'gal-empty');
const emptyCam = button('btn', 'Open Camera');
empty.append(h('p', '', 'No photos yet.'), h('p', '', 'Open the Camera, pick a filter and press the red button.'), emptyCam);
const viewer = h('div', 'gal-view');
const big = h('img', 'gal-photo');
big.alt = '';
viewer.append(big);

const foot = h('div', 'dlg-foot gal-foot');
const prevBtn = button('btn gal-nav', '◀', 'Previous photo (←)');
prevBtn.setAttribute('aria-label', 'Previous photo');
const nextBtn = button('btn gal-nav', '▶', 'Next photo (→)');
nextBtn.setAttribute('aria-label', 'Next photo');
const info = h('span', 'search-status gal-info');
const openBtn = button('btn', 'Open');
const saveBtn = button('btn', 'Save', 'Save a copy to this device');
const delBtn = button('btn', 'Delete', 'Move to the Recycle Bin (Del)');
const backBtn = button('btn', 'All photos', 'Back to all photos (Esc)');
foot.append(prevBtn, nextBtn, info, openBtn, saveBtn, delBtn, backBtn);

G.body.append(grid, empty, viewer, foot);

const current = () => photos.find(p => p.id === gal.sel) || null;

function renderGallery() {
  const items = photos.map(p => {
    const f = filterById(p.filter);
    const b = h('button', 'gal-item');
    b.dataset.id = p.id;
    b.setAttribute('role', 'option');
    b.title = `${f.name} · ${longDate(p.at)}`;
    const img = h('img', f.pixel ? 'pixel' : '');
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.src = urlFor(p, 'thumb');
    b.append(img, h('span', '', shortDate(p.at)));
    return b;
  });
  grid.replaceChildren(...items);
  if (!current()) gal.sel = null;
  if (!photos.length) gal.viewing = false;
  syncGallery();
}

function syncGallery() {
  const p = current();
  const i = photos.indexOf(p);
  const v = gal.viewing && !!p;
  grid.hidden = v || !photos.length;
  empty.hidden = v || photos.length > 0;
  viewer.hidden = !v;
  for (const b of grid.children) b.setAttribute('aria-selected', Number(b.dataset.id) === gal.sel);
  prevBtn.hidden = nextBtn.hidden = backBtn.hidden = !v;
  openBtn.hidden = v;
  openBtn.disabled = saveBtn.disabled = delBtn.disabled = !p;
  prevBtn.disabled = i <= 0;
  nextBtn.disabled = i < 0 || i >= photos.length - 1;
  if (v) {
    const f = filterById(p.filter);
    big.src = urlFor(p, 'full');
    big.classList.toggle('pixel', !!f.pixel);
    big.alt = `Photo taken ${longDate(p.at)} with the ${f.name} filter`;
    info.textContent = `${i + 1} of ${photos.length} · ${f.name} · ${longDate(p.at)}`;
  } else if (p) {
    info.textContent = `${filterById(p.filter).name} · ${longDate(p.at)} · ${p.w}×${p.h}`;
  } else {
    const bytes = photos.reduce((a, x) => a + (x.blob?.size || 0), 0);
    info.textContent = photos.length ? `${plural(photos.length, 'photo')} · ${(bytes / 1048576).toFixed(1)} MB` : '';
    if (!persistent) info.textContent += `${photos.length ? ' · ' : ''}Browser storage is off: photos go when this tab closes.`;
  }
}

function select(id) {
  gal.sel = id;
  syncGallery();
}
function showPhoto(id) {
  if (id != null) gal.sel = id;
  if (!current()) return;
  gal.viewing = true;
  syncGallery();
}
function back() {
  gal.viewing = false;
  syncGallery();
  grid.querySelector(`[data-id="${gal.sel}"]`)?.focus();
}
function step(d) {
  const i = photos.indexOf(current()) + d;
  if (i >= 0 && i < photos.length) (gal.viewing ? showPhoto : select)(photos[i].id);
}

// Delete asks, then moves the photo to the Recycle Bin (core/trash.js): it stays
// in IndexedDB, marked trashed, until it's restored or deleted for good.
async function askDelete() {
  const p = current();
  if (!p) return;
  delBtn.title = `Move to the ${binName()} (Del)`;
  await moveToBin('photo', [{ name: `Photo, ${longDate(p.at)}`, data: { id: p.id } }], async () => {
    try {
      await store.trash(p.id);
    } catch (err) {
      devLog(err);
      info.textContent = 'Couldn’t delete the photo.';
      throw err;
    }
    const i = photos.indexOf(p);
    photos.splice(i, 1);
    forget(p.id);
    gal.sel = photos[Math.min(i, photos.length - 1)]?.id ?? null;
    photosChanged();
  }).catch(() => {}); // the message above already says it failed
}

// After a restore from the Recycle Bin.
export async function reloadPhotos() {
  try {
    photos = await store.list();
  } catch (err) {
    devLog(err);
  }
  photosChanged();
}

// Phones get the share sheet (→ Save Image); everything else downloads a file.
async function saveToDevice() {
  const p = current();
  if (!p) return;
  const name = fileName(p);
  if (coarse.matches && navigator.canShare) {
    const file = new File([p.blob], name, { type: p.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
  }
  const a = h('a');
  a.href = URL.createObjectURL(p.blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

grid.addEventListener('click', e => {
  const item = e.target.closest('.gal-item');
  if (!item) return select(null);
  select(Number(item.dataset.id));
  if (e.pointerType === 'touch' || e.detail === 0) showPhoto();
});
grid.addEventListener('dblclick', e => {
  const item = e.target.closest('.gal-item');
  if (item) showPhoto(Number(item.dataset.id));
});
big.addEventListener('dblclick', back);
openBtn.addEventListener('click', () => showPhoto());
saveBtn.addEventListener('click', saveToDevice);
delBtn.addEventListener('click', askDelete);
backBtn.addEventListener('click', back);
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));
emptyCam.addEventListener('click', openCamera);

// Thumbnails per row, for ↑ ↓ in the grid.
function columns() {
  const items = [...grid.children];
  const top = items[0]?.offsetTop;
  const n = items.findIndex(it => it.offsetTop !== top);
  return n < 0 ? items.length || 1 : n;
}

// ---------------------------------------------------------------------------
// Keyboard: runs before the player's shortcuts (capture phase on window), so
// Space, arrows and Delete act on the focused camera or gallery window.

const isActive = w => wm.isOpen(w) && w.classList.contains('active');
window.addEventListener(
  'keydown',
  e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches?.('input, textarea')) return;
    let handled = true;
    if (isActive(cam.win)) {
      if (e.key === ' ') snap();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stepFilter(-1);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stepFilter(1);
      else if (e.key === 'Escape') wm.hide(cam.win);
      else handled = false;
    } else if (isActive(G.win)) {
      const onButton = e.target.matches?.('button:not(.gal-item)');
      if (e.key === 'Escape') gal.viewing ? back() : wm.hide(G.win);
      else if (e.key === 'Delete' || e.key === 'Backspace') askDelete();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (!gal.viewing && e.key === 'ArrowUp') step(-columns());
      else if (!gal.viewing && e.key === 'ArrowDown') step(columns());
      else if (e.key === 'Enter' && !onButton) showPhoto();
      else handled = false;
      if (handled && !gal.viewing && grid.contains(document.activeElement)) grid.querySelector(`[data-id="${gal.sel}"]`)?.focus();
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);

// ===========================================================================

export function openCamera() {
  wm.show(cam.win, { center: !cam.placed });
  cam.placed = true;
}

export function openGallery(id) {
  if (id != null && photos.some(p => p.id === id)) {
    gal.sel = id;
    gal.viewing = true;
  }
  syncGallery();
  wm.show(G.win, { center: !gal.placed });
  gal.placed = true;
}

setFilter(P.filter);
syncSound();
setCamState('off');
photosChanged();
