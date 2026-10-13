// Paint CSS backgrounds on a canvas, so canvas-drawn things can wear the current
// skin: the pop-out mini player (player/pip.js) and reminder notification images
// (notes/art.js). Reads the skin's CSS variables from <html>.

export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------------------------------------------------------------------------
// CSS backgrounds on a canvas: colors plus linear and radial gradients, enough
// to repaint a skin's title bar, body and screen. Repeating and conic gradients
// use their first color.

function splitTop(str) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === ',' && !depth) {
      out.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(str.slice(start).trim());
  return out.filter(Boolean);
}

// "rgba(0, 0, 0, .5) 20% 40%" → { color, at: [0.2, 0.4] }
function parseStop(arg, len) {
  let color = arg;
  let rest = '';
  const paren = arg.match(/^[a-z-]+\(/i);
  if (paren) {
    let depth = 0;
    for (let i = 0; i < arg.length; i++) {
      if (arg[i] === '(') depth++;
      else if (arg[i] === ')' && !--depth) {
        color = arg.slice(0, i + 1);
        rest = arg.slice(i + 1);
        break;
      }
    }
  } else {
    [color, ...rest] = arg.split(/\s+/);
    rest = rest.join(' ');
  }
  const at = rest
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(p => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p) / len));
  return { color, at };
}

function stops(args, len) {
  const list = [];
  for (const a of args) {
    const { color, at } = parseStop(a, len);
    if (!at.length) list.push({ color, pos: null });
    for (const p of at) list.push({ color, pos: Number.isFinite(p) ? p : null });
  }
  if (!list.length) return list;
  list[0].pos ??= 0;
  list.at(-1).pos ??= 1;
  for (let i = 1; i < list.length; i++) {
    if (list[i].pos === null) {
      let j = i;
      while (list[j].pos === null) j++;
      const from = list[i - 1].pos;
      const step = (list[j].pos - from) / (j - i + 1);
      for (let k = i; k < j; k++) list[k].pos = from + step * (k - i + 1);
    }
    list[i].pos = Math.max(list[i].pos, list[i - 1].pos);
  }
  return list;
}

const SIDES = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 };

function layer(ctx, value, x, y, w, h) {
  const m = value.match(/^(repeating-)?(linear|radial|conic)-gradient\(/);
  if (!m) {
    if (/^(none|url\()/.test(value)) return;
    ctx.fillStyle = value;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const args = splitTop(value.slice(m[0].length, value.lastIndexOf(')'))); // drops any "0 0 / 4px 4px" size
  let grad;
  if (m[1] || m[2] === 'conic') return fillFirst(ctx, args.filter(a => !/^(from|-?[\d.]+deg|to )/.test(a)), x, y, w, h);
  if (m[2] === 'linear') {
    let deg = 180;
    const a = args[0];
    if (/^-?[\d.]+(deg|turn)$/.test(a)) deg = parseFloat(a) * (a.endsWith('turn') ? 360 : 1);
    if (/^-?[\d.]+(deg|turn)$/.test(a) || a.startsWith('to ')) args.shift();
    if (a.startsWith('to ')) deg = SIDES[a.slice(3)] ?? 180;
    const rad = (deg * Math.PI) / 180;
    const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    const dx = (Math.sin(rad) * len) / 2;
    const dy = (-Math.cos(rad) * len) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    for (const s of stops(args, len)) addStop(grad, s);
  } else {
    let cx = x + w / 2;
    let cy = y + h / 2;
    if (/\bat\b|circle|ellipse|closest|farthest|^[\d.]+(px|%)/.test(args[0])) {
      const at = args.shift().match(/at\s+([\d.]+)%\s*(?:([\d.]+)%)?/);
      if (at) {
        cx = x + (w * parseFloat(at[1])) / 100;
        cy = y + (h * parseFloat(at[2] ?? 50)) / 100;
      }
    }
    const r = Math.hypot(Math.max(cx - x, x + w - cx), Math.max(cy - y, y + h - cy));
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const s of stops(args, r)) addStop(grad, s);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function addStop(grad, s) {
  try {
    grad.addColorStop(Math.min(1, Math.max(0, s.pos)), s.color);
  } catch {
    // a color the canvas can't parse: skip the stop
  }
}

function fillFirst(ctx, args, x, y, w, h) {
  const first = args.length && parseStop(args[0], 1).color;
  if (!first) return;
  ctx.fillStyle = first;
  ctx.fillRect(x, y, w, h);
}

// Paint a CSS background value (several layers allowed) into a rounded box.
export function paint(ctx, value, x, y, w, h, r = 0) {
  if (!value) return;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  for (const l of splitTop(value).reverse()) layer(ctx, l, x, y, w, h);
  ctx.restore();
}
