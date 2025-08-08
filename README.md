## gpt-5-tetris / apps overview

このリポジトリには、以下の2つの小さなWebアプリが入っています。

1) Tetris (Vanilla JS)
- 10x20の盤面、7種類のテトリミノ、レベルアップで落下速度が上昇
- 操作: ← → 移動 / ↑ 回転 / ↓ ソフトドロップ / Space 開始・一時停止 / R リスタート
- ページ: tetris/index.html

2) お絵かきキャンバス (Vanilla JS)
- ペン/消しゴム/直線/四角/円、Undo/Redo、全消し、PNG保存
- グリッド表示、筆圧対応（対応デバイスのみ）、ライト/ダーク切替（既存描画の色も反転）
- ページ: cambus/index.html

## ローカルで開く
シンプルな静的サイトです。任意の静的サーバーでルートを配信してください。Pythonがあれば以下で起動できます。

```powershell
cd C:\Users\koichino\github\playground
python -m http.server 5173
# Tetris:  http://localhost:5173/tetris/index.html
# Canvas:  http://localhost:5173/cambus/index.html
```

## フォルダー構成
- tetris/ … テトリス本体 (index.html, main.js, styles.css)
- cambus/ … お絵かきキャンバス (index.html, main.js, styles.css)

## ライセンス
Playground用途。必要に応じてご自由に改変してください。
