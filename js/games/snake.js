// Snake — a late-90s phone Snake homage on a green-gray LCD.
import { h } from '../util.js';
import { crisp, loop, swipe, PIXEL_FONT, fontReady } from './common.js';

const COLS = 24;
const ROWS = 14;
const CELL = 12;
const BAR = 20; // score bar
const PAD = 4;
const OX = PAD;
const OY = BAR + PAD;
const W = COLS * CELL + PAD * 2;
const H = BAR + ROWS * CELL + PAD * 2;
const LCD = '#a7c18f';
const INK = '#1d2a14';
const GHOST = 'rgba(29, 42, 20, .14)'; // the faint offset shadow old LCDs had
const GRID = 'rgba(29, 42, 20, .05)';
const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
const FOOD = ['......', '..##..', '.#..#.', '.#..#.', '..##..', '......'];
const BUG = ['#....#', '.####.', '##..##', '.####.', '#.##.#', '......'];
const tickFor = level => (260 - (level - 1) * 25) / 1000; // level 1 = 260 ms … level 9 = 60 ms

const HELP = `Steer with the arrow keys (or WASD). Eat the dots to grow. Every fifth dot brings out a bonus bug, worth more the faster you get it.

Don’t bite your own tail. With Walls on, the edge is deadly too; with Walls off, you wrap around to the other side.

Space or P pauses. Level sets the speed. On a touch screen, swipe to turn and tap to pause.`;

export default function create(host) {
  const { store } = host;
  const phone = h('div', 'snk-phone');
  const grille = h('div', 'snk-grille');
  for (let i = 0; i < 4; i++) grille.append(h('i'));
  const screen = h('div', 'snk-screen');
  const canvas = h('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Snake');
  screen.append(canvas);
  phone.append(grille, screen);
  host.body.append(phone);
  const ctx = crisp(canvas, W, H);

  let level = store.get('level', 5);
  let walls = store.get('walls', false);
  let snake, dir, moved, queue, grow, score, eaten, food, bonus, acc, dyingT;
  let state = 'ready'; // ready | run | paused | dying | over

  const ticker = loop(dt => {
    if (state === 'run') {
      acc += dt;
      const t = tickFor(level);
      while (acc >= t && state === 'run') {
        acc -= t;
        step();
      }
    } else if (state === 'dying') {
      dyingT += dt;
      if (dyingT >= 1.2) return gameOver();
    }
    draw();
  });

  function newGame(start = false) {
    ticker.stop();
    const y = ROWS >> 1;
    snake = [[6, y], [5, y], [4, y], [3, y], [2, y]];
    dir = moved = DIRS.right;
    queue = [];
    grow = score = eaten = acc = dyingT = 0;
    bonus = null;
    food = freeCell();
    state = 'ready';
    if (start) begin();
    else draw();
  }

  function begin() {
    state = 'run';
    acc = 0;
    ticker.start();
  }

  function pause() {
    if (state !== 'run') return;
    state = 'paused';
    ticker.stop();
    draw();
  }

  function togglePause() {
    if (state === 'run') pause();
    else if (state === 'paused' || state === 'ready') begin();
    else if (state === 'over') newGame(true);
  }

  function turn(name) {
    if (state === 'dying') return;
    if (state === 'over') newGame();
    const d = DIRS[name];
    const last = queue.length ? queue[queue.length - 1] : dir;
    const reverse = d[0] === -last[0] && d[1] === -last[1];
    if (d !== last && !reverse && queue.length < 2) queue.push(d);
    if (state !== 'run') begin();
  }

  const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

  function freeCell() {
    const free = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = [x, y];
        if (!snake.some(s => same(s, c)) && !same(food, c) && !same(bonus, c)) free.push(c);
      }
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  function step() {
    if (queue.length) dir = queue.shift();
    moved = dir;
    let x = snake[0][0] + dir[0];
    let y = snake[0][1] + dir[1];
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) {
      if (walls) return die();
      x = (x + COLS) % COLS;
      y = (y + ROWS) % ROWS;
    }
    const head = [x, y];
    const body = grow ? snake : snake.slice(0, -1); // the tail moves out of the way
    if (body.some(s => same(s, head))) return die();
    snake.unshift(head);
    if (grow) grow--;
    else snake.pop();

    if (same(head, food)) {
      score += level;
      grow++;
      eaten++;
      food = freeCell();
      if (eaten % 5 === 0) {
        const c = freeCell();
        bonus = c && Object.assign(c, { ticks: 20 });
      }
    }
    if (bonus && same(head, bonus)) {
      score += level * 5 + bonus.ticks;
      bonus = null;
    } else if (bonus && --bonus.ticks <= 0) bonus = null;
  }

  function die() {
    state = 'dying';
    dyingT = 0;
  }

  function gameOver() {
    state = 'over';
    ticker.stop();
    draw();
    const key = walls ? 'bestWalls' : 'bestOpen';
    const best = store.get(key, 0);
    const record = score > best;
    if (record) store.set(key, score);
    host.alert({
      title: 'Game over',
      text: `Score: ${score}\nBest: ${Math.max(best, score)}${record ? '\n\nNew high score!' : ''}`,
      buttons: [{ label: 'Play again', act: () => newGame(true) }, { label: 'Close' }],
    });
  }

  function setLevel(n) {
    level = n;
    store.set('level', n);
    draw();
  }

  function toggleWalls() {
    walls = !walls;
    store.set('walls', walls);
    newGame();
  }

  function showBest() {
    const dl = h('dl', 'g-scores');
    for (const [label, key] of [['Walls on', 'bestWalls'], ['Walls off', 'bestOpen']]) {
      dl.append(h('dt', '', label), h('dd', '', String(store.get(key, 0))));
    }
    host.alert({
      title: 'Best scores',
      content: dl,
      buttons: [
        { label: 'OK' },
        {
          label: 'Reset',
          act: () => {
            store.set('bestWalls', 0);
            store.set('bestOpen', 0);
          },
        },
      ],
    });
  }

  // -------------------------------------------------------------------------
  // Drawing: every shape goes in twice, a faint offset ghost first, then ink.

  let rects = [];
  const ink = (x, y, w, hgt) => rects.push([x, y, w, hgt]);
  function flush() {
    ctx.fillStyle = GHOST;
    for (const [x, y, w, hgt] of rects) ctx.fillRect(x + 1, y + 1, w, hgt);
    ctx.fillStyle = INK;
    for (const [x, y, w, hgt] of rects) ctx.fillRect(x, y, w, hgt);
    rects = [];
  }

  function sprite(rows, px, py) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ink(px + i * 2, py + j * 2, 2, 2);
    });
  }

  function text(str, x, y, size, align = 'left') {
    ctx.font = `${size}px ${PIXEL_FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GHOST;
    ctx.fillText(str, x + 1, y + 1);
    ctx.fillStyle = INK;
    ctx.fillText(str, x, y);
  }

  function banner(lines) {
    const bh = lines.reduce((a, [, size]) => a + size + 4, 10);
    const bw = 210;
    const bx = Math.round((W - bw) / 2);
    const by = Math.round(OY + (ROWS * CELL - bh) / 2);
    ctx.fillStyle = LCD;
    ctx.fillRect(bx, by, bw, bh);
    ink(bx, by, bw, 2);
    ink(bx, by + bh - 2, bw, 2);
    ink(bx, by, 2, bh);
    ink(bx + bw - 2, by, 2, bh);
    flush();
    let y = by + 7;
    for (const [str, size] of lines) {
      text(str, W / 2, y, size, 'center');
      y += size + 4;
    }
  }

  function draw() {
    ctx.fillStyle = LCD;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = GRID;
    for (let x = 0; x <= COLS; x++) ctx.fillRect(OX + x * CELL, OY, 1, ROWS * CELL);
    for (let y = 0; y <= ROWS; y++) ctx.fillRect(OX, OY + y * CELL, COLS * CELL, 1);

    // field edge: solid when it's a wall, dotted when you wrap
    const fw = COLS * CELL + 6;
    const fh = ROWS * CELL + 6;
    if (walls) {
      ink(OX - 3, OY - 3, fw, 2);
      ink(OX - 3, OY + ROWS * CELL + 1, fw, 2);
      ink(OX - 3, OY - 3, 2, fh);
      ink(OX + COLS * CELL + 1, OY - 3, 2, fh);
    } else {
      ink(OX - 3, OY - 3, fw, 2);
      for (let x = 0; x < fw; x += 6) ink(OX - 3 + x, OY + ROWS * CELL + 1, 2, 2);
      for (let y = 6; y < fh; y += 6) {
        ink(OX - 3, OY - 3 + y, 2, 2);
        ink(OX + COLS * CELL + 1, OY - 3 + y, 2, 2);
      }
    }

    sprite(FOOD, OX + food[0] * CELL, OY + food[1] * CELL);
    if (bonus) sprite(BUG, OX + bonus[0] * CELL, OY + bonus[1] * CELL);

    const hidden = state === 'dying' && Math.floor(dyingT / 0.15) % 2 === 1;
    let eye = null;
    if (!hidden) {
      snake.forEach(([x, y], i) => {
        const px = OX + x * CELL;
        const py = OY + y * CELL;
        if (i === 0) {
          ink(px + 1, py + 1, CELL - 2, CELL - 2);
          eye = [px + (moved[0] > 0 ? 7 : 3), py + (moved[1] > 0 ? 7 : 3)];
        } else ink(px + 2, py + 2, CELL - 4, CELL - 4);
        const prev = snake[i - 1];
        if (!prev) return;
        const dx = prev[0] - x;
        const dy = prev[1] - y;
        if (Math.abs(dx) + Math.abs(dy) !== 1) return; // wrapped across the edge
        if (dx) ink(dx > 0 ? px + CELL - 2 : px - 2, py + 3, 4, CELL - 6);
        else ink(px + 3, dy > 0 ? py + CELL - 2 : py - 2, CELL - 6, 4);
      });
    }
    flush();
    if (eye) {
      ctx.fillStyle = LCD;
      ctx.fillRect(eye[0], eye[1], 2, 2);
      // mouth opens when food is right ahead
      const ahead = [snake[0][0] + moved[0], snake[0][1] + moved[1]];
      if (same(ahead, food) || same(ahead, bonus)) {
        const px = OX + snake[0][0] * CELL;
        const py = OY + snake[0][1] * CELL;
        if (moved[0]) ctx.fillRect(moved[0] > 0 ? px + CELL - 4 : px + 1, py + 5, 3, 2);
        else ctx.fillRect(px + 5, moved[1] > 0 ? py + CELL - 4 : py + 1, 2, 3);
      }
    }

    text(String(score).padStart(4, '0'), PAD + 1, 2, 16);
    if (bonus) {
      text(String(bonus.ticks).padStart(2, '0'), W - PAD - 1, 2, 16, 'right');
      sprite(BUG, W - PAD - 42, 4);
      flush();
    }

    if (state === 'ready') banner([['SNAKE', 16], [touch() ? 'SWIPE TO START' : 'PRESS AN ARROW KEY', 8]]);
    else if (state === 'paused') banner([['PAUSED', 16], [touch() ? 'TAP TO GO ON' : 'SPACE TO GO ON', 8]]);
  }
  const touch = () => matchMedia('(pointer: coarse)').matches;

  // -------------------------------------------------------------------------
  // Input

  swipe(canvas, turn, togglePause);
  host.pad([
    { act: 'left', label: '◀', title: 'Left' },
    { act: 'up', label: '▲', title: 'Up' },
    { act: 'down', label: '▼', title: 'Down' },
    { act: 'right', label: '▶', title: 'Right' },
    { act: 'pause', label: '❚❚', title: 'Pause' },
  ]);

  newGame();
  fontReady.then(() => state !== 'run' && draw());

  return {
    newGame: () => newGame(),
    help: HELP,
    menu: () => [
      {
        label: 'Level',
        sub: Array.from({ length: 9 }, (_, i) => ({ label: `Level ${i + 1}`, radio: true, checked: level === i + 1, act: () => setLevel(i + 1) })),
      },
      { label: 'Walls', checked: walls, act: toggleWalls },
      { sep: true },
      { label: state === 'paused' ? 'Resume' : 'Pause', key: 'P', disabled: state !== 'run' && state !== 'paused', act: togglePause },
      { label: 'Best scores…', act: showBest },
    ],
    key(e) {
      const name = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (name) {
        if (!e.repeat) turn(name);
        return true;
      }
      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        if (!e.repeat) togglePause();
        return true;
      }
      if (e.key === 'Escape' && state === 'run') {
        pause();
        return true;
      }
      return false;
    },
    pause,
    pad(act, down) {
      if (!down) return;
      if (act === 'pause') togglePause();
      else turn(act);
    },
  };
}
