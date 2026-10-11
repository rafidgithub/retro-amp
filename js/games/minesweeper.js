// Minesweeper, Windows 3.1 to XP. Left click opens, right click flags, click a
// number whose flags are all placed to open its neighbors (chord).
import { crisp } from './common.js';
import { h } from '../util.js';

const LEVELS = {
  beginner: { name: 'Beginner', rows: 9, cols: 9, mines: 10 },
  intermediate: { name: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  expert: { name: 'Expert', rows: 16, cols: 30, mines: 99 },
};

// Red seven-segment counter digits, 13×23 like the original.
const SEGS = {
  a: [[2, 1], [11, 1], [9, 3], [4, 3]],
  b: [[12, 2], [12, 10.5], [10, 9.5], [10, 4]],
  c: [[12, 12.5], [12, 21], [10, 19], [10, 13.5]],
  d: [[2, 22], [11, 22], [9, 20], [4, 20]],
  e: [[1, 12.5], [3, 13.5], [3, 19], [1, 21]],
  f: [[1, 2], [3, 4], [3, 9.5], [1, 10.5]],
  g: [[2, 11.5], [4, 10.5], [9, 10.5], [11, 11.5], [9, 12.5], [4, 12.5]],
};
const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };

function led(ctx, n) {
  const s = n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 39, 23);
  [...s].forEach((ch, i) => {
    for (const [seg, pts] of Object.entries(SEGS)) {
      ctx.fillStyle = DIGITS[ch].includes(seg) ? '#ff0000' : '#3a0000';
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x + i * 13, y) : ctx.moveTo(x + i * 13, y)));
      ctx.fill();
    }
  });
}

export default function create(host) {
  const { store } = host;
  let level = LEVELS[store.get('level')] ? store.get('level') : 'beginner';
  let marks = store.get('marks', true);
  let cells = [];
  let rows = 0;
  let cols = 0;
  let mines = 0;
  let status = 'ready'; // ready | playing | won | lost
  let flags = 0;
  let opened = 0;
  let elapsed = 0;
  let timer = 0;
  let cursor = -1;

  const root = h('div', 'ms');
  const head = h('div', 'ms-head');
  const minesLed = h('canvas', 'ms-led');
  const timeLed = h('canvas', 'ms-led');
  const face = h('button', 'ms-face');
  face.setAttribute('aria-label', 'New game');
  head.append(minesLed, face, timeLed);
  const grid = h('div', 'ms-grid');
  grid.setAttribute('role', 'grid');
  grid.tabIndex = 0;
  root.append(head, grid);
  host.body.append(root);
  const minesCtx = crisp(minesLed, 39, 23);
  const timeCtx = crisp(timeLed, 39, 23);

  const setFace = f => (face.dataset.face = f);
  const drawCounters = () => {
    led(minesCtx, mines - flags);
    led(timeCtx, elapsed);
  };

  function newGame() {
    stopTimer();
    ({ rows, cols, mines } = LEVELS[level]);
    status = 'ready';
    flags = 0;
    opened = 0;
    elapsed = 0;
    cursor = -1;
    grid.style.setProperty('--cols', cols);
    cells = Array.from({ length: rows * cols }, (_, i) => {
      const el = h('div', 'ms-c');
      el.dataset.i = i;
      return { el, mine: false, n: 0, open: false, mark: 0 };
    });
    grid.replaceChildren(...cells.map(c => c.el));
    setFace('smile');
    drawCounters();
  }

  const around = i => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if ((dr || dc) && rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
      }
    }
    return out;
  };

  // Mines go down on the first click, never under it (or its neighbors, when there's room).
  function layMines(first) {
    const keep = new Set([first, ...(rows * cols - 9 >= mines ? around(first) : [])]);
    const spots = cells.map((_, i) => i).filter(i => !keep.has(i));
    for (let k = 0; k < mines; k++) {
      const j = k + Math.floor(Math.random() * (spots.length - k));
      [spots[k], spots[j]] = [spots[j], spots[k]];
      cells[spots[k]].mine = true;
    }
    cells.forEach((c, i) => (c.n = around(i).filter(j => cells[j].mine).length));
  }

  function paint(i) {
    const c = cells[i];
    let cls = 'ms-c';
    let text = '';
    if (c.open) {
      cls += ' open';
      if (c.mine) cls += c.boom ? ' mine boom' : ' mine';
      else if (c.n) {
        cls += ` n${c.n}`;
        text = c.n;
      }
    } else if (c.mark === 1) cls += status === 'lost' && !c.mine ? ' open wrong' : ' flag';
    else if (c.mark === 2) cls += ' q';
    if (i === cursor) cls += ' cur';
    c.el.className = cls;
    c.el.textContent = text;
  }

  function startTimer() {
    if (timer || status !== 'playing') return;
    timer = setInterval(() => {
      if (elapsed < 999) elapsed++;
      drawCounters();
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = 0;
  }

  function open(i) {
    if (status === 'won' || status === 'lost') return;
    if (status === 'ready') {
      layMines(i);
      status = 'playing';
      elapsed = 1;
      drawCounters();
    }
    startTimer();
    const c = cells[i];
    if (c.open || c.mark === 1) return;
    if (c.mine) return lose(i);
    // Flood-open the empty region.
    const stack = [i];
    while (stack.length) {
      const j = stack.pop();
      const d = cells[j];
      if (d.open || d.mark === 1) continue;
      d.open = true;
      d.mark = 0;
      opened++;
      paint(j);
      if (!d.n) stack.push(...around(j).filter(k => !cells[k].open));
    }
    if (opened === rows * cols - mines) win();
  }

  // Open every neighbor once the right number of flags surrounds a number.
  function chord(i) {
    const c = cells[i];
    if (!c.open || !c.n || status !== 'playing') return;
    const near = around(i);
    if (near.filter(j => cells[j].mark === 1).length !== c.n) return;
    for (const j of near) if (!cells[j].open && cells[j].mark !== 1) open(j);
  }

  function mark(i) {
    const c = cells[i];
    if (!c || c.open || status === 'won' || status === 'lost') return;
    const was = c.mark;
    c.mark = (c.mark + 1) % (marks ? 3 : 2); // flag → ? → blank
    flags += (c.mark === 1) - (was === 1);
    paint(i);
    drawCounters();
  }

  function lose(i) {
    status = 'lost';
    stopTimer();
    cells[i].boom = true;
    cells.forEach((c, j) => {
      if (c.mine && c.mark !== 1) c.open = true;
      paint(j);
    });
    setFace('dead');
  }

  function win() {
    status = 'won';
    stopTimer();
    cells.forEach((c, j) => {
      if (c.mine) c.mark = 1;
      paint(j);
    });
    flags = mines;
    drawCounters();
    setFace('cool');
    const best = store.get('best', {});
    if (!(best[level] <= elapsed)) {
      store.set('best', { ...best, [level]: elapsed });
      setTimeout(
        () => host.alert({
          title: 'Fastest time!',
          text: `You have the fastest time for ${LEVELS[level].name.toLowerCase()} level: ${elapsed} seconds.`,
          buttons: [{ label: 'OK' }, { label: 'Best Times…', act: showBest }],
        }),
        250,
      );
    }
  }

  function showBest() {
    const best = store.get('best', {});
    const list = h('dl', 'g-scores');
    for (const [id, l] of Object.entries(LEVELS)) list.append(h('dt', '', `${l.name}:`), h('dd', '', best[id] ? `${best[id]} seconds` : '—'));
    host.alert({
      title: 'Fastest Mine Sweepers',
      content: list,
      buttons: [{ label: 'OK' }, { label: 'Reset Scores', act: () => store.set('best', {}) }],
    });
  }

  function setLevel(id) {
    level = id;
    store.set('level', id);
    newGame();
  }

  // ---------------------------------------------------------------------------
  // Mouse and touch: press shows the sunken cell, release acts — like the original.

  let press = null; // { id, chord, cell, longTimer, flagged }
  const cellAt = e => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ms-c');
    return el && grid.contains(el) ? Number(el.dataset.i) : -1;
  };
  const pressed = new Set();
  function showPressed(i, wide) {
    for (const j of pressed) cells[j].el.classList.remove('down');
    pressed.clear();
    if (i < 0 || status === 'won' || status === 'lost') return;
    for (const j of wide ? [i, ...around(i)] : [i]) {
      if (!cells[j].open && cells[j].mark !== 1) {
        cells[j].el.classList.add('down');
        pressed.add(j);
      }
    }
  }

  grid.addEventListener('contextmenu', e => e.preventDefault());
  grid.addEventListener('pointerdown', e => {
    const i = cellAt(e);
    if (i < 0) return;
    if (status === 'won' || status === 'lost') return;
    if (e.button === 2 && e.buttons !== 3) return mark(i);
    grid.setPointerCapture(e.pointerId);
    const both = e.buttons === 3 || e.button === 1;
    press = { id: e.pointerId, chord: both || cells[i].open, flagged: false, longTimer: 0 };
    if (e.pointerType !== 'mouse') {
      // long press flags on touch screens
      press.longTimer = setTimeout(() => {
        if (!press) return;
        press.flagged = true;
        showPressed(-1);
        mark(cellAt(e));
        navigator.vibrate?.(15);
      }, 420);
    }
    setFace('ooh');
    showPressed(i, press.chord);
  });
  grid.addEventListener('pointermove', e => {
    if (!press || press.id !== e.pointerId) return;
    if (press.longTimer && e.pointerType !== 'mouse') return; // finger jitter
    if (e.buttons === 3) press.chord = true;
    showPressed(cellAt(e), press.chord);
  });
  const release = e => {
    if (!press || press.id !== e.pointerId) return;
    const p = press;
    press = null;
    clearTimeout(p.longTimer);
    showPressed(-1);
    if (status === 'ready' || status === 'playing') setFace('smile');
    if (e.type === 'pointercancel' || p.flagged) return;
    const i = cellAt(e);
    if (i < 0) return;
    if (p.chord) chord(i);
    else open(i);
  };
  grid.addEventListener('pointerup', release);
  grid.addEventListener('pointercancel', release);
  grid.addEventListener('dblclick', e => {
    const i = cellAt(e);
    if (i >= 0) chord(i);
  });
  face.addEventListener('click', newGame);

  // Keyboard: arrows move a cursor, Space/Enter opens (or chords), F flags.
  function key(e) {
    const k = e.key;
    const move = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k];
    if (move) {
      const prev = cursor;
      if (cursor < 0) cursor = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
      else {
        const r = Math.min(rows - 1, Math.max(0, Math.floor(cursor / cols) + move[0]));
        const c = Math.min(cols - 1, Math.max(0, (cursor % cols) + move[1]));
        cursor = r * cols + c;
      }
      if (prev >= 0) paint(prev);
      paint(cursor);
      return true;
    }
    if (cursor < 0) return false;
    if (k === ' ' || k === 'Enter') {
      if (cells[cursor].open) chord(cursor);
      else open(cursor);
      paint(cursor);
      return true;
    }
    if (k === 'f' || k === 'F' || k === '?') {
      mark(cursor);
      return true;
    }
    return false;
  }

  newGame();

  return {
    newGame,
    help: 'Find every mine without stepping on one.\n\nClick a square to open it. The number tells how many mines touch it. Right-click (or long-press) to plant a flag where you think a mine is.\n\nClick a number whose mines are all flagged to open its neighbors at once — or press both buttons. Click the smiley, or press F2, for a new game.\n\nKeyboard: arrows move, Space opens, F flags.',
    menu: () => [
      ...Object.entries(LEVELS).map(([id, l]) => ({ label: l.name, radio: true, checked: level === id, act: () => setLevel(id) })),
      { sep: true },
      {
        label: 'Marks (?)',
        checked: marks,
        act: () => {
          marks = !marks;
          store.set('marks', marks);
          if (!marks) cells.forEach((c, i) => c.mark === 2 && ((c.mark = 0), paint(i)));
        },
      },
      { sep: true },
      { label: 'Best Times…', act: showBest },
    ],
    key,
    pause: stopTimer,
  };
}
