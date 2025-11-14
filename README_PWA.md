# 📱 SBT JPYC Pay - PWA 対応版

パソコン・タブレット・スマートフォンにインストール可能な **Progressive Web App (PWA)** として、SBTスタンプカード発行・QR決済管理システムです。

## 🌟 主な機能

### ✅ 完全対応

- 📊 **SBT テンプレート管理** - 3つの発行パターン（毎回、カウント達成後、期間内）
- 🎨 **画像アップロード** - JPEG 512×512px で店舗ロゴ設定
- 🔐 **ウォレット接続** - MetaMask、WalletConnect 対応（PC・タブレット最適）
- 💾 **ローカル保存** - IndexedDB + localStorage で完全にデバイスに保存
- 📱 **ホーム画面追加** - スマートフォン・パソコンから インストール可能
- ⚡ **オフライン対応** - インターネット接続なしでも基本機能が動作
- 🔄 **自動更新** - Service Worker で新しいバージョンを自動取得

### ⚠️ 制限事項

- **スマートフォン（PWA版Safari）**: MetaMask アプリのブラウザからアクセス必要
- **ブロックチェーン機能**: インターネット接続が必須

---

## 🚀 クイックスタート

### 1️⃣ インストール方法

**Windows パソコン (Chrome/Edge):**
```
1. http://localhost:4173 を開く
2. アドレスバーに「インストール」ボタンが表示される
3. クリック → スタートメニューに追加
```

**iPhone (Safari):**
```
1. Safari で http://localhost:4173 を開く
2. 共有ボタン（↑） → 「ホーム画面に追加」
3. ホーム画面にアイコン追加
```

**Android (Chrome):**
```
1. Chrome で http://localhost:4173 を開く
2. メニュー（⋮） → 「アプリをインストール」
3. ホーム画面にアイコン追加
```

### 2️⃣ 開発環境セットアップ

```bash
# クローンして依存関係をインストール
git clone <repository>
cd SBT-JPYC-Pay
npm install

# 開発サーバー起動
npm run dev
# → http://localhost:3000

# ビルド
npm run build

# プレビュー (本番版確認)
npm run preview
# → http://localhost:4173
```

---

## 📋 PWA セットアップ (初回のみ)

### ✅ 既に完了されています

- ✓ manifest.json（`/public/manifest.json`）
- ✓ Service Worker 設定（`vite.config.ts`）
- ✓ PWA アイコン（`/public/icons/*.png`）
- ✓ index.html メタタグ設定

### 📱 動作確認

1. **npm run build** でビルド
2. **npm run preview** でプレビュー起動
3. Chrome で http://localhost:4173 を開く
4. アドレスバーにインストールボタン表示される ✓

---

## 📚 ドキュメント

| ドキュメント | 説明 |
|------------|------|
| **PWA_GUIDE.md** | PWA の使用方法、各デバイスでのインストール手順 |
| **PWA_SETUP.md** | PWA セットアップ手順、トラブルシューティング |
| **FLOW_GUIDE.md** | 機能仕様、SBT 発行パターン説明 |
| **DATA_PERSISTENCE.md** | データ永続化アーキテクチャ（IndexedDB + localStorage） |

---

## 🎯 技術スタック

```
Frontend:
  - React 18 + TypeScript
  - Vite (高速ビルド)
  - Tailwind CSS 3 (レスポンシブUI)

Web3:
  - ethers.js v6 (ウォレット接続)
  - wagmi + viem (ブロックチェーン操作)

PWA/Storage:
  - Vite PWA プラグイン (Service Worker)
  - IndexedDB API (永続化)
  - localStorage (バックアップ)

通知:
  - react-hot-toast (トースト表示)
  - lucide-react (アイコン)
```

---

## 🔧 設定ファイル

### manifest.json
```json
{
  "name": "SBT JPYC Pay - 店舗スタンプカード管理",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#7c3aed",
  "icons": [...]
}
```

### vite.config.ts
- **registerType**: `autoUpdate` - 自動更新有効
- **workbox**: キャッシュ戦略設定
  - JS/CSS/HTML: 各更新時に取得
  - 画像: 30日間キャッシュ

---

## 📊 ファイル構成

```
SBT-JPYC-Pay/
├── src/
│   ├── pages/
│   │   ├── SBTManagement.tsx      # SBT テンプレート・発行管理
│   │   ├── QRPayment.tsx          # QR 決済受付
│   │   └── Settings.tsx           # 設定画面
│   ├── components/
│   │   ├── WalletConnect.tsx      # ウォレット接続UI
│   │   └── QRCodeDisplay.tsx      # QRコード表示
│   ├── hooks/
│   │   └── useWallet.ts           # ウォレットロジック
│   ├── utils/
│   │   ├── storage.ts             # IndexedDB + localStorage
│   │   └── helpers.ts             # ユーティリティ関数
│   ├── App.tsx                    # メインアプリ
│   └── main.tsx                   # エントリーポイント
├── public/
│   ├── manifest.json              # PWA メタデータ
│   ├── icons/                     # PWA アイコン (192x192, 512x512 等)
│   └── [assets]/
├── index.html                     # PWA メタタグ設定済み
├── vite.config.ts                 # Vite + PWA 設定
└── package.json
```

---

## 🌍 デプロイ

### 推奨ホスティング

| ホスティング | 料金 | 特徴 |
|------------|------|------|
| **Vercel** | 無料～ | デプロイ簡単、自動SSL、高速 |
| **Netlify** | 無料～ | 自動デプロイ、プレビュー機能 |
| **GitHub Pages** | 無料 | Git 連携、手軽 |
| **Cloudflare Pages** | 無料～ | グローバル配信、高速 |

### デプロイ手順（Vercel）

```bash
npm install -g vercel
vercel
```

または GitHub リポジトリを Vercel に接続して自動デプロイ

---

## ⚙️ 環境変数

```env
# .env.local

# Blockchain RPC エンドポイント
VITE_POLYGON_RPC=https://polygon-rpc.com
VITE_AVALANCHE_RPC=https://api.avax.network/ext/bc/C/rpc

# サポートチェーン ID
VITE_SUPPORTED_CHAINS=1,137,43114
```

---

## 🔐 セキュリティ

- ✅ **ユーザー管理なし** - 各デバイスで完全独立
- ✅ **HTTPS推奨** - PWA デプロイ時は HTTPS 必須
- ✅ **ローカル保存** - 個人情報はデバイスにのみ保存
- ✅ **Service Worker** - オフライン機能 + キャッシュ制御
- ⚠️ **MetaMask 依存** - ウォレット機能は MetaMask に依存

---

## 📖 PWA ガイド

詳しい使用方法は **PWA_GUIDE.md** を参照してください。

- インストール方法（OS別）
- デバイス別の最適な設定
- オフライン動作
- トラブルシューティング
- よくある質問

---

## 🐛 トラブルシューティング

### Q: インストールボタンが表示されない

```bash
# 以下を確認:
1. ブラウザが最新版か確認 (Chrome, Edge)
2. http://localhost:4173 で確認 (HTTPS は不要)
3. DevTools → Application → Manifest で確認
4. Service Worker が registered か確認
```

### Q: Service Worker が登録されない

```bash
# キャッシュをクリア:
Ctrl + Shift + Del
→ キャッシュとクッキーをクリア
→ リロード
```

### Q: SBT データが保存されない

```bash
# IndexedDB を確認:
DevTools → Application → IndexedDB
→ SBT_JPYC_PAY データベース存在確認
→ 必要に応じて削除後、再度開く
```

---

## 📞 サポート

### リソース
- [PWA Guide](./PWA_GUIDE.md)
- [PWA Setup](./PWA_SETUP.md)
- [MDN PWA チェックリスト](https://developer.mozilla.org/ja/docs/Web/Progressive_web_apps)
- [Google PWA チェックリスト](https://web.dev/pwa-checklist/)

### よくある質問
- PWA と通常のウェブサイトの違い → PWA_GUIDE.md 参照
- スマートフォンでMetaMask が使えない → PWA_GUIDE.md「SBT発行への影響」参照
- データをデバイス間で同期したい → PWA_GUIDE.md「データ管理」参照

---

## 📜 ライセンス

MIT

---

## 👨‍💻 開発者向け情報

### プロジェクト構成

```
開発流:
1. npm run dev           # ホットリロード開発
2. コード編集            # src/ フォルダ
3. npm run build        # 本番ビルド
4. npm run preview      # 本番ビルド確認
5. デプロイ              # Vercel 等
```

### PWA アイコン生成

```bash
# SVG → PNG 自動生成
node setup-pwa.js
node public/icons/generate-icons.js
```

### Service Worker の動作確認

```javascript
// ブラウザコンソール:
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs))
```

---

**最終更新**: 2025年11月14日  
**バージョン**: 1.0.0 PWA対応版  
**対応ブラウザ**: Chrome 90+, Edge 90+, Safari 15+, Firefox 88+
