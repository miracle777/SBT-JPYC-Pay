# 🚀 PWA セットアップ手順書

このドキュメントは、SBT JPYC Pay を PWA (Progressive Web App) として、パソコン・タブレット・スマートフォンで動作させるための設定手順です。

---

## 📋 セットアップステップ

### ✅ ステップ 1: アイコンファイル生成

```bash
# ディレクトリに移動
cd d:\自分の開発研究\JPYC\SBTスタンプ対応ウォレットと支払いアプリ\SBT-JPYC-Pay

# セットアップスクリプト実行
node setup-pwa.js
```

**出力例:**
```
🎨 PWA セットアップ

📁 public/icons を作成しました

📝 SVG アイコン生成中...

✅ icon-192x192.svg
✅ icon-192x192-maskable.svg
✅ icon-512x512.svg
✅ icon-512x512-maskable.svg
✅ shortcut-sbt-96x96.svg
✅ shortcut-payment-96x96.svg
✅ screenshot-540x720.svg

📋 次のステップ:
...
```

### ✅ ステップ 2: SVG → PNG 変換

生成された SVG ファイルを PNG に変換します。3つの方法から選択してください。

#### **方法 A: オンラインツール（推奨・最も簡単）**

1. 以下のサイトにアクセス:
   - https://cloudconvert.com/svg-to-png
   - または https://svg2png.online.fr

2. `public/icons/*.svg` ファイルを次々と変換:
   - `icon-192x192.svg` → `icon-192x192.png`
   - `icon-192x192-maskable.svg` → `icon-192x192-maskable.png`
   - `icon-512x512.svg` → `icon-512x512.png`
   - `icon-512x512-maskable.svg` → `icon-512x512-maskable.png`
   - `shortcut-sbt-96x96.svg` → `shortcut-sbt-96x96.png`
   - `shortcut-payment-96x96.svg` → `shortcut-payment-96x96.png`
   - `screenshot-540x720.svg` → `screenshot-540x720.png`

3. 変換されたファイルを `public/icons/` フォルダにコピー

#### **方法 B: Node.js ツール (Sharp 使用)**

```bash
# sharp をインストール
npm install sharp

# 自動変換スクリプト実行
node public/icons/generate-icons.js
```

#### **方法 C: Figma (デザイン調整したい場合)**

1. Figma でアカウント作成: https://figma.com
2. 新規ファイル作成
3. 640x640px キャンバスで SVG をインポート
4. デザイン調整後、PNG でエクスポート
5. `public/icons/` にコピー

### ✅ ステップ 3: ビルド

```bash
# 本番用ビルド実行
npm run build
```

**出力例:**
```
✓ 1523 modules transformed.
✓ built in 45.23s

dist/index.html                   12.50 kB │ gzip:  4.52 kB
dist/assets/index-xxxxx.js      1234.56 kB │ gzip: 345.67 kB
dist/sw.js                         25.30 kB │ gzip:  8.12 kB
dist/manifest.json                 2.15 kB │ gzip:  0.89 kB
```

### ✅ ステップ 4: ローカルテスト

```bash
# プレビューサーバー起動 (http://localhost:4173)
npm run preview
```

### ✅ ステップ 5: ブラウザで確認

1. **Chrome/Edge** でアクセス: `http://localhost:4173`
2. **アドレスバーにインストールボタン**が表示される ✓
3. 「インストール」をクリック
4. デスクトップにアプリが追加される ✓

---

## 📱 各デバイスでのテスト

### 🖥️ パソコン (Windows)

```bash
# 開発環境で確認
npm run preview
# → http://localhost:4173 にアクセス
# → インストールボタンが表示される

# または

# ビルド後
npm run build
# → dist フォルダを http サーバーでホスト
```

**確認チェックリスト:**
- [ ] インストールボタンが表示される
- [ ] アプリをインストール可能
- [ ] スタートメニューに追加される
- [ ] オフラインで基本機能が動作する
- [ ] MetaMask ウォレット接続が可能

### 📱 タブレット (iPad)

1. Safari で `http://localhost:4173` にアクセス
2. 下部の共有ボタン → 「ホーム画面に追加」
3. ホーム画面でアプリが動作するか確認

### 📱 スマートフォン (iPhone/Android)

**iOS:**
```
Safari → 共有ボタン → 「ホーム画面に追加」
```

**Android:**
```
Chrome メニュー (⋮) → 「アプリをインストール」
```

---

## ⚙️ 設定確認

### `manifest.json` の確認

```json
{
  "name": "SBT JPYC Pay - 店舗スタンプカード管理",
  "short_name": "SBT Pay",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#7c3aed",
  "background_color": "#ffffff",
  "icons": [
    // ✓ icon-192x192.png が必要
    // ✓ icon-512x512.png が必要
  ]
}
```

**チェックリスト:**
- [ ] `manifest.json` が `public/` に存在する
- [ ] アイコンファイルが `public/icons/` に存在する
- [ ] `index.html` に `<link rel="manifest" href="/manifest.json" />` がある
- [ ] `vite.config.ts` に VitePWA プラグインが設定されている

### Service Worker の確認

```typescript
// src/main.tsx で確認
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register(
      import.meta.env.PROD ? '/sw.js' : '/dev-sw.js?dev-sw'
    );
    console.log('✅ PWA: Service Worker registered');
  });
}
```

**ブラウザで確認:**
1. DevTools を開く (F12)
2. Application タブ → Service Workers
3. `sw.js` が "activated and running" と表示される ✓

---

## 🔍 トラブルシューティング

### 問題 1: インストールボタンが表示されない

**原因と対策:**

```
① HTTPS ではないか？
   → 本番環境は HTTPS が必須
   → ローカルテストは http://localhost でOK

② manifest.json が見つからない？
   → DevTools → Network → manifest.json を確認
   → Status 200 なら OK
   → Status 404 なら public/ に配置確認

③ Service Worker が登録されていない？
   → DevTools → Application → Service Workers
   → "activated and running" と表示されるか確認

④ アイコンが不足している？
   → manifest.json の icons セクションを確認
   → 指定されたすべてのアイコンが存在するか確認
```

### 問題 2: アプリがインストールできない

```
① ブラウザのストレージクォータが満杯？
   → キャッシュをクリア: Ctrl+Shift+Del

② Service Worker が正常に動作していない？
   → DevTools → Console でエラーを確認
   → npm run build で再ビルド

③ manifest.json のエラー？
   → DevTools → Application → Manifest
   → "manifest is valid" と表示されるか確認
```

### 問題 3: オフラインで動作しない

```
① キャッシュが生成されていない？
   → アプリを一度開いてキャッシュを作成
   → DevTools → Cache Storage で確認

② IndexedDB に問題？
   → DevTools → Application → IndexedDB
   → SBT_JPYC_PAY データベースが表示されるか確認
   → 必要に応じてクリア → 再度開く
```

### 問題 4: MetaMask が接続できない

```
① パソコンの場合:
   → Chrome に MetaMask 拡張をインストール
   → MetaMask 拡張が有効か確認
   → アプリを再起動

② スマートフォンの場合:
   → Chrome ではなく MetaMask アプリのブラウザを使用
   → または WalletConnect を使用
```

---

## 🚀 デプロイ

### ホスティング先での設定

PWA をデプロイするには以下の条件が必要です:

#### **必須条件**

1. **HTTPS** - すべてのデプロイ先が HTTPS を使用する必要があります
2. **manifest.json** - `/manifest.json` にアクセス可能
3. **Service Worker** - `/sw.js` にアクセス可能
4. **アイコン** - `/icons/` フォルダにアクセス可能

#### **推奨ホスティング先**

| ホスティング | 料金 | HTTPS | 特徴 |
|------------|------|-------|------|
| **Vercel** | 無料～ | ✓ | デプロイ簡単、自動SSL |
| **Netlify** | 無料～ | ✓ | 自動デプロイ、プレビュー機能 |
| **GitHub Pages** | 無料 | ✓ | Git と連携 |
| **Cloudflare Pages** | 無料～ | ✓ | 高速、グローバル配信 |
| **AWS S3 + CloudFront** | 従量課金 | ✓ | スケーラブル |

#### **Vercel へのデプロイ例**

```bash
# Vercel CLI をインストール
npm install -g vercel

# デプロイ
vercel

# または GitHub リポジトリを接続して自動デプロイ
```

---

## 📊 PWA チェックリスト

```
[ ] manifest.json が有効
[ ] Service Worker が登録される
[ ] HTTPS で配信されている
[ ] アイコンがすべて配置されている
[ ] index.html に必要なメタタグがある
[ ] オフラインで基本機能が動作する
[ ] インストール可能
[ ] ホーム画面に追加できる
[ ] 自動更新が機能する
```

---

## 📞 サポート

### よくある質問

**Q: ローカル開発で HTTPS にしたい**
```bash
# mkcert でローカル証明書生成
npm install -g mkcert
mkcert localhost

# Vite 設定で HTTPS を有効化
# vite.config.ts:
server: {
  https: true,
}
```

**Q: 古い Service Worker をクリア したい**
```
DevTools → Application → Service Workers → Unregister
DevTools → Application → Cache Storage → Delete all
リロード
```

**Q: データをリセットしたい**
```
DevTools → Application → Clear storage → Clear all
またはアプリをアンインストール
```

---

## 🎓 参考資料

- [MDN PWA チェックリスト](https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps)
- [Google PWA チェックリスト](https://web.dev/pwa-checklist/)
- [Vite PWA プラグイン](https://vite-pwa-org.netlify.app/)
- [Web.dev: Service Workers](https://web.dev/service-workers-cache-storage/)

---

**最終更新**: 2025年11月14日
**手順バージョン**: 1.0
