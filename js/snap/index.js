// Screenshots to share what you're up to. On computers it's a real capture of the
// RetroAmp tab (Screen Capture API; the browser asks each time): nothing is
// closed, minimized or paused, and the YouTube video is in the shot. Phones and
// tablets can't capture the screen from a page, so there it draws a Now Playing
// card instead: the current skin's player with the song, on the skin's desktop.
// Either way the picture stays on the device until Share, Copy or Save.
// Tray button, Start › Screenshot, or the P key.
import { $, h } from '../core/util.js';
import * as wm from '../core/wm.js';
import { paint, cssVar } from '../core/paint.js';
import { SKINS } from '../core/skins.js';
import { createPip } from '../player/pip.js';

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `<symbol id="s-snap" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5.5 2h5l1 2H14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2.5zM8 5.6a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm0 1.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z"/></symbol>`;
document.body.prepend(sprite);

function icon(id) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
const canvas = (w, h2) => Object.assign(document.createElement('canvas'), { width: w, height: h2 });
const root = document.documentElement;
const canCapture = () => !!navigator.mediaDevices?.getDisplayMedia && !root.classList.contains('touch');
const skin = () => SKINS[root.dataset.skin] || { name: 'RetroAmp', inspo: '' };
const playing = () => navigator.mediaSession?.metadata || null;
const stamp = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
const font = (weight, size) => `${weight} ${size}px ${(cssVar('--ui-font') || '').replace(/^.*?\d+(\.\d+)?px(\/\S+)?\s*/, '') || 'sans-serif'}`;
const devLog = err => (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && console.warn('[screenshot]', err);

// ---------------------------------------------------------------------------
// Taking the picture

// The tab as it is right now. The browser shows its own "allow" prompt and a
// sharing bar; one frame is taken and the capture stops straight away.
async function captureTab() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    // full window resolution; Chrome otherwise sends a small default size
    video: { displaySurface: 'browser', width: { ideal: Math.round(innerWidth * devicePixelRatio) }, height: { ideal: Math.round(innerHeight * devicePixelRatio) } },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
    monitorTypeSurfaces: 'exclude',
  });
  try {
    const video = h('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise(done => setTimeout(done, 400)); // let the prompt close and the sharing bar settle
    const c = canvas(video.videoWidth, video.videoHeight);
    c.getContext('2d').drawImage(video, 0, 0);
    return c;
  } finally {
    stream.getTracks().forEach(t => t.stop());
  }
}

// Phones and tablets: a 4:5 card (fits Instagram and WhatsApp) drawn in the skin.
let pip = null;
async function nowPlayingCard() {
  pip ||= createPip({
    info: () => {
      const m = playing();
      const seek = $('#w-player .seek');
      return {
        title: m?.title || 'Nothing playing yet',
        artist: m?.artist || 'RetroAmp',
        state: root.dataset.state || 'stopped',
        progress: seek ? Number(seek.value) / 1000 : 0,
        art: m?.artwork?.find(a => /^https:\/\/i\.ytimg\.com\//.test(a.src))?.src || null,
      };
    },
    viz: $('#w-player .lcd-viz'),
    clock: $('#w-player .lcd-time'),
    toggle: () => {},
    onChange: () => {},
  });
  const W = 1080;
  const H = 1350;
  const c = canvas(W, H);
  const x = c.getContext('2d');
  paint(x, cssVar('--desk-bg') || '#008080', 0, 0, W, H);
  const shade = x.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, .45)');
  x.fillStyle = shade;
  x.fillRect(0, 0, W, H);

  const shot = await pip.snapshot();
  x.save();
  x.shadowColor = 'rgba(0, 0, 0, .5)';
  x.shadowBlur = 40;
  x.shadowOffsetY = 16;
  x.drawImage(shot, 60, 200, 960, 480);
  x.restore();

  const s = skin();
  const m = playing();
  const box = (y, hh) => paint(x, cssVar('--face') || '#c0c0c0', 60, y, W - 120, hh, 18);
  box(760, 380);
  paint(x, cssVar('--title') || '#000080', 60, 760, W - 120, 70, 18);
  x.fillStyle = cssVar('--title-text') || '#fff';
  x.font = font('bold', 34);
  x.textBaseline = 'middle';
  x.fillText(m ? 'Now playing on RetroAmp' : 'Hanging out on RetroAmp', 96, 795);
  x.textBaseline = 'alphabetic';
  x.fillStyle = cssVar('--text') || '#000';
  x.font = font('bold', 52);
  x.fillText(fit(x, m?.title || 'Picking the next song…', W - 200), 96, 900);
  x.font = font('normal', 38);
  x.fillText(fit(x, m?.artist || '', W - 200), 96, 958);
  x.font = font('normal', 32);
  x.fillStyle = cssVar('--muted') || cssVar('--text') || '#444';
  x.fillText(fit(x, `${s.name} skin${s.inspo ? ` · inspired by ${s.inspo}` : ''}`, W - 200), 96, 1040);
  x.fillText(new Date().toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }), 96, 1092);

  x.fillStyle = 'rgba(255, 255, 255, .85)';
  x.font = font('bold', 30);
  x.textAlign = 'center';
  x.fillText(`RetroAmp · ${location.host}`, W / 2, H - 70);
  return c;
}

function fit(x, text, max) {
  if (x.measureText(text).width <= max) return text;
  let t = text;
  while (t && x.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

// ---------------------------------------------------------------------------
// Preview window: Share, Copy, Save

const win = h('section', 'win dialog sn is-min');
win.id = 'w-snap';
win.setAttribute('aria-label', 'Screenshot');
const bar = h('header', 'titlebar');
const tbIcon = h('span', 'tb-icon');
tbIcon.append(icon('s-snap'));
const tbBtns = h('span', 'tb-btns');
const closeBox = h('button');
closeBox.dataset.wm = 'close';
closeBox.setAttribute('aria-label', 'Close');
tbBtns.append(closeBox);
bar.append(tbIcon, h('span', 'tb-title', 'Screenshot'), tbBtns);
const body = h('div', 'win-body sn-body');
const img = h('img', 'sn-shot');
img.alt = '';
const note = h('p', 'sn-note');
const foot = h('div', 'dlg-foot sn-foot');
const status = h('span', 'search-status sn-status');
const shareBtn = h('button', 'btn', 'Share…');
const copyBtn = h('button', 'btn', 'Copy');
const saveBtn = h('button', 'btn', 'Save');
const againBtn = h('button', 'btn', 'Take another');
foot.append(status, shareBtn, copyBtn, saveBtn, againBtn);
body.append(img, note, foot);
win.append(bar, body);
document.getElementById('desktop').append(win);
wm.register(win, { title: 'Screenshot', icon: 's-snap', dialog: true });

let current = null; // { blob, file, url, text }

async function show(c, kind) {
  const blob = await new Promise(done => c.toBlob(done, 'image/png'));
  if (!blob) throw new Error('could not encode the picture');
  if (current) URL.revokeObjectURL(current.url);
  const now = new Date();
  const m = playing();
  current = {
    blob,
    url: URL.createObjectURL(blob),
    file: new File([blob], `retroamp-${root.dataset.skin || 'skin'}-${stamp(now)}.png`, { type: 'image/png' }),
    text: m ? `Listening to “${m.title}” on RetroAmp (${skin().name} skin)` : `Hanging out on RetroAmp (${skin().name} skin)`,
  };
  img.src = current.url;
  img.alt = kind === 'card' ? 'Now Playing card' : 'Screenshot of RetroAmp';
  note.textContent =
    kind === 'card'
      ? 'Phones can’t capture the screen from a web page, so here’s a Now Playing card in your skin.'
      : `Screenshot, ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. It stays on this device until you share, copy or save it.`;
  status.textContent = '';
  shareBtn.hidden = !navigator.canShare?.({ files: [current.file] });
  copyBtn.hidden = !(navigator.clipboard?.write && window.ClipboardItem);
  wm.show(win, { center: true });
}

// A white flash, the way the old cameras did it. Shown after the picture is taken.
function flash() {
  const f = h('div', 'sn-flash');
  document.body.append(f);
  f.addEventListener('animationend', () => f.remove());
}

let busy = false;
async function snap() {
  if (busy) return;
  busy = true;
  try {
    let c = null;
    let kind = 'tab';
    if (canCapture()) {
      try {
        c = await captureTab();
      } catch (err) {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return; // the person said no
        devLog(err);
      }
    }
    if (!c) {
      c = await nowPlayingCard();
      kind = 'card';
    }
    flash();
    await show(c, kind);
  } catch (err) {
    devLog(err);
  } finally {
    busy = false;
  }
}

shareBtn.addEventListener('click', async () => {
  if (!current) return;
  try {
    await navigator.share({ files: [current.file], text: current.text, title: 'RetroAmp' });
  } catch (err) {
    if (err?.name !== 'AbortError') status.textContent = 'Couldn’t open sharing.';
  }
});
copyBtn.addEventListener('click', async () => {
  if (!current) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': current.blob })]);
    status.textContent = 'Copied. Paste it into a chat or post.';
  } catch {
    status.textContent = 'Couldn’t copy. Try Save instead.';
  }
});
saveBtn.addEventListener('click', () => {
  if (!current) return;
  const a = h('a');
  a.href = current.url;
  a.download = current.file.name;
  document.body.append(a);
  a.click();
  a.remove();
  status.textContent = 'Saved to your downloads.';
});
againBtn.addEventListener('click', () => {
  wm.hide(win);
  setTimeout(snap, 250); // let the window get out of the shot
});

// ---------------------------------------------------------------------------
// Ways in: tray button, Start menu, P

const tray = h('button');
tray.id = 'tray-snap';
tray.title = 'Screenshot (P)';
tray.setAttribute('aria-label', 'Take a screenshot');
tray.append(icon('s-snap'));
tray.addEventListener('click', snap);
$('#tray-vol')?.before(tray);

const smItems = $('#start-menu .sm-items');
if (smItems) {
  const b = h('button');
  b.append(icon('s-snap'), 'Screenshot');
  b.addEventListener('click', () => setTimeout(snap, 150)); // after the Start menu closes
  smItems.insertBefore(b, smItems.querySelector('hr'));
}

document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (e.target.matches?.('input, textarea, [contenteditable]')) return;
  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    snap();
  }
});
