# Mariosan

シンプルな横スクロール・アクション（スーパーマリオ風）。
- 2 ステージ実装（Stage 2 は少し難しめ）
- タイルマップ＋敵（キノコ型／亀／ネズミ）＋スパイク（トゲ）＋ゴール旗

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
- `main.js` ... ゲームループ、当たり判定、描画、敵 AI
- `sprites.js` ... プレイヤー＆敵（キノコ・亀・ネズミ）のドット絵と描画

## ステージ追加方法
`levels.js` の `Levels` 配列にオブジェクトを追加します。
最低限の項目:
```js
{
  name: "Stage 3",
  width: 90,
  height: 17,
  playerStart: { x: 2, y: 10 },
  enemies: [
    { type: EnemyType.Mouse, x: 30, y: 10, patrol: { left: 28, right: 38 } },
  ],
  tiles: (() => {
    const w = 90, h = 17;
    const A = new Array(w * h).fill(0);
    const G = Tiles.Ground, P = Tiles.Platform, S = Tiles.Spike, F = Tiles.Flag;
    // ...地形を A[idx(x,y,w)] に詰める
    return A;
  })(),
}
```

## ライセンス
MIT
