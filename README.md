# SBT-JPYC-Pay

> お店側のSBTスタンプカード発行・管理システム

This is a Progressive Web App (PWA) for shop owners to issue and manage SBT (Soulbound Token) stamp cards with JPYC payment integration.

## 🌟 主要機能

- **SBT発行管理**: お店独自のデザインでSBTスタンプを発行
- **QRコード決済**: 制限時間付きQRコード決済システム
- **ウォレット接続**: MetaMask、WalletConnect対応
- **Pinata連携**: 分散ストレージによる画像・メタデータ管理
- **PWA対応**: スマートフォンアプリのような操作感
- **マルチチェーン対応**: Polygon、Avalanche、Ethereum

## 🛠️ 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Web3**: ethers.js v6, WalletConnect
- **Storage**: Pinata (IPFS)
- **Blockchain**: Solidity, Hardhat
- **Styling**: Tailwind CSS
- **PWA**: Service Worker, Manifest

## 📋 セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env`ファイルを作成：
```env
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_API_SECRET=your_pinata_api_secret
VITE_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
```

### 3. スマートコントラクトのデプロイ
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat deploy --network polygon
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

## 📖 使用方法

### お店側の操作
詳細は [Shop仕様.md](./Shop仕様.md) を参照

1. **ウォレット接続**: MetaMaskを接続
2. **SBT設定**: 店舗情報とスタンプデザインを設定
3. **決済QR生成**: 商品価格を入力してQRコード生成
4. **SBT発行**: 条件達成時に自動でSBTを発行

### ユーザー側の操作
詳細は [user仕様.md](./user仕様.md) を参照

## 🔗 関連リポジトリ

- [jpycwallet-x402](https://github.com/miracle777/jpycwallet-x402) - QRコード規格参考
- [jpycwallet.dev](https://github.com/miracle777/jpycwallet.dev) - ガスレス決済参考
- [jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner) - ユーザー側アプリ

## 📁 プロジェクト構造

```
.
├── src/                    # フロントエンドソース
│   ├── components/         # Reactコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── utils/             # ユーティリティ
│   ├── types/             # TypeScript型定義
│   └── styles/            # スタイル
├── contracts/             # スマートコントラクト
├── public/               # 静的ファイル
└── docs/                 # ドキュメント
```

## 🎯 SBTスタンプカードについて

- **発行条件**: 10回など指定回数での自動発行
- **データ管理**: ユーザーの自己管理（ノンカストディアル）
- **コレクション性**: 店舗別デザインによる差別化
- **セキュリティ**: 転送不可（Soulbound）による不正防止
- **メタデータ**: 店舗情報・クーポン情報の埋め込み可能

## 📄 ライセンス

MIT License

