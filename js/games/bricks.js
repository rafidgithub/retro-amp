// Bricks: the 1976 arcade wall-breaker. Eight rows in four colors, the ball
// speeds up after 4 and 12 hits and on first touching the orange and red rows,
// and the paddle shrinks to half once the ball reaches the back wall.
import { crisp, loop, toLocal, PIXEL_FONT, fontReady } from './common.js';
import { isMenuOpen } from '../core/menu.js';
import { h } from '../core/util.js';

const W = 360;
const H = 300;
const WALL_Y = 36; // top wall (HUD above it)
const WALL_H = 8;
const FL = 12; // field left / right / top
const FR = W - 12;
const FT = WALL_Y + WALL_H;
const COLS = 14;
const ROWS = 8;
const BW = (FR - FL) / COLS; // 24
const BH = 9;
const BT = 72; // top of the brick wall
const PAD_Y = 274;
const PAD_H = 6;
const R = 2.5; // ball half-size (5px square)
const BALLS = 3;
const PADDLE_SPEED = 300;
const ANGLES = [18, 32, 46, 60].map(d => (d * Math.PI) / 180); // from vertical, center → edge
const POINTS = [7, 7, 5, 5, 3, 3, 1, 1];
const COLORS = ['#d83a3a', '#e8862a', '#3fae4f', '#e6d23a'];
const LIGHT = ['#f07070', '#ffb060', '#78d884', '#fff07a'];

export default function create(host) {
  const { store } = host;
  const cab = h('div', 'brk-cab');
  const screen = h('div', 'brk-screen');
  const canvas = h('canvas');
  canvas.setAttribute('aria-label', 'Bricks playfield');
  screen.append(canvas);
  cab.append(screen);
  host.body.append(cab);
  const ctx = crisp(canvas, W, H);

  let wide = !!store.get('wide', false);
  let mouseCtl = store.get('mouse', true) !== false;
  let best = store.get('best', 0);

  const bricks = new Uint8Array(COLS * ROWS);
  const held = { left: false, right: false };
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let state = 'serve'; // serve | play | over
  let paused = false;
  let score = 0;
  let ballNo = 1;
  let level = 1;
  let left = 0;
  let px = W / 2;
  let pw = 36;
  let shrunk = false;
  let base = 200;
  let speed = 200;
  let hits = 0;
  let steps = 0;
  let touchedOrange = false;
  let touchedRed = false;
  let banner = '';

  const basePW = () => (wide ? 56 : 36);
  const setPaddle = x => {
    px = Math.min(FR - pw / 2, Math.max(FL + pw / 2, x));
  };

  function resetWall() {
    bricks.fill(1);
    left = bricks.length;
    shrunk = false;
    pw = basePW();
    setPaddle(px);
  }

  // Speed-ups count per ball; a fresh ball starts at the level's base speed.
  function resetBall() {
    base = Math.min(320, 200 + (level - 1) * 20);
    speed = base;
    hits = 0;
    steps = 0;
    touchedOrange = touchedRed = false;
    ball.vx = ball.vy = 0;
    state = 'serve';
  }

  function speedUp() {
    steps++;
    speed = Math.min(460, base * (1 + 0.18 * steps));
    const k = speed / Math.hypot(ball.vx, ball.vy);
    ball.vx *= k;
    ball.vy *= k;
  }

  function aim(angle, dir) {
    ball.vx = dir * Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
  }

  function newGame() {
    score = 0;
    ballNo = 1;
    level = 1;
    px = W / 2;
    resetWall();
    resetBall();
    banner = 'LEVEL 1';
    paused = false;
    sync();
  }

  function launch() {
    if (state === 'over') return newGame();
    if (paused) return resume();
    if (state !== 'serve') return;
    state = 'play';
    ball.x = px;
    ball.y = PAD_Y - R;
    aim(ANGLES[1 + Math.floor(Math.random() * 2)], Math.random() < 0.5 ? -1 : 1);
    sync();
  }

  function pause() {
    if (paused || state === 'over') return;
    paused = true;
    held.left = held.right = false;
    sync();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    sync();
  }

  const togglePause = () => (paused ? resume() : pause());

  // Loop only while something can move; paused and game-over show a still frame.
  function sync() {
    if (!paused && state !== 'over') tick.start();
    else tick.stop();
    screen.classList.toggle('brk-play', mouseCtl && !paused && state !== 'over');
    draw();
  }

  function gameOver() {
    state = 'over';
    const isBest = score > best;
    if (isBest) {
      best = score;
      store.set('best', best);
    }
    sync();
    host.alert({
      title: 'Game over',
      text: `Score: ${score}\nBest: ${best}${isBest && score ? '\n\nNew best score!' : ''}`,
      buttons: [{ label: 'Play again', act: newGame }, { label: 'Close' }],
    });
  }

  // ---------------------------------------------------------------------------
  // Physics: substeps of ≤2px, x and y resolved separately so the ball can't
  // tunnel through a brick or slip past the paddle.

  function hitBrick() {
    const c0 = Math.max(0, Math.floor((ball.x - R - FL) / BW));
    const c1 = Math.min(COLS - 1, Math.floor((ball.x + R - FL) / BW));
    const r0 = Math.max(0, Math.floor((ball.y - R - BT) / BH));
    const r1 = Math.min(ROWS - 1, Math.floor((ball.y + R - BT) / BH));
    let hit = -1;
    let near = Infinity;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!bricks[r * COLS + c]) continue;
        const d = Math.hypot(FL + (c + 0.5) * BW - ball.x, BT + (r + 0.5) * BH - ball.y);
        if (d < near) {
          near = d;
          hit = r * COLS + c;
        }
      }
    }
    if (hit < 0) return false;
    const row = Math.floor(hit / COLS);
    bricks[hit] = 0;
    left--;
    score += POINTS[row];
    hits++;
    if (hits === 4 || hits === 12) speedUp();
    if (row < 2 && !touchedRed) {
      touchedRed = true;
      speedUp();
    } else if (row < 4 && row >= 2 && !touchedOrange) {
      touchedOrange = true;
      speedUp();
    }
    if (!left) {
      level++;
      resetWall();
      resetBall();
      banner = `LEVEL ${level}`;
    }
    return true;
  }

  function stepBall(dt) {
    ball.x += ball.vx * dt;
    if (ball.x - R < FL) {
      ball.x = FL + R;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + R > FR) {
      ball.x = FR - R;
      ball.vx = -Math.abs(ball.vx);
    } else if (hitBrick()) {
      if (state !== 'play') return;
      ball.x -= ball.vx * dt;
      ball.vx = -ball.vx;
    }

    ball.y += ball.vy * dt;
    if (ball.y - R < FT) {
      ball.y = FT + R;
      ball.vy = Math.abs(ball.vy);
      if (!shrunk) {
        shrunk = true;
        pw = basePW() / 2;
        setPaddle(px);
      }
    } else if (hitBrick()) {
      if (state !== 'play') return;
      ball.y -= ball.vy * dt;
      ball.vy = -ball.vy;
    } else if (ball.vy > 0 && ball.y + R >= PAD_Y && ball.y + R <= PAD_Y + PAD_H + 4 && ball.x + R >= px - pw / 2 && ball.x - R <= px + pw / 2) {
      // Where it lands on the paddle picks one of four angles each side.
      const off = Math.max(-1, Math.min(1, (ball.x - px) / (pw / 2)));
      const seg = Math.min(3, Math.floor(Math.abs(off) * 4));
      ball.y = PAD_Y - R;
      aim(ANGLES[seg], off < 0 ? -1 : off > 0 ? 1 : Math.sign(ball.vx) || 1);
    } else if (ball.y - R > H) {
      if (++ballNo > BALLS) return gameOver();
      resetBall();
      banner = `BALL ${ballNo}`;
    }
  }

  function update(dt) {
    const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    if (dir) setPaddle(px + dir * PADDLE_SPEED * dt);
    if (state !== 'play') return;
    const n = Math.max(1, Math.ceil((speed * dt) / 2));
    for (let i = 0; i < n && state === 'play'; i++) stepBall(dt / n);
  }

  // Menus freeze the action, like the originals did.
  const tick = loop((dt, now) => {
    if (!isMenuOpen()) update(dt);
    draw(now);
  });

  // ---------------------------------------------------------------------------
  // Drawing

  function text(str, x, y, size, color, align = 'left') {
    ctx.font = `${size}px ${PIXEL_FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(str, x, y);
  }

  function draw(now = performance.now()) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const hud = [
      ['SCORE', String(score).padStart(3, '0'), 14, 'left'],
      ['BALL', String(Math.min(ballNo, BALLS)), 132, 'left'],
      ['LEVEL', String(level), 206, 'left'],
      ['HI', String(Math.max(best, score)).padStart(3, '0'), W - 14, 'right'],
    ];
    for (const [label, value, x, align] of hud) {
      text(label, x, 3, 8, '#8f8f96', align);
      text(value, x, 14, 16, '#f2f2f2', align);
    }

    ctx.fillStyle = '#7d7d84';
    ctx.fillRect(0, WALL_Y, W, WALL_H);
    ctx.fillRect(0, WALL_Y, FL, H - WALL_Y);
    ctx.fillRect(FR, WALL_Y, W - FR, H - WALL_Y);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!bricks[r * COLS + c]) continue;
        const x = FL + c * BW + 1;
        const y = BT + r * BH + 1;
        ctx.fillStyle = COLORS[r >> 1];
        ctx.fillRect(x, y, BW - 2, BH - 2);
        ctx.fillStyle = LIGHT[r >> 1];
        ctx.fillRect(x, y, BW - 2, 1);
      }
    }

    ctx.fillStyle = '#3d8bff';
    ctx.fillRect(Math.round(px - pw / 2), PAD_Y, Math.round(pw), PAD_H);
    ctx.fillStyle = '#9cc6ff';
    ctx.fillRect(Math.round(px - pw / 2), PAD_Y, Math.round(pw), 1);

    if (state !== 'over') {
      const bx = state === 'serve' ? px : ball.x;
      const by = state === 'serve' ? PAD_Y - R : ball.y;
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(bx - R), Math.round(by - R), 5, 5);
    }

    const mid = W / 2;
    if (paused || state === 'over') {
      ctx.fillStyle = 'rgba(0, 0, 0, .55)';
      ctx.fillRect(FL, FT, FR - FL, H - FT);
      if (state === 'over') {
        text('GAME OVER', mid, 168, 16, '#fff', 'center');
        text('CLICK OR SPACE TO PLAY AGAIN', mid, 192, 8, '#c8c8c8', 'center');
      } else {
        text('PAUSED', mid, 168, 16, '#fff', 'center');
        text('SPACE OR P TO RESUME', mid, 192, 8, '#c8c8c8', 'center');
      }
    } else if (state === 'serve') {
      text(banner, mid, 176, 16, '#fff', 'center');
      if (now % 1000 < 650) text('CLICK OR SPACE TO SERVE', mid, 200, 8, '#c8c8c8', 'center');
    }
  }

  // ---------------------------------------------------------------------------
  // Input

  host.body.addEventListener('pointermove', e => {
    if (paused || state === 'over' || (e.pointerType === 'mouse' && !mouseCtl) || e.target.closest('.g-pad')) return;
    setPaddle(toLocal(canvas, e, W, H)[0]);
    if (!tick.running) draw();
  });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' && !paused && state !== 'over') setPaddle(toLocal(canvas, e, W, H)[0]);
  });
  canvas.addEventListener('click', launch);

  host.pad([
    { act: 'left', label: '◀', title: 'Left', repeat: true },
    { act: 'launch', label: '●', title: 'Serve' },
    { act: 'right', label: '▶', title: 'Right', repeat: true },
  ]);

  const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right' };

  fontReady.then(() => draw());
  newGame();

  return {
    newGame,
    pause,
    help:
      'Knock out every brick with the ball, and don’t let it get past your paddle.\n\n' +
      'Move: mouse, or ← →\nServe: click or Space\nPause: P or Space\n\n' +
      'Yellow 1 · Green 3 · Orange 5 · Red 7 points. The ball speeds up as you go, and your paddle shrinks once the ball reaches the back wall. Three balls per game.',
    menu: () => [
      { label: 'Paddle: Normal', radio: true, checked: !wide, act: () => setWide(false) },
      { label: 'Paddle: Wide (easy)', radio: true, checked: wide, act: () => setWide(true) },
      { sep: true },
      { label: 'Mouse control', checked: mouseCtl, act: toggleMouse },
      { label: 'Pause', key: 'P', checked: paused, disabled: state === 'over', act: togglePause },
      { sep: true },
      { label: 'Best score…', act: showBest },
    ],
    key(e) {
      if (ARROWS[e.key]) {
        if (!e.repeat) held[ARROWS[e.key]] = true;
        return true;
      }
      if (e.key === ' ') {
        if (e.repeat) return true;
        if (state === 'over') newGame();
        else if (state === 'serve' && !paused) launch();
        else togglePause();
        return true;
      }
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return true;
      }
      if (e.key === 'Escape' && !paused && state !== 'over') {
        pause();
        return true;
      }
      return false;
    },
    keyup(e) {
      if (!ARROWS[e.key]) return false;
      held[ARROWS[e.key]] = false;
      return true;
    },
    pad(act, down) {
      if (act === 'launch') {
        if (down) launch();
      } else held[act] = down;
    },
  };

  function setWide(v) {
    wide = v;
    store.set('wide', v);
    pw = shrunk ? basePW() / 2 : basePW();
    setPaddle(px);
    draw();
  }

  function toggleMouse() {
    mouseCtl = !mouseCtl;
    store.set('mouse', mouseCtl);
    sync();
  }

  function showBest() {
    host.alert({
      title: 'Best score',
      text: best ? `Best: ${best}` : 'No best score yet.',
      buttons: [
        { label: 'OK' },
        {
          label: 'Reset',
          act: () => {
            best = 0;
            store.set('best', 0);
            draw();
          },
        },
      ],
    });
  }
}
