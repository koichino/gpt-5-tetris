# Mariosan

シンプルな横スクロール・アクション（スーパーマリオ風）。
- 1 ステージ実装済み（今後ステージ追加可能な構成）
- タイルマップ＋敵（ウォーカー＆キノコ型）＋スパイク（トゲ）＋ゴール旗

## 操作
- 左右移動: ← →
- ジャンプ: ↑
- リスタート: R
- 次のステージ: N（ゴール後に有効）

## 遊び方
`index.html` をブラウザで開きます。
- もしブラウザが `ESM(ES Modules)` を file:// でブロックする場合は、VS Code の Live Server 拡張などでローカルサーバーから開いてください。

## 構成
- `index.html` ... キャンバスと HUD のみ、スクリプト読み込み
- `styles.css` ... HUD/オーバーレイ/キャンバスのスタイル
- `levels.js` ... タイルサイズ、タイル種別、ステージ配列（`Levels`）
- `main.js` ... ゲームループ、当たり判定、描画、敵 AI（パトロール＋崖検出）
- `sprites.js` ... プレイヤー＆キノコ型敵のドット絵と描画

## ステージ追加方法
`levels.js` の `Levels` 配列にオブジェクトを追加します。
最低限の項目:
```js
{
  name: "Stage 2",
  width: 80,
  height: 17,
  playerStart: { x: 2, y: 10 },
  enemies: [
    { type: EnemyType.Goomba, x: 20, y: 10, patrol: { left: 18, right: 26 } },
  ],
  tiles: (() => {
    const w = 80, h = 17;
    const A = new Array(w * h).fill(0);
    const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;
    // ... A[idx(x,y,w)] にタイルを詰める（サンプルは Stage 1 参照）
    return A;
  })(),
}
```
- 地形衝突: `Ground`/`Platform`
- トゲ: `Spike`（触れるとミス）
- ゴール: `Flag`（触れるとクリア）

## ライセンス
MIT
