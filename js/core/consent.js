// First-launch welcome and privacy consent, the privacy page, and Clear All Data.
// js/start.js waits on requireConsent() before it loads the app: until someone
// accepts, nothing loads from YouTube and nothing is saved. Declining "closes"
// RetroAmp (a page can't close its own tab). These screens show before any skin
// is applied, so they carry their own look: css/consent.css, a Windows 9x Setup.
import { h, freezeStorage } from './util.js';

const KEY = 'retroamp:consent';
const VERSION = 2; // bump when the privacy text below changes, so everyone is asked again
const PHOTOS_DB = 'retroamp-camera';
const WIPE = 'retroamp:wipe'; // sessionStorage: finish deleting photos after the reload

const accepted = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY))?.v === VERSION;
  } catch {
    return false; // storage blocked: ask on every visit
  }
};
const remember = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, at: new Date().toISOString() }));
  } catch {
    // storage blocked: the consent lasts for this visit only
  }
};
const hasSavedData = () => {
  try {
    return Object.keys(localStorage).some(k => k.startsWith('retroamp') && k !== KEY);
  } catch {
    return false;
  }
};

const ABOUT = [
  ['What this is', [
    'RetroAmp is a music player dressed up as the computers and gadgets we grew up with: a player skin for every year from 1990 to 2026, Macs, a Walkman, a Discman, a turntable and more. It plays music from YouTube and your own audio files, and comes with classic games, notes with reminders and a retro camera.',
  ]],
  ['Why it was made', [
    'Rafid Khan built it for fun and nostalgia: today’s music deserves the players we loved, with spinning reels, 7-segment clocks and a new skin every week.',
  ]],
];
const PRIVACY = [
  ['Your privacy', [
    'No account, no ads, no analytics and no cookies of our own.',
    'Saved only in this browser: your playlist, settings and skin, recent searches, notes and reminders, game scores and camera photos. None of it is sent to us.',
    'Deleting a song, note or photo asks first and moves it to the Recycle Bin, where you can restore it for 7 days. After that it’s deleted for good.',
    'Reminders from Notes pop up inside RetroAmp, and as system notifications if you allow them. There’s no server behind them, so they only go off while RetroAmp is open in a tab.',
    'Music comes from YouTube (Google), so Google sees your IP address and what plays. Its player can set cookies once a video starts, and more if you turn on Play › Use my YouTube sign-in.',
    'YouTube searches pass through this site’s server on the way to YouTube. The server doesn’t store them, but its hosting logs can briefly include them.',
    'Your own audio files play inside your browser and are never uploaded.',
    'RetroAmp keeps a copy of its own program files (not your data) so it opens offline and can be installed as an app.',
    'The camera runs only while the Camera window is open, and photos stay on this device.',
    'Screenshots capture only when you ask (your browser confirms each one) and stay on this device until you share, copy or save them.',
  ]],
  ['Your choice', [
    'RetroAmp starts only if you accept. You can read this again from Help › Privacy, and erase everything RetroAmp saved at any time with Start › Clear All Data.',
  ]],
];

function icon(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function section([title, paras], list) {
  const out = [h('h2', '', title)];
  if (list) {
    const ul = h('ul');
    for (const p of paras) ul.append(h('li', '', p));
    out.push(ul);
  } else for (const p of paras) out.push(h('p', '', p));
  return out;
}

// A Setup-style dialog on its own full-screen layer. Keys stay inside it, so the
// player's shortcuts don't fire behind it.
function screen({ title, heading, banner = true, body, buttons, closed = false }) {
  document.querySelector('.cs-screen')?.remove();
  const layer = h('div', `cs-screen${closed ? ' cs-closed' : ''}`);
  const dlg = h('section', 'cs-dialog');
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', title);
  const main = h('div', 'cs-main');
  if (banner) {
    const b = h('div', 'cs-banner');
    b.append(icon('i-disc'));
    main.append(b);
  }
  const content = h('div', 'cs-content');
  content.append(h('h1', '', heading), ...body);
  main.append(content);
  const foot = h('div', 'cs-foot');
  foot.append(...buttons);
  dlg.append(h('div', 'cs-title', title), main, foot);
  layer.append(dlg);
  layer.addEventListener('keydown', e => e.stopPropagation());
  document.body.append(layer);
  return layer;
}

function button(label, act) {
  const b = h('button', 'cs-btn', label);
  b.type = 'button';
  b.addEventListener('click', act);
  return b;
}

function textBox(parts) {
  const box = h('div', 'cs-text');
  box.tabIndex = 0;
  box.append(...parts);
  return box;
}

let consent = null;

// Resolves once the visitor has accepted (right away if they already have).
export function requireConsent() {
  finishWipe();
  if (accepted()) return Promise.resolve();
  consent ||= new Promise(resolve => welcome(resolve));
  return consent;
}

function welcome(resolve) {
  const choice = name => {
    const label = h('label');
    const radio = h('input');
    radio.type = 'radio';
    radio.name = 'cs-choice';
    radio.value = name;
    label.append(radio, h('span', '', name === 'yes'
      ? 'I accept: start RetroAmp and save my settings in this browser'
      : 'I don’t accept: close RetroAmp without saving anything'));
    return label;
  };
  const choices = h('div', 'cs-choices');
  choices.setAttribute('role', 'radiogroup');
  choices.setAttribute('aria-label', 'Your choice');
  choices.append(choice('yes'), choice('no'));
  const go = button('Start RetroAmp', () => {
    const v = choices.querySelector('input:checked')?.value;
    if (v === 'yes') {
      remember();
      layer.remove();
      resolve();
    } else if (v === 'no') goodbye(resolve);
  });
  go.disabled = true;
  choices.addEventListener('change', () => {
    const v = choices.querySelector('input:checked')?.value;
    go.disabled = !v;
    go.textContent = v === 'no' ? 'Close' : 'Start RetroAmp';
  });
  const layer = screen({
    title: 'RetroAmp Setup',
    heading: 'Welcome to RetroAmp',
    body: [
      h('p', 'cs-lead', 'Please read the following before you start.'),
      textBox([...ABOUT.flatMap(s => section(s)), ...PRIVACY.flatMap((s, i) => section(s, i === 0))]),
      choices,
    ],
    buttons: [go],
  });
  choices.querySelector('input').focus();
}

// Declined: nothing loads and nothing is saved. Anything saved on an earlier visit
// can still be erased from here.
function goodbye(resolve) {
  const buttons = [button('Start over', () => welcome(resolve))];
  if (hasSavedData()) buttons.unshift(button('Clear saved data', () => confirmClear(() => goodbye(resolve))));
  const layer = screen({
    title: 'RetroAmp',
    heading: 'It’s now safe to close this tab.',
    banner: false,
    closed: true,
    body: [
      h('p', '', 'You didn’t accept, so RetroAmp didn’t start and saved nothing.'),
      ...(hasSavedData() ? [h('p', '', 'Settings from an earlier visit are still in this browser. You can clear them here.')] : []),
    ],
    buttons,
  });
  layer.querySelector('.cs-btn:last-child').focus();
}

// A plain message in the same Setup style (e.g. how to install on iPhone).
export function showNotice(title, heading, paragraphs) {
  const layer = screen({ title, heading, body: paragraphs.map(p => h('p', '', p)), buttons: [button('OK', () => layer.remove())] });
  layer.addEventListener('keydown', e => e.key === 'Escape' && layer.remove());
  layer.querySelector('.cs-btn').focus();
}

// Help › Privacy: the same text, to read again.
export function showPrivacy() {
  const layer = screen({
    title: 'RetroAmp Privacy',
    heading: 'Privacy',
    body: [textBox([...ABOUT.flatMap(s => section(s)), ...PRIVACY.flatMap((s, i) => section(s, i === 0))])],
    buttons: [button('Clear All Data…', () => confirmClear(showPrivacy)), button('Close', () => layer.remove())],
  });
  layer.addEventListener('keydown', e => e.key === 'Escape' && layer.remove());
  layer.querySelector('.cs-btn:last-child').focus();
}

// Start › Clear All Data: erase everything, then start over from the welcome screen.
export function confirmClear(back = null) {
  const cancel = button('Cancel', () => (back ? back() : layer.remove()));
  const layer = screen({
    title: 'Clear All Data',
    heading: 'Erase everything RetroAmp saved?',
    body: [
      textBox([
        h('p', '', 'This deletes, from this browser:'),
        (() => {
          const ul = h('ul');
          for (const t of ['your playlist and recent searches', 'your skin, volume, equalizer and window layout', 'notes and reminders', 'game scores', 'camera photos and camera settings', 'everything in the Recycle Bin', 'the offline copy of RetroAmp', 'your privacy consent']) ul.append(h('li', '', t));
          return ul;
        })(),
        h('p', '', 'RetroAmp then starts over from the welcome screen. This can’t be undone.'),
        h('p', '', 'YouTube’s own cookies (from Use my YouTube sign-in) belong to YouTube; clear them in your browser’s settings.'),
      ]),
    ],
    buttons: [button('Clear everything', wipe), cancel],
  });
  layer.addEventListener('keydown', e => e.key === 'Escape' && cancel.click());
  cancel.focus();
}

function wipe() {
  freezeStorage(); // the player saves on pagehide; don't let it write anything back
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('retroamp')) localStorage.removeItem(k);
  } catch {
    // storage blocked: nothing was saved
  }
  try {
    sessionStorage.clear();
    sessionStorage.setItem(WIPE, '1');
  } catch {
    // no session storage: the photo delete below has to finish on its own
  }
  Promise.all([deletePhotos(), dropNotifications()]).then(() => location.reload());
}

function deletePhotos() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.deleteDatabase(PHOTOS_DB);
      req.onsuccess = req.onerror = () => {
        try {
          sessionStorage.removeItem(WIPE);
        } catch {
          // nothing to clean up
        }
        resolve();
      };
      req.onblocked = resolve; // an open Gallery holds it: finishWipe() completes it after the reload
      setTimeout(resolve, 1500);
    } catch {
      resolve();
    }
  });
}

// The app's service worker, its offline copy and any reminder notifications still on screen.
function dropNotifications() {
  const work = (async () => {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) {
      for (const n of await r.getNotifications()) n.close();
      await r.unregister();
    }
    if ('caches' in window) for (const k of await caches.keys()) if (k.startsWith('retroamp-')) await caches.delete(k);
  })().catch(() => {});
  return Promise.race([work, new Promise(done => setTimeout(done, 1500))]);
}

function finishWipe() {
  try {
    if (!sessionStorage.getItem(WIPE)) return;
    indexedDB.deleteDatabase(PHOTOS_DB).onsuccess = () => sessionStorage.removeItem(WIPE);
  } catch {
    // no IndexedDB or session storage
  }
}
