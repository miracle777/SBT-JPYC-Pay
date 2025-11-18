# ブラウザ版で権限エラーが表示される場合の対処法

## 症状
- PWA版は正常に動作
- ブラウザ版で「⚠️ SBT発行権限がありません」と表示される
- デバッグ情報では「Contract == Wallet: ✅ TRUE」なのに権限フラグが `false`

## 原因
ブラウザのキャッシュやLocalStorageに古い状態が保存されているため

## 解決方法

### 方法1: ハードリロード（推奨）

1. **Windows / Linux:**
   - `Ctrl + Shift + R` または `Ctrl + F5`

2. **Mac:**
   - `Command + Shift + R`

### 方法2: キャッシュとCookieのクリア

#### Chrome / Edge
1. `F12` で開発者ツールを開く
2. 右クリックでリロードボタンを長押し
3. 「キャッシュの消去とハード再読み込み」を選択

または

1. 設定 → プライバシーとセキュリティ
2. 閲覧データの削除
3. 期間: 「全期間」
4. 以下をチェック:
   - ✅ キャッシュされた画像とファイル
   - ✅ Cookieと他のサイトデータ
5. データを削除

#### Firefox
1. `Ctrl + Shift + Delete`
2. 期間: すべての履歴
3. 以下をチェック:
   - ✅ キャッシュ
   - ✅ Cookie
   - ✅ サイトの設定
4. 今すぐ消去

### 方法3: 開発者ツールでLocalStorageをクリア

1. `F12` で開発者ツールを開く
2. 「Application」タブ（または「ストレージ」タブ）
3. 左側メニューから「Local Storage」を展開
4. サイトのURLをクリック
5. 右クリック → 「Clear」

### 方法4: プライベートブラウジングモードで確認

1. **Chrome / Edge:** `Ctrl + Shift + N`
2. **Firefox:** `Ctrl + Shift + P`
3. **Safari:** `Command + Shift + N`

プライベートモードで正常に動作する場合は、通常モードのキャッシュが原因です。

## 再発防止

### 開発中の場合

`vite.config.ts`を確認して、Service Workerのキャッシュ戦略を調整:

```typescript
VitePWA({
  registerType: 'autoUpdate', // または 'prompt'
  workbox: {
    cleanupOutdatedCaches: true, // 古いキャッシュを自動削除
  }
})
```

### 本番環境の場合

バージョン番号を更新して、強制的に新しいバージョンを読み込ませる:

```json
// package.json
{
  "version": "2.0.1" // バージョンアップ
}
```

## それでも解決しない場合

1. **ウォレットを再接続:**
   - 一度ウォレットを切断
   - ページをリロード
   - 再度ウォレットを接続

2. **ブラウザを完全に再起動:**
   - すべてのタブを閉じる
   - ブラウザを終了
   - 再度起動してアクセス

3. **Service Workerを手動で削除:**
   - 開発者ツール → Application → Service Workers
   - 「Unregister」をクリック
   - ページをリロード

## 確認

修正後、以下が表示されれば成功です:

✅ **SBT発行権限OK**
- コントラクトオーナーとしてSBTをミントできます

または

✅ **SBT発行権限OK**
- ショップオーナーとしてSBTをミントできます
