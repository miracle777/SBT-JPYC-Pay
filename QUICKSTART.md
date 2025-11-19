# ⚡ クイックスタートガイド

SBTシステムを最速でセットアップして動作させるための手順書です。

## 🎯 最短5ステップでデプロイ

### ステップ1: 環境準備（5分）

```bash
# プロジェクトのクローン
git clone https://github.com/your-repo/SBT-JPYC-Pay.git
cd SBT-JPYC-Pay

# 依存パッケージのインストール
npm install
cd contracts && npm install && cd ..
```

### ステップ2: MetaMaskのセットアップ（5分）

1. **MetaMaskインストール**: https://metamask.io/
2. **Polygon Amoyテストネット追加**:
   - ネットワーク名: `Polygon Amoy Testnet`
   - RPC URL: `https://rpc-amoy.polygon.technology/`
   - Chain ID: `80002`
   - 通貨: `POL`

3. **テストPOL取得**: https://faucet.polygon.technology/
   - Polygon Amoy を選択
   - アドレスを入力して請求
   - 最低 0.1 POL を取得

### ステップ3: 環境変数の設定（3分）

`contracts/.env` ファイルを作成:

```env
PRIVATE_KEY=your_metamask_private_key_without_0x
AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
```

**秘密鍵の取得:**
1. MetaMask → アカウント詳細 → 秘密鍵をエクスポート
2. `0x` を除いた部分をコピー

### ステップ4: テストネットにデプロイ（2分）

```bash
cd contracts
npm run deploy:testnet
```

**表示されたコントラクトアドレスをメモ！**

例: `0x1234567890abcdef...`

### ステップ5: アプリケーション設定（5分）

#### 5-1. コントラクトアドレスの設定

`src/config/contracts.ts` を編集:

```typescript
80002: '0xYourContractAddressHere', // ← ここに貼り付け
```

#### 5-2. アプリケーションの起動

```bash
# プロジェクトルートで
npm run dev
```

ブラウザで http://localhost:5173 を開く

#### 5-3. 店舗情報の登録

1. 「設定」ページへ移動
2. 店舗名、説明、オーナーアドレス（デプロイに使用したアドレス）を入力
3. 保存

#### 5-4. ショップオーナー登録

1. 「SBT管理」ページへ移動
2. MetaMaskをAmoyテストネットに接続
3. 「🏪 ショップオーナーとして登録する」をクリック
4. トランザクションを承認
5. 完了を待つ（10〜30秒）

#### 5-5. テストSBT発行

1. 受取人アドレスを入力（自分のアドレスでOK）
2. 画像をアップロード
3. 「SBT発行」をクリック
4. トランザクションを承認

**✅ 完了！** 発行済みSBTリストに表示されます

---

## 🚀 npmスクリプト早見表

### デプロイ

```bash
# テストネット（Amoy）にデプロイ
npm run deploy:testnet

# 本番環境（Polygon Mainnet）にデプロイ
npm run deploy:mainnet

# ローカルノードにデプロイ
npm run deploy:localhost
```

### 検証

```bash
# Polygonscan で検証（本番環境）
npm run verify:polygon -- [コントラクトアドレス] "[デプロイヤーアドレス]"

# Amoy Polygonscan で検証（テスト環境）
npm run verify:amoy -- [コントラクトアドレス] "[デプロイヤーアドレス]"
```

### その他

```bash
# コンパイル
npm run compile

# テスト実行
npm test

# ローカルノード起動
npm run node
```

---

## 📱 詳細なガイドが必要な場合

アプリケーション内の **「セットアップガイド」** ページをご覧ください:

1. ブラウザで http://localhost:5173 を開く
2. SBT管理画面へ移動
3. 「セットアップガイド」ボタンをクリック

または、[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) をご覧ください。

---

## ⚠️ よくあるエラーと解決方法

### 「残高不足」エラー

**解決策:** Faucet でテストPOLを取得
https://faucet.polygon.technology/

### 「Network Error」

**解決策:** 
- `.env` のRPC URLを確認
- インターネット接続を確認

### 「Shop already registered」

**解決策:** 既に登録済みです。別のショップIDを使用

### 「権限がありません」

**解決策:** 
1. ショップオーナー登録を実行
2. デプロイに使用したアドレスで接続

---

## 💡 本番環境へのデプロイ

テストネットで十分にテストした後:

1. **POLを準備**（最低0.05 POL推奨）
2. **環境変数を本番用に更新**
3. **本番デプロイ実行**:
   ```bash
   npm run deploy:mainnet
   ```
4. **contracts.ts を更新**（Chain ID 137）
5. **ショップオーナー登録** (Polygon Mainnetで)

詳細は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) を参照してください。

---

## 🆘 サポート

- **詳細ガイド**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **アプリ内ガイド**: セットアップガイドページ
- **Issue報告**: GitHubのIssueタブ

---

**🎉 Happy Deploying!**
