# SBT-JPYC-Pay

SBT-JPYC-Pay is an open source PWA that helps small shops experiment with JPYC payments and SBT-based stamp cards.

It provides a practical starting point for QR-based payment flows, wallet integration, and SBT stamp card issuance/management. The goal is to make JPYC payment experiments easier for small businesses, while also providing an open source reference for developers working with Web3-based shop tools.

> お店側のSBTスタンプカード発行・管理システム（SBT masaru21 Pay 仮）
> 暗号資産決済とSBTスタンプカードの統合管理


>
> 📱 **暗号資産決済とSBTスタンプカードの統合管理**

This is a Progressive Web App (PWA) for shop owners to issue and manage SBT (Soulbound Token) stamp cards with cryptocurrency payment integration.

## 🌐 ライブデモ

**[https://shop.jpyc-pay.app/](https://shop.jpyc-pay.app/)**

実際の動作をお試しいただけます。テストネット（Polygon Amoy）での利用を推奨します。

## 🌟 主要機能

- **SBT発行管理**: お店独自のデザインでSBTスタンプを発行
- **動的メタデータ**: 店舗設定に基づくSBTメタデータの自動生成
- **QRコード決済**: 制限時間付きQRコード決済システム
- **暗号資産決済連携**: 様々な暗号資産決済アプリに対応
- **ウォレット接続**: MetaMask、WalletConnect対応
- **Pinata連携**: 分散ストレージによる画像・メタデータ管理
- **PWA対応**: スマートフォンアプリのような操作感
- **マルチチェーン対応**: Polygon、Avalanche、Ethereum、Kaia

## 🔗 暗号資産決済との連携

このシステムは暗号資産決済アプリとの連携を前提として開発されています：

- **店舗側（このアプリ）**: QRコード生成、SBT発行設定、決済管理
- **顧客側（決済アプリ）**: QR読み取り、暗号資産決済、SBT受け取り
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
| Kaia Mainnet | 8217 (0x2019) | **KAIA** | 本番JPYC決済対応 |

**Polygonネットワークでは、アプリケーション内のガス代表記を POL で統一しています。Kaia Mainnet では KAIA 表記になります。**

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

### ⚠️ ガス代について

現在、このアプリでは **通常のガス代支払い方式** を使用しています：

- **SBT発行時**: お店側がガス代（POL）を負担
- **JPYC決済時**: ユーザー側がガス代を負担

#### ガス代の自動負担（ガスレス決済）について

店舗側がガス代を自動負担する機能の実装を検討する場合は、[GASLESS_PAYMENT_GUIDE.md](./GASLESS_PAYMENT_GUIDE.md) をご参照ください。

### 💰 ガス代表示機能

アプリ内には各トランザクションの **推定ガス代** が表示されます：

#### QRコード生成画面

- JPYC決済時のガス代を自動計算
- 現在のネットワークガス価格を反映
- 各ネットワークのネイティブトークン単位（POL、KAIAなど）とGwei単位で表示

#### SBT発行画面

- SBTミント時のガス代を自動計算
- NFT発行は通常のトランザクションより多くガスを消費

#### ガス代計算の仕組み

1. ネットワークから現在のガス価格を自動取得
2. トランザクション種別に応じたガス消費量を推定
3. ガス価格 × ガスユニット = 総ガス代（各ネットワークのネイティブトークン単位）
4. リアルタイムで表示更新

## 📜 コントラクトアドレス一覧

### 🎖️ SBT (Soulbound Token) コントラクト

#### Polygon Mainnet ✨ (推奨)

- **SBTコントラクト**: `0x26C55F745c5BF80475C2D024F9F07ce56E308039`
- **チェーンID**: 137
- **デプロイヤー**: `0x5888578ad9a33Ce8a9FA3A0ca40816665bfaD8Fd`
- **ブロックエクスプローラ**: [Polygonscan](https://polygonscan.com/address/0x26C55F745c5BF80475C2D024F9F07ce56E308039)

#### Ethereum Sepolia Testnet

- **SBTコントラクト**: `0x96FFdC8495742e1F0b0819dc1cB4548Bf3AD23A4`
- **チェーンID**: 11155111
- **ブロックエクスプローラ**: [Sepolia Etherscan](https://sepolia.etherscan.io/address/0x96FFdC8495742e1F0b0819dc1cB4548Bf3AD23A4)

#### Polygon Amoy Testnet

- **SBTコントラクト**: `0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E`
- **チェーンID**: 80002
- **ブロックエクスプローラ**: [Polygon Amoy Explorer](https://amoy.polygonscan.com/address/0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E)

### 💴 JPYC (JPY Coin) コントラクト

#### Ethereum Mainnet

- **JPYCコントラクト**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **チェーンID**: 1
- **ブロックエクスプローラ**: [Etherscan](https://etherscan.io/address/0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29)

#### Polygon Mainnet

- **JPYCコントラクト**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **チェーンID**: 137
- **ブロックエクスプローラ**: [Polygonscan](https://polygonscan.com/address/0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29)

#### Avalanche C-Chain

- **JPYCコントラクト**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **チェーンID**: 43114
- **ブロックエクスプローラ**: [Snowtrace](https://snowtrace.io/address/0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29)

#### Kaia Mainnet

- **JPYCコントラクト**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **チェーンID**: 8217 (0x2019)
- **ガス代トークン**: KAIA
- **ブロックエクスプローラ**: [KaiaScan](https://kaiascan.io/token/0xe7c3d8c9a439fede00d2600032d5db0be71c3c29)

#### Ethereum Sepolia Testnet (テスト用)

- **公式SepoliaJPYC**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **JPYC公式Faucet**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB` (JPYC公式のFaucetでもらえるトークン)
- **コミュニティJPYC**: `0xd3eF95d29A198868241FE374A999fc25F6152253` (コミュニティ提供)
- **チェーンID**: 11155111 (0xaa36a7)
- **ブロックエクスプローラ**: [Sepolia Etherscan](https://sepolia.etherscan.io/)

> **重要**: 公式テストJPYCの配布が限定的なため、以下の3種類のJPYCトークンが存在します：
>
> 1. 公式SepoliaJPYC - 正規の公式アドレス（配布は限定的）
> 2. JPYC公式Faucet - JPYC公式が提供するFaucetトークン
> 3. コミュニティJPYC - コミュニティによる提供トークン

#### Polygon Amoy Testnet (テスト用)

- **公式AmoyテストJPYC**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **tJPYC（デバッグ用）**: `0xcD54D62DF66f54AB3788CA17aD90d402eCD8D34a` ※未配布
- **チェーンID**: 80002 (0x13882)
- **ブロックエクスプローラ**: [Polygon Amoy Explorer](https://amoy.polygonscan.com/)

> **重要**: デバッグ用tJPYCは開発者専用で配布されていません。公式のFaucetで正式なJPYCテストトークンが配布されるまでは、各自でトークンのデプロイが必要かもしれません。

#### Avalanche Fuji Testnet (テスト用)

- **公式FujiテストJPYC**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **デバッグ用tJPYC (Fuji専用)**: `0xeAB2AF47cbc02CDD73d106CA15884cAB541F5345` ※未配布
- **チェーンID**: 43113 (0xa869)
- **ブロックエクスプローラ**: [Snowtrace Testnet](https://testnet.snowtrace.io/)

> **重要**: デバッグ用tJPYCは開発者専用で配布されていません。公式のFaucetで正式なJPYCテストトークンが配布されるまでは、各自でトークンのデプロイが必要かもしれません。

## ⚠️ JPYCの偽物トークンにご注意ください

### 🔒 公式JPYCコントラクトアドレス（全ネットワーク共通）

- **正規アドレス**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **対応ネットワーク**:
  - Ethereum Mainnet (ChainID: 1 / 0x1)
  - Polygon Mainnet (ChainID: 137 / 0x89)
  - Avalanche C-Chain (ChainID: 43114 / 0xa86a)
  - Kaia Mainnet (ChainID: 8217 / 0x2019)
- **テストネットワーク**:
  - Ethereum Sepolia (ChainID: 11155111 / 0xaa36a7)
  - Polygon Amoy (ChainID: 80002 / 0x13882)
  - Avalanche Fuji (ChainID: 43113 / 0xa869)

> ⚠️**注意**: 上記以外のコントラクトアドレスは偽物の可能性があります。必ず[JPYC公式FAQ](https://faq.jpyc.co.jp/s/article/fake-jpyc-warning)で最新の正規アドレスを確認してください。

### 🛡️ 偽物トークンの見分け方

- ✅ **正規**: コントラクトアドレスが`0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- ❌ **偽物**: 上記以外のアドレス、または類似した名前のトークン
- 📍 **確認方法**: [JPYC公式サイト](https://jpyc.co.jp/)または[公式FAQ](https://faq.jpyc.co.jp/s/ex)で最新情報を確認

### 📋 このアプリで使用している情報

- **SBTコントラクト**: 独自にデプロイしたSoulbound Token（当プロジェクト専用）
- **JPYCコントラクト**: JPYC公式の正規コントラクトアドレスのみ使用

> ⚠️**注意**: Sepolia と Polygon Amoy はテストネット用のコントラクトです。本番環境では Ethereum、Polygon、Avalanche、Kaia の Mainnet をご利用ください。

### トークン情報

- **JPYC** (Japanese Yen Coin) - 正規の公式トークン
- **tJPYC** (Test JPYC) - 開発・デバッグ専用トークン（配布なし）

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

### 📋 **完全ドキュメント一覧**: **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - 全ドキュメントの詳細インデックス

### 🛠️ SBT技術ドキュメント

- **[🔴 コントラクト要件チェックリスト](./CONTRACT_REQUIREMENTS.md)** - **デプロイ前必読**
- **[🆕 動的SBTメタデータ実装ガイド](./DYNAMIC_SBT_METADATA.md)** - 動的メタデータ機能の詳細
- **[📖 SBT発行完全ガイド](./docs/SBT_ISSUANCE_GUIDE.md)** - SBT発行プロセスの完全解説  
- **[📋 SBTメタデータ仕様書](./docs/SBT_METADATA_SPECIFICATION.md)** - メタデータ構造と技術仕様

### 💳 ウォレット対応ドキュメント

- **[🌐 Hash Port Wallet対応分析レポート](./HASHPACK_WALLET_QR_ANALYSIS.md)** - Hash Port Wallet QR対応状況と技術実装
- **[📱 店舗スタッフ向けHash Port Walletサポートガイド](./SHOP_HASHPACK_SUPPORT_GUIDE.md)** - 接客・案内マニュアル
- **[📱 モバイルウォレット対応ガイド](./MOBILE_WALLET_GUIDE.md)** - 各種ウォレット対応状況

### 📖 運用・管理ガイド

- **[🏪 ショップ管理者ガイド](./SHOP_ADMIN_GUIDE.md)** - 店舗運営者向け完全マニュアル
- **[👤 ユーザーガイド](./USER_GUIDE.md)** - エンドユーザー向け操作ガイド
- **[🔍 トランザクション検証ガイド](./TRANSACTION_VERIFICATION_GUIDE.md)** - ブロックチェーン決済の検証方法

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

### 🎖️ SBT・ウォレット関連

- **[SBT-JPYC-QR-Scanner](https://github.com/miracle777/SBT-JPYC-QR-Scanner)** - 顧客側QRスキャナー・SBT表示アプリ
  - SBT表示機能とネットワーク検証
  - QRコード読み取りとJPYC決済
  - マルチウォレット対応（MetaMask、Trust Wallet、HashPort等）
  - ライブデモ: [https://jpyc-pay.app/](https://jpyc-pay.app/)

### 💳 決済・ウォレット関連

- **[jpycwallet-x402](https://github.com/miracle777/jpycwallet-x402)** - QRコード規格参考
- **[jpycwallet.dev](https://github.com/miracle777/jpycwallet.dev)** - 関連実装参考
- **[jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner)** - 基本的なJPYC決済スキャナー

### 🏪 このプロジェクトとの関係

このプロジェクト（SBT-JPYC-Pay）は**店舗側アプリ**で、[SBT-JPYC-QR-Scanner](https://github.com/miracle777/SBT-JPYC-QR-Scanner)は**顧客側アプリ**として連携します：

- **店舗側（このアプリ）**: QRコード生成、SBT発行設定、決済管理
- **顧客側（SBT-JPYC-QR-Scanner）**: QR読み取り、SBT表示、JPYC決済実行

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
