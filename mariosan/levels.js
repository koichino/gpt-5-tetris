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
