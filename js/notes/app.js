// The Notes window: a list and an editor, with color tags, pins, search and a
// reminder per note. js/notes/index.js loads this the first time Notes opens.
// It takes the name of the era's note app: Notepad on Windows 9x, Sticky Notes
// on XP and later, Stickies on the Mac.
import { h, debounce } from '../core/util.js';
import * as wm from '../core/wm.js';
import * as store from './store.js';
import { allowNotifications, notificationState } from './remind.js';
import { moveToBin, binName } from '../core/trash.js';

const eraName = () => ({ chicago: 'Notepad', amp: 'Notepad', mac: 'Stickies' })[document.documentElement.dataset.look] || 'Sticky Notes';
const pad = n => String(n).padStart(2, '0');
const localInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const when = at => new Date(at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const firstLine = n => n.title.trim() || n.body.trim().split('\n')[0].slice(0, 60) || 'Untitled note';

function icon(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
function button(cls, label, title) {
  const b = h('button', cls, label);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

// ---------------------------------------------------------------------------
// Window

const win = h('section', 'win dialog nt is-min');
win.id = 'w-notes';
win.setAttribute('aria-label', 'Notes');
const bar = h('header', 'titlebar');
const tbIcon = h('span', 'tb-icon');
tbIcon.append(icon('n-notes'));
const tbTitle = h('span', 'tb-title', eraName());
const tbBtns = h('span', 'tb-btns');
const closeBtn = h('button');
closeBtn.dataset.wm = 'close';
closeBtn.setAttribute('aria-label', 'Close');
tbBtns.append(closeBtn);
bar.append(tbIcon, tbTitle, tbBtns);
const body = h('div', 'win-body nt-body');
win.append(bar, body);
document.getElementById('desktop').append(win);
wm.register(win, { title: eraName(), icon: 'n-notes', dialog: true });

new MutationObserver(() => {
  tbTitle.textContent = eraName();
  wm.setTitle(win, eraName());
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });

// toolbar
const tools = h('div', 'nt-tools');
const newBtn = button('btn nt-new', '+ New note');
const search = h('input', 'nt-search');
Object.assign(search, { type: 'text', placeholder: 'Search notes', spellcheck: false, maxLength: 100 });
search.setAttribute('aria-label', 'Search notes');
tools.append(newBtn, search);

// list + editor
const main = h('div', 'nt-main');
const list = h('div', 'nt-list');
list.setAttribute('role', 'listbox');
list.setAttribute('aria-label', 'Notes');
const editor = h('div', 'nt-editor');
const empty = h('p', 'nt-empty', 'Pick a note, or start a new one.');

const back = button('btn nt-back', '‹ Notes');
const titleIn = h('input', 'nt-title');
Object.assign(titleIn, { type: 'text', placeholder: 'Title', maxLength: 200 });
titleIn.setAttribute('aria-label', 'Note title');
const head = h('div', 'nt-head');
head.append(back, titleIn);
const text = h('textarea', 'nt-text');
text.placeholder = 'Write something…';
text.maxLength = 20000;
text.setAttribute('aria-label', 'Note');

const swatches = h('div', 'nt-colors');
swatches.setAttribute('role', 'radiogroup');
swatches.setAttribute('aria-label', 'Note color');
for (const [name, hex] of Object.entries(store.COLORS)) {
  const s = button('nt-swatch', '', `${name[0].toUpperCase()}${name.slice(1)}`);
  s.dataset.color = name;
  s.style.setProperty('--sw', hex);
  s.setAttribute('role', 'radio');
  s.setAttribute('aria-label', name);
  swatches.append(s);
}
const pin = button('btn nt-pin', '★ Pin', 'Keep this note at the top');
const look = h('div', 'nt-row');
look.append(swatches, pin);

const remindRow = h('div', 'nt-row nt-remind');
const whenIn = h('input', 'nt-when');
whenIn.type = 'datetime-local';
whenIn.setAttribute('aria-label', 'Reminder time');
const setBtn = button('btn', 'Remind me');
const clearBtn = button('btn', 'No reminder');
remindRow.append(h('span', 'nt-label', '⏰'), whenIn, setBtn, clearBtn);
const remindNote = h('p', 'nt-hint');

const del = button('btn nt-del', 'Delete note');
const delRow = h('div', 'nt-row nt-end');
delRow.append(del);

editor.append(empty, head, text, look, remindRow, remindNote, delRow);
main.append(list, editor);
const status = h('div', 'nt-status');
body.append(tools, main, status);

// ---------------------------------------------------------------------------
// State

let current = null;

function renderList() {
  const q = search.value.trim().toLowerCase();
  const notes = store.sorted().filter(n => !q || `${n.title}\n${n.body}`.toLowerCase().includes(q));
  list.replaceChildren(
    ...notes.map(n => {
      const item = button('nt-item');
      item.dataset.id = n.id;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', n.id === current);
      item.style.setProperty('--note', store.COLORS[n.color]);
      const meta = n.remind && !n.remind.done ? `⏰ ${when(n.remind.at)}` : new Date(n.updated).toLocaleDateString();
      item.append(h('b', '', `${n.pinned ? '★ ' : ''}${firstLine(n)}`), h('small', '', meta));
      return item;
    }),
  );
  if (!notes.length) list.append(h('p', 'nt-none', q ? 'No notes match.' : 'No notes yet.'));
  const count = store.all().length;
  status.textContent = `${count} note${count === 1 ? '' : 's'} · saved in this browser`;
}

function fill() {
  const n = current && store.get(current);
  editor.classList.toggle('blank', !n);
  body.classList.toggle('editing', !!n);
  if (!n) return;
  editor.style.setProperty('--note', store.COLORS[n.color]);
  if (document.activeElement !== titleIn) titleIn.value = n.title;
  if (document.activeElement !== text) text.value = n.body;
  for (const s of swatches.children) s.setAttribute('aria-checked', s.dataset.color === n.color);
  pin.setAttribute('aria-pressed', n.pinned);
  const pending = n.remind && !n.remind.done;
  if (document.activeElement !== whenIn) whenIn.value = pending ? localInput(new Date(n.remind.at)) : '';
  clearBtn.disabled = !pending;
  remindNote.textContent = pending ? reminderHint(n.remind.at) : '';
  del.textContent = `Move to ${binName()}`;
}

function reminderHint(at) {
  const where = {
    granted: 'here and as a system notification',
    denied: 'here in RetroAmp (system notifications are blocked in your browser settings)',
    default: 'here in RetroAmp',
    unsupported: 'here in RetroAmp',
  }[notificationState()];
  return `Reminder set for ${when(at)}. It pops up ${where}, as long as RetroAmp is open in a tab.`;
}

function select(id) {
  current = id;
  renderList();
  fill();
}

export function open(id) {
  wm.show(win, { center: !wm.isOpen(win) });
  if (id && store.get(id)) select(id);
  else if (!current || !store.get(current)) select(store.sorted()[0]?.id ?? null);
  else fill();
}

// ---------------------------------------------------------------------------
// Events

store.onChange(() => {
  if (current && !store.get(current)) current = null; // deleted in another tab
  renderList();
  fill();
});

newBtn.addEventListener('click', () => {
  search.value = '';
  select(store.create().id);
  titleIn.focus();
});
search.addEventListener('input', renderList);
list.addEventListener('click', e => {
  const item = e.target.closest('.nt-item');
  if (item) select(item.dataset.id);
});
back.addEventListener('click', () => {
  current = null;
  renderList();
  fill();
});

const saveText = debounce(() => current && store.update(current, { title: titleIn.value, body: text.value }), 400);
titleIn.addEventListener('input', saveText);
text.addEventListener('input', saveText);

swatches.addEventListener('click', e => {
  const s = e.target.closest('.nt-swatch');
  if (s && current) store.update(current, { color: s.dataset.color });
});
pin.addEventListener('click', () => {
  const n = current && store.get(current);
  if (n) store.update(current, { pinned: !n.pinned });
});

setBtn.addEventListener('click', async () => {
  if (!current) return;
  if (!whenIn.value) {
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    soon.setMinutes(0, 0, 0);
    whenIn.value = localInput(soon);
  }
  const at = new Date(whenIn.value).getTime();
  if (!Number.isFinite(at) || at < Date.now() + 30_000) {
    remindNote.textContent = 'Pick a time at least a minute from now.';
    return;
  }
  const id = current;
  store.update(id, { remind: { at, done: false } }, { touch: false });
  await allowNotifications(); // asks only the first time, and only from this click
  if (current === id) remindNote.textContent = reminderHint(at);
});
clearBtn.addEventListener('click', () => current && store.update(current, { remind: null }, { touch: false }));

del.addEventListener('click', () => {
  const n = current && store.get(current);
  if (!n) return;
  moveToBin('note', [{ name: firstLine(n), data: { ...n } }], () => {
    store.remove(n.id);
    if (current === n.id) current = null;
    select(store.sorted()[0]?.id ?? null);
  });
});

renderList();
fill();
