# モバイルウォレット検出デバッグガイド

## iPhone SE2でのウォレット検出が読み込み中のままの場合

### 1. デバッグ情報の取得方法

**Safari（iOS）**での開発者ツール設定：
1. Mac の Safari で iPhone を接続
2. iPhone の「設定」→「Safari」→「詳細」→「Web Inspector」をON
3. 再度Mac の Safari で「Safari メニュー」→「環境設定」→「詳細」→「メニューバーに開発/デバッグを表示」をON
4. iPhone で該当ページを表示
5. Mac の Safari で「開発」メニュー → 「[デバイス名]」→「対象ページ」を選択
6. コンソールを確認

### 2. コンソールで確認すべきログ

以下のログが表示されているか確認してください：

**期待されるログ:**
```
🔍 ウォレット検出開始... { isMobile: true, userAgent: "..." }
ethereum: { exists: true/false, isMetaMask: true/false, chainId: "..." }
🔍 [検出開始] { timestamp: "...", userAgent: "...", isMobile: true, hasEthereum: true, hasEIP6963: true }
```

**フォールバック時:**
```
⏱️ ウォレット検出タイムアウト - フォールバック実行
✅ ウォレット検出完了: ["MetaMask","WalletConnect"]
```

### 3. デバッグコマンド（コンソール で実行）

ブラウザのコンソールに以下を入力して情報を取得：

```javascript
// ウォレット情報を取得
window.__walletDebug.diagnostics

// MetaMask接続テスト
window.__walletDebug.testMetaMaskConnection()

// ネットワーク診断
// Consoleに表示されたネットワーク診断結果
```

### 4. 可能性のある原因と対策

#### A. MetaMaskがインストールされていない
- **症状:** "MetaMask"が検出されない
- **解決策:**
  1. App Storeで「MetaMask」をインストール
  2. iOS 13.0以上が必要
  3. インストール後、ブラウザを再起動

#### B. window.ethereumが存在しない
- **症状:** `ethereum: { exists: false }`
- **解決策:**
  1. 別のブラウザを試す（Chrome, Firefox, Edge）
  2. キャッシュをクリア
  3. JavaScriptがブロックされていないか確認

#### C. EIP-6963が反応しない  
- **症状:** `hasEIP6963: false`
- **解決策:**
  1. ブラウザの再起動
  2. ページの再読み込み
  3. JavaScript コンソールエラーを確認

#### D. ネットワーク接続エラー
- **症状:** RPC呼び出しが失敗
- **解決策:**
  1. WiFi接続を確認
  2. 接続をリセット（機内モード→OFF）
  3. VPN使用時は一時的に無効化

### 5. 収集すべき情報（問題報告時）

問題報告時に以下を含めてください：

1. **ブラウザ情報:**
   - ブラウザ名（Safari, Chrome, Firefoxなど）
   - iOSバージョン
   - デバイス名（iPhone SE2など）

2. **ウォレット情報:**
   - インストール状況（MetaMask, TrustWalletなど）
   - アプリのバージョン

3. **コンソールログ:**
   ```
   🔍 ウォレット検出開始... { isMobile: ..., userAgent: "..." }
   ethereum: { exists: ..., isMetaMask: ..., chainId: "..." }
   [タイムアウト時のログ]
   ```

4. **診断結果:**
   ```javascript
   console.log(window.__walletDebug.diagnostics)
   // 結果をコピー＆ペースト
   ```

### 6. 高度なデバッグ

**タイムアウトが短すぎる場合（カスタム延長）：**

ブラウザコンソールで：
```javascript
// 検出時間を5秒に延長（開発者向け）
// デフォルトは2秒（モバイル）
```

**キャッシュが干渉している場合：**

```javascript
// 強制リセット
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 7. 既知の制限

- **MetaMask in-app ブラウザ:** 制限があるため、標準ブラウザの使用を推奨
- **PWA版:** app.storeインストール後は、ブラウザ版が推奨
- **iPhoneのみ:** Android端末では別の手順が必要

### 8. サポート連絡時の情報

以下をコピーして送信：

```
【デバッグ情報】
デバイス: iPhone SE2
iOS: 15.x
ブラウザ: Safari
MetaMask: インストール済み/未インストール
症状: 読み込み中のままで止まる

【コンソール出力】
[上記の診断結果をペースト]

【追加情報】
- 他のブラウザで試したか: はい/いいえ
- キャッシュをクリアしたか: はい/いいえ
- VPN使用有無: あり/なし
```

---

**最終手段:** 上記すべてを試しても問題が解決しない場合、開発者までご報告ください。
