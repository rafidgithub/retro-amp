// Notes and their reminders, kept only in this browser (localStorage). The Notes
// window (app.js) and the reminder clock (remind.js) share this one copy, and
// another tab's edits arrive through the storage event.
import { storageFrozen } from '../core/util.js';

const KEY = 'retroamp:notes';
export const COLORS = { yellow: '#ffe066', green: '#b2f2bb', blue: '#a5d8ff', pink: '#fcc2d7', purple: '#d0bfff', gray: '#dee2e6' };

const clean = n => ({
  id: String(n.id),
  title: String(n.title ?? '').slice(0, 200),
  body: String(n.body ?? '').slice(0, 20000),
  color: COLORS[n.color] ? n.color : 'yellow',
  pinned: !!n.pinned,
  created: Number(n.created) || Date.now(),
  updated: Number(n.updated) || Date.now(),
  remind: n.remind && Number.isFinite(Number(n.remind.at)) ? { at: Number(n.remind.at), done: !!n.remind.done } : null,
});

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw.filter(n => n && n.id).map(clean) : [];
  } catch {
    return []; // storage blocked: notes last for this visit only
  }
}

let notes = read();
const listeners = new Set();
const changed = () => listeners.forEach(fn => fn());

function save() {
  if (!storageFrozen()) {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch {
      // private mode or quota: keep going in memory
    }
  }
  changed();
}

window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  notes = read();
  changed();
});

const newId = () => crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export const onChange = fn => listeners.add(fn);
export const all = () => notes;
export const get = id => notes.find(n => n.id === id);
// pinned first, then most recently edited
export const sorted = () => [...notes].sort((a, b) => b.pinned - a.pinned || b.updated - a.updated);

export function create() {
  const n = clean({ id: newId() });
  notes.unshift(n);
  save();
  return n;
}

// touch: false keeps the note's place in the list (reminder bookkeeping isn't an edit)
export function update(id, patch, { touch = true } = {}) {
  const i = notes.findIndex(n => n.id === id);
  if (i < 0) return;
  notes[i] = clean({ ...notes[i], ...patch, updated: touch ? Date.now() : notes[i].updated });
  save();
}

export function remove(id) {
  notes = notes.filter(n => n.id !== id);
  save();
}

// From the Recycle Bin: the note exactly as it was deleted.
export function restore(note) {
  if (!note?.id || get(note.id)) return;
  notes.push(clean(note));
  save();
}
