// Tetris in plain JS - by you + Copilot
// Board: 10x20. Each cell is 24px. Canvas is 240x480.

const COLS = 10;
const ROWS = 20;
const BLOCK = 24;

const KEY = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  DOWN: 'ArrowDown',
  ROTATE: 'ArrowUp',
  PAUSE: ' ',
  RESTART: 'r',
  RESTART_UPPER: 'R',
};

const COLORS = {
  I: getCssColor('--c-i'),
  J: getCssColor('--c-j'),
  L: getCssColor('--c-l'),
  O: getCssColor('--c-o'),
  S: getCssColor('--c-s'),
  T: getCssColor('--c-t'),
  Z: getCssColor('--c-z'),
};

function getCssColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#ccc';
}

// Shapes as rotation states (arrays of [row,col])
const SHAPES = {
  I: [
    [[0, -1], [0, 0], [0, 1], [0, 2]],
    [[-1, 1], [0, 1], [1, 1], [2, 1]],
  ],
  J: [
    [[-1, 0], [0, 0], [1, 0], [1, -1]],
    [[0, -1], [0, 0], [0, 1], [1, 1]],
    [[-1, 1], [-1, 0], [0, 0], [1, 0]],
    [[-1, -1], [0, -1], [0, 0], [0, 1]],
  ],
  L: [
    [[-1, 0], [0, 0], [1, 0], [1, 1]],
    [[0, -1], [0, 0], [0, 1], [-1, 1]],
    [[-1, -1], [-1, 0], [0, 0], [1, 0]],
    [[1, -1], [0, -1], [0, 0], [0, 1]],
  ],
  O: [
    [[0, 0], [0, 1], [1, 0], [1, 1]],
  ],
  S: [
    [[0, 0], [0, 1], [-1, 0], [-1, -1]],
    [[-1, 0], [0, 0], [0, 1], [1, 1]],
  ],
  T: [
    [[0, -1], [0, 0], [0, 1], [-1, 0]],
    [[-1, 0], [0, 0], [1, 0], [0, 1]],
    [[1, -1], [1, 0], [1, 1], [0, 0]],
    [[-1, 0], [0, 0], [1, 0], [0, -1]],
  ],
  Z: [
    [[0, 0], [0, -1], [-1, 0], [-1, 1]],
    [[-1, -1], [0, -1], [0, 0], [1, 0]],
  ],
};

const TYPES = Object.keys(SHAPES);

class RNG {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }
  next() {
    // xorshift32
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 0xffffffff;
  }
  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

class Bag {
  constructor(rng) {
    this.rng = rng;
    this.bag = [];
  }
  take() {
    if (this.bag.length === 0) {
      this.bag = TYPES.slice();
      // Fisher-Yates
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }
}

class Piece {
  constructor(type) {
    this.type = type;
    this.rot = 0;
    this.row = 0;
    this.col = Math.floor(COLS / 2) - 1; // spawn near center
  }
  get blocks() {
    const shape = SHAPES[this.type][this.rot];
    return shape.map(([dr, dc]) => [this.row + dr, this.col + dc]);
  }
  rotate(dir = 1) {
    const sz = SHAPES[this.type].length;
    this.rot = (this.rot + dir + sz) % sz;
  }
}

class Board {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.grid = [...Array(rows)].map(() => Array(cols).fill(null));
  }
  inBounds(r, c) {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }
  collides(piece) {
    // Allow blocks above the top (r < 0). Only enforce:
    // - horizontal bounds (c must be within [0, cols))
    // - bottom bound (r < rows)
    // - cell occupancy when r >= 0
    for (const [r, c] of piece.blocks) {
      if (c < 0 || c >= this.cols || r >= this.rows) return true;
      if (r >= 0 && this.grid[r]?.[c]) return true;
    }
    return false;
  }
  lock(piece) {
    for (const [r, c] of piece.blocks) {
      if (this.inBounds(r, c)) this.grid[r][c] = piece.type;
    }
    return this.clearLines();
  }
  clearLines() {
    let cleared = 0;
    this.grid = this.grid.filter(row => {
      const full = row.every(cell => cell);
      if (full) cleared++;
      return !full;
    });
    while (this.grid.length < this.rows) this.grid.unshift(Array(this.cols).fill(null));
    return cleared;
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById('board');
    this.ctx = this.canvas.getContext('2d');
    this.nextCanvas = document.getElementById('next');
    this.nextCtx = this.nextCanvas.getContext('2d');

    this.board = new Board(ROWS, COLS);
    this.rng = new RNG();
    this.bag = new Bag(this.rng);
    this.active = new Piece(this.bag.take());
    this.next = new Piece(this.bag.take());

    this.dropInterval = 800; // ms, decreases with level
    this.accumulator = 0;
    this.lastTime = 0;

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.paused = false;
    this.gameOver = false;

    this.bindInputs();
    this.updateHUD();
    this.draw();
    requestAnimationFrame(this.loop);
  }

  loop = (time) => {
    if (this.paused || this.gameOver) {
      this.lastTime = time;
      requestAnimationFrame(this.loop);
      return;
    }
    const delta = time - this.lastTime;
    this.lastTime = time;
    this.accumulator += delta;

    if (this.accumulator >= this.dropInterval) {
      this.accumulator = 0;
      this.softDrop();
    }

    this.draw();
    requestAnimationFrame(this.loop);
  };

  bindInputs() {
    document.addEventListener('keydown', (e) => {
      if (e.key === KEY.PAUSE) return this.togglePause();
      if (e.key === KEY.RESTART || e.key === KEY.RESTART_UPPER) return this.restart();
      if (this.paused || this.gameOver) return;

      if (e.key === KEY.LEFT) this.tryMove(-1, 0);
      else if (e.key === KEY.RIGHT) this.tryMove(1, 0);
      else if (e.key === KEY.DOWN) this.softDrop(true);
      else if (e.key === KEY.ROTATE) this.tryRotate();
    });

    document.getElementById('btn-start').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart').addEventListener('click', () => this.restart());
  }

  togglePause() {
    if (this.gameOver) return;
    this.paused = !this.paused;
  }

  restart() {
    this.board = new Board(ROWS, COLS);
    this.rng = new RNG();
    this.bag = new Bag(this.rng);
    this.active = new Piece(this.bag.take());
    this.next = new Piece(this.bag.take());
    this.dropInterval = 800;
    this.accumulator = 0;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.paused = false;
    this.gameOver = false;
    this.updateHUD();
  }

  levelUp() {
    this.level++;
    // Speed up: min 100ms
    this.dropInterval = Math.max(100, 800 - (this.level - 1) * 60);
  }

  tryMove(dc, dr) {
    const p = new Piece(this.active.type);
    p.rot = this.active.rot;
    p.row = this.active.row + (dr || 0);
    p.col = this.active.col + (dc || 0);
    if (!this.board.collides(p)) {
      this.active = p;
      this.draw();
    }
  }

  tryRotate(dir = 1) {
    const p = new Piece(this.active.type);
    p.rot = this.active.rot;
    p.row = this.active.row;
    p.col = this.active.col;
    p.rotate(dir);

    // Basic wall kicks: try shifting left/right up to 2
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      const test = new Piece(p.type);
      test.rot = p.rot;
      test.row = p.row;
      test.col = p.col + k;
      if (!this.board.collides(test)) {
        this.active = test;
        this.draw();
        return;
      }
    }
  }

  softDrop(addScore = false) {
    const p = new Piece(this.active.type);
    p.rot = this.active.rot;
    p.row = this.active.row + 1;
    p.col = this.active.col;

    if (!this.board.collides(p)) {
      this.active = p;
      if (addScore) this.addScore(1); // soft drop score
    } else {
      // lock and spawn next
      const cleared = this.board.lock(this.active);
      if (cleared > 0) {
        this.handleLineClear(cleared);
      }
      this.spawnNext();
    }
  }

  spawnNext() {
    this.active = this.next;
    this.next = new Piece(this.bag.take());
    // If new active collides at spawn => game over
    if (this.board.collides(this.active)) {
      this.gameOver = true;
      this.paused = true;
      this.drawGameOver();
    }
    this.updateHUD();
  }

  handleLineClear(n) {
    const base = [0, 100, 300, 500, 800][n] || 0;
    this.addScore(base * this.level);
    this.lines += n;
    if (Math.floor(this.lines / 10) + 1 > this.level) this.levelUp();
    this.updateHUD();
  }

  addScore(points) {
    this.score += points;
    this.updateHUD();
  }

  updateHUD() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('level').textContent = this.level;
    document.getElementById('lines').textContent = this.lines;
    this.drawNext();
  }

  drawCell(ctx, r, c, color) {
    const x = c * BLOCK;
    const y = r * BLOCK;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, BLOCK, BLOCK);
    // inner shading
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 2, y + 2, BLOCK - 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 2, y + BLOCK - 6, BLOCK - 4, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, BLOCK - 1, BLOCK - 1);
  }

  clearCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b0f1f';
    ctx.fillRect(0, 0, w, h);
  }

  draw() {
    this.clearCanvas(this.ctx, this.canvas.width, this.canvas.height);
    // fixed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.board.grid[r][c];
        if (t) this.drawCell(this.ctx, r, c, COLORS[t]);
      }
    }
    // active piece
    for (const [r, c] of this.active.blocks) {
      if (r >= 0) this.drawCell(this.ctx, r, c, COLORS[this.active.type]);
    }
  }

  drawNext() {
    this.clearCanvas(this.nextCtx, this.nextCanvas.width, this.nextCanvas.height);
    const shape = SHAPES[this.next.type][0];
    // center shape in 5x5 grid (120x120 canvas, BLOCK=24 -> 5x5)
    const offsetR = 2;
    const offsetC = 2;
    for (const [dr, dc] of shape) {
      const r = offsetR + dr;
      const c = offsetC + dc;
      this.drawCell(this.nextCtx, r, c, COLORS[this.next.type]);
    }
  }

  drawGameOver() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#e7eaf6';
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 10);
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillText('Rでリスタート', this.canvas.width / 2, this.canvas.height / 2 + 16);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
