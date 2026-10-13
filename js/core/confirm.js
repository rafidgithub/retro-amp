// "Are you sure?" drawn in the current skin: a .win dialog on a dimmed desktop.
// Every move to the Recycle Bin, restore and permanent delete goes through here
// (core/trash.js), so nothing is thrown away or brought back without a clear yes.
// Resolves true for the OK button, false for Cancel, the close box or Esc.
import { h } from './util.js';

function icon(id) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ico');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

export function ask({ title, message, detail = '', ok = 'OK', cancel = 'Cancel', danger = false, glyph = 'i-erase' }) {
  return new Promise(resolve => {
    const before = document.activeElement;
    const back = h('div', 'cf-back');
    const win = h('section', 'win dialog active cf-win');
    win.setAttribute('role', 'alertdialog');
    win.setAttribute('aria-modal', 'true');
    win.setAttribute('aria-label', title);
    const bar = h('header', 'titlebar');
    const tbIcon = h('span', 'tb-icon');
    tbIcon.append(icon(glyph));
    const tbBtns = h('span', 'tb-btns');
    const x = h('button');
    x.dataset.wm = 'close'; // styling only: the window manager never sees this window
    x.setAttribute('aria-label', 'Cancel');
    tbBtns.append(x);
    bar.append(tbIcon, h('span', 'tb-title', title), tbBtns);

    const body = h('div', 'win-body cf-body');
    const msg = h('div', 'cf-msg');
    const big = h('span', `cf-glyph${danger ? ' danger' : ''}`);
    big.append(icon(glyph));
    const text = h('div', 'cf-text');
    text.append(h('p', '', message));
    if (detail) text.append(h('p', 'cf-detail', detail));
    msg.append(big, text);
    const foot = h('div', 'dlg-foot cf-foot');
    const yes = h('button', 'btn', ok);
    const no = h('button', 'btn', cancel);
    foot.append(h('span'), yes, no);
    body.append(msg, foot);
    win.append(bar, body);
    back.append(win);

    const done = v => {
      back.remove();
      before?.focus?.();
      resolve(v);
    };
    yes.addEventListener('click', () => done(true));
    no.addEventListener('click', () => done(false));
    x.addEventListener('click', () => done(false));
    back.addEventListener('pointerdown', e => e.target === back && done(false));
    back.addEventListener('keydown', e => {
      e.stopPropagation(); // the player's shortcuts stay quiet while this is open
      if (e.key === 'Escape') done(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === yes ? no : yes).focus();
      }
    });
    document.body.append(back);
    (danger ? no : yes).focus(); // the irreversible ones start on Cancel
  });
}
