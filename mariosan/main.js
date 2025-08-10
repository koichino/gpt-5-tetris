// Mariosan - tiny, extensible platformer
// Architecture: simple ECS-ish loop, tile collisions, 60fps target, multiple stages

import { TILE, Tiles, TileColors, Levels, EnemyType, idx } from './levels.js';
import { PlayerSprites, drawSprite, EnemySprites } from './sprites.js';

// --- Simple diagnostics (remove later if not needed) ---
let diag = { lastReset:'', tiles:0, enemies:0 };
window.__MARIOSAN_DIAG__ = diag;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Camera
const camera = { x: 0, y: 0, w: W, h: H };

// Input
const keys = new Set();
let justPressedUp = false;
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','r','R','n','N'].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === 'ArrowUp') justPressedUp = true;
  keys.add(e.key);
});
window.addEventListener('keyup', (e) => keys.delete(e.key));

// Game state
let levelIndex = 0;
let level = Levels[levelIndex];
let gravity = 1800; // px/s^2
let friction = 0.8; // ground friction
let maxRunSpeed = 260; // px/s
let accel = 1600; // px/s^2
let jumpVel = 650; // px/s
let timeScale = 1;
let player, enemies, solidFn;
let animTime = 0;
let projectiles = [];
// Boss behavior parameters (populated from level each reset)
// Defaults ensure backward compatibility if older levels lack custom fields
let currentBossHits = 3;
let currentBossFireCooldown = 1.6;
let currentBossFireBurst = 3;

// Overlay
const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const levelName = document.getElementById('levelName');
const stageSelect = document.getElementById('stageSelect');

// Populate stage selector
if(stageSelect){
  Levels.forEach((L, i)=>{
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i+1}: ${L.name}`;
    stageSelect.appendChild(opt);
  });
  stageSelect.addEventListener('change', ()=>{
    const idx = parseInt(stageSelect.value, 10) || 0;
    resetLevel(idx);
  });
}

function resetLevel(idxOverride) {
  try {
    levelIndex = idxOverride ?? levelIndex;
    level = Levels[levelIndex];
    levelName.textContent = level?.name || '(unknown)';
  } catch(err){
    console.error('Level load error', err);
    message.textContent = 'レベル読み込み失敗: '+ err;
    overlay.classList.remove('hidden');
    return;
  }
  if(stageSelect && stageSelect.value != String(levelIndex)) stageSelect.value = String(levelIndex);
  // Build collision accessor
  solidFn = (x, y) => isSolidTile(getTileAtWorld(x, y));

  // Create player
  const px = level.playerStart.x * TILE + TILE * 0.1;
  const py = level.playerStart.y * TILE - TILE; // stand on ground tile row
  player = makeBody(px, py, TILE * 0.8, TILE * 0.95);
  player.color = '#1E90FF';
  player.onGround = false;
  player.dead = false;
  player.win = false;
  player.face = 1; // 1 right, -1 left
  player.maxJumps = 2;
  player.jumpCount = 0;

  // Enemies
  enemies = (level.enemies||[]).map((e) => {
    const sizeMul = (e.type === EnemyType.Boss) ? 2.0 : 0.9;
    const b = makeBody(e.x * TILE, e.y * TILE - TILE * sizeMul, TILE * sizeMul, TILE * sizeMul);
    b.type = e.type;
    b.color = '#E67E22';
    b.speed = (e.type === EnemyType.Boss) ? 60 : 80;
    b.dir = -1;
    b.patrol = e.patrol ?? null;
    if (e.type === EnemyType.Boss) {
      b.hitsTaken = 0;
    }
    return b;
  });

  // Camera start
  camera.x = Math.max(0, player.x - 200);
  camera.y = 0;

  // Hide overlay
  overlay.classList.add('hidden');
  message.textContent = '';
  projectiles = [];

  // Per-level boss tuning
  currentBossHits = level?.bossHits || 3;
  currentBossFireCooldown = level?.bossFireCooldown || 1.6;
  currentBossFireBurst = level?.bossFireBurst || 3;

  // Diagnostics
  let nonEmpty = 0;
  if (level && level.tiles) {
    for (const t of level.tiles) if (t) nonEmpty++;
  }
  diag.lastReset = new Date().toISOString();
  diag.tiles = nonEmpty;
  diag.enemies = enemies.length;
  if(nonEmpty === 0){
    console.warn('No tiles detected in level', levelIndex);
  }
}

function makeBody(x, y, w, h) {
  return { x, y, w, h, vx: 0, vy: 0 };
}

function isSolidTile(t) {
  return t === Tiles.Ground || t === Tiles.Platform;
}

function isHazardTile(t) { return t === Tiles.Spike; }

function isGoalTile(t) {
  return t === Tiles.Flag;
}

function getTileAtWorld(wx, wy) {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return Tiles.Empty;
  return level.tiles[idx(tx, ty, level.width)];
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function step(dt) {
  const inputLeft = keys.has('ArrowLeft');
  const inputRight = keys.has('ArrowRight');
  const wantJump = justPressedUp; // edge-triggered

  if (inputLeft) player.face = -1;
  if (inputRight) player.face = 1;

  // Player control
  if (inputLeft) player.vx -= accel * dt;
  if (inputRight) player.vx += accel * dt;
  if (!inputLeft && !inputRight) player.vx *= player.onGround ? friction : 1;
  player.vx = clamp(player.vx, -maxRunSpeed, maxRunSpeed);

  // Jump with double-jump support (edge-triggered)
  if (wantJump) {
    if (player.onGround) {
      player.vy = -jumpVel;
      player.onGround = false;
      player.jumpCount = 1;
    } else if (player.jumpCount < player.maxJumps) {
      player.vy = -jumpVel;
      player.jumpCount += 1;
    }
  }

  // consume edge-trigger
  justPressedUp = false;

  // Gravity
  player.vy += gravity * dt;

  // Integrate and collide
  moveWithCollisions(player, dt);
  if (player.onGround) player.jumpCount = 0; // reset jumps when grounded

  // Enemies simple AI
  for (const e of enemies) {
    if (e.type === EnemyType.Walker) {
      if (e.patrol) {
        if (e.x < e.patrol.left * TILE) e.dir = 1;
        if (e.x + e.w > (e.patrol.right + 1) * TILE) e.dir = -1;
      }
      e.vx = e.speed * e.dir;
      e.vy += gravity * dt;
      moveWithCollisions(e, dt, true);
    } else if (e.type === EnemyType.Goomba) {
      // basic side-to-side with edge detection
      e.vx = e.speed * e.dir;
      e.vy += gravity * dt;
      const frontX = e.dir > 0 ? (e.x + e.w + 2) : (e.x - 2);
      const tileAheadBelow = getTileAtWorld(frontX, e.y + e.h + 2);
      if (!isSolidTile(tileAheadBelow)) {
        e.dir *= -1; e.vx = e.speed * e.dir;
      }
      moveWithCollisions(e, dt, true);
    } else if (e.type === EnemyType.Turtle) {
      // turtle: slower pace, turns at walls or edges
      const base = e.speed * 0.75;
      e.vx = base * e.dir;
      e.vy += gravity * dt;
      const frontX = e.dir > 0 ? (e.x + e.w + 2) : (e.x - 2);
      const tileAheadBelow = getTileAtWorld(frontX, e.y + e.h + 2);
      if (!isSolidTile(tileAheadBelow)) e.dir *= -1;
      moveWithCollisions(e, dt, true);
      // also if hit wall, moveWithCollisions will invert due to enemy flag
    } else if (e.type === EnemyType.Mouse) {
      // mouse: fast runner, turns at edges
      const base = e.speed * 1.35;
      e.vx = base * e.dir;
      e.vy += gravity * dt;
      const frontX = e.dir > 0 ? (e.x + e.w + 2) : (e.x - 2);
      const tileAheadBelow = getTileAtWorld(frontX, e.y + e.h + 2);
      if (!isSolidTile(tileAheadBelow)) e.dir *= -1;
      moveWithCollisions(e, dt, true);
  } else if (e.type === EnemyType.Boss) {
      // Boss: heavy slow patrol; requires 3 stomps + fire breath
      if (e.hitsTaken == null) e.hitsTaken = 0;
      if (e.fireCooldown == null) e.fireCooldown = 0;
      const base = e.speed * 0.5;
      e.vx = base * e.dir;
      e.vy += gravity * dt;
      const frontX = e.dir > 0 ? (e.x + e.w + 2) : (e.x - 2);
      const tileAheadBelow = getTileAtWorld(frontX, e.y + e.h + 2);
      if (!isSolidTile(tileAheadBelow)) e.dir *= -1;
      moveWithCollisions(e, dt, true);

      // Face based on velocity
      if (Math.abs(e.vx) > 1) e.dir = e.vx > 0 ? 1 : -1;

      // Fire breath when player is near horizontally
      e.fireCooldown -= dt;
      if (Math.abs((player.x + player.w/2) - (e.x + e.w/2)) < TILE * 10 && e.fireCooldown <= 0) {
  spawnBossFire(e);
  e.fireCooldown = currentBossFireCooldown; // per-level seconds
      }
    }

    // If player stomps enemy
    if (aabbOverlap(player, e)) {
      const playerBottom = player.y + player.h;
      const enemyTop = e.y;
      const verticalSpeed = player.vy;
      const stomped = (playerBottom - enemyTop < TILE * 0.6 && verticalSpeed > 60);
      if (stomped) {
        player.vy = -jumpVel * 0.7;
        if (e.type === EnemyType.Boss) {
          if (e.hitsTaken == null) e.hitsTaken = 0;
          e.hitsTaken += 1;
          if (e.hitsTaken >= currentBossHits) e.dead = true; // boss defeated (per-level)
        } else {
          e.dead = true;
        }
      } else {
        player.dead = true;
      }
    }
  }
  enemies = enemies.filter(e => !e.dead);

  // Projectiles update
  const newProjectiles = [];
  for (const p of projectiles) {
    p.vy += (p.gravity ?? 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // collide with tiles
    if (hitsSolid(p.x, p.y + p.h/2, p.y + p.h/2)) continue; // horizontal wall
    if (hitsSolid(p.x + p.w/2, p.y + p.h, p.x + p.w/2, true)) continue; // floor
    // hit player
    if (!player.dead && aabbOverlap(player, p)) { player.dead = true; continue; }
    // cull off-screen
    if (p.x < camera.x - 100 || p.x > camera.x + W + 100 || p.y > level.height * TILE + 100) continue;
    newProjectiles.push(p);
  }
  projectiles = newProjectiles;

  // If boss-based win condition
  if (level.winByDefeatingBoss) {
    const bossAlive = enemies.some(e => e.type === EnemyType.Boss);
    if (!bossAlive) player.win = true;
  }

  // Hazards
  const head = getTileAtWorld(player.x + player.w * 0.5, player.y + 2);
  const feet = getTileAtWorld(player.x + player.w * 0.5, player.y + player.h - 2);
  if (isHazardTile(head) || isHazardTile(feet)) player.dead = true;

  // Goal
  const goalMid = getTileAtWorld(player.x + player.w * 0.5, player.y + player.h * 0.5);
  if (isGoalTile(goalMid)) player.win = true;

  // Camera follow
  camera.x = clamp(player.x - W * 0.35, 0, level.width * TILE - W);

  // death/win
  if (player.y > level.height * TILE + 40) player.dead = true; // fell out quicker
  if (player.dead) showOverlay('やられた… R でリトライ');
  if (player.win) showOverlay('ゴール! N で次のステージ');

  animTime += dt;
}

function showOverlay(text) {
  if (!overlay.classList.contains('hidden')) return;
  message.textContent = text;
  overlay.classList.remove('hidden');
}

function moveWithCollisions(b, dt, enemy = false) {
  // Horizontal
  b.x += b.vx * dt;
  if (b.vx > 0) {
    if (hitsSolid(b.x + b.w, b.y + 2, b.y + b.h - 2)) {
      b.x = tileX(b.x + b.w) * TILE - b.w - 0.01; b.vx = enemy ? -Math.abs(b.vx) : 0;
    }
  } else if (b.vx < 0) {
    if (hitsSolid(b.x, b.y + 2, b.y + b.h - 2)) {
      b.x = tileX(b.x) * TILE + TILE + 0.01; b.vx = enemy ? Math.abs(b.vx) : 0;
    }
  }

  // Vertical
  b.y += b.vy * dt;
  b.onGround = false;
  if (b.vy > 0) {
    if (hitsSolid(b.x + 2, b.y + b.h, b.x + b.w - 2, true)) {
      b.y = tileY(b.y + b.h) * TILE - b.h - 0.01; b.vy = 0; b.onGround = true;
    }
  } else if (b.vy < 0) {
    if (hitsSolid(b.x + 2, b.y, b.x + b.w - 2, true)) {
      b.y = tileY(b.y) * TILE + TILE + 0.01; b.vy = 0;
    }
  }
}

function hitsSolid(x1, y1, x2OrY2, vertical = false) {
  if (vertical) {
    const y = y1; const x1v = x1; const x2v = x2OrY2;
    for (let x = Math.floor(x1v / TILE); x <= Math.floor(x2v / TILE); x++) {
      const t = getTileAtWorld(x * TILE + 1, y);
  if (isSolidTile(t)) return true;
      if (isGoalTile(t)) return false;
    }
    return false;
  } else {
    const x = x1; const y1h = y1; const y2h = x2OrY2;
    for (let y = Math.floor(y1h / TILE); y <= Math.floor(y2h / TILE); y++) {
      const t = getTileAtWorld(x, y * TILE + 1);
  if (isSolidTile(t)) return true;
      if (isGoalTile(t)) return false;
    }
    return false;
  }
}

function tileX(px) { return Math.floor(px / TILE); }
function tileY(py) { return Math.floor(py / TILE); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Rendering
function render() {
  ctx.clearRect(0, 0, W, H);

  // Background by theme
  if (level.theme === 'battle') {
    // darker sky
    ctx.fillStyle = '#5c7a8a';
    ctx.fillRect(0, 0, W, H);
    // smoke clouds
    ctx.fillStyle = 'rgba(220,220,220,0.6)';
    for (let i = 0; i < 10; i++) {
      const cx = ((i * 200) - camera.x * 0.6) % (level.width * TILE);
      const cy = 40 + 30 * Math.sin(i * 1.3);
      pill(cx - camera.x, cy, 130, 30, 16);
    }
    // distant silhouettes (tanks / barricades as rectangles)
    ctx.fillStyle = 'rgba(40,50,60,0.7)';
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 320) - camera.x * 0.8) % (level.width * TILE) - camera.x;
      const by = H - 80 + 10 * Math.sin(i);
      ctx.fillRect(bx, by, 120, 18);
      ctx.fillRect(bx + 20, by - 10, 40, 10);
    }
  } else if (level.theme === 'fortress') {
    // Dark interior with brick pattern and torches
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, W, H);
    // bricks
    ctx.fillStyle = '#1e1e1e';
    const brickSize = 32;
    for (let by = 0; by < H; by += brickSize) {
      for (let bx = -((camera.x * 0.4) % brickSize); bx < W; bx += brickSize) {
        ctx.fillRect(bx, by, brickSize - 3, brickSize - 3);
      }
    }
    // torches (parallax)
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 300) - camera.x * 0.5) % (level.width * TILE) - camera.x;
      const ty = 100 + 10 * Math.sin((animTime + i) * 2);
      ctx.fillStyle = '#552200';
      ctx.fillRect(tx, ty + 15, 12, 40);
      ctx.fillStyle = '#ff7b00';
      pill(tx + 6, ty + 10, 30, 30, 12);
      ctx.fillStyle = '#ffd200';
      pill(tx + 6, ty + 10, 16, 16, 8);
    }
  } else if (level.theme === 'forest') {
    // Lush forest: gradient sky + parallax tree layers
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#6ec6ff');
    grad.addColorStop(1,'#b0e67a');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);
    // distant canopy silhouettes
    for(let layer=0; layer<3; layer++){
      const speed = 0.2 + layer*0.15;
      const color = ['#2f5d31','#266029','#1e4d21'][layer];
      ctx.fillStyle = color;
      for(let i=0;i<12;i++){
        const baseX = ((i*300) - camera.x * speed) % (level.width*TILE) - camera.x;
        const h = 120 + layer*30;
        ctx.beginPath();
        ctx.ellipse(baseX, H - 60 - layer*25, 160, h, 0, 0, Math.PI*2);
        ctx.fill();
      }
    }
    // foreground trunks
    for(let i=0;i<8;i++){
      const x = ((i*220) - camera.x * 0.6) % (level.width*TILE) - camera.x;
      ctx.fillStyle = '#5a3b13';
      ctx.fillRect(x, H-200, 30, 200);
      ctx.fillStyle = '#3a8b2c';
      ctx.beginPath(); ctx.arc(x+15, H-210, 70,0,Math.PI*2); ctx.fill();
    }
  } else {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, W, H);

    // Parallax clouds (simple)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 240) - camera.x * 0.5) % (level.width * TILE);
      const cy = 60 + 40 * Math.sin(i * 1.7);
      pill(cx - camera.x, cy, 120, 28, 14);
    }
  }

  // Tiles
  const startX = Math.floor(camera.x / TILE) - 1;
  const endX = Math.ceil((camera.x + W) / TILE) + 1;
  for (let x = startX; x < endX; x++) {
    if (x < 0 || x >= level.width) continue;
    for (let y = 0; y < level.height; y++) {
      const t = level.tiles[idx(x, y, level.width)];
      if (t === Tiles.Empty) continue;
      drawTile(x, y, t);
    }
  }

  // Projectiles
  drawProjectiles();

  // Entities
  drawPlayer(player);
  for (const e of enemies) drawEnemy(e);

  // Diagnostics text if something wrong
  if (diag.tiles === 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, H-80, 300, 70);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText('DEBUG: tiles=0', 20, H-55);
    ctx.fillText('enemies='+diag.enemies, 20, H-35);
    ctx.fillText('levelIndex='+levelIndex, 20, H-15);
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    const x = Math.round(p.x - camera.x);
    const y = Math.round(p.y - camera.y);
    // simple flame gradient
    const grad = ctx.createLinearGradient(x, y, x + p.w, y);
    grad.addColorStop(0, p.color1);
    grad.addColorStop(1, p.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, p.w, p.h);
  }
}

function drawEnemy(e) {
  const x = Math.round(e.x - camera.x);
  const y = Math.round(e.y - camera.y);
  const scale = Math.max(2, Math.floor((TILE * 0.9) / 16));
  if (e.type === EnemyType.Goomba) {
    drawSprite(ctx, EnemySprites.goomba, x + Math.floor((e.w - 16 * scale) / 2), y + Math.floor(e.h - 16 * scale), scale, e.dir < 0);
  } else if (e.type === EnemyType.Turtle) {
    drawSprite(ctx, EnemySprites.turtle, x + Math.floor((e.w - 16 * scale) / 2), y + Math.floor(e.h - 16 * scale), scale, e.dir < 0);
  } else if (e.type === EnemyType.Mouse) {
    drawSprite(ctx, EnemySprites.mouse, x + Math.floor((e.w - 16 * scale) / 2), y + Math.floor(e.h - 16 * scale), scale, e.dir < 0);
  } else if (e.type === EnemyType.Boss) {
    const bw = EnemySprites.boss[0].length; const bh = EnemySprites.boss.length;
    const bossScale = Math.max(2, Math.floor(e.h / bh));
    drawSprite(ctx, EnemySprites.boss, x + Math.floor((e.w - bw * bossScale) / 2), y + Math.floor(e.h - bh * bossScale), bossScale, e.dir < 0);
  } else {
    drawBody(e, e.color);
  }
}

function drawPlayer(p) {
  const speed = Math.abs(p.vx);
  const x = Math.round(p.x - camera.x);
  const y = Math.round(p.y - camera.y);
  const scale = Math.max(2, Math.floor((TILE * 0.9) / 16));

  let frame = PlayerSprites.idle;
  if (!p.onGround) frame = PlayerSprites.jump;
  else if (speed > 20) frame = (Math.floor(animTime * 10) % 2 === 0) ? PlayerSprites.run1 : PlayerSprites.run2;

  drawSprite(ctx, frame, x + Math.floor((p.w - 16 * scale) / 2), y + Math.floor(p.h - 16 * scale), scale, p.face === -1);
}

function drawTile(tx, ty, t) {
  const x = tx * TILE - camera.x;
  const y = ty * TILE - camera.y;
  if (t === Tiles.Ground || t === Tiles.Platform) {
    ctx.fillStyle = TileColors[t];
    ctx.fillRect(x, y, TILE, TILE);
    // simple shading
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(x, y + TILE - 6, TILE, 6);
  } else if (t === Tiles.Spike) {
    ctx.fillStyle = TileColors[t];
    drawSpikes(x, y, TILE, TILE);
  } else if (t === Tiles.Flag) {
    // pole
    ctx.fillStyle = '#ddd';
    ctx.fillRect(x + TILE * 0.45, y, 4, TILE);
    // flag
    ctx.fillStyle = TileColors[t];
    ctx.beginPath();
    ctx.moveTo(x + TILE * 0.45 + 4, y + 4);
    ctx.lineTo(x + TILE * 0.45 + 4 + 18, y + 12);
    ctx.lineTo(x + TILE * 0.45 + 4, y + 20);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSpikes(x, y, w, h) {
  const n = 3; const step = w / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = x + i * step;
    ctx.moveTo(x0, y + h);
    ctx.lineTo(x0 + step * 0.5, y + h * 0.2);
    ctx.lineTo(x0 + step, y + h);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBody(b, color) {
  // used for enemies
  const x = Math.round(b.x - camera.x);
  const y = Math.round(b.y - camera.y);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(b.w), Math.round(b.h));
}

function pill(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - h / 2);
  ctx.arcTo(x + w / 2, y - h / 2, x + w / 2, y + h / 2, r);
  ctx.arcTo(x + w / 2, y + h / 2, x - w / 2, y + h / 2, r);
  ctx.arcTo(x - w / 2, y + h / 2, x - w / 2, y - h / 2, r);
  ctx.arcTo(x - w / 2, y - h / 2, x + w / 2, y - h / 2, r);
  ctx.closePath();
  ctx.fill();
}

// Loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(1/30, (now - last) / 1000) * timeScale;
  last = now;
  if (overlay.classList.contains('hidden')) step(dt);
  render();
  requestAnimationFrame(loop);
}

// Inputs: restart/next
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    resetLevel();
  } else if (e.key === 'n' || e.key === 'N') {
    // advance level if exists
    if (player.win) {
      levelIndex = (levelIndex + 1) % Levels.length;
      resetLevel();
    }
  }
});

// Start
try { resetLevel(0); } catch(e){ console.error(e); }
requestAnimationFrame(loop);

// ---------------- Boss Fire / Projectiles Helpers ----------------
function spawnBossFire(e){
  // Burst fan downward slightly
  const count = currentBossFireBurst;
  const baseAngle = -0.28; // upward negative y is up
  const step = 0.12;
  for(let i=0;i<count;i++){
    const ang = baseAngle - step * i;
    const speed = 240;
    const dir = (e.dir || 1);
    const vx = Math.cos(ang) * speed * dir;
    const vy = Math.sin(ang) * speed;
    projectiles.push({
      x: e.x + e.w/2 + (dir>0? e.w/2 : -e.w/2),
      y: e.y + e.h*0.4,
      w: 14,
      h: 14,
      vx, vy,
      gravity: 300,
      color1: '#ffed00',
      color2: '#ff5500'
    });
  }
}
