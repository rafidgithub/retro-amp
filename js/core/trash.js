// Recycle Bin. Deleting a song, note or photo moves it here first. It can be
// restored for 7 days, then it's deleted for good (sweep(), run at launch and
// every hour by js/trash/index.js). Every move, restore and permanent delete asks
// first (core/confirm.js). Each kind registers how to put an item back and how to
// really delete it: songs in main.js, notes in notes/index.js, photos in
// camera/index.js.
//
// Item: { id, kind, name, at (deleted, ms), data, session }. Session items (your
// own audio files, which only live in memory) are never saved and vanish when
// RetroAmp closes.
import { storageFrozen } from './util.js';
import { ask } from './confirm.js';

const KEY = 'retroamp:trash';
export const KEEP_DAYS = 7;
const KEEP = KEEP_DAYS * 864e5;

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw.filter(i => i && i.id && i.kind && Number.isFinite(i.at)) : [];
  } catch {
    return [];
  }
};
let saved = read();
let session = [];
const kinds = new Map();
const listeners = new Set();

function save() {
  if (!storageFrozen()) {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // private mode or quota: the bin lasts for this visit
    }
  }
  listeners.forEach(fn => fn());
}
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  saved = read();
  listeners.forEach(fn => fn());
});

export const binName = () => (document.documentElement.dataset.look === 'mac' ? 'Trash' : 'Recycle Bin');
export const onChange = fn => listeners.add(fn);
export const all = () => [...saved, ...session].sort((a, b) => b.at - a.at);
export const daysLeft = item => Math.max(0, Math.ceil((item.at + KEEP - Date.now()) / 864e5));
export const kindName = item => kinds.get(item.kind)?.noun || item.kind;

// handlers: { noun, plural, restore(item), purge(item) }
export function registerKind(kind, handlers) {
  kinds.set(kind, handlers);
}

const newId = () => crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
const count = (n, noun, plural) => (n === 1 ? `1 ${noun}` : `${n} ${plural}`);
const describe = list => {
  if (list.length === 1) return `“${list[0].name}”`;
  const k = new Set(list.map(i => i.kind));
  if (k.size === 1) {
    const h = kinds.get(list[0].kind);
    return count(list.length, h?.noun || 'item', h?.plural || 'items');
  }
  return `${list.length} items`;
};

// Ask, then move things of one kind to the bin. things: [{ name, data, session }].
// remove() takes them out of their own list once the answer is yes.
export async function moveToBin(kind, things, remove) {
  if (!things.length) return false;
  const h = kinds.get(kind);
  const what = things.length === 1 ? `“${things[0].name}”` : count(things.length, h.noun, h.plural);
  const it = things.length === 1 ? 'it' : 'them';
  const local = things.some(t => t.session);
  const ok = await ask({
    title: `Move to ${binName()}`,
    message: `Move ${what} to the ${binName()}?`,
    detail: local
      ? `Your own audio files can be restored until you close RetroAmp (they only live in memory). Everything else stays restorable for ${KEEP_DAYS} days.`
      : `You can restore ${it} from the ${binName()} for ${KEEP_DAYS} days. After that ${it === 'it' ? 'it’s' : 'they’re'} deleted for good.`,
    ok: `Move to ${binName()}`,
  });
  if (!ok) return false;
  await remove();
  const at = Date.now();
  for (const t of things) {
    const item = { id: newId(), kind, name: String(t.name || 'Untitled').slice(0, 200), at, data: t.data };
    if (t.session) session.push({ ...item, session: true });
    else saved.push(item);
  }
  save();
  return true;
}

const take = ids => {
  const set = new Set(ids);
  const list = all().filter(i => set.has(i.id));
  saved = saved.filter(i => !set.has(i.id));
  session = session.filter(i => !set.has(i.id));
  return list;
};

export async function restore(ids) {
  const list = all().filter(i => ids.includes(i.id) && kinds.get(i.kind));
  if (!list.length) return false;
  const ok = await ask({
    title: `Restore from ${binName()}`,
    message: `Restore ${describe(list)}?`,
    detail: 'Songs go back into the playlist, notes into Notes and photos into the Gallery.',
    ok: 'Restore',
    glyph: 'i-info',
  });
  if (!ok) return false;
  for (const item of take(list.map(i => i.id))) {
    try {
      await kinds.get(item.kind).restore(item);
    } catch {
      // couldn't put it back: keep it in the bin
      (item.session ? session : saved).push(item);
    }
  }
  save();
  return true;
}

async function purgeItems(list) {
  for (const item of take(list.map(i => i.id))) {
    try {
      await kinds.get(item.kind)?.purge(item);
    } catch {
      // already gone from its own storage
    }
  }
  save();
}

export async function deleteForever(ids) {
  const list = all().filter(i => ids.includes(i.id));
  if (!list.length) return false;
  const ok = await ask({
    title: 'Delete forever',
    message: `Delete ${describe(list)} forever?`,
    detail: 'This can’t be undone.',
    ok: 'Delete forever',
    danger: true,
  });
  if (ok) await purgeItems(list);
  return ok;
}

export async function empty() {
  const list = all();
  if (!list.length) return false;
  const ok = await ask({
    title: `Empty ${binName()}`,
    message: `Delete all ${list.length === 1 ? '1 item' : `${list.length} items`} in the ${binName()} forever?`,
    detail: 'This can’t be undone.',
    ok: `Empty ${binName()}`,
    danger: true,
  });
  if (ok) await purgeItems(list);
  return ok;
}

// The 7-day rule, applied without asking: that's what moving to the bin agreed to.
// Kinds that haven't registered yet (a module failed to load) wait for next time.
export async function sweep() {
  const old = all().filter(i => Date.now() - i.at > KEEP && kinds.has(i.kind));
  if (old.length) await purgeItems(old);
}
