// Classic cascading menus for the menubar, title-bar icon and right-click.
// Item: { label, key, act, checked, radio, sub, sep, disabled }
let stack = [];
let onClose = null;

export const isMenuOpen = () => stack.length > 0;

export function closeMenus() {
  stack.forEach(m => m.remove());
  stack = [];
  const cb = onClose;
  onClose = null;
  cb?.();
}

export function openMenu(items, x, y, whenClosed) {
  closeMenus();
  onClose = whenClosed;
  show(items, x, y, 0);
}

function show(items, x, y, depth) {
  stack.splice(depth).forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.setAttribute('role', 'menu');
  for (const it of items) {
    if (it.sep) {
      menu.append(document.createElement('hr'));
      continue;
    }
    const b = document.createElement('button');
    b.className = 'mi';
    b.setAttribute('role', 'menuitem');
    b.disabled = !!it.disabled;
    const on = typeof it.checked === 'function' ? it.checked() : it.checked;
    b.append(
      span(`mi-chk${on ? (it.radio ? ' radio' : ' check') : ''}`),
      span('mi-label', it.label),
      span('mi-key', it.key || ''),
      span('mi-sub', it.sub ? '▸' : ''),
    );
    const hover = () => {
      for (const sib of menu.querySelectorAll('.hot')) sib.classList.remove('hot');
      stack.splice(depth + 1).forEach(m => m.remove());
    };
    if (it.sub) {
      const open = () => {
        hover();
        b.classList.add('hot');
        const r = b.getBoundingClientRect();
        show(it.sub, r.right - 3, r.top - 3, depth + 1);
      };
      b.addEventListener('pointerenter', open);
      b.addEventListener('click', open);
    } else {
      b.addEventListener('pointerenter', hover);
      b.addEventListener('click', () => {
        closeMenus();
        it.act?.();
      });
    }
    menu.append(b);
  }
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(0, Math.min(x, innerWidth - r.width))}px`;
  menu.style.top = `${Math.max(0, Math.min(y, innerHeight - r.height))}px`;
  stack.push(menu);
}

function span(cls, text = '') {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
}

document.addEventListener(
  'pointerdown',
  e => {
    if (stack.length && !e.target.closest('.menu, .menubar [data-menu], .tb-icon')) closeMenus();
  },
  true,
);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && stack.length) {
    e.preventDefault();
    closeMenus();
  }
});
window.addEventListener('blur', closeMenus);
