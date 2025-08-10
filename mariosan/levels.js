// Level definitions and utilities
// Each level is a tile map with entities. Designed to scale for multiple stages.

export const TILE = 32; // world unit (px)

// Tile types: 0 empty, 1 ground, 2 platform, 3 spike, 4 flag
export const Tiles = {
  Empty: 0,
  Ground: 1,
  Platform: 2,
  Spike: 3,
  Flag: 4,
};

// Colors for quick prototyping (drawn on canvas)
export const TileColors = {
  [Tiles.Ground]: "#8B4513",
  [Tiles.Platform]: "#B5651D",
  [Tiles.Spike]: "#444",
  [Tiles.Flag]: "#E11",
};

// Enemy types
export const EnemyType = {
  Walker: "walker",
  Goomba: "goomba",
  Turtle: "turtle",
  Mouse: "mouse",
  Boss: "boss",
};

// Level schema
// {
//   name: string
//   width: number (tiles)
//   height: number (tiles)
//   tiles: number[] (width*height)
//   playerStart: { x, y } in tiles
//   enemies: [ { type, x, y, patrol?: { left, right } } ] (in tiles)
// }

export const Levels = [
  // Stage 1: basic intro
  {
    name: "Stage 1",
    width: 60,
    height: 17,
    playerStart: { x: 2, y: 10 },
    enemies: [
      { type: EnemyType.Goomba, x: 12, y: 10, patrol: { left: 12, right: 18 } },
      { type: EnemyType.Turtle, x: 22, y: 10, patrol: { left: 20, right: 26 } },
      { type: EnemyType.Goomba, x: 34, y: 6, patrol: { left: 32, right: 38 } },
    ],
    tiles: (() => {
      const w = 60, h = 17; // 540/32 ~= 16.9 -> 17 tiles tall for 960x540 canvas
      const A = new Array(w * h).fill(0);
      const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;

      // base ground (solid floor)
      for (let x = 0; x < w; x++) {
        A[idx(x, 12, w)] = G;
        A[idx(x, 13, w)] = G;
        A[idx(x, 14, w)] = G;
        A[idx(x, 15, w)] = G;
        A[idx(x, 16, w)] = G;
      }

  // Real pits: slightly narrower so they are more forgiving
  clearRect(A, w, 9, 12, 2, 5);  // small pit near start
  clearRect(A, w, 28, 12, 3, 5); // small-mid pit

      // small platforms
      rect(A, w, 10, 9, 3, 1, P);
      rect(A, w, 18, 8, 4, 1, P);
      rect(A, w, 26, 7, 5, 1, P);
      rect(A, w, 34, 5, 5, 1, P);
      rect(A, w, 45, 9, 6, 1, P);

      // small staircase
      for (let i = 0; i < 4; i++) rect(A, w, 52 + i, 11 - i, 1, 1, G);

      // flag / goal
      rect(A, w, 58, 5, 1, 7, F);
      return A;
    })(),
  },
  // Stage 2: harder
  {
    name: "Stage 2",
    width: 80,
    height: 17,
    playerStart: { x: 2, y: 10 },
    enemies: [
      { type: EnemyType.Goomba, x: 16, y: 10, patrol: { left: 14, right: 20 } },
      { type: EnemyType.Mouse, x: 23, y: 10, patrol: { left: 22, right: 28 } },
      { type: EnemyType.Turtle, x: 39, y: 10, patrol: { left: 38, right: 44 } },
      { type: EnemyType.Mouse, x: 56, y: 7, patrol: { left: 55, right: 60 } },
      { type: EnemyType.Goomba, x: 68, y: 6, patrol: { left: 66, right: 72 } },
    ],
    tiles: (() => {
      const w = 80, h = 17;
      const A = new Array(w * h).fill(0);
      const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;

      // base ground
      for (let x = 0; x < w; x++) {
        A[idx(x, 12, w)] = G;
        A[idx(x, 13, w)] = G;
        A[idx(x, 14, w)] = G;
        A[idx(x, 15, w)] = G;
        A[idx(x, 16, w)] = G;
      }

      // pits (narrow to medium)
      clearRect(A, w, 13, 12, 2, 5);
      clearRect(A, w, 24, 12, 3, 5);
      clearRect(A, w, 41, 12, 4, 5);
      clearRect(A, w, 62, 12, 3, 5);

      // spikes segments
      for (let x = 30; x <= 34; x++) A[idx(x, 12, w)] = S;
      for (let x = 48; x <= 50; x++) A[idx(x, 12, w)] = S;

      // platforms and higher paths
      rect(A, w, 10, 9, 3, 1, P);
      rect(A, w, 18, 8, 4, 1, P);
      rect(A, w, 26, 7, 5, 1, P);
      rect(A, w, 35, 6, 4, 1, P);
      rect(A, w, 44, 8, 4, 1, P);
      rect(A, w, 54, 7, 5, 1, P);
      rect(A, w, 64, 5, 4, 1, P);

      // staggered blocks
      for (let i = 0; i < 4; i++) rect(A, w, 70 + i, 11 - i, 1, 1, G);

      // goal flag
      rect(A, w, 78, 5, 1, 7, F);
      return A;
    })(),
  },
  // Stage 3: forest theme (flag goal, no boss)
  {
    name: "Stage 3",
    width: 100,
    height: 17,
    theme: "forest",
    playerStart: { x: 2, y: 10 },
    enemies: [
      { type: EnemyType.Goomba, x: 14, y: 10, patrol: { left: 12, right: 20 } },
      { type: EnemyType.Mouse, x: 28, y: 10, patrol: { left: 26, right: 34 } },
      { type: EnemyType.Turtle, x: 44, y: 10, patrol: { left: 42, right: 48 } },
      { type: EnemyType.Mouse, x: 56, y: 7, patrol: { left: 54, right: 60 } },
      { type: EnemyType.Goomba, x: 70, y: 6, patrol: { left: 68, right: 74 } },
    ],
    tiles: (() => {
      const w = 100, h = 17;
      const A = new Array(w * h).fill(0);
      const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;
      // base ground
      for (let x = 0; x < w; x++) {
        A[idx(x, 12, w)] = G;
        A[idx(x, 13, w)] = G;
        A[idx(x, 14, w)] = G;
        A[idx(x, 15, w)] = G;
        A[idx(x, 16, w)] = G;
      }
      // natural pits / roots (shallower hazards)
      clearRect(A, w, 9, 12, 2, 5);
      clearRect(A, w, 22, 12, 3, 5);
      clearRect(A, w, 33, 12, 3, 5);
      for (let x = 48; x <= 50; x++) A[idx(x, 12, w)] = S; // small thorns
      clearRect(A, w, 60, 12, 3, 5);
      for (let x = 68; x <= 69; x++) A[idx(x, 12, w)] = S;
      // tree branch platforms
      rect(A, w, 12, 8, 4, 1, P);
      rect(A, w, 20, 7, 4, 1, P);
      rect(A, w, 28, 6, 5, 1, P);
      rect(A, w, 38, 8, 4, 1, P);
      rect(A, w, 46, 7, 4, 1, P);
      rect(A, w, 58, 6, 5, 1, P);
      rect(A, w, 68, 5, 4, 1, P);
      rect(A, w, 78, 7, 4, 1, P);
      rect(A, w, 73, 8, 3, 1, P);
      // gentle rise to flag
      for (let i = 0; i < 4; i++) rect(A, w, 84 + i, 11 - i, 1, 1, G);
      // flag goal
      rect(A, w, 98, 5, 1, 7, F);
      return A;
    })(),
  },
  // Stage 4: fortress (hard) with stronger boss
  {
    name: "Stage 4",
    width: 120,
    height: 17,
    theme: "fortress",
    bossHits: 5,              // boss needs 5 stomps here
    bossFireCooldown: 1.0,    // faster fire
    bossFireBurst: 5,         // more projectiles
    playerStart: { x: 2, y: 10 },
    enemies: [
      { type: EnemyType.Goomba, x: 10, y: 10, patrol: { left: 8, right: 14 } },
      { type: EnemyType.Mouse, x: 18, y: 10, patrol: { left: 16, right: 22 } },
      { type: EnemyType.Turtle, x: 26, y: 10, patrol: { left: 24, right: 30 } },
      { type: EnemyType.Mouse, x: 36, y: 9, patrol: { left: 34, right: 40 } },
      { type: EnemyType.Goomba, x: 44, y: 8, patrol: { left: 42, right: 48 } },
      { type: EnemyType.Turtle, x: 54, y: 10, patrol: { left: 52, right: 58 } },
      { type: EnemyType.Mouse, x: 64, y: 7, patrol: { left: 62, right: 68 } },
      { type: EnemyType.Goomba, x: 72, y: 6, patrol: { left: 70, right: 76 } },
      { type: EnemyType.Mouse, x: 82, y: 5, patrol: { left: 80, right: 86 } },
      // Boss arena at the end
      { type: EnemyType.Boss, x: 104, y: 10, patrol: { left: 100, right: 112 } },
    ],
    tiles: (() => {
      const w = 120, h = 17;
      const A = new Array(w * h).fill(0);
      const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;
      // solid base
      for (let x = 0; x < w; x++) {
        A[idx(x, 12, w)] = G; A[idx(x,13,w)] = G; A[idx(x,14,w)] = G; A[idx(x,15,w)] = G; A[idx(x,16,w)] = G;
      }
      // alternating pits & spikes to force precision
      clearRect(A, w, 14, 12, 3, 5);
      for (let x = 22; x <= 25; x++) A[idx(x, 12, w)] = S;
      clearRect(A, w, 30, 12, 4, 5);
      for (let x = 38; x <= 42; x++) A[idx(x, 12, w)] = S;
      clearRect(A, w, 48, 12, 3, 5);
      for (let x = 56; x <= 60; x++) A[idx(x, 12, w)] = S;
      clearRect(A, w, 66, 12, 3, 5);
      for (let x = 74; x <= 77; x++) A[idx(x, 12, w)] = S;
      // platforms (narrow) increasing difficulty
      rect(A, w, 18, 8, 3, 1, P);
      rect(A, w, 26, 7, 3, 1, P);
      rect(A, w, 34, 6, 3, 1, P);
      rect(A, w, 42, 5, 3, 1, P);
      rect(A, w, 50, 7, 3, 1, P);
      rect(A, w, 58, 6, 3, 1, P);
      rect(A, w, 66, 5, 3, 1, P);
      rect(A, w, 74, 4, 3, 1, P);
      rect(A, w, 82, 6, 4, 1, P);
      // boss arena floor raised
      for (let x = 96; x < 120; x++) {
        A[idx(x, 11, w)] = G; A[idx(x, 12, w)] = G; A[idx(x,13,w)] = G; A[idx(x,14,w)] = G; A[idx(x,15,w)] = G; A[idx(x,16,w)] = G;
      }
      // hazard moat before boss
      clearRect(A, w, 92, 11, 2, 6);
      for (let x = 92; x <= 93; x++) A[idx(x, 11, w)] = S;
  // flag goal at far right
  rect(A, w, 118, 5, 1, 7, F);
      return A;
    })(),
  },
];

export function idx(x, y, w) { return y * w + x; }

function rect(A, w, x, y, ww, hh, t) {
  for (let yy = 0; yy < hh; yy++) {
    for (let xx = 0; xx < ww; xx++) {
      A[idx(x + xx, y + yy, w)] = t;
    }
  }
}

function clearColumn(A, w, x, ys) {
  for (const y of ys) A[idx(x, y, w)] = Tiles.Empty;
}

function clearRect(A, w, x, y, ww, hh) {
  for (let yy = 0; yy < hh; yy++) {
    for (let xx = 0; xx < ww; xx++) {
      A[idx(x + xx, y + yy, w)] = Tiles.Empty;
    }
  }
}
