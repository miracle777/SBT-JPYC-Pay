# SBT-JPYC-Pay

> お店側のSBTスタンプカード発行・管理システム

This is a Progressive Web App (PWA) for shop owners to issue and manage SBT (Soulbound Token) stamp cards with JPYC payment integration.

## 🌟 主要機能

- **SBT発行管理**: お店独自のデザインでSBTスタンプを発行
- **動的メタデータ**: 店舗設定に基づくSBTメタデータの自動生成
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

## 🌐 ネットワーク設定

### ガス代の変更（重要）

**2024年9月のアップグレードにより、Polygonネットワークのネイティブトークンが MATIC → POL に変更されました。**

| ネットワーク | チェーンID | ガス代トークン | ステータス |
|-----------|----------|------------|---------|
| Polygon Mainnet | 137 | **POL** | 本番環境 |
| Polygon Amoy | 80002 | **POL (テスト用)** | テスト環境 |

**このアプリケーション内では POL で統一表記されます。**

### Amoy テストネット - Faucet 利用方法

Polygon Amoy でテストを行う際は、テストネットトークン（POL）が必要です。以下のファウセットから取得できます。

#### 1. Alchemy Faucet ✅ 推奨

- **URL**: [https://www.alchemy.com/faucets/polygon-amoy](https://www.alchemy.com/faucets/polygon-amoy)
- **取得量**: 0.1 POL/日（アカウント登録時は 0.5 POL/日）
- **認証**: 不要
- **特徴**: 最も簡単、認証不要、高速
- **使い方**:
  1. ウォレットアドレスを入力
  2. 「Send 0.1 POL」をクリック
  3. 24時間後に再度利用可能

#### 2. QuickNode Polygon Faucet

- **URL**: [https://faucet.quicknode.com/polygon](https://faucet.quicknode.com/polygon)
- **取得量**: 1x POL/12時間（Tweetで2x ボーナス）
- **⚠️ 必須条件**: **ウォレットに最低 0.001 ETH (Ethereum Mainnet) 保有**
- **使い方**:
  1. MetaMask/Coinbase Wallet などをconnect
  2. ウォレットが 0.001 ETH 以上保有していることを確認
  3. Polygon Amoy を選択
  4. トークン受け取り（12時間ごと）
  5. Tweetボーナスで 2x 取得可能

**⚠️ 注意**: QuickNode Faucet は Ethereum Mainnet 上の ETH 残高チェックがあります。Ethereum Sepolia テスト ETH では使用できません。

#### 3. GetBlock Faucet

- **URL**: [https://getblock.io/faucet/matic-amoy/](https://getblock.io/faucet/matic-amoy/)
- **認証**: 登録/ログイン必要
- **特徴**: TwitterでのシェアでボーナスPOL取得可能

### 推奨フロー

1. **初回テスト**: Alchemy Faucet で 0.1 POL 取得
2. **継続テスト**: 24時間ごと Alchemy Faucet で補充
3. **高頻度テスト**: Ethereum Mainnet で 0.001 ETH 取得後、QuickNode で最大 2x POL/12時間

### ガスレス決済について

このアプリは **ガスレス決済モデル** を採用しています：

- **お店が負担**: ガス代（POL）
- **ユーザーが負担**: 商品代金（JPYC）
- **メリット**: ユーザーはガス代を気にせずSBT受け取り可能

### 💰 ガス代表示機能

アプリ内には各トランザクションの **推定ガス代** が表示されます：

#### QRコード生成画面

- JPYC決済時のガス代を自動計算
- 現在のネットワークガス価格を反映
- POL単位とGwei単位で表示

#### SBT発行画面

- SBTミント時のガス代を自動計算
- NFT発行は通常のトランザクションより多くガスを消費
- お店がガスレス決済を通じて負担

#### ガス代計算の仕組み

1. ネットワークから現在のガス価格を自動取得
2. トランザクション種別に応じたガス消費量を推定
3. ガス価格 × ガスユニット = 総ガス代（POL単位）
4. リアルタイムで表示更新

### トークン情報

- **JPYC** (Japanese Yen Coin)
  - Polygon Mainnet: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
  - Polygon Amoy: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`

## 🆕 最新機能：動的SBTメタデータ

**v2024.11.17** より、SBTメタデータが動的に生成されるようになりました：

### 特徴
- **店舗設定連携**: 設定画面で入力した店舗名・カテゴリ・説明が自動的にSBTメタデータに反映
- **ハードコーディング削除**: 固定された店舗情報から、テンプレート・設定ベースの動的生成へ移行
- **自動ランク決定**: 必要訪問回数に応じてbronze/silver/gold/platinumを自動設定
- **特典リスト生成**: テンプレートの報酬説明から配列形式の特典リストを自動作成

### メタデータ形式
```json
{
  "name": "カフェ常連客証明",
  "description": "Cafe JPYCの常連客証明SBT",
  "shopId": 2,
  "required_visits": 5,
  "benefits": ["10%割引", "無料ドリンクアップグレード"],
  "attributes": [
    {"trait_type": "Shop Name", "value": "Cafe JPYC"},
    {"trait_type": "Shop Category", "value": "カフェ・飲食"},
    {"trait_type": "Rank", "value": "silver"}
  ]
}
```

詳細は **[DYNAMIC_SBT_METADATA.md](./DYNAMIC_SBT_METADATA.md)** を参照

## 📚 ドキュメント

### 🛠️ SBT技術ドキュメント

- **[🆕 動的SBTメタデータ実装ガイド](./DYNAMIC_SBT_METADATA.md)** - 動的メタデータ機能の詳細
- **[📖 SBT発行完全ガイド](./docs/SBT_ISSUANCE_GUIDE.md)** - SBT発行プロセスの完全解説  
- **[📋 SBTメタデータ仕様書](./docs/SBT_METADATA_SPECIFICATION.md)** - メタデータ構造と技術仕様

### 📱 スマホアプリ向けドキュメント

- **[📱 SBT一覧表示実装ガイド](./docs/SBT_LIST_INTEGRATION.md)** ⭐ スマホでSBTを表示したい場合は必読
  - React コンポーネント実装例（完全版）
  - 複数ショップ対応（タブ表示）
  - 来店回数（スタンプ数）表示
  - Polygon MainNet / Amoy Testnet 完全対応
  - IPFS メタデータ取得
  - トラブルシューティング

### 📖 操作マニュアル

- **[Shop仕様](./Shop仕様.md)** - お店側の操作マニュアル
- **[User仕様](./user仕様.md)** - ユーザー側の操作マニュアル

## 🔗 関連リポジトリ

- [jpycwallet-x402](https://github.com/miracle777/jpycwallet-x402) - QRコード規格参考
- [jpycwallet.dev](https://github.com/miracle777/jpycwallet.dev) - ガスレス決済参考
- [jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner) - ユーザー側アプリ

## 📁 プロジェクト構造

```plaintext
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
