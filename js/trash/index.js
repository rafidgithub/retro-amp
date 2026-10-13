// The Recycle Bin window ("Trash" on the Mac skins): desktop icon that shows when
// it has something in it, a Start-menu entry, and the list where things come back
// from or go for good. The bin itself (what's in it, the 7-day rule, the
// confirmations) is js/core/trash.js. This module loads last, after every kind
// of thing has registered, so it runs the first sweep.
import { $, h } from '../core/util.js';
import * as wm from '../core/wm.js';
import * as bin from '../core/trash.js';

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `
  <symbol id="t-bin" viewBox="0 0 32 32"><path d="M8 9h16l-1.6 19H9.6z" fill="#e3eaf0" stroke="#333"/><path d="M6 6.5h20v3H6z" fill="#b9c7d4" stroke="#333"/><path d="M12.5 12l.8 13M16 12v13M19.5 12l-.8 13" stroke="#7d8d9c" stroke-width="1.4"/></symbol>
  <symbol id="t-bin-full" viewBox="0 0 32 32"><path d="M9 7l3.5-4.5 3 3.2L19.8 2 23 6.6z" fill="#fff" stroke="#333"/><path d="M14 6.5l6-2.5 1 2.5" fill="#ffe066" stroke="#333"/><path d="M8 9h16l-1.6 19H9.6z" fill="#e3eaf0" stroke="#333"/><path d="M6 6.5h20v3H6z" fill="#b9c7d4" stroke="#333"/><path d="M12.5 12l.8 13M16 12v13M19.5 12l-.8 13" stroke="#7d8d9c" stroke-width="1.4"/></symbol>
`;
document.body.prepend(sprite);

function icon(id, cls = 'ico') {
  const svg = document.createElementNS(NS, 'svg');
  if (cls) svg.setAttribute('class', cls);
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}
const binIcon = () => (bin.all().length ? 't-bin-full' : 't-bin');
const GLYPH = { song: 'i-note', note: 'n-notes', photo: 'c-gallery' };
const deletedOn = at => new Date(at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// ---------------------------------------------------------------------------
// Window

const win = h('section', 'win dialog rb is-min');
win.id = 'w-trash';
win.setAttribute('aria-label', 'Recycle Bin');
const bar = h('header', 'titlebar');
const tbIcon = h('span', 'tb-icon');
tbIcon.append(icon('t-bin'));
const tbTitle = h('span', 'tb-title', bin.binName());
const tbBtns = h('span', 'tb-btns');
const closeBtn = h('button');
closeBtn.dataset.wm = 'close';
closeBtn.setAttribute('aria-label', 'Close');
tbBtns.append(closeBtn);
bar.append(tbIcon, tbTitle, tbBtns);

const body = h('div', 'win-body rb-body');
const tools = h('div', 'rb-tools');
const restoreBtn = h('button', 'btn', 'Restore');
const forgetBtn = h('button', 'btn', 'Delete forever');
const allBtn = h('button', 'btn', 'Select all');
const emptyBtn = h('button', 'btn rb-empty-btn', 'Empty');
tools.append(restoreBtn, forgetBtn, allBtn, h('span', 'rb-gap'), emptyBtn);
const list = h('div', 'rb-list');
list.setAttribute('role', 'listbox');
list.setAttribute('aria-multiselectable', 'true');
list.setAttribute('aria-label', 'Deleted items');
const status = h('div', 'rb-status');
body.append(tools, list, status);
win.append(bar, body);
document.getElementById('desktop').append(win);
wm.register(win, { title: bin.binName(), icon: 't-bin', dialog: true });

const selected = new Set();

function render() {
  const items = bin.all();
  for (const id of selected) if (!items.some(i => i.id === id)) selected.delete(id);
  list.replaceChildren(
    ...items.map(item => {
      const row = h('button', 'rb-item');
      row.dataset.id = item.id;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', selected.has(item.id));
      const left = item.session ? 'until you close RetroAmp' : `${bin.daysLeft(item)} day${bin.daysLeft(item) === 1 ? '' : 's'} left`;
      const text = h('span', 'rb-text');
      const kind = bin.kindName(item);
      text.append(h('b', '', item.name), h('small', '', `${kind[0].toUpperCase()}${kind.slice(1)} · deleted ${deletedOn(item.at)} · ${left}`));
      row.append(h('span', 'rb-check'), icon(GLYPH[item.kind] || 't-bin', 'rb-kind'), text);
      return row;
    }),
  );
  if (!items.length) list.append(h('p', 'rb-none', `The ${bin.binName()} is empty.`));
  restoreBtn.disabled = forgetBtn.disabled = !selected.size;
  allBtn.disabled = emptyBtn.disabled = !items.length;
  allBtn.textContent = items.length && selected.size === items.length ? 'Select none' : 'Select all';
  emptyBtn.textContent = `Empty ${bin.binName()}`;
  status.textContent = `${items.length} item${items.length === 1 ? '' : 's'} · deleted for good ${bin.KEEP_DAYS} days after they were moved here`;
  syncIcons();
}

list.addEventListener('click', e => {
  const row = e.target.closest('.rb-item');
  if (!row) return;
  const id = row.dataset.id;
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  render();
});
list.addEventListener('dblclick', e => {
  const row = e.target.closest('.rb-item');
  if (row) bin.restore([row.dataset.id]);
});
allBtn.addEventListener('click', () => {
  const items = bin.all();
  if (selected.size === items.length) selected.clear();
  else items.forEach(i => selected.add(i.id));
  render();
});
restoreBtn.addEventListener('click', () => bin.restore([...selected]));
forgetBtn.addEventListener('click', () => bin.deleteForever([...selected]));
emptyBtn.addEventListener('click', () => bin.empty());

function open() {
  render();
  wm.show(win, { center: !wm.isOpen(win) });
}

// ---------------------------------------------------------------------------
// Desktop icon + Start menu: empty or full, "Recycle Bin" or "Trash"

const desk = h('button', 'dicon');
desk.dataset.open = 'trash';
const deskLabel = h('span', '', bin.binName());
desk.append(icon('t-bin', ''), deskLabel);
$('#icons')?.append(desk);
desk.addEventListener('click', e => {
  if (e.pointerType === 'touch' || e.detail === 0) open();
});
desk.addEventListener('dblclick', open);

const smEntry = h('button');
const smLabel = document.createTextNode(bin.binName());
smEntry.append(icon('t-bin'), smLabel);
smEntry.addEventListener('click', open);
const smItems = $('#start-menu .sm-items');
smItems?.insertBefore(smEntry, smItems.querySelector('hr'));

function syncIcons() {
  const id = `#${binIcon()}`;
  for (const use of [desk, smEntry, tbIcon].map(el => el.querySelector('use'))) use?.setAttribute('href', id);
  const name = bin.binName();
  deskLabel.textContent = smLabel.textContent = tbTitle.textContent = name;
  wm.setTitle(win, name);
  win.setAttribute('aria-label', name);
}
new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });
bin.onChange(render);

// ---------------------------------------------------------------------------
// The 7-day rule: at launch, every hour, and whenever RetroAmp comes back to the front

const sweep = () => bin.sweep().catch(() => {});
sweep();
setInterval(sweep, 60 * 60 * 1000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && sweep());
render();
