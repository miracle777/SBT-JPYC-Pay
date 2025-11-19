# 🚀 SBTシステム デプロイ完全ガイド

このガイドでは、JPYC SBTスタンプシステムをテストネットから本番環境までデプロイする手順を解説します。

## 📋 目次

1. [環境準備](#環境準備)
2. [テストネットデプロイ](#テストネットデプロイ)
3. [アプリケーション設定](#アプリケーション設定)
4. [ショップオーナー登録](#ショップオーナー登録)
5. [SBT発行テスト](#SBT発行テスト)
6. [本番環境デプロイ](#本番環境デプロイ)
7. [トラブルシューティング](#トラブルシューティング)

---

## 🔧 環境準備

### 1. 必要なツール

- **Node.js**: v18以上
- **npm**: v9以上
- **MetaMask**: ブラウザ拡張機能
- **Git**: バージョン管理

### 2. MetaMaskのセットアップ

#### 2-1. MetaMaskのインストール

1. [MetaMask公式サイト](https://metamask.io/)からブラウザ拡張機能をインストール
2. 新しいウォレットを作成（または既存のウォレットをインポート）
3. **シークレットリカバリーフレーズを安全に保管**（絶対に誰にも見せない！）

#### 2-2. Polygon Amoy テストネットの追加

MetaMaskに以下のネットワークを追加します:

```
ネットワーク名: Polygon Amoy Testnet
RPC URL: https://rpc-amoy.polygon.technology/
Chain ID: 80002
通貨シンボル: POL
Block Explorer: https://amoy.polygonscan.com/
```

**追加方法:**
1. MetaMaskを開く
2. 上部のネットワーク選択をクリック
3. 「ネットワークを追加」→「ネットワークを手動で追加」
4. 上記の情報を入力して保存

#### 2-3. テストPOLの取得

1. [Polygon Faucet](https://faucet.polygon.technology/)にアクセス
2. 「Polygon Amoy」を選択
3. ウォレットアドレスを入力
4. テストPOLを請求（最低 0.1 POL 推奨）

---

## 🧪 テストネットデプロイ

### 1. プロジェクトのクローン

```bash
git clone https://github.com/your-repo/SBT-JPYC-Pay.git
cd SBT-JPYC-Pay
npm install
```

### 2. 環境変数の設定

`contracts/.env` ファイルを作成:

```env
# デプロイ用の秘密鍵（0xなし）
PRIVATE_KEY=your_private_key_here

# Polygon Amoy RPC URL
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/

# Polygon Mainnet RPC URL（本番用）
POLYGON_RPC_URL=https://polygon-rpc.com

# Polygonscan API Key（検証用・オプション）
POLYGONSCAN_API_KEY=your_api_key_here
```

**⚠️ セキュリティ警告:**
- `.env` ファイルは絶対にGitにコミットしない
- 秘密鍵は安全に管理し、誰とも共有しない
- テスト用と本番用で異なるウォレットを使用推奨

**秘密鍵の取得方法:**
1. MetaMaskを開く
2. アカウント詳細 → 「秘密鍵をエクスポート」
3. パスワードを入力
4. 表示された秘密鍵から `0x` を除いた部分をコピー

### 3. 依存パッケージのインストール

```bash
cd contracts
npm install
```

### 4. テストネットへのデプロイ

```bash
npx hardhat run scripts/deploy-testnet.js --network polygonAmoy
```

**成功すると以下のように表示されます:**

```
🚀 Polygon Amoy Testnet へのコントラクトデプロイを開始します...
============================================================
📡 接続ネットワーク: amoy (Chain ID: 80002)
👤 デプロイアカウント: 0xYourAddress...
💰 アカウント残高: 0.5 POL
⛽ 現在のガス価格: 30 Gwei

✅ デプロイ完了!
📍 コントラクトアドレス: 0x1234567890abcdef...
👤 コントラクト所有者: 0xYourAddress...
```

**📝 重要: コントラクトアドレスをメモしてください！**

---

## ⚙️ アプリケーション設定

### 1. コントラクトアドレスの更新

`src/config/contracts.ts` を開き、以下を更新:

```typescript
export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // Testnet
  80002: '0xYourContractAddressHere', // ← デプロイしたアドレスに変更
  // Mainnet
  137: '0x0000000000000000000000000000000000000000',
};
```

### 2. 開発サーバーの起動

プロジェクトルートで:

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

### 3. 店舗情報の登録

1. アプリケーションで「設定」ページへ移動
2. 以下の情報を入力:
   - **店舗名**: あなたの店舗名
   - **店舗説明**: サービス内容
   - **ショップオーナーアドレス**: デプロイに使用したウォレットアドレス
   - **ロゴ画像**: 店舗ロゴ（オプション）
3. 「保存」をクリック

---

## 🏪 ショップオーナー登録

### 1. MetaMaskの接続確認

- MetaMaskが **Polygon Amoy テストネット** に接続されていることを確認
- デプロイに使用したアドレスで接続していることを確認

### 2. ショップオーナー登録の実行

1. 「SBT管理」ページへ移動
2. ページ上部に警告が表示されている場合:
   ```
   ⚠️ SBT発行権限がありません
   ```
3. 「🏪 ショップオーナーとして登録する」ボタンをクリック
4. MetaMaskでトランザクションを確認
5. 署名して送信
6. トランザクション完了を待つ（約10〜30秒）

**成功すると:**
```
🎉 ショップオーナー登録完了！
```

### 3. 登録の確認

ページをリロードして、以下が表示されることを確認:

```
✅ SBT発行権限OK
ショップオーナーとしてSBTをミントできます
```

---

## 🎨 SBT発行テスト

### 1. テンプレートの選択

SBT管理画面で、初期テンプレート（スタンプカード、マイルストーン、キャンペーン）から選択。

### 2. SBTの発行

1. 受取人のウォレットアドレスを入力（テスト用に自分のアドレスでもOK）
2. SBT用の画像を選択してアップロード
3. Pinataに自動的にアップロード → IPFS URLが生成される
4. 「SBT発行」ボタンをクリック
5. MetaMaskでトランザクションを確認・署名
6. ミント完了を待つ

### 3. 発行の確認

- 発行済みSBTリストに新しいSBTが表示される
- [Amoy Polygonscan](https://amoy.polygonscan.com/)でトランザクション詳細を確認

---

## 🌐 本番環境デプロイ

### ⚠️ デプロイ前のチェックリスト

- [ ] テストネットで全機能をテスト済み
- [ ] SBT発行・受取のフローを確認済み
- [ ] 本番用ウォレットに十分なPOL（0.05 POL以上推奨）
- [ ] `.env` の秘密鍵を本番用に更新済み
- [ ] コントラクトコードのレビュー完了

### 1. 本番用ウォレットの準備

1. MetaMaskで **Polygon Mainnet** に切り替え
2. POLトークンを購入または転送（最低0.05 POL推奨）
3. 本番用の秘密鍵を `.env` の `PRIVATE_KEY` に設定

### 2. 本番環境へのデプロイ

```bash
cd contracts
npx hardhat run deploy-mainnet.js --network polygon
```

**デプロイ完了後:**
```
✅ デプロイ完了!
📍 コントラクトアドレス: 0xMainnetContractAddress...
```

### 3. コントラクトアドレスの更新

`src/config/contracts.ts`:

```typescript
export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // Testnet
  80002: '0xTestnetAddress...',
  // Mainnet
  137: '0xMainnetContractAddress...', // ← 本番アドレスに更新
};
```

### 4. Polygonscan でコントラクト検証（オプション）

```bash
npx hardhat verify --network polygon [コントラクトアドレス] "[デプロイヤーアドレス]"
```

### 5. 本番環境での動作確認

1. MetaMaskで **Polygon Mainnet** に接続
2. アプリケーションをリロード
3. 設定画面で店舗情報を入力
4. ショップオーナー登録を実行
5. テストSBTを発行して動作確認

---

## 🔧 トラブルシューティング

### デプロイ時のエラー

#### 「残高不足」エラー

**原因:** ウォレットにPOLが不足

**解決策:**
- テストネット: [Faucet](https://faucet.polygon.technology/)で取得
- 本番環境: POLを購入・転送（最低0.05 POL推奨）

#### 「Network Error」

**原因:** RPC URLが正しくない、またはネットワーク接続問題

**解決策:**
1. `.env` の `AMOY_RPC_URL` または `POLYGON_RPC_URL` を確認
2. hardhat.config.js のネットワーク設定を確認
3. インターネット接続を確認

### ショップオーナー登録のエラー

#### 「Shop already registered」

**原因:** そのショップIDは既に登録済み

**解決策:**
- 別のショップIDを使用
- 既存のショップ情報を更新

#### 「Not authorized」

**原因:** コントラクトオーナーではないアドレスで実行

**解決策:**
- デプロイに使用したアドレスで接続しているか確認
- MetaMaskのアカウントを切り替え

### SBT発行のエラー

#### 「権限がありません」

**原因:** ショップオーナーとして登録されていない

**解決策:**
1. ショップオーナー登録を実行
2. 正しいウォレットアドレスで接続
3. ページをリロードして権限を再確認

#### Pinataアップロードエラー

**原因:** Pinata APIキーが未設定または無効

**解決策:**
1. `.env` の `VITE_PINATA_JWT` を確認
2. Pinataアカウントでキーを再生成
3. 画像ファイルサイズを確認（推奨: 5MB以下）

---

## 📚 参考リンク

- **Polygon Faucet**: https://faucet.polygon.technology/
- **Amoy Explorer**: https://amoy.polygonscan.com/
- **Polygonscan**: https://polygonscan.com/
- **Polygon Docs**: https://docs.polygon.technology/
- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com/

---

## 💡 ヒント

### テスト時の推奨フロー

1. **Amoyテストネットで完全テスト**
   - デプロイ → ショップ登録 → SBT発行
   - 複数のユーザーアドレスでテスト
   - UI/UXの確認

2. **本番デプロイ前の確認**
   - コードレビュー
   - セキュリティチェック
   - ガスコスト見積もり

3. **本番デプロイ後の監視**
   - トランザクションの監視
   - エラーログの確認
   - ユーザーフィードバック収集

### セキュリティベストプラクティス

- 秘密鍵は絶対に共有しない
- `.env` ファイルをGitにコミットしない
- 本番用と開発用でウォレットを分離
- 定期的なバックアップ

---

## 🎉 完了！

これでSBTシステムが本番環境で稼働しています！
ユーザーにSBTを配布して、デジタルスタンプカードシステムを楽しんでください！

**質問やサポートが必要な場合:**
- GitHubのIssueで報告
- ドキュメントを確認
- コミュニティに相談
