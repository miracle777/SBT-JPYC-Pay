# 📱 スマホでのMetaMask接続ガイド

## 🔍 問題の解決策

スマホでMetaMaskが「見つからない」と表示される問題を解決しました。

### ✅ 主な改善点

1. **モバイル環境の自動検出**: スマホ・タブレットを自動判別
2. **MetaMaskモバイルアプリ対応**: ブラウザ拡張機能とは異なる検出方式
3. **遅延読み込み対応**: モバイルでの`window.ethereum`の遅延を考慮
4. **DeepLink対応**: MetaMaskアプリとの直接連携

### 🛠️ 新機能

#### モバイルウォレットコネクター
- **自動環境検出**: iOS/Android自動判別
- **MetaMaskアプリ起動**: ワンクリックでアプリ連携
- **接続状態の視覚化**: 分かりやすいステップ表示
- **再試行機能**: 接続に失敗した場合の自動リトライ

#### 対応プラットフォーム
```
✅ iOS Safari + MetaMask App
✅ Android Chrome + MetaMask App  
✅ iOS Chrome + MetaMask App
✅ Android Browser + MetaMask App
```

## 📲 使用方法

### ステップ1: ウォレット接続ボタンをタップ
アプリで「ウォレット接続」ボタンをタップします。

### ステップ2: 自動検出
アプリが以下を自動で実行します：
- モバイル環境の検出
- MetaMaskアプリの有無確認
- 最適な接続方法の提案

### ステップ3A: MetaMaskアプリが検出された場合
```
✅ MetaMaskが検出されました！
[ウォレットに接続] ボタンをタップ
→ MetaMaskアプリが開き、接続確認
→ 承認すると接続完了
```

### ステップ3B: MetaMaskアプリが見つからない場合
```
⚠️ MetaMaskが見つかりません

オプション1: [MetaMaskアプリで開く]
→ MetaMaskアプリが自動起動
→ 接続確認画面で承認

オプション2: [再検出]  
→ もう一度MetaMaskアプリを検索

オプション3: [MetaMaskをインストール]
→ App Store/Google Playに移動
```

## 🔧 トラブルシューティング

### MetaMaskアプリが開かない場合

1. **MetaMaskアプリを手動起動**
2. **ブラウザに戻って「再検出」をタップ**
3. **接続ボタンを再度タップ**

### それでも接続できない場合

1. **MetaMaskアプリを最新版に更新**
2. **ブラウザアプリを再起動**  
3. **デバイスを再起動**

## 📋 対応ウォレット

### 現在対応済み
- **MetaMask Mobile**: iOS/Android完全対応
- **ブラウザ内蔵ウォレット**: 基本対応

### 今後対応予定
- **Trust Wallet**: Universal Link対応
- **Rainbow Wallet**: DeepLink対応  
- **WalletConnect**: QRコード連携

## 💡 開発者向け情報

### 新機能の技術詳細

#### モバイルウォレット検出
```typescript
// 複数の検出方法を組み合わせ
const checks = [
  ethereum.isMetaMask === true,
  ethereum._metamask !== undefined,
  ethereum.providers?.some(p => p.isMetaMask),
  navigator.userAgent.includes('MetaMaskMobile')
];
```

#### DeepLink生成
```typescript  
// iOS: Universal Link優先
const iosLink = `https://metamask.app.link/dapp/${baseUrl}`;

// Android: DeepLink + フォールバック
const androidLink = `metamask://dapp/${baseUrl}`;
```

#### 遅延読み込み対応
```typescript
// 1秒後に再チェック（モバイル対応）
setTimeout(() => {
  if (window.ethereum) {
    window.dispatchEvent(new Event('ethereum#initialized'));
  }
}, 1000);
```

## 🏆 ベストプラクティス

### ユーザー向け
1. **MetaMaskアプリを事前にインストール**
2. **最新版に更新を維持**
3. **ブラウザでアプリを開く**（PWAより推奨）

### 開発者向け  
1. **環境検出を早期実行**
2. **複数の検出方法を組み合わせ**
3. **ユーザー体験を重視したエラー表示**
4. **DeepLinkとUniversal Linkの使い分け**

---

## 📞 サポート

問題が解決しない場合は、以下の情報と共にGitHub Issuesでご報告ください：

- デバイス情報（iPhone/Android、OSバージョン）  
- ブラウザ情報（Safari/Chrome、バージョン）
- MetaMaskアプリのバージョン
- エラーメッセージのスクリーンショット

*モバイル環境でのウォレット接続が大幅に改善されました！*