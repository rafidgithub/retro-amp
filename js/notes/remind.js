// Reminder clock. js/notes/index.js starts it at launch, so reminders go off even
// if the Notes window was never opened. There's no server: a reminder can only
// go off while RetroAmp is open in some tab, and one that came due while it was
// closed goes off at the next launch, marked as missed.
//
// When one goes off: a small window drawn in the current skin pops up above the
// taskbar, and if RetroAmp isn't the window in front and notifications are
// allowed, a system notification too (its pictures drawn in the skin, art.js).
import { h } from '../core/util.js';
import * as store from './store.js';
import { themedIcon, themedCard } from './art.js';
import { appWorker } from '../core/pwa.js';

const SNOOZE = 10 * 60 * 1000;
const LATE = 2 * 60 * 1000; // went off this long after its time: call it missed

let openNote = () => {};
export const setOpener = fn => {
  openNote = fn;
};

const when = at => new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const excerpt = body => body.replace(/\s+/g, ' ').trim().slice(0, 140);

// ---------------------------------------------------------------------------
// The clock

let timer = 0;
let checking = false; // ringing saves the note, and saving calls check() again
export function check() {
  if (checking) return;
  checking = true;
  clearTimeout(timer);
  const now = Date.now();
  let next = Infinity;
  try {
    for (const n of [...store.all()]) {
      if (!n.remind || n.remind.done) continue;
      if (n.remind.at <= now) ring(n, now - n.remind.at > LATE);
      else next = Math.min(next, n.remind.at);
    }
  } finally {
    checking = false;
  }
  // background tabs throttle long timers, so wake at least once a minute
  if (next < Infinity) timer = setTimeout(check, Math.min(next - now, 60_000) + 50);
}

function ring(n, missed) {
  store.update(n.id, { remind: { at: n.remind.at, done: true } }, { touch: false });
  popup(n, missed);
  systemNotice(n, missed);
}

export function snooze(id) {
  if (!store.get(id)) return;
  store.update(id, { remind: { at: Date.now() + SNOOZE, done: false } }, { touch: false });
  close(id);
}

// ---------------------------------------------------------------------------
// In-app popup: a real .win (no window manager), so every look styles it

const stack = h('div', 'nt-pops');
stack.setAttribute('aria-live', 'polite');
document.body.append(stack);

const close = id => stack.querySelector(`[data-note="${CSS.escape(id)}"]`)?.remove();

function popup(n, missed) {
  close(n.id);
  const win = h('section', 'win dialog active nt-pop');
  win.dataset.note = n.id;
  win.setAttribute('role', 'alert');
  win.style.setProperty('--note', store.COLORS[n.color]);
  const bar = h('header', 'titlebar');
  const ico = h('span', 'tb-icon');
  ico.append(svg('n-notes'));
  const btns = h('span', 'tb-btns');
  const x = h('button');
  x.dataset.wm = 'close'; // styling only: the window manager never sees this window
  x.setAttribute('aria-label', 'Dismiss');
  x.addEventListener('click', () => close(n.id));
  btns.append(x);
  bar.append(ico, h('span', 'tb-title', missed ? 'Missed reminder' : 'Reminder'), btns);
  const body = h('div', 'win-body nt-pop-body');
  const note = h('div', 'nt-pop-note');
  note.append(h('b', '', n.title || 'Untitled note'));
  if (n.body.trim()) note.append(h('p', '', excerpt(n.body)));
  note.append(h('small', '', when(n.remind.at)));
  const actions = h('div', 'nt-pop-acts');
  const act = (label, fn) => {
    const b = h('button', 'btn', label);
    b.addEventListener('click', fn);
    return b;
  };
  actions.append(
    act('Open', () => {
      close(n.id);
      openNote(n.id);
    }),
    act('Snooze 10 min', () => snooze(n.id)),
    act('Done', () => close(n.id)),
  );
  body.append(note, actions);
  win.append(bar, body);
  stack.append(win);
  while (stack.children.length > 3) stack.firstChild.remove();
}

function svg(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  s.append(use);
  return s;
}

// ---------------------------------------------------------------------------
// System notifications

export const notificationsSupported = () => 'Notification' in window;
export const notificationState = () => (notificationsSupported() ? Notification.permission : 'unsupported');

// Asked only when someone sets a reminder (a click), never at launch.
export async function allowNotifications() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // old callback-only API or blocked: treat as not allowed
    }
  }
  return Notification.permission;
}

// System notifications go through the app's service worker (/sw.js, registered
// by core/pwa.js): Android only allows them from a worker, and it answers clicks.

async function systemNotice(n, missed) {
  if (notificationState() !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return; // the popup is right there
  const title = `${missed ? 'Missed reminder' : 'Reminder'}: ${n.title || 'Untitled note'}`;
  const options = {
    body: excerpt(n.body) || when(n.remind.at),
    tag: `retroamp-note-${n.id}`,
    renotify: true,
    requireInteraction: true,
    icon: themedIcon(),
    image: themedCard(n, missed),
    data: { id: n.id },
  };
  const r = await appWorker();
  if (r) {
    try {
      await r.showNotification(title, { ...options, actions: [{ action: 'snooze', title: 'Snooze 10 min' }, { action: 'done', title: 'Done' }] });
      return;
    } catch {
      // fall through to the page-level notification
    }
  }
  try {
    const note = new Notification(title, options);
    note.onclick = () => {
      window.focus();
      openNote(n.id);
      note.close();
    };
  } catch {
    // this browser only allows notifications from a worker
  }
}

// Clicks on a system notification, relayed by sw.js.
navigator.serviceWorker?.addEventListener('message', e => {
  const { type, action, id } = e.data || {};
  if (type !== 'retroamp-note' || !id) return;
  if (action === 'snooze') snooze(id);
  else if (action === 'done') close(id);
  else {
    close(id);
    openNote(id);
  }
});
navigator.serviceWorker?.startMessages?.();

// sw.js opens RetroAmp with ?note=<id> when no RetroAmp tab is left to click into.
export function handleLaunch() {
  const params = new URLSearchParams(location.search);
  const id = params.get('note');
  if (!id) return;
  history.replaceState(null, '', location.pathname);
  if (!store.get(id)) return;
  if (params.has('snooze')) snooze(id);
  else openNote(id);
}

store.onChange(check);
document.addEventListener('visibilitychange', check);
window.addEventListener('focus', check);
