# ガスレス決済実装ガイド（Biconomy Account Abstraction）

このプロジェクトには、店舗側がガス代を負担する「ガスレス決済」機能の基盤が実装されています。

## 📋 目次

1. [概要](#概要)
2. [Biconomyとは](#biconomyとは)
3. [料金体系](#料金体系)
4. [セットアップ手順](#セットアップ手順)
5. [実装ファイル](#実装ファイル)
6. [使用方法](#使用方法)
7. [注意事項](#注意事項)

---

## 概要

**ガスレス決済**とは、お客様がガス代（トランザクション手数料）を支払うことなく、暗号資産の送金ができる仕組みです。店舗側がガス代を負担することで、お客様の利便性が向上します。

### 実装済みの機能

- ✅ Biconomy SDK v4 のインストール完了
- ✅ 設定ファイル（`src/config/biconomy.ts`）
- ✅ ガスレス決済ユーティリティ（`src/utils/gaslessPayment.ts`）
- ✅ 環境変数設定ファイル（`.env.local`）

### 未実装の機能

- ⏸️ UI統合（QRPaymentページへのボタン追加）
- ⏸️ トランザクション実行ロジック
- ⏸️ エラーハンドリング

---

## Biconomyとは

[Biconomy](https://www.biconomy.io/) は、Ethereum のAccount Abstraction (AA) を実装したプラットフォームです。

### 主な機能

- **ガスレストランザクション**: ユーザーがガス代を支払わずに取引可能
- **バッチトランザクション**: 複数のトランザクションを1つにまとめる
- **セッションキー**: 一定期間、署名なしで自動実行
- **マルチチェーン対応**: Polygon、Ethereum、Avalanche など

---

## 料金体系

### 無料プラン（Testnet）

- ✅ **テストネット**: 完全無料・無制限
  - Polygon Amoy
  - Ethereum Sepolia
  - その他テストネット

### Mainnet 料金

⚠️ **注意**: Mainnet（本番環境）の料金は公式サイトで確認が必要です。

- 📊 **従量課金制**: トランザクション数に応じた課金
- 💰 **ガス代**: 店舗側が負担（POL/ETH/AVAX）
- 🎯 **Paymaster費用**: Biconomyへの手数料（詳細は要確認）

#### 料金確認方法

1. [Biconomy Dashboard](https://dashboard.biconomy.io/) にログイン
2. プロジェクト作成時に料金プランを確認
3. 公式ドキュメント: https://docs.biconomy.io/

---

## セットアップ手順

### 1. Biconomy Dashboard でアカウント作成

1. **アクセス**: https://dashboard.biconomy.io/
2. **サインアップ**: Googleアカウントで登録（無料）
3. **プロジェクト作成**: 
   - 「Create New Project」をクリック
   - プロジェクト名: 例「SBT JPYC Pay」

### 2. ネットワーク設定

#### テストネット（推奨）

1. Dashboard で **Polygon Amoy Testnet** を選択
2. **Paymaster** を有効化
3. **Sponsored Mode** を選択（店舗側がガス代負担）

#### Mainnet（本番環境）

1. Dashboard で **Polygon Mainnet** を選択
2. 料金プランを確認・選択
3. 支払い方法を設定

### 3. API Key 取得

1. **Bundler URL** をコピー
   ```
   https://bundler.biconomy.io/api/v2/80002/YOUR_KEY_HERE
   ```

2. **Paymaster API Key** をコピー
   ```
   YOUR_KEY_HERE.paymaster-key-string
   ```

### 4. 環境変数設定

`.env.local` ファイルを編集:

```env
# Polygon Amoy Testnet (ChainID: 80002)
VITE_BICONOMY_BUNDLER_URL_80002=https://bundler.biconomy.io/api/v2/80002/YOUR_KEY
VITE_BICONOMY_PAYMASTER_KEY_80002=YOUR_PAYMASTER_KEY

# Polygon Mainnet (ChainID: 137)
VITE_BICONOMY_BUNDLER_URL_137=https://bundler.biconomy.io/api/v2/137/YOUR_KEY
VITE_BICONOMY_PAYMASTER_KEY_137=YOUR_PAYMASTER_KEY
```

### 5. 開発サーバー再起動

```bash
npm run dev
```

---

## 実装ファイル

### 設定ファイル

#### `src/config/biconomy.ts`

Biconomyの基本設定とAPI Key管理

```typescript
import { getBiconomyConfig } from '../config/biconomy';

const { bundlerUrl, paymasterKey } = getBiconomyConfig(80002); // Polygon Amoy
```

#### `src/utils/gaslessPayment.ts`

ガスレストランザクション実行のユーティリティ関数

```typescript
import { sendGaslessTransaction, isGaslessAvailable } from '../utils/gaslessPayment';

// ガスレス決済が利用可能か確認
if (isGaslessAvailable(chainId)) {
  // ガスレス決済を実行
  const result = await sendGaslessTransaction(
    customerAddress,
    shopAddress,
    jpycContractAddress,
    amount,
    chainId,
    shopPrivateKey
  );
}
```

---

## 使用方法

### 基本的な実装例

```typescript
import { sendGaslessTransaction } from '@/utils/gaslessPayment';

// ガスレストランザクションを送信
async function processGaslessPayment(
  customerAddress: string,
  amount: string,
  chainId: number
) {
  try {
    const result = await sendGaslessTransaction(
      customerAddress,
      shopWalletAddress,
      jpycContractAddress,
      amount,
      chainId,
      shopPrivateKey
    );

    if (result.success) {
      console.log('✅ ガスレス決済成功:', result.txHash);
      toast.success(`決済完了: ${result.txHash}`);
    } else {
      console.error('❌ ガスレス決済失敗:', result.error);
      toast.error(`決済失敗: ${result.error}`);
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}
```

### UIへの統合例

```typescript
// QRPaymentページにボタンを追加
<button
  onClick={() => processGaslessPayment(
    customerAddress,
    amount,
    selectedChainId
  )}
  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg"
>
  <Sparkles className="w-5 h-5 inline mr-2" />
  ガスレス決済
</button>
```

---

## 注意事項

### セキュリティ

⚠️ **重要**: 店舗の秘密鍵管理には細心の注意が必要です。

- ❌ **フロントエンドに秘密鍵を保存しない**
- ✅ **バックエンドサーバーで秘密鍵を管理**
- ✅ **環境変数で秘密鍵を管理**
- ✅ **本番環境では AWS Secrets Manager / Azure Key Vault 等を使用**

### コスト管理

- 📊 店舗側がガス代を全額負担
- 💰 Polygon Mainnet のガス代: 約 1-5円/トランザクション
- 📈 大量トランザクション時はコストが増加
- 🎯 月間トランザクション数を予測して予算を設定

### テスト推奨

1. **必ずテストネットで動作確認**
   - Polygon Amoy で十分にテスト
   - コスト見積もりを実施

2. **段階的なリリース**
   - 少額決済から開始
   - トランザクション数をモニタリング
   - コストを継続的に確認

### サポートされるネットワーク

- ✅ Polygon Mainnet (ChainID: 137)
- ✅ Polygon Amoy Testnet (ChainID: 80002)
- ✅ Ethereum Sepolia Testnet (ChainID: 11155111)
- ✅ その他 Biconomy 対応ネットワーク

---

## 参考リンク

- 🏠 **Biconomy 公式サイト**: https://www.biconomy.io/
- 📖 **公式ドキュメント**: https://docs.biconomy.io/
- 🎛️ **Dashboard**: https://dashboard.biconomy.io/
- 💬 **Discord コミュニティ**: https://discord.gg/biconomy
- 📺 **チュートリアル動画**: https://www.youtube.com/@biconomy

---

## トラブルシューティング

### よくある問題

#### 1. "Paymaster not configured" エラー

**原因**: API Keyが未設定または無効

**解決方法**:
- `.env.local` の設定を確認
- Biconomy Dashboard で Paymaster が有効化されているか確認
- 開発サーバーを再起動

#### 2. "Insufficient balance for gas" エラー

**原因**: 店舗ウォレットのガス代残高不足

**解決方法**:
- 店舗ウォレットに POL/ETH をチャージ
- Polygon の場合: 0.1 POL 程度を常時保持

#### 3. トランザクションが失敗する

**原因**: ネットワーク混雑、ガス代不足など

**解決方法**:
- ガス価格を確認
- トランザクションをリトライ
- Biconomy Dashboard でステータス確認

---

## ライセンス

このガイドは SBT-JPYC-Pay プロジェクトの一部です。
LICENSE ファイルを参照してください。

---

**作成日**: 2025年11月19日  
**最終更新**: 2025年11月19日  
**バージョン**: 1.0.0
