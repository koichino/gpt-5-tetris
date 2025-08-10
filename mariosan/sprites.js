// Tiny pixel-art sprite renderer (original art)
// Each frame is a 16x16 grid of characters. '.' is transparent.

const PALETTE = {
  R: '#C62828', // cap/shirt (red)
  B: '#1565C0', // overalls (blue)
  Y: '#FBC02D', // buttons (yellow)
  S: '#F5CBA7', // skin
  K: '#2E2E2E', // outlines/shoes
  W: '#FFFFFF', // eye white
  G: '#2E7D32', // green for turtle shell
  D: '#8E0000', // dark red for boss accents
  O: '#FB8C00', // orange (optional)
};

// 16x16 frames
// Simple plumber-like figure, not referencing any existing IP
const idle = [
  '................',
  '......RRRR......',
  '.....RRRRRR.....',
  '.....RRWWRR.....',
  '.....RRRRRR.....',
  '......SSSS......',
  '.....SSSSSS.....',
  '....SBBSSBB S...',
  '...SBBBSSBB S...',
  '...SBBBBBBBBS...',
  '....BBBBBBBB....',
  '.....BYY YB.....',
  '.....B B B B....',
  '.....K B B K....',
  '.....K.....K....',
  '................',
];

const run1 = [
  '................',
  '......RRRR......',
  '.....RRRRRR.....',
  '.....RRWWRR.....',
  '.....RRRRRR.....',
  '......SSSS......',
  '.....SSSSSS.....',
  '....SBBSSBB S...',
  '...SBBBSSBB S...',
  '...SBBBBBBBBS...',
  '....BBBBBBBB....',
  '.....BYY YB.....',
  '.....K B B......',
  '......K..BK.....',
  '.......K.K......',
  '................',
];

const run2 = [
  '................',
  '......RRRR......',
  '.....RRRRRR.....',
  '.....RRWWRR.....',
  '.....RRRRRR.....',
  '......SSSS......',
  '.....SSSSSS.....',
  '....SBBSSBB S...',
  '...SBBBSSBB S...',
  '...SBBBBBBBBS...',
  '....BBBBBBBB....',
  '.....BYY YB.....',
  '......B B K.....',
  '.....KB..K......',
  '.....K.K........',
  '................',
];

const jump = [
  '................',
  '......RRRR......',
  '.....RRRRRR.....',
  '.....RRWWRR.....',
  '.....RRRRRR.....',
  '......SSSS......',
  '.....SSSSSS.....',
  '....SBBSSBB S...',
  '...SBBBSSBB S...',
  '...SBBBBBBBBS...',
  '....BBBBBBBB....',
  '.....BYY YB.....',
  '.....K B K......',
  '......K.K.......',
  '........K.......',
  '................',
];

export const PlayerSprites = { idle, run1, run2, jump };

const goomba = [
  '................',
  '......RRRRRR....',
  '....RRRRRRRRR...',
  '...RRRRRRRRRR...',
  '...RRRRWWRRRR...',
  '...RRRRRRRRRR...',
  '....RRRRRRRR....',
  '.....KSSSSK.....',
  '....KSSSSSSK....',
  '....KSSSSSSK....',
  '.....KSSSSK.....',
  '.....KKBKKK.....',
  '....KKB..BKK....',
  '....KKB..BKK....',
  '.....K....K.....',
  '................',
];

const turtle = [
  '................',
  '........GG......',
  '.......GGGG.....',
  '......GGGGGG....',
  '.....GKKWKKG....',
  '.....GKKKKKG....',
  '.....GGGGGG.....',
  '....GGGGGGGG....',
  '...GGGGGGGGGG...',
  '....GGGKKGGG....',
  '.....GGKKGG.....',
  '......K..K......',
  '......K..K......',
  '.....K....K.....',
  '................',
  '................',
];

const mouse = [
  '................',
  '......YYYYY.....',
  '.....YYYYYYY....',
  '....YYYYYYYYY...',
  '...YYWWWYWWWY...',
  '...YYYYYYYYYY...',
  '....YYYYYYYY....',
  '...KYYSSSSYYK...',
  '...KYYYYYYYYK...',
  '....KYYYYYYK....',
  '.....KYYYYK.....',
  '......KYYK......',
  '.......K.K......',
  '......K...K.....',
  '................',
  '................',
];

const boss = [
  '................................',
  '...........DDDDDDDD.............',
  '.........DDRRRRRRRRDD...........',
  '........DRRRWWWWRRRRD...........',
  '........DRRRRRRRRRRRD...........',
  '.......DRRRRRRRRRRRRRD..........',
  '.......DRRRRRRRRRRRRRD..........',
  '.......DRRRRRRRRRRRRRD..........',
  '.......DRRRRRRRRRRRRRD..........',
  '........DRRRRRRRRRRRD...........',
  '........DRRYYYYYYYYRD...........',
  '.........DRRYYYYYYRD............',
  '..........KRRRRRRRK.............',
  '..........KRR....RRK............',
  '.........KRRR....RRRK...........',
  '.........KRRR....RRRK...........',
  '..........KRR....RRK............',
  '..........KRRRRRRRK.............',
  '.........KRR......RRK...........',
  '........KRR........RRK..........',
  '........KRR........RRK..........',
  '.........K..........K...........',
  '................................',
  '................................',
];

export const EnemySprites = { goomba, turtle, mouse, boss };
// (Mon sprite removed in revert to pre-Stage5)

export function drawSprite(ctx, frame, dx, dy, scale = 2, flip = false) {
  const h = frame.length;
  const w = frame[0]?.length || 0;
  ctx.save();
  ctx.translate(Math.round(dx), Math.round(dy));
  if (flip) {
    ctx.scale(-1, 1);
    ctx.translate(-w * scale, 0);
  }
  for (let y = 0; y < h; y++) {
    const row = frame[y];
    for (let x = 0; x < w; x++) {
      const c = row[x];
      if (c === '.' || !c) continue;
      const color = PALETTE[c] || '#000';
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  ctx.restore();
}
