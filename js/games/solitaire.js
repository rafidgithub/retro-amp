// Solitaire — Klondike the way Windows 3.0 dealt it: green felt, drag to move,
// click to turn a card over, standard scoring, and the bouncing-cards finale.
import { crisp, loop, toLocal, shuffle } from './common.js';

const CW = 71;
const CH = 96;
const GAP = 11;
const W = 7 * (CW + GAP) + GAP;
const H = 480;
const TOP = 10;
const TAB_Y = TOP + CH + 18;
const DOWN = 5; // fan offset below a face-down card
const UP = 18; // fan offset below a face-up card
const FAN3 = 14; // Draw Three waste fan
const FELT = '#008000';
const INK_RED = '#e01b1b';
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const isRed = s => s === 1 || s === 2; // suits: 0 clubs, 1 diamonds, 2 hearts, 3 spades
const colX = i => GAP + i * (CW + GAP);
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Suit shapes in a unit box centered on 0,0.
const SUITS = (() => {
  const club = new Path2D();
  for (const [x, y] of [[0, -0.24], [-0.25, 0.08], [0.25, 0.08], [0, 0.04]]) {
    const r = y === 0.04 ? 0.14 : 0.23;
    club.moveTo(x + r, y);
    club.arc(x, y, r, 0, Math.PI * 2);
  }
  club.moveTo(-0.05, 0.1); // stem, wound the same way as the lobes
  club.lineTo(0.05, 0.1);
  club.quadraticCurveTo(0.04, 0.4, 0.2, 0.5);
  club.lineTo(-0.2, 0.5);
  club.quadraticCurveTo(-0.04, 0.4, -0.05, 0.1);

  const diamond = new Path2D();
  diamond.moveTo(0, -0.5);
  diamond.quadraticCurveTo(0.18, -0.2, 0.38, 0);
  diamond.quadraticCurveTo(0.18, 0.2, 0, 0.5);
  diamond.quadraticCurveTo(-0.18, 0.2, -0.38, 0);
  diamond.quadraticCurveTo(-0.18, -0.2, 0, -0.5);

  const heart = new Path2D();
  heart.moveTo(0, 0.5);
  heart.bezierCurveTo(-0.1, 0.35, -0.5, 0.1, -0.5, -0.18);
  heart.bezierCurveTo(-0.5, -0.42, -0.32, -0.5, -0.24, -0.5);
  heart.bezierCurveTo(-0.1, -0.5, 0, -0.4, 0, -0.28);
  heart.bezierCurveTo(0, -0.4, 0.1, -0.5, 0.24, -0.5);
  heart.bezierCurveTo(0.32, -0.5, 0.5, -0.42, 0.5, -0.18);
  heart.bezierCurveTo(0.5, 0.1, 0.1, 0.35, 0, 0.5);

  const spade = new Path2D();
  spade.moveTo(0, -0.5);
  spade.bezierCurveTo(-0.1, -0.35, -0.5, -0.1, -0.5, 0.12);
  spade.bezierCurveTo(-0.5, 0.34, -0.32, 0.42, -0.22, 0.42);
  spade.bezierCurveTo(-0.1, 0.42, -0.03, 0.36, -0.02, 0.28);
  spade.quadraticCurveTo(-0.05, 0.45, -0.18, 0.5);
  spade.lineTo(0.18, 0.5);
  spade.quadraticCurveTo(0.05, 0.45, 0.02, 0.28);
  spade.bezierCurveTo(0.03, 0.36, 0.1, 0.42, 0.22, 0.42);
  spade.bezierCurveTo(0.32, 0.42, 0.5, 0.34, 0.5, 0.12);
  spade.bezierCurveTo(0.5, -0.1, 0.1, -0.35, 0, -0.5);
  return [club, diamond, heart, spade];
})();

// Pip positions for 2–10: [x, row 0..1]; pips below the middle are drawn upside down.
const L = 21;
const C = CW / 2;
const R = 50;
const PIPS = {
  2: [[C, 0], [C, 1]],
  3: [[C, 0], [C, 0.5], [C, 1]],
  4: [[L, 0], [R, 0], [L, 1], [R, 1]],
  5: [[L, 0], [R, 0], [C, 0.5], [L, 1], [R, 1]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  7: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [L, 1], [R, 1]],
  8: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [C, 0.75], [L, 1], [R, 1]],
  9: [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [C, 0.5], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1]],
  10: [[L, 0], [R, 0], [C, 1 / 6], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [C, 5 / 6], [L, 1], [R, 1]],
};

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function pip(g, s, x, y, size, flip = false) {
  g.save();
  g.translate(x, y);
  if (flip) g.rotate(Math.PI);
  g.scale(size, size);
  g.fill(SUITS[s]);
  g.restore();
}

function crown(g, cx, top, w, h, balls) {
  const l = cx - w / 2;
  g.beginPath();
  g.moveTo(l, top + h);
  g.lineTo(l, top + h * 0.3);
  g.lineTo(l + w * 0.25, top + h * 0.65);
  g.lineTo(cx, top);
  g.lineTo(l + w * 0.75, top + h * 0.65);
  g.lineTo(l + w, top + h * 0.3);
  g.lineTo(l + w, top + h);
  g.closePath();
  g.fillStyle = '#e8b923';
  g.fill();
  g.strokeStyle = '#7a5200';
  g.lineWidth = 1;
  g.stroke();
  if (balls) {
    for (const [x, y] of [[l, top + h * 0.3], [cx, top], [l + w, top + h * 0.3]]) {
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }
}

function drawFace(g, { s, r }) {
  roundRect(g, 0.5, 0.5, CW - 1, CH - 1, 4);
  g.fillStyle = '#fff';
  g.fill();
  g.strokeStyle = '#000';
  g.lineWidth = 1;
  g.stroke();
  const ink = isRed(s) ? INK_RED : '#000';

  const corner = () => {
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = 'bold 12px Arial, Helvetica, sans-serif';
    g.save();
    g.translate(8.5, 14);
    if (r === 10) g.scale(0.8, 1);
    g.fillText(RANKS[r], 0, 0);
    g.restore();
    pip(g, s, 8.5, 21.5, 8);
  };
  corner();
  g.save();
  g.translate(CW, CH);
  g.rotate(Math.PI);
  corner();
  g.restore();

  g.fillStyle = ink;
  if (r === 1) {
    pip(g, s, CW / 2, CH / 2, s === 3 ? 36 : 28);
  } else if (r <= 10) {
    for (const [x, row] of PIPS[r]) pip(g, s, x, 20 + row * 56, 12, row > 0.5);
  } else {
    // Court card: framed panel, crown, big letter, suit.
    const fx = 15;
    const fy = 10;
    const fw = CW - 30;
    const fh = CH - 20;
    g.fillStyle = '#fdf3cf';
    g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = ink;
    g.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
    g.strokeRect(fx + 2.5, fy + 2.5, fw - 5, fh - 5);
    if (r === 13) crown(g, C, fy + 8, 22, 10, false);
    else if (r === 12) crown(g, C, fy + 9, 18, 8, true);
    else {
      g.fillStyle = ink;
      pip(g, s, C, fy + 13, 9);
    }
    g.fillStyle = ink;
    g.font = 'bold 24px Georgia, "Times New Roman", serif';
    g.textAlign = 'center';
    g.fillText(RANKS[r], C, fy + 43);
    pip(g, s, C, fy + 58, 15);
    pip(g, s, fx + 7, fy + 8, 6);
    pip(g, s, fx + fw - 7, fy + fh - 8, 6, true);
  }
}

function drawBack(g) {
  roundRect(g, 0.5, 0.5, CW - 1, CH - 1, 4);
  g.fillStyle = '#fff';
  g.fill();
  g.strokeStyle = '#000';
  g.lineWidth = 1;
  g.stroke();
  const x = 4;
  const y = 4;
  const w = CW - 8;
  const h = CH - 8;
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.fillStyle = '#1d3fbb';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#7f9cff';
  g.beginPath();
  for (let d = x - h; d < x + w; d += 6) {
    g.moveTo(d, y);
    g.lineTo(d + h, y + h);
    g.moveTo(d, y + h);
    g.lineTo(d + h, y);
  }
  g.stroke();
  g.restore();
  g.strokeStyle = '#0a1f6e';
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export default function create(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sol-table';
  const ctx = crisp(canvas, W, H);
  const bar = document.createElement('div');
  bar.className = 'sol-status';
  const scoreEl = document.createElement('span');
  const timeEl = document.createElement('span');
  bar.append(scoreEl, timeEl);
  host.body.append(canvas, bar);

  // Card faces are drawn once, at screen resolution, then blitted.
  const ratio = Math.min(3, Math.ceil(window.devicePixelRatio || 1));
  const cache = new Map();
  const sprite = (key, paint) => {
    let c = cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = CW * ratio;
      c.height = CH * ratio;
      const g = c.getContext('2d');
      g.scale(ratio, ratio);
      paint(g);
      cache.set(key, c);
    }
    return c;
  };
  const image = card => (card.up ? sprite(`${card.s}-${card.r}`, g => drawFace(g, card)) : sprite('back', drawBack));

  let draw = host.store.get('draw', 1) === 3 ? 3 : 1;
  let stock, waste, found, tab;
  let score, secs, started, won, bonus, newBest, wasteFan;
  let undoStack = [];
  let drag = null; // { src, cards, card, x, y, x0, y0, dx, dy, px, py, moved, offs }
  let anim = null; // snap-back of an illegal drop
  let cascade = null; // the win animation
  let lastTap = null;
  let clockId = 0;

  // ---------------------------------------------------------------------------
  // Rules

  const pileOf = src => (src.pile === 'waste' ? waste : src.pile === 'found' ? found[src.i] : src.pile === 'stock' ? stock : tab[src.i]);
  const topOf = pile => pile[pile.length - 1];

  function canFound(card, f) {
    const t = topOf(found[f]);
    return t ? t.s === card.s && card.r === t.r + 1 : card.r === 1;
  }

  function canTab(card, i) {
    const t = topOf(tab[i]);
    return t ? t.up && isRed(t.s) !== isRed(card.s) && card.r === t.r - 1 : card.r === 13;
  }

  const legal = (cards, dst) => (dst.pile === 'found' ? cards.length === 1 && canFound(cards[0], dst.i) : canTab(cards[0], dst.i));

  const copy = pile => pile.map(c => ({ ...c }));
  const snapshot = () => ({ stock: copy(stock), waste: copy(waste), found: found.map(copy), tab: tab.map(copy), score, wasteFan });
  function remember() {
    undoStack.push(snapshot());
    if (undoStack.length > 200) undoStack.shift();
  }

  function undo() {
    if (!undoStack.length || won || cascade) return;
    ({ stock, waste, found, tab, score, wasteFan } = undoStack.pop());
    drag = anim = lastTap = null;
    redraw();
  }

  const addScore = n => (score = Math.max(0, score + n));

  function deal() {
    if (won || cascade) return;
    if (stock.length) {
      remember();
      const n = Math.min(draw, stock.length);
      for (let j = 0; j < n; j++) {
        const c = stock.pop();
        c.up = true;
        waste.push(c);
      }
      wasteFan = n;
    } else if (waste.length) {
      remember();
      for (const c of waste) c.up = false;
      stock = waste.reverse();
      waste = [];
      wasteFan = 0;
      addScore(draw === 1 ? -100 : -20);
    } else return;
    began();
    redraw();
  }

  function flip(i) {
    remember();
    topOf(tab[i]).up = true;
    addScore(5);
    began();
    redraw();
  }

  function move(src, dst, record = true) {
    if (record) remember();
    const cards = pileOf(src).splice(src.k);
    pileOf(dst).push(...cards);
    if (src.pile === 'waste') wasteFan = Math.max(1, wasteFan - 1);
    addScore({ 'waste>tab': 5, 'waste>found': 10, 'tab>found': 10, 'found>tab': -15 }[`${src.pile}>${dst.pile}`] || 0);
    began();
    redraw();
    if (dst.pile === 'found') checkWin();
  }

  // Double-click: send a top card to its foundation.
  function sendHome(src) {
    const pile = pileOf(src);
    const card = pile[src.k];
    if (src.pile === 'found' || src.k !== pile.length - 1 || !card?.up) return;
    const f = [0, 1, 2, 3].find(i => canFound(card, i));
    if (f !== undefined) move(src, { pile: 'found', i: f });
  }

  // Right-click: everything that can go home, goes home.
  function sendAllHome() {
    if (won || cascade || anim) return;
    const before = snapshot();
    let moved = false;
    for (let again = true; again && !won; ) {
      again = false;
      const srcs = waste.length ? [{ pile: 'waste', k: waste.length - 1 }] : [];
      for (let i = 0; i < 7; i++) if (tab[i].length) srcs.push({ pile: 'tab', i, k: tab[i].length - 1 });
      for (const src of srcs) {
        const card = pileOf(src)[src.k];
        const f = [0, 1, 2, 3].find(i => canFound(card, i));
        if (!card.up || f === undefined) continue;
        if (!moved) undoStack.push(before);
        moved = again = true;
        move(src, { pile: 'found', i: f }, false);
        break;
      }
    }
  }

  function checkWin() {
    if (!found.every(p => p.length === 13)) return;
    won = true;
    stopClock();
    bonus = secs > 30 ? Math.round(700000 / secs) : 0;
    score += bonus;
    newBest = score > host.store.get('best', 0);
    if (newBest) host.store.set('best', score);
    const fastest = host.store.get('fastest', 0);
    if (secs && (!fastest || secs < fastest)) host.store.set('fastest', secs);
    host.store.set('wins', host.store.get('wins', 0) + 1);
    drag = null;
    redraw();
    startCascade();
  }

  // ---------------------------------------------------------------------------
  // Clock: starts on the first move, −2 points every 10 seconds

  function began() {
    started = true;
    resumeClock();
  }
  function resumeClock() {
    if (!started || won || clockId) return;
    clockId = setInterval(() => {
      secs++;
      if (secs % 10 === 0) addScore(-2);
      status();
    }, 1000);
  }
  function stopClock() {
    clearInterval(clockId);
    clockId = 0;
  }

  function status() {
    scoreEl.textContent = `Score: ${score}`;
    timeEl.textContent = `Time: ${secs}`;
  }

  // ---------------------------------------------------------------------------
  // Drawing

  const drawCard = (card, x, y) => ctx.drawImage(image(card), Math.round(x), Math.round(y), CW, CH);

  function slot(x, y) {
    roundRect(ctx, x + 0.5, y + 0.5, CW - 1, CH - 1, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, .08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, .5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Empty stock: green O = click to turn the waste over, X = nothing left.
  function stockMark(x, y, again) {
    const cx = x + CW / 2;
    const cy = y + CH / 2;
    ctx.lineWidth = 6;
    ctx.beginPath();
    if (again) {
      ctx.strokeStyle = '#30e030';
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    } else {
      ctx.strokeStyle = '#d02020';
      ctx.moveTo(cx - 14, cy - 14);
      ctx.lineTo(cx + 14, cy + 14);
      ctx.moveTo(cx + 14, cy - 14);
      ctx.lineTo(cx - 14, cy + 14);
    }
    ctx.stroke();
  }

  function layoutCol(i) {
    const pile = tab[i];
    const ys = [TAB_Y];
    let total = 0;
    for (let k = 1; k < pile.length; k++) total += pile[k - 1].up ? UP : DOWN;
    const room = H - 6 - CH - TAB_Y;
    const squeeze = total > room ? room / total : 1;
    for (let k = 1; k < pile.length; k++) ys.push(ys[k - 1] + (pile[k - 1].up ? UP : DOWN) * squeeze);
    return ys;
  }

  // Visible waste cards, bottom to top: the fanned ones plus the one under them.
  function wasteLayout() {
    const n = waste.length;
    const fan = draw === 3 ? Math.min(Math.max(wasteFan, 1), n) : Math.min(1, n);
    const out = n > fan ? [{ card: waste[n - fan - 1], x: colX(1) }] : [];
    for (let j = 0; j < fan; j++) out.push({ card: waste[n - fan + j], x: colX(1) + j * FAN3 });
    return out;
  }

  function render() {
    if (cascade) return; // the finale paints over the table on purpose
    ctx.fillStyle = FELT;
    ctx.fillRect(0, 0, W, H);
    const lifted = drag?.moved ? drag.src : null;

    const sx = colX(0);
    if (stock.length) {
      const layers = stock.length > 16 ? 3 : stock.length > 8 ? 2 : 1;
      for (let j = 0; j < layers; j++) drawCard(stock[0], sx + j * 2, TOP + j);
    } else {
      slot(sx, TOP);
      stockMark(sx, TOP, waste.length > 0);
    }

    for (const { card, x } of wasteLayout()) if (!(lifted?.pile === 'waste' && card === drag.card)) drawCard(card, x, TOP);

    for (let f = 0; f < 4; f++) {
      const n = found[f].length - (lifted?.pile === 'found' && lifted.i === f ? 1 : 0);
      if (n) drawCard(found[f][n - 1], colX(3 + f), TOP);
      else slot(colX(3 + f), TOP);
    }

    for (let i = 0; i < 7; i++) {
      const ys = layoutCol(i);
      const end = lifted?.pile === 'tab' && lifted.i === i ? lifted.k : tab[i].length;
      if (!end) slot(colX(i), TAB_Y);
      for (let k = 0; k < end; k++) drawCard(tab[i][k], colX(i), ys[k]);
    }

    if (lifted) drag.cards.forEach((c, j) => drawCard(c, drag.x, drag.y + drag.offs[j]));
  }

  function redraw() {
    render();
    status();
  }

  // ---------------------------------------------------------------------------
  // Pointer: click, drag, double-click

  function hit(x, y) {
    const inside = (rx, ry) => x >= rx && x < rx + CW && y >= ry && y < ry + CH;
    for (let i = 0; i < 7; i++) {
      const ys = layoutCol(i);
      for (let k = tab[i].length - 1; k >= 0; k--) if (inside(colX(i), ys[k])) return { pile: 'tab', i, k };
    }
    if (inside(colX(0), TOP)) return { pile: 'stock' };
    if (waste.length) {
      const top = wasteLayout().at(-1);
      if (inside(top.x, TOP)) return { pile: 'waste', k: waste.length - 1 };
    }
    for (let f = 0; f < 4; f++) if (found[f].length && inside(colX(3 + f), TOP)) return { pile: 'found', i: f, k: found[f].length - 1 };
    return null;
  }

  function originOf(src) {
    if (src.pile === 'waste') return [wasteLayout().at(-1).x, TOP];
    if (src.pile === 'found') return [colX(3 + src.i), TOP];
    return [colX(src.i), layoutCol(src.i)[src.k]];
  }

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (cascade) return showWin();
    if (anim || won) return;
    resumeClock();
    const [x, y] = toLocal(canvas, e, W, H);
    const at = hit(x, y);
    if (!at) return;
    if (at.pile === 'stock') {
      lastTap = null;
      return deal();
    }
    const pile = pileOf(at);
    const card = pile[at.k];
    if (!card.up) {
      if (at.pile === 'tab' && at.k === pile.length - 1) {
        flip(at.i);
        lastTap = { card, t: performance.now() };
      }
      return;
    }
    const [ox, oy] = originOf(at);
    const cards = pile.slice(at.k);
    const ys = at.pile === 'tab' ? layoutCol(at.i) : null;
    drag = {
      src: at,
      cards,
      card,
      x: ox,
      y: oy,
      x0: ox,
      y0: oy,
      dx: x - ox,
      dy: y - oy,
      px: x,
      py: y,
      moved: false,
      offs: cards.map((_, j) => (ys ? ys[at.k + j] - ys[at.k] : 0)),
    };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!drag || anim) return;
    const [x, y] = toLocal(canvas, e, W, H);
    if (!drag.moved && Math.hypot(x - drag.px, y - drag.py) < 4) return;
    drag.moved = true;
    drag.x = x - drag.dx;
    drag.y = y - drag.dy;
    render();
  });

  canvas.addEventListener('pointerup', () => {
    if (!drag || anim) return;
    const d = drag;
    if (d.moved) return drop();
    drag = null;
    const now = performance.now();
    if (lastTap?.card === d.card && now - lastTap.t < 400) {
      lastTap = null;
      sendHome(d.src);
    } else lastTap = { card: d.card, t: now };
  });

  canvas.addEventListener('pointercancel', () => {
    if (!drag || anim) return;
    if (drag.moved) snapBack();
    else drag = null;
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (e.pointerType === 'touch') return;
    if (cascade) return showWin();
    resumeClock();
    sendAllHome();
  });

  // Drop on whichever legal pile the dragged card overlaps most.
  function drop() {
    const d = drag;
    let best = null;
    let bestArea = 0;
    const consider = (dst, rx, ry) => {
      const ix = Math.min(d.x, rx) + CW - Math.max(d.x, rx);
      const iy = Math.min(d.y, ry) + CH - Math.max(d.y, ry);
      if (ix > 0 && iy > 0 && ix * iy > bestArea && legal(d.cards, dst)) {
        best = dst;
        bestArea = ix * iy;
      }
    };
    for (let f = 0; f < 4; f++) if (!(d.src.pile === 'found' && d.src.i === f)) consider({ pile: 'found', i: f }, colX(3 + f), TOP);
    for (let i = 0; i < 7; i++) {
      if (d.src.pile === 'tab' && d.src.i === i) continue;
      const n = tab[i].length;
      consider({ pile: 'tab', i }, colX(i), n ? layoutCol(i)[n - 1] : TAB_Y);
    }
    if (!best) return snapBack();
    drag = null;
    lastTap = null;
    move(d.src, best);
  }

  // ---------------------------------------------------------------------------
  // Animation: illegal-drop snap back, and the win cascade

  const ticker = loop(dt => {
    if (anim) return snapStep(dt);
    if (cascade) {
      cascade.acc += dt;
      while (cascade && cascade.acc >= 1 / 60) {
        cascade.acc -= 1 / 60;
        cascadeTick();
      }
      return;
    }
    ticker.stop();
  });

  function snapBack() {
    anim = { fx: drag.x, fy: drag.y, t: 0 };
    ticker.start();
  }

  function snapStep(dt) {
    anim.t = Math.min(1, anim.t + dt / 0.16);
    const e = 1 - (1 - anim.t) ** 2;
    drag.x = anim.fx + (drag.x0 - anim.fx) * e;
    drag.y = anim.fy + (drag.y0 - anim.fy) * e;
    if (anim.t >= 1) {
      anim = drag = null;
      ticker.stop();
    }
    render();
  }

  // Kings first, cycling the foundations; each card bounces off the bottom and
  // leaves a trail because the table is never cleared.
  function startCascade() {
    if (reduceMotion.matches) return showWin();
    const order = [];
    for (let r = 0; r < 13; r++) order.push(0, 1, 2, 3);
    cascade = { order, left: [13, 13, 13, 13], flying: null, acc: 0 };
    ticker.start();
  }

  function cascadeTick() {
    const c = cascade;
    if (!c.flying) {
      if (!c.order.length) return showWin();
      const f = c.order.shift();
      const x = colX(3 + f);
      const card = found[f][--c.left[f]];
      ctx.fillStyle = FELT;
      ctx.fillRect(x - 1, TOP - 1, CW + 2, CH + 2);
      if (c.left[f]) drawCard(found[f][c.left[f] - 1], x, TOP);
      else slot(x, TOP);
      c.flying = { card, x, y: TOP, vx: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5), vy: -Math.random() * 10 };
    }
    const k = c.flying;
    k.vy += 0.5;
    k.x += k.vx;
    k.y += k.vy;
    if (k.y > H - CH) {
      k.y = H - CH;
      k.vy *= -0.75;
    }
    drawCard(k.card, k.x, k.y);
    if (k.x < -CW || k.x > W) c.flying = null;
  }

  function showWin() {
    ticker.stop();
    cascade = null;
    const lines = [`Score: ${score}`, `Time: ${fmt(secs)}`];
    if (bonus) lines.push(`Time bonus: ${bonus}`);
    host.alert({
      title: 'You win!',
      text: `Congratulations!\n\n${lines.join('\n')}${newBest ? '\n\nNew best score!' : ''}`,
      buttons: [{ label: 'Deal again', act: newGame }, { label: 'Close' }],
    });
  }

  // ---------------------------------------------------------------------------
  // Game

  function newGame() {
    ticker.stop();
    stopClock();
    cascade = anim = drag = lastTap = null;
    const deck = shuffle(Array.from({ length: 52 }, (_, n) => ({ s: n % 4, r: Math.floor(n / 4) + 1, up: false })));
    tab = Array.from({ length: 7 }, (_, i) => {
      const col = deck.splice(0, i + 1);
      col[i].up = true;
      return col;
    });
    stock = deck;
    waste = [];
    found = [[], [], [], []];
    score = secs = bonus = wasteFan = 0;
    started = won = newBest = false;
    undoStack = [];
    redraw();
  }

  function setDraw(n) {
    if (n === draw) return;
    draw = n;
    host.store.set('draw', n);
    newGame();
  }

  function showBest() {
    const dl = document.createElement('dl');
    dl.className = 'g-scores';
    const fastest = host.store.get('fastest', 0);
    for (const [k, v] of [
      ['Best score', host.store.get('best', 0) || '—'],
      ['Fastest win', fastest ? fmt(fastest) : '—'],
      ['Games won', host.store.get('wins', 0)],
    ]) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    }
    host.alert({
      title: 'Best score',
      content: dl,
      buttons: [
        { label: 'OK' },
        {
          label: 'Reset',
          act: () => {
            for (const k of ['best', 'fastest', 'wins']) host.store.set(k, 0);
          },
        },
      ],
    });
  }

  newGame();

  return {
    newGame,
    help: 'Build the four piles at the top right up by suit, from Ace to King.\n\nOn the table, stack cards downward in alternating colors. Only a King can fill an empty column. Drag a card, or a run of face-up cards, to move it. Click a face-down card to turn it over.\n\nClick the deck (or press D) to deal. Double-click a card to send it home; right-click to send every card that can go. Backspace undoes. F2 deals a new game.',
    menu: () => [
      { label: 'Undo', key: 'Backspace', disabled: !undoStack.length || won, act: undo },
      { sep: true },
      { label: 'Draw One', radio: true, checked: draw === 1, act: () => setDraw(1) },
      { label: 'Draw Three', radio: true, checked: draw === 3, act: () => setDraw(3) },
      { sep: true },
      { label: 'Best score…', act: showBest },
    ],
    key(e) {
      if (cascade) {
        showWin();
        return true;
      }
      if (e.key === 'Backspace') {
        undo();
        return true;
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'd') {
        resumeClock();
        deal();
        return true;
      }
      return false;
    },
    pause() {
      stopClock();
      if (anim) {
        anim = drag = null;
        render();
      }
      if (cascade) ticker.stop();
    },
  };
}
