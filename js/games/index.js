// Games: classic time-wasters, each in its own window. A game lives in
// js/games/<id>.js (plus css/games/<id>.css) and loads the first time it opens.
//
// A game module's default export is create(host) → game:
//   host: { body, win, store: { get, set }, setTitle(text), alert(opts), pad(buttons) }
//   game: { newGame(), menu() → items, help, key(e) → handled?, keyup?(e), pause?(), pad?(act, down) }
import { $, $$, h } from '../core/util.js';
import * as wm from '../core/wm.js';
import { openMenu, closeMenus, isMenuOpen } from '../core/menu.js';

const GAMES = [
  { id: 'minesweeper', name: 'Minesweeper', icon: 'g-mines', era: '1990 · Windows 3.1' },
  { id: 'solitaire', name: 'Solitaire', icon: 'g-cards', era: '1990 · Windows 3.0' },
  { id: 'snake', name: 'Snake', icon: 'g-snake', era: '1997 · Nokia phone' },
  { id: 'blocks', name: 'Blocks', icon: 'g-blocks', era: '1989 · Game Boy' },
  { id: 'bricks', name: 'Bricks', icon: 'g-bricks', era: '1976 · arcade' },
];

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `
  <symbol id="g-folder" viewBox="0 0 32 32"><path d="M2 7h10l3 3h15v18H2z" fill="#c9a227" stroke="#5c4600"/><path d="M2 12h28v16H2z" fill="#ffe274" stroke="#5c4600"/><path d="M3 13h26" stroke="#fff6c4"/></symbol>
  <symbol id="g-mines" viewBox="0 0 32 32"><rect x=".5" y=".5" width="31" height="31" fill="#c0c0c0" stroke="#808080"/><path d="M1 31V1h30" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24" stroke="#000" stroke-width="2.4"/><circle cx="16" cy="16" r="8"/><rect x="12" y="12" width="3.5" height="3.5" fill="#fff"/></symbol>
  <symbol id="g-cards" viewBox="0 0 32 32"><rect x="3" y="5" width="17" height="23" rx="2" fill="#fff" stroke="#222" transform="rotate(-12 11 16)"/><path d="M8.5 15c-2-3 2-5.5 3.2-2.5 1.2-3 5.2-.5 3.2 2.5L11.7 19z" fill="#e01b1b" transform="rotate(-12 11 16)"/><rect x="12" y="4" width="17" height="23" rx="2" fill="#fff" stroke="#222" transform="rotate(10 20 16)"/><path d="M20.5 10c3 3 5 4.6 3.2 6.6-1 1.1-2.4.7-3.2-.2l1 3.6h-2l1-3.6c-.8.9-2.2 1.3-3.2.2-1.8-2 .2-3.6 3.2-6.6z" transform="rotate(10 20 16)"/></symbol>
  <symbol id="g-snake" viewBox="0 0 32 32"><rect x="1" y="3" width="30" height="26" rx="3" fill="#9fb784" stroke="#2c3a20"/><path d="M6 23h8v-8h8v-6h4" fill="none" stroke="#1d2a14" stroke-width="3.2"/><rect x="24" y="20" width="3" height="3" fill="#1d2a14"/></symbol>
  <symbol id="g-blocks" viewBox="0 0 32 32"><path d="M4 20h8v8H4zM12 20h8v8h-8zM20 20h8v8h-8zM12 12h8v8h-8z" fill="#8bac0f" stroke="#0f380f" stroke-width="1.4"/><path d="M20 4h8v8h-8zM20 12h8v8h-8z" fill="#306230" stroke="#0f380f" stroke-width="1.4"/></symbol>
  <symbol id="g-bricks" viewBox="0 0 32 32"><rect width="32" height="32" rx="2" fill="#111"/><path d="M2 3h9v4H2zM12 3h9v4h-9zM22 3h8v4h-8z" fill="#d23c3c"/><path d="M2 8h9v4H2zM22 8h8v4h-8z" fill="#e88a2a"/><path d="M2 13h9v4H2zM12 13h9v4h-9z" fill="#3fae4f"/><circle cx="17" cy="21" r="2" fill="#fff"/><path d="M10 27h12v2H10z" fill="#5aa0ff"/></symbol>
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

// header.titlebar > .tb-icon + .tb-title + .tb-btns, then .win-body — same as the built-in dialogs.
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
  const body = h('div', 'win-body g-body');
  win.append(bar, body);
  $('#desktop').append(win);
  wm.register(win, { title, icon: iconId, dialog: true });
  return { win, body };
}

// ---------------------------------------------------------------------------
// Saved scores and settings, one object per game

const KEY = 'retroamp:games';
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  // storage blocked — scores just won't stick
}
function storeFor(id) {
  return {
    get: (k, fallback) => saved[id]?.[k] ?? fallback,
    set(k, v) {
      saved[id] = { ...saved[id], [k]: v };
      try {
        localStorage.setItem(KEY, JSON.stringify(saved));
      } catch {
        // private mode or quota
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Game windows

const running = new Map(); // id -> { def, win, body, game, placed }
const loading = new Set();

function loadCss(id) {
  return new Promise(resolve => {
    const link = h('link');
    link.rel = 'stylesheet';
    link.href = `css/games/${id}.css`;
    link.onload = link.onerror = resolve;
    document.head.append(link);
  });
}

async function launch(id) {
  let g = running.get(id);
  if (!g) {
    if (loading.has(id)) return;
    const def = GAMES.find(x => x.id === id);
    loading.add(id);
    document.documentElement.classList.add('g-wait');
    try {
      const [mod] = await Promise.all([import(`./${id}.js`), loadCss(id)]);
      g = build(def, mod.default);
      running.set(id, g);
    } catch (err) {
      console.error(`Couldn't start ${def.name}`, err);
      return;
    } finally {
      loading.delete(id);
      document.documentElement.classList.remove('g-wait');
    }
  }
  wm.show(g.win, { center: !g.placed });
  g.placed = true;
}

function build(def, create) {
  const { win, body } = makeWindow(def.id, def.name, def.icon, 'game');
  const g = { def, win, body, game: null, placed: false };

  const bar = h('nav', 'g-menubar');
  bar.setAttribute('aria-label', 'Menu');
  for (const [key, label] of [['game', 'Game'], ['help', 'Help']]) {
    const b = h('button');
    b.dataset.gmenu = key;
    const u = h('u', '', label[0]);
    b.append(u, label.slice(1));
    bar.append(b);
  }
  win.insertBefore(bar, body);

  const host = {
    body,
    win,
    store: storeFor(def.id),
    setTitle(text) {
      $('.tb-title', win).textContent = text;
      wm.setTitle(win, text);
    },
    alert: opts => showModal(g, opts),
    pad: buttons => body.append(makePad(g, buttons)),
  };
  g.game = create(host);

  const menus = {
    game: () => [
      { label: 'New', key: 'F2', act: () => g.game.newGame() },
      { sep: true },
      ...(g.game.menu?.() || []),
      { sep: true },
      { label: 'Exit', act: () => wm.hide(win) },
    ],
    help: () => [
      { label: 'How to play', act: () => showModal(g, { title: `${def.name} Help`, text: g.game.help }) },
      { sep: true },
      { label: `About ${def.name}…`, act: () => showModal(g, { title: `About ${def.name}`, text: `${def.name}\n${def.era}\n\nOne of the classics in RetroAmp’s Games folder. Best scores stay in this browser.` }) },
    ],
  };
  let open = null;
  const openBar = b => {
    g.game.pause?.();
    open?.classList.remove('open');
    open = b;
    b.classList.add('open');
    const r = b.getBoundingClientRect();
    openMenu(menus[b.dataset.gmenu](), r.left, r.bottom, () => {
      b.classList.remove('open');
      if (open === b) open = null;
    });
  };
  for (const b of $$('[data-gmenu]', bar)) {
    b.addEventListener('click', () => (open === b ? closeMenus() : openBar(b)));
    b.addEventListener('pointerenter', () => open && open !== b && openBar(b));
  }

  // Action games pause when their window is closed or loses focus.
  new MutationObserver(() => {
    if (!win.classList.contains('active') || !wm.isOpen(win)) g.game.pause?.();
  }).observe(win, { attributes: true, attributeFilter: ['class'] });
  return g;
}

// Message box (game over, best times, help…): one shared dialog window that
// opens over the game, like a Windows MessageBox. The game pauses on blur.
const msg = makeWindow('gmsg', 'Message', 'i-info', 'g-msg');
let msgOwner = null;

function showModal(g, { title, text = '', content = null, buttons = [{ label: 'OK' }] }) {
  msgOwner = g;
  $('.tb-title', msg.win).textContent = title;
  wm.setTitle(msg.win, title);
  msg.win.setAttribute('aria-label', title);
  const parts = text.split('\n\n').filter(Boolean).map(para => h('p', '', para));
  const foot = h('div', 'g-msg-foot');
  for (const { label, act } of buttons) {
    const b = h('button', 'btn', label);
    b.addEventListener('click', () => {
      closeModal();
      act?.();
    });
    foot.append(b);
  }
  msg.body.replaceChildren(...parts, ...(content ? [content] : []), foot);
  // Wait for the current click to finish, or its pointerdown would raise the
  // game window back over the box.
  setTimeout(() => {
    if (msgOwner !== g) return;
    const wasOpen = wm.isOpen(msg.win);
    wm.show(msg.win);
    if (!wasOpen) {
      const r = g.win;
      wm.place(msg.win, r.offsetLeft + (r.offsetWidth - msg.win.offsetWidth) / 2, r.offsetTop + Math.max(24, (r.offsetHeight - msg.win.offsetHeight) / 2));
    }
    foot.firstChild.focus();
  });
}

function closeModal() {
  const g = msgOwner;
  msgOwner = null;
  wm.hide(msg.win);
  if (g && wm.isOpen(g.win)) wm.focus(g.win);
}

// On-screen buttons for touch screens (hidden when there's a mouse).
function makePad(g, buttons) {
  const pad = h('div', 'g-pad');
  for (const { act, label, title, repeat } of buttons) {
    const b = h('button', 'btn', label);
    b.setAttribute('aria-label', title || act);
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      clearInterval(timer);
      if (b.classList.contains('down')) g.game.pad?.(act, false);
      b.classList.remove('down');
    };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      b.classList.add('down');
      g.game.pad?.(act, true);
      if (repeat) timer = setTimeout(() => (timer = setInterval(() => g.game.pad?.(act, true), 70)), 220);
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('contextmenu', e => e.preventDefault());
    pad.append(b);
  }
  return pad;
}

const activeGame = () => [...running.values()].find(g => wm.isOpen(g.win) && g.win.classList.contains('active'));

// Capture phase on window: runs before the player's shortcuts on document, so
// arrows and Space steer the game instead of seeking or changing volume.
window.addEventListener(
  'keydown',
  e => {
    if (isMenuOpen()) return;
    if (wm.isOpen(msg.win) && msg.win.classList.contains('active')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation(); // Enter/Space still press the focused button
      return;
    }
    const g = activeGame();
    if (!g) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches?.('input, textarea')) return;
    let handled = false;
    if (e.key === 'F2') {
      g.game.newGame();
      handled = true;
    } else handled = !!g.game.key?.(e);
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true,
);
window.addEventListener(
  'keyup',
  e => {
    const g = activeGame();
    if (g?.game.keyup?.(e)) e.stopPropagation();
  },
  true,
);

// ---------------------------------------------------------------------------
// The Games folder: an Explorer-style window with one icon per game

const folder = makeWindow('games', 'Games', 'g-folder', 'g-folder-win');
const grid = h('div', 'g-folder');
grid.setAttribute('role', 'listbox');
grid.setAttribute('aria-label', 'Games');
for (const def of GAMES) {
  const item = h('button', 'g-item');
  item.dataset.game = def.id;
  item.setAttribute('role', 'option');
  item.title = def.era;
  const svg = icon(def.icon);
  svg.setAttribute('class', 'g-item-ico');
  item.append(svg, h('span', '', def.name));
  grid.append(item);
}
const status = h('div', 'g-folder-status', `${GAMES.length} object(s)`);
folder.body.append(grid, status);

const selectItem = item => {
  for (const it of $$('.g-item', grid)) it.setAttribute('aria-selected', it === item);
  status.textContent = item ? `${item.textContent} — ${GAMES.find(d => d.id === item.dataset.game).era}` : `${GAMES.length} object(s)`;
};
grid.addEventListener('click', e => {
  const item = e.target.closest('.g-item');
  selectItem(item);
  if (item && (e.pointerType === 'touch' || e.detail === 0)) launch(item.dataset.game);
});
grid.addEventListener('dblclick', e => {
  const item = e.target.closest('.g-item');
  if (item) launch(item.dataset.game);
});
grid.addEventListener('keydown', e => {
  const items = $$('.g-item', grid);
  const i = items.indexOf(document.activeElement);
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step || i < 0) return;
  e.preventDefault();
  e.stopPropagation();
  const next = items[(i + step + items.length) % items.length];
  next.focus();
  selectItem(next);
});

function openFolder() {
  wm.show(folder.win, { center: !folder.placed });
  folder.placed = true;
}

// Desktop icon. main.js highlights any .dicon on click; opening is ours.
const desk = h('button', 'dicon');
desk.dataset.open = 'games';
desk.append(icon('g-folder'), h('span', '', 'Games'));
desk.firstChild.removeAttribute('class');
$('#icons')?.append(desk);
desk.addEventListener('click', e => {
  if (e.pointerType === 'touch' || e.detail === 0) openFolder();
});
desk.addEventListener('dblclick', openFolder);

// Start menu: "Games ▸" with a cascading submenu.
const smItems = $('#start-menu .sm-items');
if (smItems) {
  const entry = h('button', 'g-sm-entry');
  entry.setAttribute('aria-haspopup', 'menu');
  entry.append(icon('g-folder'), h('span', '', 'Games'), h('span', 'g-sm-arrow', '▸'));
  smItems.insertBefore(entry, smItems.querySelector('hr'));
  const sub = () => {
    const r = entry.getBoundingClientRect();
    openMenu(
      [
        ...GAMES.map(d => ({ label: d.name, act: () => launch(d.id) })),
        { sep: true },
        { label: 'Games folder', act: openFolder },
      ],
      r.right - 3,
      r.top - 3,
    );
  };
  entry.addEventListener('click', e => {
    e.stopPropagation(); // keep the Start menu open while the submenu is up
    sub();
  });
  entry.addEventListener('pointerenter', e => e.pointerType === 'mouse' && sub());
  smItems.addEventListener('pointerover', e => {
    const b = e.target.closest('button');
    if (b && b !== entry && isMenuOpen()) closeMenus();
  });
}
