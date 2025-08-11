# Pancake Flip
フライパンでパンケーキを焼いてタイミングよくひっくり返すミニゲーム。

## 遊び方
1. Start ボタンで加熱が始まる (ゲージが伸びる)
2. 目標ライン (白線) に近い焼き加減のときに Flip! ボタン (または Space) を押してジャンプ
3. 空中回転後に着地して焼き加減 + 回転精度で得点
4. PERFECT を狙ってスコアとコンボを伸ばそう

## スコア
- 焼き加減と回転の総合品質でランク (PERFECT / GOOD / OK / MISS)
- 連続 PERFECT でコンボボーナス (+80, +160, ...)
- ハイスコアはローカルストレージ保存

## カスタマイズ
- `perfectWindow` や `targetCook` のランダム範囲で難易度調整
- 回転速度や重力でゲームテンポを変更
- グラフィックを改良する場合は Canvas 描画コード (`draw*` 関数) を編集

## ファイル
```
PancakeFlip/
  index.html
  styles.css
  main.js
  README.md
```

MIT License (サンプル)
