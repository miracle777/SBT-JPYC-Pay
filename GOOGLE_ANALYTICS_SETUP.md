# Google Analytics 4 (GA4) セットアップガイド

## 概要

SBT JPYC Payアプリに**Google Analytics 4 (GA4)**を統合し、PWAの利用状況を詳細に追跡できるようになりました。

## 📊 追跡される主要メトリクス

### 1. PWA関連イベント
- **PWAインストール数** - アプリがデバイスにインストールされた回数
- **PWA起動モード** - スタンドアロン/ブラウザ/フルスクリーンの検出
- **Service Worker更新** - アプリの更新頻度

### 2. ユーザー行動
- **ページビュー** - 各ページの閲覧数
- **SBT発行イベント** - スタンプカード発行数とテンプレート名
- **QR決済イベント** - 決済回数と金額
- **オンライン/オフライン状態** - ネットワーク接続状況

### 3. エラートラッキング
- **Service Workerエラー**
- **アプリケーションエラー**
- **ネットワークエラー**

## 🚀 セットアップ手順

### ステップ1: Google Analytics 4プロパティを作成

1. [Google Analytics](https://analytics.google.com/)にアクセス
2. 「管理」→「プロパティを作成」
3. プロパティ名: `SBT JPYC Pay`
4. レポートのタイムゾーン: `日本`
5. 通貨: `日本円 (JPY)`
6. 「次へ」をクリック

### ステップ2: データストリームを作成

1. 「ウェブ」を選択
2. ウェブサイトのURL: `https://shop.jpyc-pay.app` (本番環境のURL)
3. ストリーム名: `SBT JPYC Pay - Production`
4. 「拡張計測機能」を有効にする（推奨）
5. 「ストリームを作成」をクリック

### ステップ3: 測定IDを取得

データストリーム作成後、画面右上に表示される **測定ID** をコピーします。

形式: `G-XXXXXXXXXX`

### ステップ4: 環境変数を設定

プロジェクトのルートディレクトリに `.env` ファイルを作成し、以下を追加:

```env
# Google Analytics 4 測定ID
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**重要:** `.env.example`をコピーして`.env`を作成してください。

```powershell
# PowerShellの場合
Copy-Item .env.example .env
```

### ステップ5: アプリを再起動

```powershell
npm run dev
```

## 📈 Google Analyticsで確認できる情報

### リアルタイムレポート

`レポート` → `リアルタイム` で以下を確認:

- 現在のアクティブユーザー数
- ページビュー
- イベント発生状況
- ユーザーの所在地
- 使用デバイス（モバイル/PC）

### カスタムイベント

以下のカスタムイベントが記録されます:

| イベント名 | 説明 | パラメータ |
|----------|------|----------|
| `pwa_install` | PWAインストール | - |
| `pwa_launch` | PWA起動 | `display_mode` |
| `sbt_issuance` | SBT発行 | `template_name` |
| `qr_payment` | QR決済 | `value`, `currency` |
| `online` / `offline` | ネットワーク状態変化 | - |
| `sw_update` | Service Worker更新 | - |
| `exception` | エラー発生 | `description`, `error_type` |

### PWA利用状況の確認方法

#### 1. インストール数を確認

`レポート` → `イベント` → `pwa_install`

- 総イベント数 = PWAインストール数
- 時系列グラフで推移を確認

#### 2. スタンドアロンモード vs ブラウザモード

`レポート` → `イベント` → `pwa_launch` → `display_mode`パラメータ

- `standalone`: PWAとして起動
- `browser`: ブラウザで使用
- `standalone-ios`: iOS PWAとして起動

#### 3. アクティブユーザー数

`レポート` → `ユーザー` → `概要`

- DAU (日次アクティブユーザー)
- WAU (週次アクティブユーザー)
- MAU (月次アクティブユーザー)

#### 4. ユーザー維持率

`レポート` → `維持率`

- 新規ユーザーの再訪問率
- コホート分析

## 🔧 高度な設定

### カスタムディメンションの追加

GA4管理画面で以下のカスタムディメンションを作成すると、より詳細な分析が可能:

| ディメンション名 | イベントパラメータ | 説明 |
|---------------|----------------|------|
| PWA表示モード | `display_mode` | standalone/browser |
| テンプレート名 | `template_name` | 発行されたSBTテンプレート |
| 決済通貨 | `currency` | 決済に使用された通貨 |
| エラータイプ | `error_type` | エラーの種類 |

### コンバージョンイベントの設定

重要なイベントをコンバージョンとして設定:

1. `管理` → `イベント` → イベント名の横の「コンバージョンとしてマーク」
2. 推奨コンバージョン:
   - `pwa_install` - PWAインストール
   - `sbt_issuance` - SBT発行
   - `qr_payment` - QR決済完了

### Google Analyticsダッシュボードの作成

`探索` → `空白` で以下のレポートを作成:

1. **PWA利用状況ダッシュボード**
   - PWAインストール数（累計・日次）
   - スタンドアロン vs ブラウザの比率
   - デバイス別利用状況

2. **ビジネスメトリクスダッシュボード**
   - SBT発行数（テンプレート別）
   - 決済件数と金額
   - アクティブユーザー数

## 📱 PWA固有の分析ポイント

### PWA vs Webアプリの比較

```javascript
// display_modeパラメータで区別
- standalone: PWAとしてインストール済み
- browser: ブラウザで使用
```

### インストール率の計算

```
インストール率 = (pwa_installイベント数) / (初回訪問ユーザー数) × 100
```

### エンゲージメント率

PWAユーザーは通常、ブラウザユーザーよりもエンゲージメントが高い傾向:

- セッション時間
- ページ/セッション
- 再訪問率

## 🔒 プライバシーとGDPR対応

### データ収集の透明性

`PRIVACY_POLICY.md`に以下を明記済み:

- Google Analyticsによるデータ収集
- 収集される情報の種類
- データの使用目的
- ユーザーの権利

### IPアドレスの匿名化

GA4ではデフォルトでIPアドレスが匿名化されます。

### オプトアウトの提供（オプション）

必要に応じて、ユーザーがトラッキングを無効化できる機能を追加可能:

```typescript
// utils/analytics.ts に追加
export const disableAnalytics = () => {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
};
```

## 🐛 トラブルシューティング

### データが表示されない場合

1. **測定IDの確認**
   ```powershell
   # .envファイルを確認
   cat .env
   ```

2. **ブラウザコンソールでGA読み込みを確認**
   ```javascript
   // デベロッパーツールのコンソールで確認
   console.log(window.gtag);  // function であればOK
   console.log(window.dataLayer); // 配列であればOK
   ```

3. **リアルタイムレポートで即座に確認**
   GA管理画面の「リアルタイム」でイベントが送信されているか確認

4. **広告ブロッカーの無効化**
   開発中は広告ブロッカーを無効化してテスト

### イベントが記録されない場合

```javascript
// ブラウザコンソールでイベント送信を確認
window.gtag('event', 'test_event', { test: 'value' });
```

## 📚 参考リソース

- [Google Analytics 4 ドキュメント](https://support.google.com/analytics/answer/10089681)
- [GA4 イベント測定](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [PWA Analytics ベストプラクティス](https://web.dev/pwa-analytics/)

## 📞 サポート

GA4の設定でお困りの場合は、以下を確認:

1. `.env`ファイルに正しい測定IDが設定されているか
2. アプリを再起動したか
3. ブラウザのキャッシュをクリアしたか
4. GA4のリアルタイムレポートを確認したか

---

**設定完了後、GA4のリアルタイムレポートで即座にデータが確認できます！** 🎉
