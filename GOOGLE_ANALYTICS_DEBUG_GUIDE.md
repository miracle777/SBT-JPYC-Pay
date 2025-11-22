# Google Analytics トラブルシューティングガイド

## 🔧 現在の状況

✅ **コード実装**: 完了  
✅ **Vercel環境変数**: 設定済み  
❌ **ローカル環境変数**: 要設定

## 🛠️ 修正手順

### 1. 測定IDの確認

Google Analytics 4 管理画面で測定IDを確認:
1. [Google Analytics](https://analytics.google.com/) にログイン
2. プロパティを選択
3. 「管理」→「データストリーム」→「ウェブ」
4. 測定ID (`G-XXXXXXXXXX`) をコピー

### 2. ローカル環境の設定

`.env`ファイルの`VITE_GA_MEASUREMENT_ID`を実際の値に更新:

```env
# 例: 実際の測定IDに置き換える
VITE_GA_MEASUREMENT_ID=G-ABC123DEF4
```

### 3. デバッグモードでの確認

開発サーバーを起動:

```powershell
npm run dev
```

ブラウザのコンソールで以下を確認:

```javascript
// 1. GA初期化の確認
console.log(window.__GA_MEASUREMENT_ID); // 測定IDが表示される
console.log(window.__GA_INITIALIZED);    // true が表示される

// 2. テストイベントの送信
window.__GA_send_test_event();

// 3. dataLayerの確認
console.log(window.dataLayer); // 配列が表示される
```

### 4. Google Analyticsでの確認

1. **リアルタイムレポート**を開く
2. **イベント**セクションでカスタムイベントを確認
3. `debug_test_event`, `page_view`などが表示されることを確認

## 🚨 よくある問題と解決策

### 問題1: 測定IDが空文字

**症状**: `⚠️ Google Analytics Measurement ID が設定されていません`

**解決策**: 
- `.env`ファイルで`VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`を設定
- アプリを再起動 (`npm run dev`)

### 問題2: スクリプト読み込みエラー

**症状**: `❌ Failed to load Google Analytics script`

**解決策**: 
- ネットワーク接続を確認
- 広告ブロッカーを一時的に無効化
- VPNを使用している場合は無効化

### 問題3: データが表示されない

**症状**: GA管理画面でデータが見えない

**解決策**: 
- リアルタイムレポートで即座に確認
- 24時間待って標準レポートを確認
- プライベートブラウジングでテスト

### 問題4: 開発環境でのみ動作しない

**症状**: Vercelでは動作するが、ローカルで動作しない

**解決策**: 
- `.env`ファイルの確認
- `import.meta.env.VITE_GA_MEASUREMENT_ID`の値をコンソールで確認

## 📊 デバッグコマンド集

```javascript
// GA状態の確認
console.table({
  'Measurement ID': window.__GA_MEASUREMENT_ID,
  'Initialized': window.__GA_INITIALIZED,
  'gtag available': typeof window.gtag,
  'dataLayer length': window.dataLayer?.length
});

// テストイベント送信
window.gtag('event', 'manual_test', {
  test_parameter: 'debug_value',
  timestamp: Date.now()
});
```

## ✅ 正常動作の確認

以下が全て確認できれば正常動作しています：

1. **コンソールログ**: `✅ Google Analytics script loaded successfully`
2. **リアルタイムレポート**: アクティブユーザーが表示される
3. **イベント**: カスタムイベントが記録される
4. **ページビュー**: ページ遷移が追跡される

## 🔗 参考資料

- [GA4 デバッグビュー](https://support.google.com/analytics/answer/7201382)
- [GA4 リアルタイムレポート](https://support.google.com/analytics/answer/9271392)
- [gtag.js リファレンス](https://developers.google.com/analytics/devguides/collection/ga4)