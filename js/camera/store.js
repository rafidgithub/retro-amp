// Photo gallery storage: IndexedDB in this browser only, never uploaded.
// If IndexedDB is blocked (some private modes), photos live in memory until
// the tab closes and `persistent` is false.
//
// Photo: { id, at, filter, w, h, type, blob, thumb, trashed? }
// A photo in the Recycle Bin keeps its record with trashed: <ms>; list() skips it.

const DB = 'retroamp-camera';
const STORE = 'photos';

let db = null;
let memory = null; // fallback when IndexedDB is unavailable
let nextId = 1;

const opened = (async () => {
  try {
    db = await new Promise((resolve, reject) => {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
  } catch {
    memory = [];
  }
})();

export const isPersistent = async () => {
  await opened;
  return !!db;
};

// Resolves once the transaction has committed, with the request's result.
function tx(mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r.result);
    t.onerror = t.onabort = () => reject(t.error || new Error('IndexedDB transaction failed'));
  });
}

// Newest first, without the ones in the Recycle Bin.
export async function list() {
  await opened;
  const all = memory ? memory.slice() : await tx('readonly', s => s.getAll());
  return all.filter(p => !p.trashed).sort((a, b) => b.at - a.at || b.id - a.id);
}

async function setTrashed(id, trashed) {
  await opened;
  if (memory) {
    const p = memory.find(x => x.id === id);
    if (p) p.trashed = trashed;
    return;
  }
  const p = await tx('readonly', s => s.get(id));
  if (!p) throw new Error('photo not found');
  await tx('readwrite', s => s.put({ ...p, trashed }));
}
export const trash = id => setTrashed(id, Date.now());
export const untrash = id => setTrashed(id, 0);

export async function add(photo) {
  await opened;
  if (memory) {
    const p = { ...photo, id: nextId++ };
    memory.push(p);
    return p;
  }
  const id = await tx('readwrite', s => s.add(photo));
  return { ...photo, id };
}

export async function remove(id) {
  await opened;
  if (memory) {
    memory = memory.filter(p => p.id !== id);
    return;
  }
  await tx('readwrite', s => s.delete(id));
}
