# Google Search Console 設定ガイド

## 📋 目次

1. [概要](#概要)
2. [初期設定](#初期設定)
3. [サイトマップ送信](#サイトマップ送信)
4. [URL検査とインデックス登録](#url検査とインデックス登録)
5. [構造化データの確認](#構造化データの確認)
6. [パフォーマンス監視](#パフォーマンス監視)
7. [トラブルシューティング](#トラブルシューティング)

---

## 📌 概要

このプロジェクトは以下のSEO対策が実装されています:

### ✅ 実装済み機能

- **robots.txt** - クローラー制御
- **sitemap.xml** - サイト構造定義
- **構造化データ (JSON-LD)** - リッチリザルト対応
  - SoftwareApplication
  - WebApplication
  - BreadcrumbList
- **メタタグ最適化** - SEO向上
- **Open Graph & Twitter Card** - SNS共有最適化
- **Canonical URL** - 重複コンテンツ防止

---

## 🚀 初期設定

### 1. Google Search Consoleにログイン

1. [Google Search Console](https://search.google.com/search-console) にアクセス
2. Googleアカウントでログイン

### 2. プロパティを追加

#### 方法A: ドメインプロパティ (推奨)

```
ドメイン: your-domain.com
```

**メリット:**
- すべてのサブドメイン・プロトコルを一括管理
- http/httpsの両方を自動カバー

**所有権確認方法:**
- DNSレコードにTXTレコードを追加

```dns
種類: TXT
名前: @
値: google-site-verification=XXXXXX...
```

#### 方法B: URLプレフィックス

```
URL: https://your-domain.com
```

**所有権確認方法 (いずれか1つ):**

1. **HTMLファイルアップロード** (最も簡単)
   ```bash
   # public/google*.html としてダウンロードしたファイルを配置
   cp google1234567890abcdef.html public/
   ```

2. **HTMLタグ** (index.htmlに追加済み)
   ```html
   <meta name="google-site-verification" content="YOUR_CODE" />
   ```
   
   **設定手順:**
   - Search Consoleで確認コードをコピー
   - `index.html`の該当行を以下のように更新:
   ```html
   <meta name="google-site-verification" content="コピーしたコード" />
   ```

3. **Google Analytics**
   - GA4が既に設定されている場合、自動認識

4. **Google Tag Manager**
   - GTMが設定されている場合、自動認識

### 3. 所有権の確認

1. 確認方法を選択
2. 指示に従って設定
3. 「確認」ボタンをクリック
4. 成功メッセージを確認

---

## 📤 サイトマップ送信

### 1. サイトマップURLの確認

本プロジェクトのサイトマップ:
```
https://your-domain.com/sitemap.xml
```

### 2. サイトマップの送信手順

1. Search Console > **サイトマップ**
2. 「新しいサイトマップの追加」に `sitemap.xml` を入力
3. 「送信」をクリック
4. ステータスが「成功しました」になることを確認

### 3. サイトマップの内容

現在のサイトマップに含まれるページ:

| ページ | URL | 優先度 | 更新頻度 |
|--------|-----|--------|----------|
| ホーム | `/` | 1.0 | 毎日 |
| SBT管理 | `/sbt` | 0.8 | 毎週 |
| QR決済 | `/payment` | 0.8 | 毎週 |
| ガイド | `/guide` | 0.6 | 毎月 |
| プライバシー | `/privacy` | 0.4 | 毎月 |
| 利用規約 | `/terms` | 0.4 | 毎月 |

### 4. サイトマップの更新

新しいページを追加した場合:

```xml
<url>
  <loc>https://your-domain.com/new-page</loc>
  <lastmod>2025-01-19</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
  <mobile:mobile/>
</url>
```

---

## 🔍 URL検査とインデックス登録

### 1. URL検査ツールの使用

1. Search Console > **URL検査**
2. 検査したいURLを入力 (例: `https://your-domain.com/`)
3. 検査結果を確認

### 2. インデックス登録のリクエスト

新しいページや更新したページを即座にインデックス:

1. URL検査実施
2. 「インデックス登録をリクエスト」をクリック
3. クローリングキューに追加される (1-2分かかる)
4. 数時間〜数日でインデックスに反映

### 3. 優先的にインデックスするページ

初回デプロイ時にリクエストすべきページ:

```
✅ https://your-domain.com/
✅ https://your-domain.com/sbt
✅ https://your-domain.com/payment
✅ https://your-domain.com/guide
```

---

## 🎯 構造化データの確認

### 1. リッチリザルトテスト

[リッチリザルトテスト](https://search.google.com/test/rich-results)でテスト:

1. URLを入力: `https://your-domain.com/`
2. 「URLをテスト」をクリック
3. 検出された構造化データを確認

### 2. 実装されている構造化データ

#### SoftwareApplication (アプリ情報)

```json
{
  "@type": "SoftwareApplication",
  "name": "SBT masaru21 Pay(仮)",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  }
}
```

**期待される表示:**
- Google検索結果にアプリ評価・価格表示
- リッチスニペット対応

#### WebApplication (Web アプリ情報)

```json
{
  "@type": "WebApplication",
  "name": "SBT masaru21 Pay(仮)",
  "applicationCategory": "BusinessApplication",
  "browserRequirements": "Requires JavaScript. Requires HTML5."
}
```

#### BreadcrumbList (パンくずリスト)

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [...]
}
```

**期待される表示:**
- Google検索結果にパンくずリスト表示
- ナビゲーション構造の可視化

### 3. Search Consoleでの確認

1. Search Console > **拡張** > **構造化データ**
2. 検出された構造化データタイプを確認
3. エラーや警告がないか確認

---

## 📊 パフォーマンス監視

### 1. 検索パフォーマンスの確認

Search Console > **検索パフォーマンス**

**確認項目:**
- **合計クリック数** - 検索結果からのクリック数
- **合計表示回数** - 検索結果に表示された回数
- **平均CTR** - クリック率 (目標: 3%以上)
- **平均掲載順位** - 検索結果の平均順位 (目標: 10位以内)

### 2. クエリ分析

**人気のクエリ:**
- どのキーワードで流入しているか確認
- 想定外のキーワードをチェック

### 3. ページ別パフォーマンス

**各ページのパフォーマンス:**
```
/          - ホーム (最重要)
/sbt       - SBT管理
/payment   - QR決済
/guide     - ガイド
```

### 4. モバイルユーザビリティ

Search Console > **モバイルユーザビリティ**

**チェック項目:**
- モバイルフレンドリーかどうか
- タップ可能な要素が適切か
- テキストサイズが読みやすいか
- ビューポートが設定されているか ✅

---

## 📈 パフォーマンス最適化のヒント

### 1. Core Web Vitals

Search Console > **ウェブに関する主な指標**

**重要指標:**
- **LCP** (Largest Contentful Paint): 2.5秒以下 ✅
- **FID** (First Input Delay): 100ms以下 ✅
- **CLS** (Cumulative Layout Shift): 0.1以下 ✅

### 2. PageSpeed Insights

[PageSpeed Insights](https://pagespeed.web.dev/)で定期的にテスト:

```
URL: https://your-domain.com/
```

**改善項目:**
- 画像の最適化
- 未使用CSSの削除
- キャッシュの活用 ✅
- Service Workerの活用 ✅ (PWA対応済み)

### 3. インデックスカバレッジ

Search Console > **カバレッジ**

**確認項目:**
- **有効** - 正常にインデックスされたページ
- **エラー** - インデックスできなかったページ
- **警告あり** - 改善が必要なページ
- **除外** - 意図的に除外されたページ

---

## 🛠️ トラブルシューティング

### ❌ サイトマップが送信できない

**原因:**
- サイトマップのURLが間違っている
- robots.txtでブロックされている
- XMLの構文エラー

**解決策:**
```bash
# サイトマップの存在確認
curl https://your-domain.com/sitemap.xml

# robots.txtの確認
curl https://your-domain.com/robots.txt
```

### ❌ ページがインデックスされない

**原因:**
- robots.txtでブロック
- noindexメタタグが設定されている
- クローラーがアクセスできない

**確認方法:**
```html
<!-- index.htmlに以下が設定されているか確認 -->
<meta name="robots" content="index, follow" /> ✅
```

**robots.txt確認:**
```txt
User-agent: *
Allow: /  ✅
```

### ❌ 構造化データのエラー

**よくあるエラー:**
1. **必須プロパティの欠落**
   - 解決: `index.html`の構造化データに必須フィールドを追加

2. **無効なURL**
   - 解決: `https://your-domain.com/` を実際のドメインに置換

3. **日付フォーマットエラー**
   - 解決: ISO 8601形式を使用 (例: `2025-01-19`)

### ❌ モバイルユーザビリティの問題

**よくある問題:**
1. **テキストが小さすぎる**
   - 解決済み ✅ (16px以上のフォント使用)

2. **ビューポート未設定**
   - 解決済み ✅
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   ```

3. **タップ要素が近すぎる**
   - 解決済み ✅ (48px以上のタップ領域確保)

---

## 📝 チェックリスト

### 初回デプロイ時

- [ ] Google Search Consoleにプロパティ追加
- [ ] 所有権の確認完了
- [ ] サイトマップ送信 (`sitemap.xml`)
- [ ] 主要ページのインデックス登録リクエスト
- [ ] 構造化データの検証 (リッチリザルトテスト)
- [ ] モバイルユーザビリティの確認
- [ ] robots.txtの確認
- [ ] `index.html`のドメイン名を実際のドメインに置換

### 定期メンテナンス

- [ ] 月次: 検索パフォーマンスレポート確認
- [ ] 月次: インデックスカバレッジの確認
- [ ] 月次: Core Web Vitalsの確認
- [ ] 四半期: サイトマップの更新 (新ページ追加時)
- [ ] 四半期: 構造化データの再検証

---

## 🔗 参考リンク

- [Google Search Console](https://search.google.com/search-console)
- [リッチリザルトテスト](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [構造化データガイド](https://developers.google.com/search/docs/appearance/structured-data)

---

## 💡 次のステップ

1. **実際のドメインに置換**
   - `index.html`, `sitemap.xml`, `robots.txt` の `your-domain.com` を実際のドメインに置換

2. **Google Search Console Verificationコード取得**
   - Search Consoleでコードを取得
   - `index.html`の該当行にコードを設定

3. **デプロイ**
   ```bash
   npm run build
   # Vercel, Netlify等にデプロイ
   ```

4. **Search Consoleで確認**
   - 所有権確認
   - サイトマップ送信
   - インデックス登録リクエスト

5. **定期監視**
   - 週次でパフォーマンス確認
   - エラー発生時は即座に対応

---

**🎉 Google Search Console対応完了！**
