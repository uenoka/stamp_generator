# stamp_generator

Slack 絵文字向けの、フロントエンドのみで完結するハンコ風 PNG ジェネレーターです。

## セットアップ

Node.js `20.9.0` 以上を前提にしています。

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## MVP の方針

- `Next.js 16 + React 19 + TypeScript` の最小構成
- 描画は `Canvas` で完結
- 背景透過の正方形 PNG を `canvas.toBlob()` で保存
- 円形 / 四角形の切り替え
- 0 / 15 / 30 / 45 度の回転
- 長文時は円形を無効化し、四角形の複数行レイアウトへ自動誘導
- 朱肉風の軽い質感は `ノイズの重ね描き + 微小な欠け` のみを採用

## ディレクトリ

```text
app/
  layout.tsx
  page.tsx
  globals.css
src/
  components/
    StampGenerator.tsx
    StampCanvas.tsx
  lib/stamp/
    constants.ts
    types.ts
    text.ts
    layout.ts
    render.ts
```

## 設計メモ

- `text.ts`
  - 入力文字の正規化
  - 日本語 / 英数字 / 混在のざっくり判定
  - 文字量の重み計算
- `layout.ts`
  - 円形 / 四角形ごとの行数決定
  - 複数行分割
  - フォントサイズの初期推定
- `render.ts`
  - 枠、文字、質感の Canvas 描画
  - 回転を含む最終レンダリング

## 制約

- 絵文字・結合文字・特殊記号は、利用フォントやブラウザによって見た目がぶれる可能性があります
- 厳密な印章再現ではなく、Slack などで使う遊び向けのハンコ表現です

## Next.js 16 アップグレードメモ

- `Next.js 16.2.1` に更新し、`npm audit` の high severity 指摘を解消
- `react` / `react-dom` / `@types/react` / `@types/react-dom` を 19 系へ更新
- `tsconfig.json` は Next.js により `jsx: react-jsx` と `.next/dev/types/**/*.ts` が自動反映
- このアプリは `next/image`、`rewrites`、`middleware/proxy`、Async Request APIs を使っていないため、今回のコード変更は依存更新のみで済んでいます
