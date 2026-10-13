// Pictures for system notifications, drawn in the current skin. Windows, macOS and
// Android draw the notification themselves; the icon and the large image are the
// part we get to fill, so they carry the skin: its title bar, window face, fields
// and desktop.
import { paint, cssVar } from '../core/paint.js';
import { COLORS } from './store.js';

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// the skin's UI font family at a new size
function font(weight, size) {
  const family = (cssVar('--ui-font') || '').replace(/^.*?\d+(\.\d+)?px(\/\S+)?\s*/, '') || 'sans-serif';
  return `${weight} ${size}px ${family}`;
}

function lines(ctx, text, maxWidth, max) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else line = next;
      if (out.length >= max) break;
    }
    if (line && out.length < max) out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

// App icon: a note sheet on the skin's title-bar color.
export function themedIcon() {
  const c = canvas(192, 192);
  const x = c.getContext('2d');
  paint(x, cssVar('--title') || '#000080', 0, 0, 192, 192, 40);
  x.fillStyle = cssVar('--field') || '#fff';
  x.beginPath();
  x.moveTo(52, 34);
  x.lineTo(124, 34);
  x.lineTo(148, 58);
  x.lineTo(148, 160);
  x.lineTo(52, 160);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(0, 0, 0, .18)';
  x.beginPath();
  x.moveTo(124, 34);
  x.lineTo(148, 58);
  x.lineTo(124, 58);
  x.closePath();
  x.fill();
  x.fillStyle = cssVar('--sel') || '#316ac5';
  for (const [y, w] of [[78, 72], [100, 72], [122, 50]]) x.fillRect(66, y, w, 8);
  return c.toDataURL('image/png');
}

// Large image: the reminder as a little window of the current skin, on its desktop.
export function themedCard(note, missed) {
  const W = 720;
  const H = 360;
  const c = canvas(W, H);
  const x = c.getContext('2d');
  paint(x, cssVar('--desk-bg') || '#008080', 0, 0, W, H);
  const wx = 36;
  const wy = 30;
  const ww = W - 72;
  const wh = H - 60;
  x.save();
  x.shadowColor = 'rgba(0, 0, 0, .45)';
  x.shadowBlur = 24;
  x.shadowOffsetY = 8;
  paint(x, cssVar('--face') || '#c0c0c0', wx, wy, ww, wh, 10);
  x.restore();
  paint(x, cssVar('--face') || '#c0c0c0', wx, wy, ww, wh, 10);
  paint(x, cssVar('--title') || '#000080', wx, wy, ww, 54, 10);
  x.fillStyle = cssVar('--title-text') || '#fff';
  x.font = font('bold', 26);
  x.textBaseline = 'middle';
  x.fillText(missed ? 'Missed reminder' : 'Reminder', wx + 22, wy + 28);

  const fx = wx + 22;
  const fy = wy + 74;
  const fw = ww - 44;
  const fh = wh - 96;
  paint(x, cssVar('--field') || '#fff', fx, fy, fw, fh, 8);
  x.fillStyle = COLORS[note.color] || COLORS.yellow;
  x.fillRect(fx, fy, 12, fh);
  x.fillStyle = cssVar('--text') || '#000';
  x.textBaseline = 'alphabetic';
  x.font = font('bold', 30);
  x.fillText(lines(x, note.title || 'Untitled note', fw - 52, 1)[0] || '', fx + 32, fy + 48);
  x.font = font('normal', 22);
  x.fillStyle = cssVar('--muted') || cssVar('--text') || '#444';
  lines(x, note.body || '', fw - 52, 3).forEach((l, i) => x.fillText(l, fx + 32, fy + 88 + i * 30));
  return c.toDataURL('image/png');
}
