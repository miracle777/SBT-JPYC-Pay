# SBT-JPYC-Pay

> お店側のSBTスタンプカード発行・管理システム
>
> 📱 **[JPYCペイアプリ](https://jpyc-pay.app/)との連携対応**

This is a Progressive Web App (PWA) for shop owners to issue and manage SBT (Soulbound Token) stamp cards with JPYC payment integration.

## 🌟 主要機能

- **SBT発行管理**: お店独自のデザインでSBTスタンプを発行
- **動的メタデータ**: 店舗設定に基づくSBTメタデータの自動生成
- **QRコード決済**: 制限時間付きQRコード決済システム
- **JPYCペイアプリ連携**: [jpyc-pay.app](https://jpyc-pay.app/) での顧客決済・SBT受け取りに対応
- **ウォレット接続**: MetaMask、WalletConnect対応
- **Pinata連携**: 分散ストレージによる画像・メタデータ管理
- **PWA対応**: スマートフォンアプリのような操作感
- **マルチチェーン対応**: Polygon、Avalanche、Ethereum

## 🔗 JPYCペイアプリとの連携

このシステムは **[JPYCペイアプリ（jpyc-pay.app）](https://jpyc-pay.app/)** との連携を前提として開発されています：

- **店舗側（このアプリ）**: QRコード生成、SBT発行設定、決済管理
- **顧客側（JPYCペイアプリ）**: QR読み取り、JPYC決済、SBT受け取り
- **データ連携**: 店舗情報、SBTテンプレート、決済履歴の統合管理

## 📚 利用ガイド

初回利用の方は [USER_GUIDE.md](./USER_GUIDE.md) を必ずお読みください。

> **⚠️ 重要**: SBTの発行には**サーバーの設定**と**インターネット接続**が必要です。
>
> ### 📡 ネットワーク要件の詳細
> - 🌐 **インターネット接続必要**: SBT発行時には以下のサービスへの接続が必要です
>   - **Pinata (IPFS)**: SBTメタデータと画像の分散保存 (`api.pinata.cloud`)
>   - **Polygon Network**: ブロックチェーンへのSBT記録 (`polygon-rpc.com`)
> - 🏢 **店舗・企業単位での運用推奨**: 実際の商用利用には、利用する店舗や企業単位でサーバーの設定も含めた環境構築が推奨されます
> - 📱 **オフライン対応範囲**:
>   - ✅ **テンプレート作成・編集**: SBTデザインやショップ設定
>   - ✅ **ローカルデータ管理**: 履歴・設定の保存・編集
>   - ❌ **QRコード決済（インターネット接続必要）**: ブロックチェーン取引のため
>   - ✅ **PWAアプリとしての動作**: オフラインでのアプリ起動・基本操作
> - ⚡ **PWA対応**: ネイティブアプリのような操作感でスマートフォンでも快適に利用可能

## 🛠️ 技術スタック

- **Frontend**: React + TypeScript + Vite
- **Web3**: ethers.js v6, WalletConnect
- **Storage**: Pinata (IPFS)
- **Blockchain**: Solidity, Hardhat
- **Styling**: Tailwind CSS
- **PWA**: Service Worker, Manifest

## 📋 セットアップ

> **⚠️ 重要な前提条件**
>
> - 🌐 **インターネット接続が必要**: SBT発行時にIPFSアップロードとブロックチェーン書き込みが必要です
> - 🗺️ **サーバー環境推奨**: 実際の利用にはPinata API設定やMetaMask接続が必要です
> - 🏢 **組織単位での導入推奨**: 店舗や企業単位でのサーバー設定も含めた環境構築を推奨します

### 🎯 利用シーン別セットアップガイド

#### 1. 💻 個人デモ・テスト用（ローカル環境）

```bash
# 1. リポジトリをクローン
npm install
npm run dev

# 2. アプリ内の「設定」ページでAPIキーを入力
# - Pinata API Key/Secret (テスト用でも登録必要)
# - ウォレット接続 (MetaMask)
```

#### 2. 🏢 店舗・企業導入用（サーバー環境）

```bash
# 1. サーバーにデプロイ
# 例: Vercel, Netlify, AWS, Azure 等

# 2. 環境変数でAPIキーを設定
VITE_PINATA_API_KEY=your_organization_api_key
VITE_PINATA_API_SECRET=your_organization_secret
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id

# 3. 組織内でのアクセスURLを共有
```

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

#### 🔑 WalletConnect プロジェクトID の取得方法

**WalletConnect のプロジェクトID**は、WalletConnect に対応したウォレット（WalletConnect経由）でアプリに接続するために必要です。以下の手順で取得できます：

1. **[WalletConnect Cloud](https://walletconnect.com/) にアクセス**
   - https://walletconnect.com/ を開く

2. **アカウント登録またはログイン**
   - 「Sign Up」または「Sign In」をクリック
   - メールアドレスで登録（または Google/GitHub でのログイン）

3. **新しいプロジェクトを作成**
   - ダッシュボードで「Create Project」をクリック
   - プロジェクト名（例：「SBT-JPYC-Pay」）を入力
   - 「Create」をクリック

4. **プロジェクトID をコピー**
   - プロジェクト詳細画面に表示される **Project ID** をコピー
   - 形式例：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

5. **環境変数に設定**
   - ローカル開発: `.env` ファイルに設定
     ```env
     VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here
     ```
   - Vercel デプロイ: Vercel のプロジェクト設定から環境変数として登録
     - プロジェクト → Settings → Environment Variables
     - Key: `VITE_WALLET_CONNECT_PROJECT_ID`
     - Value: コピーしたプロジェクトID

**参考**: [WalletConnect 公式ドキュメント](https://docs.walletconnect.com/)

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

## 🎨 ウォレット接続UI について

### RainbowKit による改善

本プロジェクトでは **[RainbowKit](https://www.rainbowkit.com/)** を採用しています。RainbowKit の採用により、以下のメリットが得られます：

- **複数ウォレット対応**: MetaMask、WalletConnect、Coinbase Wallet など多数のウォレットを統一 UI でサポート
- **自動ウォレット検出**: インストール済みウォレットを自動検出し、ユーザーに提示
- **接続管理の簡素化**: ウォレットの接続・切断を Wagmi の hooks でシンプルに管理
- **UX 改善**: ネイティブで使いやすい接続モーダルと、接続済み時のアドレス表示
- **チェーン切り替え**: 接続時にネットワーク（チェーン）の選択・切り替えも含まれる

### 実装方針

ウォレット接続機能を実装する際は、**RainbowKit + Wagmi** の組み合わせを推奨します：

```tsx
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createConfig, WagmiConfig } from 'wagmi';
import { metaMask, injected, walletConnect } from '@wagmi/connectors';

// アプリ内に RainbowKitProvider でラップ
const config = createConfig({
  chains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'Your App Name',
        url: window.location.origin,
      },
    }),
    injected(),
    walletConnect({ projectId }),
  ],
});

// ConnectButton.Custom でカスタマイズ可能
<RainbowKitProvider>
  <WagmiConfig config={config}>
    <YourApp />
  </WagmiConfig>
</RainbowKitProvider>
```

## 📖 使用方法

### 🏢 お店側の操作

> **⚠️ 前提条件**:
>
> - 🌐 **インターネット接続が必要**: SBT発行時にオンラインでのアップロードが必要です
> - 🗺️ **サーバー設定必要**: PinataのAPIキー、MetaMaskウォレットの接続が必要です

#### 📝 基本フロー

1. **ウォレット接続**: MetaMaskを接続
2. **SBT設定**: 店舗情報とスタンプデザインを設定
3. **決済QR生成**: 商品価格を入力してQRコード生成
4. **SBT発行**: 条件達成時に自動でSBTを発行 (⚠️ インターネット接続必要)

詳細は [LICENSE](./LICENSE) をご確認ください。

### 📱 ユーザー側の操作

詳細は [user仕様.md](./user仕様.md) を参照

## 📋 プライバシーポリシー・利用条件

### 🔒 データの保存について

このアプリはUIデモです。**ウォレット機能はありません**。

- すべてのデータはお客様のブラウザにローカル保存されます
- サーバーには一切送信・保存されません
- ウォレットを接続して利用する必要があります
- 残高やSBTなどの資産は**ウォレット側で保管**されます

### 💾 データ管理について

決済履歴、SBT情報、店舗設定などはすべてブラウザ内で管理され、外部に送信されることはありません。ブラウザのデータを削除すると履歴も削除されます。

### 🔌 ウォレット接続について

- MetaMask、WalletConnect等のウォレットを接続して利用します
- 本アプリにはウォレット機能が含まれていません
- 秘密鍵やシードフレーズは本アプリでは管理されません
- 資産の管理はすべてお客様のウォレットで行われます

### 🧪 このアプリの目的

- SBT（ソウルバウンドトークン）発行機能のデモンストレーション
- JPYC決済QRコード生成機能のテスト
- マルチチェーン対応ネットワーク検証機能の検証
- 実際の商用利用を意図したものではありません

## 🔴 重要：免責事項

**このアプリはテスト版です。本番環境での利用時は十分にご注意ください。**

### 資産損失について

- 本番JPYC送金時の損害について一切責任を負いません
- 誤操作による資産損失について責任を負いません
- ネットワーク手数料等の損失について責任を負いません
- **利用は完全に自己責任でお願いします**

### 推奨事項

- **必ずテストネット（Polygon Amoy など）でのみご利用ください**
- 本番環境での大量取引は避けてください
- 重要な資産を扱う際は十分な検証を行ってください

### システムの制限

- ネットワークの不具合による取引失敗の責任は負いません
- ガス代の変動による損失の責任は負いません
- ウォレット接続の問題による損失の責任は負いません
- 第三者によるスマートコントラクトの悪用について責任は負いません

---

© 2025 SBT-JPYC-Pay by [@masaru21](https://x.com/masaru21)

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

### Avalanche テストネット（Fuji） - Faucet 利用方法

Avalanche テストネットでテストを行う際は、テストネットAVAXが必要です。

#### Core Faucet ✅ 推奨

- **URL**: [https://core.app/tools/testnet-faucet/?avalanche-l1=c&token=c](https://core.app/tools/testnet-faucet/?avalanche-l1=c&token=c)
- **必須条件**: **メインネットのAVAX残高が 0 より多く必要**
- **特徴**: 本番のAVAX保有者向け
- **使い方**:
  1. MetaMaskでウォレットを接続
  2. メインネットでAVAX残高を確認（0より多く必要）
  3. Fujiテストネットでトークンを受け取り
  4. MetaMaskでブリッジして本番AVAXをテスト用に変換可能

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

### 個人利用・研究目的

学習、実験、研究など個人的な利用は無料でご利用いただけます。

### 商用利用

商業目的での利用には開発者（[@masaru21](https://x.com/masaru21)）からの事前許可が必要です。
お仕事のご相談・許可申請は以下からお願いします：

- [X (Twitter) @masaru21](https://x.com/masaru21)
- [リンクイット lit.link/itsapotamk](https://lit.link/itsapotamk)

詳細は [LICENSE](./LICENSE) をご確認ください。
