// Blocks — a 1989 handheld-style falling-blocks puzzle in four shades of green.
import { h } from '../core/util.js';
import { crisp, loop, swipe, shuffle, PIXEL_FONT, fontReady } from './common.js';

const COLS = 10;
const ROWS = 20;
const CELL = 14;
const WX = 10; // well
const WY = 10;
const PX = 162; // side panel
const W = 250;
const H = 300;
const C0 = '#9bbc0f'; // lightest
const C1 = '#8bac0f';
const C2 = '#306230';
const C3 = '#0f380f'; // darkest
const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};
const STYLE = { I: 0, O: 3, T: 1, S: 2, Z: 0, J: 1, L: 2 };
// tile styles: face, highlight, shadow, center mark
const TILES = [
  [C2, C1, C3, null],
  [C1, C0, C2, null],
  [C3, C2, C3, C1],
  [C0, C0, C1, C2],
];
const SPEED = [53, 49, 45, 41, 37, 33, 28, 22, 17, 11, 10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 3]; // frames per row, 59.73 fps
const gravity = level => SPEED[Math.min(level, SPEED.length - 1)] / 59.73;
const POINTS = [0, 40, 100, 300, 1200];
const KICKS = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
const LOCK = 0.5;
const DAS = 0.17;
const ARR = 0.05;
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'x', 'z', 'p', 'Escape', 'Enter']);

const rotated = (m, dir) =>
  dir > 0 ? m[0].map((_, x) => m.map(row => row[x]).reverse()) : m[0].map((_, x) => m.map(row => row[row.length - 1 - x]));

const HELP = `Fit the falling blocks into solid rows. Full rows vanish and score; clear four at once for the big points. Every 10 rows the level goes up and the blocks fall faster.

← → move · ↑ or X rotate · Z rotate back · ↓ soft drop · Space hard drop · P pause

On a touch screen, use the buttons, or tap the screen to rotate and swipe down to drop.`;

export default function create(host) {
  const { store } = host;
  const gb = h('div', 'blk-gb');
  const screen = h('div', 'blk-screen');
  screen.append(h('span', 'blk-led'));
  const canvas = h('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Blocks');
  screen.append(canvas);
  gb.append(screen, h('div', 'blk-name', 'Blocks'));
  host.body.append(gb);
  const ctx = crisp(canvas, W, H);

  let startLevel = store.get('level', 0);
  let ghost = store.get('ghost', true);
  let board, bag, piece, next, score, lines, level;
  let grav = 0;
  let lockT = 0;
  let resets = 0;
  let clearRows = [];
  let clearT = 0;
  let endT = 0;
  let resumeTo = 'run';
  let held = {};
  let das = null;
  let state = 'ready'; // ready | run | clearing | paused | ending | over

  const ticker = loop(dt => {
    update(dt);
    draw();
  });

  const take = () => {
    if (!bag.length) bag = shuffle(Object.keys(SHAPES));
    return bag.pop();
  };

  function fits(m, x, y) {
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const bx = x + c;
        const by = y + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        if (by >= 0 && board[by][bx]) return false;
      }
    }
    return true;
  }
  const grounded = () => !fits(piece.m, piece.x, piece.y + 1);

  function newGame(start = false) {
    ticker.stop();
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    bag = [];
    next = take();
    piece = null;
    score = lines = 0;
    level = startLevel;
    clearRows = [];
    held = {};
    das = null;
    state = 'ready';
    if (start) begin();
    else draw();
  }

  function begin() {
    spawn();
    ticker.start();
  }

  function spawn() {
    state = 'run';
    const type = next;
    next = take();
    const m = SHAPES[type].map(row => [...row]);
    piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 };
    grav = lockT = resets = 0;
    if (!fits(piece.m, piece.x, piece.y)) gameOver();
  }

  function pause() {
    if (state !== 'run' && state !== 'clearing') return;
    resumeTo = state;
    state = 'paused';
    held = {};
    das = null;
    ticker.stop();
    draw();
  }

  function resume() {
    state = resumeTo;
    ticker.start();
  }

  function togglePause() {
    if (state === 'paused') resume();
    else if (state === 'ready') begin();
    else if (state === 'over') newGame(true);
    else pause();
  }

  // A successful move or turn on the ground buys more time before locking.
  function nudged() {
    if (lockT > 0 && resets < 15) {
      lockT = 0;
      resets++;
    }
  }

  function shift(dx) {
    if (!fits(piece.m, piece.x + dx, piece.y)) return;
    piece.x += dx;
    nudged();
  }

  function rotate(dir) {
    if (piece.type === 'O') return;
    const m = rotated(piece.m, dir);
    for (const [dx, dy] of KICKS) {
      if (fits(m, piece.x + dx, piece.y + dy)) {
        Object.assign(piece, { m, x: piece.x + dx, y: piece.y + dy });
        return nudged();
      }
    }
  }

  function softStep() {
    if (grounded()) return;
    piece.y++;
    score++;
    grav = 0;
  }

  function hardDrop() {
    while (!grounded()) {
      piece.y++;
      score += 2;
    }
    lock();
  }

  function lock() {
    let above = false;
    piece.m.forEach((row, r) =>
      row.forEach((v, c) => {
        if (!v) return;
        if (piece.y + r < 0) above = true;
        else board[piece.y + r][piece.x + c] = STYLE[piece.type] + 1;
      }),
    );
    piece = null;
    if (above) return gameOver();
    clearRows = board.flatMap((row, r) => (row.every(Boolean) ? [r] : []));
    if (!clearRows.length) return spawn();
    score += POINTS[clearRows.length] * (level + 1);
    lines += clearRows.length;
    level = Math.max(startLevel, Math.floor(lines / 10));
    state = 'clearing';
    clearT = 0;
  }

  function collapse() {
    board = board.filter((_, r) => !clearRows.includes(r));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(0));
    clearRows = [];
  }

  function gameOver() {
    state = 'ending';
    endT = 0;
    held = {};
    das = null;
  }

  function finish() {
    state = 'over';
    ticker.stop();
    draw();
    const best = store.get('best', 0);
    const record = score > best;
    if (record) store.set('best', score);
    host.alert({
      title: 'Game over',
      text: `Score: ${score}\nLines: ${lines}\nBest: ${Math.max(best, score)}${record ? '\n\nNew high score!' : ''}`,
      buttons: [{ label: 'Play again', act: () => newGame(true) }, { label: 'Close' }],
    });
  }

  function update(dt) {
    if (state === 'clearing') {
      clearT += dt;
      if (clearT >= 0.3) {
        collapse();
        spawn();
      }
      return;
    }
    if (state === 'ending') {
      endT += dt;
      if (endT >= ROWS * 0.035 + 0.4) finish();
      return;
    }
    if (state !== 'run') return;

    // delayed auto shift: one step on press, then repeat after a pause
    if (das) {
      das.t += dt;
      if (!das.charged && das.t >= DAS) {
        das.charged = true;
        das.t = 0;
        shift(das.dir);
      } else if (das.charged) {
        while (das.t >= ARR) {
          das.t -= ARR;
          shift(das.dir);
        }
      }
    }

    if (!grounded()) {
      lockT = 0;
      const soft = held.down;
      const rate = soft ? Math.min(0.04, gravity(level)) : gravity(level);
      grav += dt;
      while (grav >= rate && !grounded()) {
        grav -= rate;
        piece.y++;
        if (soft) score++;
      }
    } else {
      grav = 0;
      lockT += dt;
      if (lockT >= (held.down ? 0.15 : LOCK)) lock();
    }
  }

  function act(name) {
    if (name === 'pause') return togglePause();
    if (state === 'ready') return begin();
    if (state === 'over') return newGame(true);
    if (state === 'paused') return resume();
    if (state !== 'run') return;
    ({ left: () => shift(-1), right: () => shift(1), rotate: () => rotate(1), down: softStep, drop: hardDrop })[name]?.();
  }

  function setStart(n) {
    startLevel = n;
    store.set('level', n);
    if (state === 'ready') {
      level = n;
      draw();
    }
  }

  function toggleGhost() {
    ghost = !ghost;
    store.set('ghost', ghost);
    draw();
  }

  function showBest() {
    const dl = h('dl', 'g-scores');
    dl.append(h('dt', '', 'High score'), h('dd', '', String(store.get('best', 0))));
    host.alert({ title: 'High score', content: dl, buttons: [{ label: 'OK' }, { label: 'Reset', act: () => store.set('best', 0) }] });
  }

  // -------------------------------------------------------------------------
  // Drawing

  function tile(style, x, y) {
    const [face, light, dark, mark] = TILES[style];
    ctx.fillStyle = C3;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = dark;
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
    ctx.fillStyle = light;
    ctx.fillRect(x + 1, y + 1, CELL - 4, CELL - 4);
    ctx.fillStyle = face;
    ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
    if (mark) {
      const s = style === 2 ? 2 : 4;
      ctx.fillStyle = mark;
      ctx.fillRect(x + (CELL - s) / 2, y + (CELL - s) / 2, s, s);
    }
  }

  function text(str, x, y, size = 8, color = C3, align = 'left') {
    ctx.font = `${size}px ${PIXEL_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(str, x, y);
  }

  function eachCell(m, fn) {
    m.forEach((row, r) => row.forEach((v, c) => v && fn(c, r)));
  }

  function banner(lines) {
    const bw = 116;
    const bh = lines.length * 18 + 12;
    const bx = WX + (COLS * CELL - bw) / 2;
    const by = WY + Math.round((ROWS * CELL - bh) / 2);
    ctx.fillStyle = C3;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = C0;
    ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
    lines.forEach(([str, size], i) => text(str, bx + bw / 2, by + 8 + i * 18 + (16 - size) / 2, size, C3, 'center'));
  }

  function draw() {
    ctx.fillStyle = C0;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C3;
    ctx.fillRect(WX - 3, WY - 3, COLS * CELL + 6, ROWS * CELL + 6);
    ctx.fillStyle = C2;
    ctx.fillRect(WX - 1, WY - 1, COLS * CELL + 2, ROWS * CELL + 2);
    ctx.fillStyle = C0;
    ctx.fillRect(WX, WY, COLS * CELL, ROWS * CELL);

    if (state === 'paused') {
      banner([['PAUSE', 16], ['P TO GO ON', 8]]); // the well hides while paused, no peeking
    } else {
      ctx.fillStyle = C1;
      for (let r = 1; r < ROWS; r++) for (let c = 1; c < COLS; c++) ctx.fillRect(WX + c * CELL, WY + r * CELL, 1, 1);

      const blink = Math.floor(clearT / 0.075) % 2 === 1;
      board.forEach((row, r) => {
        if (state === 'clearing' && clearRows.includes(r) && blink) return;
        row.forEach((v, c) => v && tile(v - 1, WX + c * CELL, WY + r * CELL));
      });

      if (piece && state === 'run') {
        if (ghost) {
          let gy = piece.y;
          while (fits(piece.m, piece.x, gy + 1)) gy++;
          ctx.fillStyle = C1;
          eachCell(piece.m, (c, r) => gy + r >= 0 && ctx.fillRect(WX + (piece.x + c) * CELL + 2, WY + (gy + r) * CELL + 2, CELL - 4, CELL - 4));
        }
        eachCell(piece.m, (c, r) => piece.y + r >= 0 && tile(STYLE[piece.type], WX + (piece.x + c) * CELL, WY + (piece.y + r) * CELL));
      }

      if (state === 'ending' || state === 'over') {
        const rows = state === 'over' ? ROWS : Math.min(ROWS, Math.floor(endT / 0.035));
        for (let i = 0; i < rows; i++) for (let c = 0; c < COLS; c++) tile(2, WX + c * CELL, WY + (ROWS - 1 - i) * CELL);
      }
      if (state === 'ready') banner([['PUSH', 16], ['START', 16], [matchMedia('(pointer: coarse)').matches ? 'TAP' : 'ENTER', 8]]);
      else if (state === 'over') banner([['GAME', 16], ['OVER', 16]]);
    }

    // side panel
    text('NEXT', PX, WY, 8, C2);
    ctx.fillStyle = C3;
    ctx.fillRect(PX, 22, 80, 50);
    ctx.fillStyle = C0;
    ctx.fillRect(PX + 2, 24, 76, 46);
    const m = SHAPES[next];
    let minR = 9;
    let maxR = 0;
    let minC = 9;
    let maxC = 0;
    eachCell(m, (c, r) => {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    });
    const ox = Math.round(PX + (80 - (maxC - minC + 1) * CELL) / 2 - minC * CELL);
    const oy = Math.round(22 + (50 - (maxR - minR + 1) * CELL) / 2 - minR * CELL);
    eachCell(m, (c, r) => tile(STYLE[next], ox + c * CELL, oy + r * CELL));

    const stats = [
      ['SCORE', String(Math.min(score, 999999))],
      ['LEVEL', String(level)],
      ['LINES', String(lines)],
      ['HI', String(Math.min(Math.max(store.get('best', 0), score), 999999))],
    ];
    stats.forEach(([label, value], i) => {
      const y = 82 + i * 38;
      text(label, PX, y, 8, C2);
      text(value, PX + 80, y + 11, 16, C3, 'right');
    });

    ctx.fillStyle = C3;
    ctx.fillRect(PX, 240, 80, 50);
    text('BLOCKS', PX + 40, 250, 16, C0, 'center');
    text('P = PAUSE', PX + 40, 272, 8, C1, 'center');
  }

  // -------------------------------------------------------------------------
  // Input

  swipe(canvas, dir => act({ left: 'left', right: 'right', down: 'drop', up: 'rotate' }[dir]), () => act('rotate'));
  host.pad([
    { act: 'left', label: '◀', title: 'Left', repeat: true },
    { act: 'rotate', label: '⟳', title: 'Rotate' },
    { act: 'down', label: '▼', title: 'Soft drop', repeat: true },
    { act: 'drop', label: '⤓', title: 'Hard drop' },
    { act: 'right', label: '▶', title: 'Right', repeat: true },
    { act: 'pause', label: '❚❚', title: 'Pause' },
  ]);

  newGame();
  fontReady.then(() => !ticker.running && draw());

  return {
    newGame: () => newGame(),
    help: HELP,
    menu: () => [
      ...[0, 5, 9].map(n => ({ label: `Start at level ${n}`, radio: true, checked: startLevel === n, act: () => setStart(n) })),
      { label: 'Ghost piece', checked: ghost, act: toggleGhost },
      { sep: true },
      { label: state === 'paused' ? 'Resume' : 'Pause', key: 'P', disabled: !['run', 'clearing', 'paused'].includes(state), act: togglePause },
      { label: 'High score…', act: showBest },
    ],
    key(e) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!GAME_KEYS.has(k)) return false;
      if (e.repeat) return true; // auto-repeat is ours (DAS), not the keyboard's
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const dir = k === 'ArrowLeft' ? -1 : 1;
        held[dir < 0 ? 'left' : 'right'] = true;
        das = { dir, t: 0, charged: false };
      } else if (k === 'ArrowDown') held.down = true;

      if (state === 'ready') {
        if (k !== 'Escape') begin();
      } else if (state === 'paused') {
        if (['p', 'Escape', 'Enter', ' '].includes(k)) resume();
      } else if (state === 'over') {
        if (k === 'Enter' || k === ' ') newGame(true);
      } else if (k === 'p' || k === 'Escape' || k === 'Enter') {
        pause();
      } else if (state === 'run') {
        if (k === 'ArrowLeft') shift(-1);
        else if (k === 'ArrowRight') shift(1);
        else if (k === 'ArrowDown') softStep();
        else if (k === 'ArrowUp' || k === 'x') rotate(1);
        else if (k === 'z') rotate(-1);
        else if (k === ' ') hardDrop();
      }
      return true;
    },
    keyup(e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        held[dir < 0 ? 'left' : 'right'] = false;
        const other = held[dir < 0 ? 'right' : 'left'];
        if (das?.dir === dir) das = other ? { dir: -dir, t: 0, charged: false } : null;
        return true;
      }
      if (e.key === 'ArrowDown') {
        held.down = false;
        return true;
      }
      return false;
    },
    pause,
    pad(name, down) {
      if (down) act(name);
    },
  };
}
