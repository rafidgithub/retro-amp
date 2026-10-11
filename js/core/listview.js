// Win9x-style list view: column header, click / Ctrl / Shift selection,
// arrow-key navigation, Enter or double-click to activate, Delete to remove,
// and (with onMove) drag-to-reorder.
import { fmtTime, cleanArtist } from './util.js';

export class ListView {
  constructor(el, { columns, empty = '', onActivate, onDelete, onMove }) {
    Object.assign(this, { el, columns, empty, onActivate, onDelete, onMove });
    this.items = [];
    this.sel = new Set();
    this.anchor = -1;
    this.focus = -1;
    this.current = -1;
    el.addEventListener('pointerdown', e => this.press(e));
    el.addEventListener('dblclick', e => {
      const i = this.indexAt(e);
      if (i >= 0) onActivate?.(i);
    });
    el.addEventListener('keydown', e => this.key(e));
  }

  get selected() {
    return [...this.sel].sort((a, b) => a - b);
  }

  render(items, current = this.current) {
    this.items = items;
    this.current = current;
    this.sel = new Set([...this.sel].filter(i => i < items.length));
    const head = document.createElement('div');
    head.className = 'lv-head';
    for (const c of this.columns) head.append(cell(`c-${c.key}`, c.label || ''));
    const rows = items.map((it, i) => {
      const row = document.createElement('div');
      row.className = 'lv-row';
      row.dataset.i = i;
      row.setAttribute('role', 'option');
      row.title = it.channel ? `${it.title}\n${cleanArtist(it.channel)}` : it.title;
      for (const c of this.columns) row.append(cell(`c-${c.key}`, this.value(c.key, it, i)));
      return row;
    });
    this.el.replaceChildren(head, ...rows);
    if (!items.length && this.empty) this.el.append(typeof this.empty === 'function' ? this.empty() : cell('lv-empty', this.empty));
    this.paint();
  }

  value(key, it, i) {
    if (key === 'num') return `${i + 1}.`;
    if (key === 'time') return it.seconds ? fmtTime(it.seconds) : '';
    if (key === 'channel') return cleanArtist(it.channel);
    return it[key] || '';
  }

  setCurrent(i) {
    this.current = i;
    this.paint();
  }

  select(indices) {
    this.sel = new Set(indices);
    this.paint();
  }

  paint() {
    for (const row of this.el.querySelectorAll('.lv-row')) {
      const i = Number(row.dataset.i);
      const on = this.sel.has(i);
      row.classList.toggle('sel', on);
      row.classList.toggle('current', i === this.current);
      row.classList.toggle('bad', !!this.items[i]?.bad);
      row.setAttribute('aria-selected', on);
    }
  }

  indexAt(e) {
    const row = e.target.closest?.('.lv-row');
    return row ? Number(row.dataset.i) : -1;
  }

  press(e) {
    const i = this.indexAt(e);
    if (i < 0) return;
    if (e.shiftKey && this.anchor >= 0) {
      this.sel = new Set(range(this.anchor, i));
    } else if (e.ctrlKey || e.metaKey) {
      if (this.sel.has(i)) this.sel.delete(i);
      else this.sel.add(i);
      this.anchor = i;
    } else if (!(e.button === 2 && this.sel.has(i))) {
      this.sel = new Set([i]);
      this.anchor = i;
    }
    this.focus = i;
    this.paint();
    if (this.onMove && e.pointerType === 'mouse' && e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) this.dragFrom(e);
  }

  // Drag the selected rows; a line shows where they'll land.
  dragFrom(e) {
    const startY = e.clientY;
    let line = null;
    let target = -1;
    const move = ev => {
      if (!line && Math.abs(ev.clientY - startY) < 5) return;
      if (!line) {
        line = document.createElement('div');
        line.className = 'lv-drop';
        this.el.append(line);
        this.el.classList.add('dragging');
      }
      const rows = [...this.el.querySelectorAll('.lv-row')];
      target = rows.findIndex(r => {
        const b = r.getBoundingClientRect();
        return ev.clientY < b.top + b.height / 2;
      });
      if (target < 0) target = rows.length;
      const ref = rows[Math.min(target, rows.length - 1)];
      line.style.top = `${(target < rows.length ? ref.offsetTop : ref.offsetTop + ref.offsetHeight) - 1}px`;
      const box = this.el.getBoundingClientRect();
      if (ev.clientY < box.top + 24) this.el.scrollTop -= 8;
      else if (ev.clientY > box.bottom - 16) this.el.scrollTop += 8;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!line) return;
      line.remove();
      this.el.classList.remove('dragging');
      this.onMove(this.selected, target);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // Scroll a row into view without scrolling any ancestor.
  reveal(i) {
    const row = this.el.querySelector(`[data-i="${i}"]`);
    if (!row) return;
    const head = this.el.querySelector('.lv-head')?.offsetHeight || 0;
    const el = this.el;
    if (row.offsetTop - head < el.scrollTop) el.scrollTop = row.offsetTop - head;
    else if (row.offsetTop + row.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = row.offsetTop + row.offsetHeight - el.clientHeight;
  }

  key(e) {
    const n = this.items.length;
    if (!n) return;
    let i = this.focus;
    switch (e.key) {
      case 'ArrowDown': i = Math.min(n - 1, i + 1); break;
      case 'ArrowUp': i = Math.max(0, i - 1); break;
      case 'PageDown': i = Math.min(n - 1, i + 10); break;
      case 'PageUp': i = Math.max(0, i - 10); break;
      case 'Home': i = 0; break;
      case 'End': i = n - 1; break;
      case 'Enter':
        e.preventDefault();
        if (i >= 0) this.onActivate?.(i);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.onDelete?.(this.selected);
        return;
      default:
        return;
    }
    e.preventDefault();
    if (e.shiftKey && this.anchor >= 0) {
      this.sel = new Set(range(this.anchor, i));
    } else {
      this.sel = new Set([i]);
      this.anchor = i;
    }
    this.focus = i;
    this.paint();
    this.reveal(i);
  }
}

const range = (a, b) => Array.from({ length: Math.abs(b - a) + 1 }, (_, k) => Math.min(a, b) + k);

function cell(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}
