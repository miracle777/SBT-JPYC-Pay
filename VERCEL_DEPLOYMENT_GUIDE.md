# Vercelデプロイ & 環境変数設定ガイド

## 📋 概要

このガイドでは、SBT JPYC PayアプリをVercelにデプロイし、必要な環境変数を設定する手順を説明します。

## 🚀 Vercelへのデプロイ手順

### 前提条件

- GitHubアカウント
- Vercelアカウント（無料プランで可）
- このリポジトリがGitHubにpush済み

### ステップ1: Vercelプロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 「Add New...」→「Project」をクリック
3. GitHubリポジトリ `miracle777/SBT-JPYC-Pay` を選択
4. 「Import」をクリック

### ステップ2: ビルド設定の確認

以下の設定が自動で検出されます:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 🔑 環境変数の設定

### 必須の環境変数

Vercelの「Settings」→「Environment Variables」で以下を設定します:

#### 1. Google Analytics (推奨)

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**取得方法**:
- [Google Analytics](https://analytics.google.com/)でプロパティを作成
- データストリームを追加してG-から始まる測定IDを取得
- 詳細は`GOOGLE_ANALYTICS_SETUP.md`を参照

#### 2. WalletConnect (オプション)

```
VITE_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

**取得方法**:
- [WalletConnect Cloud](https://cloud.walletconnect.com/)でプロジェクトを作成
- Project IDをコピー

**注意**: 未設定の場合、MetaMaskなど他のウォレット接続は正常に動作します。

#### 3. Pinata (IPFS) - オプション

```
VITE_PINATA_JWT=your_pinata_jwt_token
VITE_PINATA_GATEWAY=your_custom_gateway_url
```

**取得方法**:
- [Pinata](https://pinata.cloud/)でアカウント作成
- API Keysから新しいJWTトークンを作成
- Gatewaysでカスタムゲートウェイを作成（オプション）

**注意**: 未設定の場合、SBTメタデータのIPFSアップロード機能が無効化されます。

#### 4. Biconomy (ガスレス決済) - オプション

```
VITE_BICONOMY_BUNDLER_URL_137=https://bundler.biconomy.io/api/v2/137/YOUR_KEY
VITE_BICONOMY_PAYMASTER_KEY_137=YOUR_PAYMASTER_KEY

VITE_BICONOMY_BUNDLER_URL_80002=https://bundler.biconomy.io/api/v2/80002/YOUR_KEY
VITE_BICONOMY_PAYMASTER_KEY_80002=YOUR_PAYMASTER_KEY
```

**取得方法**:
- [Biconomy Dashboard](https://dashboard.biconomy.io/)でプロジェクト作成
- Paymaster APIキーを取得
- 詳細は`GASLESS_PAYMENT_GUIDE.md`を参照

**注意**: 未設定の場合、通常のウォレット決済が使用されます。

### 環境変数の設定方法（Vercel）

#### 方法1: Vercel Web UIで設定

1. Vercelプロジェクトのダッシュボード
2. 「Settings」タブをクリック
3. 左メニューから「Environment Variables」を選択
4. 変数名と値を入力
5. 適用環境を選択（Production / Preview / Development）
6. 「Save」をクリック

#### 方法2: Vercel CLI で設定

```powershell
# Vercel CLIをインストール
npm i -g vercel

# プロジェクトディレクトリで実行
vercel env add VITE_GA_MEASUREMENT_ID

# 値を入力
# 環境を選択 (Production, Preview, Development)
```

#### 方法3: .env.production ファイル (非推奨)

セキュリティリスクがあるため、機密情報は含めないでください。

```env
# .env.production (公開可能な設定のみ)
VITE_APP_NAME=SBT JPYC Pay
```

## 🔄 環境変数を追加後の再デプロイ

環境変数を追加・変更した後は、再デプロイが必要です:

### 方法1: Git Push（推奨）

```powershell
git add .
git commit -m "Update environment variables"
git push origin main
```

Vercelが自動的に再デプロイを開始します。

### 方法2: Vercel Dashboard

1. 「Deployments」タブ
2. 最新のデプロイの「...」メニュー
3. 「Redeploy」をクリック

### 方法3: Vercel CLI

```powershell
vercel --prod
```

## ✅ 環境変数の動作確認

### ブラウザコンソールで確認

デプロイ後、アプリを開いてブラウザの開発者ツールコンソールで確認:

```javascript
// Google Analytics
console.log(window.gtag); // function であればOK

// WalletConnect
// エラーログに "dummy-project-id" が表示されなければOK

// 環境変数は直接確認できません（セキュリティ上の理由）
```

### 機能テスト

- ✅ アプリが正常に起動する
- ✅ Google Analyticsのリアルタイムレポートにアクセスが表示される
- ✅ MetaMask接続が正常に動作する
- ✅ PWAインストールが可能

## 🏷️ 環境別の設定

Vercelでは3つの環境があります:

### Production (本番環境)

```
ドメイン: shop.jpyc-pay.app
Git Branch: main
```

本番用のAPIキーを設定

### Preview (プレビュー環境)

```
ドメイン: sbt-jpyc-pay-*.vercel.app
Git Branch: すべてのブランチ
```

テスト用のAPIキーまたは本番と同じ設定

### Development (開発環境)

```
ローカル開発環境
vercel dev コマンド使用時
```

## 📊 最小構成での動作

以下の環境変数が**未設定でも**アプリは動作します:

- ✅ PWA機能: 正常動作
- ✅ ウォレット接続: MetaMaskなど正常動作
- ✅ SBT管理: ローカルストレージで動作
- ✅ QR決済: 通常のウォレット決済で動作
- ⚠️ Google Analytics: 無効（トラッキングされない）
- ⚠️ WalletConnect: 無効（MetaMaskは使用可能）
- ⚠️ IPFSアップロード: 無効（ローカル保存のみ）
- ⚠️ ガスレス決済: 無効（通常の決済のみ）

## 🔐 セキュリティのベストプラクティス

### ✅ すべきこと

1. **Vercelの環境変数機能を使用** - UI または CLI で設定
2. **Production専用のAPIキーを作成** - 本番環境用に別のキーを用意
3. **APIキーの権限を最小限に** - 必要な権限のみ付与
4. **定期的なキーのローテーション** - 3〜6ヶ月ごとに更新

### ❌ してはいけないこと

1. **`.env`ファイルをGitにコミット** - 機密情報が漏洩
2. **フロントエンドに秘密鍵を保存** - ブラウザから見える
3. **同じAPIキーを複数環境で共用** - セキュリティリスク
4. **APIキーをコードにハードコード** - Gitに記録される

## 🐛 トラブルシューティング

### エラー: "Property 'paymasterUrl' does not exist"

**原因**: biconomy.tsの設定が古い

**解決方法**: 
```powershell
git pull origin main  # 最新コードを取得
git push origin main  # Vercelに再デプロイ
```

### エラー: "TS2339: Property 'providers' does not exist"

**原因**: ethers v6の構文エラー

**解決方法**: 既に修正済み。最新のコードを使用してください。

### 環境変数が反映されない

**原因**: 環境変数設定後に再デプロイしていない

**解決方法**:
```powershell
# 方法1: Git経由
git commit --allow-empty -m "Trigger rebuild"
git push origin main

# 方法2: Vercel Dashboard
# Deployments → 最新デプロイ → Redeploy
```

### Google Analyticsが動作しない

**チェック項目**:
1. `VITE_GA_MEASUREMENT_ID` が設定されているか
2. 測定IDが `G-` で始まっているか（GA4形式）
3. Vercelで再デプロイしたか
4. 広告ブロッカーが無効になっているか

**確認方法**:
```javascript
// ブラウザコンソールで確認
console.log(window.gtag);  // function であればOK
```

## 📞 サポート

デプロイに関する問題が発生した場合:

1. **Vercel Build Logs を確認** - エラーメッセージを確認
2. **環境変数の設定を再確認** - 変数名のタイポがないか
3. **ローカルでビルドテスト** - `npm run build` を実行
4. **GitHubリポジトリの状態を確認** - 最新のコードがpushされているか

## 🎯 デプロイ後のチェックリスト

- [ ] アプリが正常に起動する
- [ ] PWAとしてインストール可能
- [ ] MetaMask接続が動作する
- [ ] Google Analyticsが記録される（設定した場合）
- [ ] カスタムドメインが設定されている（shop.jpyc-pay.app）
- [ ] HTTPS接続が有効
- [ ] モバイルで正常に表示される

---

**デプロイ成功後、`shop.jpyc-pay.app`で本番環境が利用可能になります！** 🎉
