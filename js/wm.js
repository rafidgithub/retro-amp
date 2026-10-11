// Tiny window manager: z-order and focus, dragging with Winamp-style edge
// snapping and docking, minimize/restore with a caption-zoom animation, taskbar.
import { $, clamp } from './util.js';

const SNAP = 10;
const TOUCH = 3;
const desktop = $('#desktop');
const tasks = $('#tasks');
const mobile = matchMedia('(max-width: 720px)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const wins = new Map(); // el -> { task, dialog, main }
let z = 10;
let changed = () => {};

export const isMobile = () => mobile.matches;
export const onChange = fn => {
  changed = fn;
};
export const isOpen = el => !el.classList.contains('is-min');
const openWins = () => [...wins.keys()].filter(isOpen);

export function register(el, { title, icon, dialog = false, main = false }) {
  const task = document.createElement('button');
  task.className = 'task';
  task.append(svgIcon(icon), document.createElement('span'));
  task.lastChild.textContent = title;
  task.addEventListener('click', () => toggle(el));
  tasks.append(task);
  wins.set(el, { task, dialog, main });

  const bar = el.querySelector('.titlebar');
  el.addEventListener('pointerdown', () => focus(el));
  bar.addEventListener('pointerdown', e => drag(e, el));
  bar.addEventListener('dblclick', e => {
    if (!e.target.closest('button') && el.querySelector('[data-wm=shade]')) toggleShade(el);
  });
  for (const b of el.querySelectorAll('[data-wm]')) {
    b.addEventListener('click', () => (b.dataset.wm === 'shade' ? toggleShade(el) : hide(el)));
  }
  sync();
}

export function setTitle(el, text) {
  const w = wins.get(el);
  if (w) w.task.lastChild.textContent = text;
}

export function focus(el) {
  for (const w of wins.keys()) w.classList.toggle('active', w === el);
  if (Number(el.style.zIndex) !== z) el.style.zIndex = ++z;
  sync();
}

export function show(el, { center = false } = {}) {
  if (!isOpen(el)) {
    el.classList.remove('is-min');
    // windows that were minimized along with the main window come back with it
    const w = wins.get(el);
    for (const f of w.followers || []) f.classList.remove('is-min');
    w.followers = null;
    if (center) place(el, (desktop.clientWidth - el.offsetWidth) / 2, (desktop.clientHeight - el.offsetHeight) / 3);
    else keepOnScreen(el);
    zoom(wins.get(el).task, el.querySelector('.titlebar'));
  }
  focus(el);
  changed();
}

export function hide(el) {
  if (!isOpen(el)) return;
  const w = wins.get(el);
  zoom(el.querySelector('.titlebar'), w.task);
  // Minimizing the main window takes its docked windows along, like Winamp,
  // so no stray playlist or video window is left behind on the desktop.
  w.followers = w.main ? docked(el).map(r => r.el) : null;
  for (const f of [el, ...(w.followers || [])]) {
    f.classList.add('is-min');
    f.classList.remove('active');
  }
  const next = openWins().sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
  if (next) focus(next);
  sync();
  changed();
}

export const toggle = el => (isOpen(el) && el.classList.contains('active') ? hide(el) : show(el));

// Window shade collapses to the title bar; docked windows slide up to stay attached.
export function toggleShade(el) {
  const rels = docked(el);
  el.classList.toggle('shaded');
  redock(rels);
  changed();
}

function sync() {
  for (const [el, w] of wins) {
    const on = isOpen(el) && el.classList.contains('active');
    w.task.hidden = w.dialog && !isOpen(el);
    w.task.classList.toggle('active', on);
    w.task.setAttribute('aria-pressed', on);
  }
}

// Windows 9x "caption zoom": a title-bar ghost flies between window and taskbar.
function zoom(fromEl, toEl) {
  if (calm.matches || mobile.matches) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const ghost = document.createElement('div');
  ghost.className = 'zoom-ghost';
  document.body.append(ghost);
  const frame = r => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const done = () => ghost.remove();
  ghost.animate([frame(a), frame(b)], { duration: 230, easing: 'ease-in' }).finished.then(done, done);
}

// ---------------------------------------------------------------------------
// Positioning, snapping, docking

const box = el => {
  const l = el.offsetLeft;
  const t = el.offsetTop;
  return { l, t, r: l + el.offsetWidth, b: t + el.offsetHeight };
};

export function place(el, x, y) {
  if (mobile.matches) return;
  const W = desktop.clientWidth;
  const H = desktop.clientHeight;
  el.style.left = `${Math.round(clamp(x, 60 - el.offsetWidth, W - 60))}px`;
  el.style.top = `${Math.round(clamp(y, 0, Math.max(0, H - 20)))}px`;
}

const keepOnScreen = el => place(el, el.offsetLeft, el.offsetTop);
export const keepAllOnScreen = () => openWins().forEach(keepOnScreen);

function side(a, b) {
  const overlapX = b.l < a.r && b.r > a.l;
  const overlapY = b.t < a.b && b.b > a.t;
  if (overlapX && Math.abs(b.t - a.b) <= TOUCH) return 'bottom';
  if (overlapX && Math.abs(b.b - a.t) <= TOUCH) return 'top';
  if (overlapY && Math.abs(b.l - a.r) <= TOUCH) return 'right';
  if (overlapY && Math.abs(b.r - a.l) <= TOUCH) return 'left';
  return null;
}

// Everything chained to `root` by touching edges, in breadth-first order.
export function docked(root) {
  const rels = [];
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const anchor = queue.shift();
    const a = box(anchor);
    for (const el of openWins()) {
      if (seen.has(el) || wins.get(el).dialog) continue;
      const b = box(el);
      const s = side(a, b);
      if (!s) continue;
      seen.add(el);
      queue.push(el);
      rels.push({ el, anchor, side: s, off: s === 'top' || s === 'bottom' ? b.l - a.l : b.t - a.t });
    }
  }
  return rels;
}

// Re-attach docked windows after their anchors changed size (skin switch).
export function redock(rels) {
  if (mobile.matches) return;
  for (const { el, anchor, side: s, off } of rels) {
    const a = box(anchor);
    const pos = {
      bottom: [a.l + off, a.b],
      top: [a.l + off, a.t - el.offsetHeight],
      right: [a.r, a.t + off],
      left: [a.l - el.offsetWidth, a.t + off],
    }[s];
    el.style.left = `${pos[0]}px`;
    el.style.top = `${pos[1]}px`;
  }
}

function snap(el, x, y, others) {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const xs = [0, desktop.clientWidth - w];
  const ys = [0, desktop.clientHeight - h];
  for (const o of others) {
    const { l, t, r, b } = box(o);
    if (y < b + SNAP && y + h > t - SNAP) xs.push(r, l - w); // side by side
    if (x < r + SNAP && x + w > l - SNAP) ys.push(b, t - h); // stacked
    if (Math.abs(y - b) <= SNAP || Math.abs(y + h - t) <= SNAP) xs.push(l, r - w); // align stacked edges
    if (Math.abs(x - r) <= SNAP || Math.abs(x + w - l) <= SNAP) ys.push(t, b - h); // align side-by-side edges
  }
  const nearest = (v, list) => list.reduce((best, c) => (Math.abs(c - v) < Math.abs(best - v) ? c : best), Infinity);
  const nx = nearest(x, xs);
  const ny = nearest(y, ys);
  return [Math.abs(nx - x) <= SNAP ? nx : x, Math.abs(ny - y) <= SNAP ? ny : y];
}

function drag(e, el) {
  if (e.button !== 0 || mobile.matches || e.target.closest('button, input')) return;
  e.preventDefault();
  const bar = e.currentTarget;
  bar.setPointerCapture(e.pointerId);
  const sx = e.clientX;
  const sy = e.clientY;
  const ox = el.offsetLeft;
  const oy = el.offsetTop;
  // Dragging the main window carries its docked windows along, like Winamp.
  const riders = wins.get(el).main ? docked(el).map(r => r.el) : [];
  const offsets = riders.map(r => [r, r.offsetLeft - ox, r.offsetTop - oy]);
  const others = openWins().filter(o => o !== el && !riders.includes(o));
  const move = ev => {
    const [x, y] = snap(el, ox + ev.clientX - sx, oy + ev.clientY - sy, others);
    place(el, x, y);
    for (const [r, dx, dy] of offsets) {
      r.style.left = `${el.offsetLeft + dx}px`;
      r.style.top = `${el.offsetTop + dy}px`;
    }
  };
  const up = () => {
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', up);
    bar.removeEventListener('pointercancel', up);
    changed();
  };
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', up);
  bar.addEventListener('pointercancel', up);
}

// ---------------------------------------------------------------------------
// Persistence + small screens

export function layout() {
  const out = {};
  for (const [el, w] of wins) {
    if (w.dialog) continue;
    out[el.id] = {
      x: el.offsetLeft,
      y: el.offsetTop,
      open: isOpen(el),
      shaded: el.classList.contains('shaded'),
      h: el.style.height || undefined,
    };
  }
  return out;
}

export function restore(saved) {
  for (const [el, w] of wins) {
    const s = saved?.[el.id];
    if (!s || w.dialog) continue;
    if (s.h) el.style.height = s.h;
    el.classList.toggle('is-min', s.open === false);
    el.classList.toggle('shaded', !!s.shaded);
    place(el, s.x, s.y);
  }
  sync();
}

// On phones the windows stack in a column; shrink any that are too wide.
export function fit() {
  for (const [el, w] of wins) {
    if (w.dialog) continue;
    el.style.zoom = '';
    if (!mobile.matches || !el.offsetWidth) continue;
    const room = window.innerWidth - 16;
    if (el.offsetWidth > room) el.style.zoom = (room / el.offsetWidth).toFixed(3);
  }
}

function svgIcon(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function tick() {
  $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
tick();
setInterval(tick, 10_000);
