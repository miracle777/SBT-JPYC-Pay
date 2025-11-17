# SBT JPYC Pay - 支払い・SBT発行フロー解説資料

## 概要

SBT JPYC Pay は、QRコード決済とSBT（Soulbound Token）スタンプカードを統合したシステムです。
お客様が支払いを完了すると、自動的にトランザクションが検知され、その支払者のウォレットアドレスにSBTが発行されます。

---

## 全体フロー図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SBT JPYC Pay システム                              │
└─────────────────────────────────────────────────────────────────────────────┘

【1. QR決済ページ（/qr-payment）】
       ↓
    店舗が「QRコード生成」ボタンをクリック
    ├─ 金額を入力
    ├─ ネットワークを選択（Ethereum, Polygon, Avalanche など）
    ├─ 有効期限を選択（5/10/15/30/60分）
    └─ QRコードが自動生成される
       ↓
【2. スマートフォン側】
       ↓
    お客様がQRコードをスキャン
    └─ ウォレットアプリ（MetaMask など）が起動
       ↓
    決済トランザクションを送信
    ├─ 金額: 指定された JPYC
    ├─ 送信先: 店舗のウォレットアドレス
    └─ ネットワーク: 指定されたブロックチェーン
       ↓
【3. トランザクション監視（自動検知）】
       ↓
    店舗画面が 5 秒ごとにトランザクションを監視
    ├─ 過去100ブロックからトランザクションを検索
    ├─ 店舗ウォレット宛のトランザクションを特定
    └─ トランザクション検知時に以下を抽出：
        ├─ transactionHash（トランザクションハッシュ）
        ├─ payerAddress（お客様のウォレットアドレス = 支払者）
        └─ detectedAt（検知時刻）
       ↓
【4. 決済完了表示】
       ↓
    店舗画面に「✓ 決済完了」と表示
    ├─ ステータスが「pending」→「completed」に変更
    ├─ トランザクションハッシュが表示される
    └─ Toast 通知: "✓ 決済完了 (Tx: xxxxxx...)"
       ↓
【5. データ永続化（LocalStorage）】
       ↓
    完了したセッション情報が LocalStorage に自動保存
    ├─ キー: completedPaymentSessions
    ├─ 保存内容:
    │   ├─ id（セッションID）
    │   ├─ amount（金額）
    │   ├─ chainName（ネットワーク名）
    │   ├─ transactionHash（トランザクションハッシュ）
    │   ├─ payerAddress（支払者のウォレットアドレス）
    │   └─ detectedAt（検知時刻）
    └─ ページをリロードしても情報が保持される
       ↓
【6. SBT管理ページ（/sbt）】
       ↓
    「支払い完了一覧」セクションに支払済みセッションが表示
    └─ 各セッション情報:
        ├─ 金額とネットワーク
        ├─ 決済日時
        ├─ 支払者のウォレットアドレス
        └─ 「SBT発行...」ドロップダウン
       ↓
【7. SBT発行】
       ↓
    店舗が「SBT発行...」ドロップダウンからテンプレートを選択
    ├─ テンプレート例:
    │   ├─ コーヒーカード（10杯無料）
    │   ├─ ランチセット（5回利用でデザート付き）
    │   └─ その他カスタムテンプレート
    └─ テンプレート選択と同時に SBT 発行処理が実行
       ↓
【8. SBT発行完了】
       ↓
    SBT（Non-Fungible Token）がお客様のウォレットに送付される
    ├─ 送付先: payerAddress（支払時のお客様ウォレット）
    ├─ 内容: 選択されたテンプレート（例：コーヒーカード）
    ├─ スタンプ: 初期値 0 / 最大値（テンプレートで定義）
    └─ ステータス: 「active」
       ↓
【9. SBT発行履歴】
       ↓
    「SBT発行」セクションに発行済み SBT が追加表示
    ├─ テンプレート名
    ├─ 受取人ウォレットアドレス
    ├─ スタンプ進捗（0/10 など）
    ├─ 発行日
    ├─ ステータス（有効 / 特典獲得）
    └─ トランザクションハッシュ（支払いに紐付けられた場合）
       ↓
【10. ユーザー側（ウォレット内）】
       ↓
    お客様のウォレットに SBT が表示される
    ├─ テンプレート情報
    ├─ スタンプカード画像
    ├─ 現在のスタンプ数と目標数
    └─ 特典内容
```

---

## 各ページの役割と機能

### 1. QR決済ページ（/qr-payment）

**用途**: 店舗側の QR コード生成・管理

#### 画面構成

**上部：現在のQRコード表示エリア**
- 決済情報カード（グラデーション背景）
  - 金額: 表示例「100 JPYC」
  - ネットワーク: 「Ethereum Sepolia」など
  - 残り時間: リアルタイムカウントダウン（mm:ss形式、5分以下で赤色）
- QRコード表示（280×280px）
- スマートフォンでスキャンしやすいサイズに最適化
- 操作ボタン
  - ID コピー
  - ダウンロード（PNG/SVG形式）
  - 削除

**中部：設定エリア（3カラムレイアウト）**

左側（2カラム）：生成フォーム
- ネットワーク選択
  - Polygon Mainnet/Amoy
  - Ethereum Mainnet/Sepolia
  - Avalanche C-Chain/Fuji
- ネットワーク不一致警告
  - ウォレット接続ネットワークと異なる場合に表示
- 金額入力（JPYC）
- 有効期限選択
  - 5分、10分、15分、30分、60分
- 「QRコード生成」ボタン

右側（1カラム）：統計情報
- 総生成数
- 完了数
- 待機中数
- 期限切れ数
- 店舗情報（店舗名、アドレス）

**下部：セッション履歴テーブル**
- 列構成
  - ID（最後8文字）
  - 金額
  - ネットワーク
  - 作成時刻
  - ステータス（ステータスバッジ）
  - トランザクション
    - 完了: ✓ アイコン + Tx ハッシュ表示
    - 監視中: 「監視中...」表示
    - 期限切れ: 「期限切れ」表示

#### 金額計算の精度

JPYCはステーブルコインで、1 JPYC = 1円で固定されています。そのため、小数点の計算は不要です。

```javascript
// 入力: 100（ユーザーが入力した整数値）
↓
const amountNum = parseInt(amount) || parseFloat(amount);  // 100（数値）
↓
// Wei 単位に変換（18小数点、整数値をそのまま使用）
const amountInWei = (BigInt(amountNum) * BigInt(10 ** 18)).toString();
// 結果: 100000000000000000000 Wei（100 JPYC）
↓
// ペイロード内に含める金額（ユーザーに表示される金額）
amount: amountNum  // 100 JPYC = 100円
```

**計算の特徴:**
- ✅ 小数点不要（1 JPYC = 1円で完全な1:1対応）
- ✅ 整数値のみを使用（parseFloat ではなく parseInt 優先）
- ✅ BigInt を使用して正確に18小数点に変換
- ✅ 誤差なし（例：100は100.00になる）

#### トランザクション監視メカニズム

```javascript
// 実行間隔: 5秒ごと

1. pending ステッションを抽出
   - status === 'pending' && !transactionHash
   
2. 現在のブロック番号を取得
   - latestBlockNumber = await provider.getBlockNumber();
   
3. 検索範囲を設定（過去100ブロック）
   - searchFromBlock = Math.max(0, latestBlockNumber - 100);
   
4. トランザクションをフィルター
   - to: shopWalletAddress（店舗ウォレット）
   - fromBlock: searchFromBlock
   - toBlock: 'latest'
   
5. トランザクションの詳細を取得
   - const txDetails = await provider.getTransaction(txHash);
   - const payerAddress = txDetails?.from;
   
6. ステータス更新と通知
   - status: 'completed'
   - transactionHash: 取得したハッシュ
   - payerAddress: 支払者アドレス（重要！）
   - detectedAt: 検知時刻
```

---

### 2. 設定ページ（/settings）

**用途**: ウォレット・ネットワーク情報の表示・管理

#### 表示内容

**店舗情報セクション**
- 店舗名（編集可能）
- 店舗ID（コピー機能付き）

**ウォレット情報セクション**
- 接続状態（✓ 接続済み / ⚠ 未接続）
- ユーザーウォレットアドレス
  - 説明: 「このアドレスが支払い元となり、SBT発行時に記録されます」
  - コピー機能付き
- 店舗受取ウォレットアドレス
  - JPYC決済の受け取り用アドレス
  - コピー機能付き

**ネットワーク情報セクション**
- 現在接続中のネットワーク
  - ネットワーク名
  - Chain ID
  - RPC URL
  - テストネット表示（該当する場合）
- 利用可能なネットワーク一覧（グリッド表示）
  - 各ネットワークのステータス
  - 接続中のネットワークをハイライト

**開発者向け情報**
- Wallet アドレス
- ChainId
- Shop ID
- 技術情報の確認用

---

#### SBT発行パターン

SBTテンプレートでは、以下の3つの発行パターンを選択できます：

#### 1. 毎回発行（per_payment）

- **発行タイミング**: 支払いの度にSBT（スタンプ）を発行
- **用途例**:
  - コーヒーチェーン：毎回注文時に1スタンプ、10スタンプでコーヒー1杯無料
  - 飲食店：毎回食事時に1スタンプ、5スタンプでデザート付き
- **設定項目**:
  - スタンプ最大数: カード完成時の総スタンプ数（例：10）
  - 特典内容: カード完成時の特典（例：「コーヒー1杯無料」）

#### 2. N回後発行（after_count）

- **発行タイミング**: 指定回数の支払い条件を達成時に1回だけSBT発行
- **用途例**:
  - キャリア形成プログラム：10回の購入で「シルバー会員証」SBT発行
  - ロイヤリティプログラム：5回の訪店で「VIP会員」SBT発行
- **設定項目**:
  - 達成条件回数: 何回の支払いで発行するか（例：10回）
  - 特典内容: 達成時の特典（例：「VIP会員特典」）
- **発行される回数**: 1回限り

#### 3. 期間内発行（time_period）

- **発行タイミング**: 指定期間内に支払いがある場合にSBT発行
- **用途例**:
  - 時間限定キャンペーン：「11月14日～11月30日の期間内に支払い＝特別SBT獲得」
  - 季節限定: 夏のキャンペーン期間内の支払いで「夏の思い出メダル」獲得
- **設定項目**:
  - 有効期間（日数）: キャンペーン期間（例：30日）
  - スタンプ最大数: 期間内の最大スタンプ数（例：5回まで）
  - 特典内容: 期間限定特典（例：「キャンペーン参加記念」）

### SBT テンプレート インターフェース

```typescript
type IssuePattern = 'per_payment' | 'after_count' | 'time_period';

interface SBTTemplate {
  id: string;                          // テンプレートID
  name: string;                        // テンプレート名
  description: string;                 // 説明
  issuePattern: IssuePattern;          // 発行パターン
  maxStamps: number;                   // スタンプ最大数
  timePeriodDays?: number;             // 期間内発行の場合の有効期間（日数）
  rewardDescription: string;           // 特典内容
  imageUrl: string;                    // Base64 JPEG画像データ
  imageMimeType: string;               // 'image/jpeg'
  createdAt: string;                   // 作成日
  status: 'active' | 'inactive';       // ステータス
}
```

### SBT 画像アップロード仕様

#### 画像要件

- **解像度**: 512px × 512px
- **ファイル形式**: JPEG のみ
- **最大ファイルサイズ**: 3MB
- **形状**: 丸形アイコン（メダル、はんこなどをイメージ）

#### 画像保存方法

- Base64 エンコーディングでブラウザに保存
- LocalStorage または IndexedDB に格納可能
- ブロックチェーンに記録する際は、IPFS等の分散ストレージに保存することを推奨

#### アップロード処理フロー

```javascript
1. ユーザーが JPEG ファイルを選択
2. ファイルサイズチェック（≤3MB）
3. ファイル形式チェック（JPEG のみ）
4. FileReader でファイルを読み込み
5. Base64 に変換
6. プレビュー表示（丸形トリミング）
7. テンプレート保存時に imageUrl に含める
```

#### 画面構成

**テンプレート管理セクション**

テンプレート一覧
- カード形式表示（グリッド）
- 各テンプレート情報
  - 画像
  - 名前
  - 説明
  - 最大スタンプ数
  - 報酬説明
  - 編集・削除ボタン

「新規作成」ボタン
- フォーム表示
- 入力項目
  - テンプレート名
  - 説明
  - 最大スタンプ数
  - 報酬説明
- 作成・キャンセルボタン

**支払い完了一覧セクション** ⭐ 重要

支払済みセッション表示（テーブル形式）
```
┌──────────────────────────────────────────────────────────┐
│ 100 JPYC - Ethereum Sepolia                              │
│ 決済日: 2025-11-14 14:44:30                              │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 支払者アドレス                                      │   │
│ │ 0x1234567890abcdef...1234567890abcdef             │   │
│ └────────────────────────────────────────────────────┘   │
│ [SBT発行...▼]（ドロップダウンメニュー）                  │
│   ├─ コーヒーカード                                     │
│   ├─ ランチセット                                       │
│   └─ その他テンプレート                                 │
└──────────────────────────────────────────────────────────┘
```

各セッション情報
- 金額とネットワーク
- 決済日時
- 支払者のウォレットアドレス
- テンプレート選択ドロップダウン

**SBT発行セクション**

手動発行フォーム
- テンプレート選択
- 支払い元ウォレットアドレス（自動入力、読み取り専用）
  - 説明: 「ウォレットから接続されているアドレスが自動的に使用されます」
- 発行ボタン（ウォレット未接続時は無効化）

発行済みSBT一覧（テーブル形式）
```
┌──────────────────────────────────────────────────┐
│ テンプレート名: コーヒーカード                   │
│ ID: sbt-1234567890                              │
│ ┌──────────────────────────────────────────────┐ │
│ │ ウォレット: 0x1234...5678                    │ │
│ │ スタンプ進捗: 0/10                           │ │
│ │ 発行日: 2025-11-14                          │ │
│ │ ステータス: ✓ 有効                          │ │
│ │ プログレスバー: [=========>               ]  │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## データフロー詳細

### PaymentSession インターフェース

```typescript
interface PaymentSession {
  id: string;                          // 例: PAY1731593070432
  amount: number;                      // 例: 100
  currency: string;                    // 'JPYC'
  chainId: number;                     // 例: 11155111 (Sepolia)
  chainName: string;                   // 例: 'Ethereum Sepolia'
  qrCodeData: string;                  // エンコード済みペイロード
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;                   // '2025-11-14 14:30:45'
  expiresAt: string;                   // '2025-11-14 14:45:45'
  expiresAtTimestamp: number;          // Unix timestamp (秒)
  timeRemainingSeconds?: number;       // リアルタイム更新値
  transactionHash?: string;            // トランザクションハッシュ
  detectedAt?: string;                 // '2025-11-14 14:40:15'
  payerAddress?: string;               // 支払者のウォレットアドレス ⭐
}
```

### IssuedSBT インターフェース

```typescript
interface IssuedSBT {
  id: string;                          // 例: sbt-1731593070432
  templateId: string;                  // テンプレートID
  templateName: string;                // テンプレート名
  recipientAddress: string;            // ⭐ 支払者のウォレットアドレス
  currentStamps: number;               // 現在のスタンプ数
  maxStamps: number;                   // 最大スタンプ数
  issuedAt: string;                    // '2025-11-14'
  status: 'active' | 'redeemed';
  sourcePaymentId?: string;            // 支払いセッションID
  transactionHash?: string;            // 支払いのトランザクションハッシュ
}
```

### LocalStorage データ構造

```javascript
// キー: completedPaymentSessions
// 値:
[
  {
    id: "PAY1731593070432",
    amount: 100,
    currency: "JPYC",
    chainId: 11155111,
    chainName: "Ethereum Sepolia",
    status: "completed",
    detectedAt: "2025-11-14 14:40:15",
    transactionHash: "0xabcd1234...",
    payerAddress: "0x1234567890123456789012345678901234567890",  // ⭐ 重要
    // その他フィールド...
  }
]

// 保存タイミング: completed status になった時点で自動保存
// 読み込みタイミング: SBTManagement.tsx 初期化時と localStorage 変更時
```

---

## 支払者アドレス抽出フロー

### ステップバイステップ

```
1. トランザクション検知
   ↓
   provider.getLogs({
     to: shopWalletAddress,
     fromBlock: past100Blocks,
     toBlock: 'latest'
   })
   → トランザクションハッシュ取得
   ↓
   
2. トランザクション詳細取得 ⭐ 重要
   ↓
   const txDetails = await provider.getTransaction(txHash);
   → txDetails.from が支払者アドレス
   ↓
   
3. PaymentSession に保存
   ↓
   payerAddress: txDetails.from
   ↓
   
4. LocalStorage に自動保存
   ↓
   localStorage.setItem(
     'completedPaymentSessions',
     JSON.stringify(completedSessions)
   );
   ↓
   
5. SBT管理ページで表示・利用
   ↓
   支払い完了一覧にセッション表示
   テンプレート選択 → SBT 発行
   → recipientAddress: payerAddress で発行
```

---

## SBT発行フロー

### 発行パターン

**パターン1: 支払いセッションから発行（推奨）**

```javascript
// SBT管理ページの「支払い完了一覧」から発行

1. セッション選択
   const payment = completedPayments.find(p => p.id === selectedPaymentId);

2. テンプレート選択
   const template = templates.find(t => t.id === templateId);

3. SBT 発行
   const sbt: IssuedSBT = {
     id: `sbt-${Date.now()}`,
     templateId: template.id,
     templateName: template.name,
     recipientAddress: payment.payerAddress,  // ⭐ 支払者アドレス
     currentStamps: 0,
     maxStamps: template.maxStamps,
     issuedAt: new Date().toISOString().split('T')[0],
     status: 'active',
     sourcePaymentId: payment.id,              // 支払いセッションID記録
     transactionHash: payment.transactionHash, // 支払いの Tx ハッシュ記録
   };
   
   // 発行履歴に追加
   setIssuedSBTs([sbt, ...issuedSBTs]);
```

**パターン2: 手動発行**

```javascript
// SBT管理ページの「新規発行」から手動発行

1. ウォレット接続状態確認
   if (!walletAddress) {
     toast.error('ウォレットを接続してください');
     return;
   }

2. テンプレート選択

3. SBT 発行
   const sbt: IssuedSBT = {
     // ... その他フィールド
     recipientAddress: walletAddress,  // ウォレット接続アドレス
     sourcePaymentId: undefined,       // 支払いセッション未連携
     transactionHash: undefined,
   };
```

---

## 重要なポイント

### 1. 支払者アドレスの役割

| 項目 | 値 | 説明 |
|------|-----|------|
| QR決済で使用 | 不要 | QR内には店舗アドレスのみ含まれる |
| トランザクション監視 | **抽出元** | `provider.getTransaction(txHash).from` |
| SBT発行先 | **使用先** | 支払者のウォレットに SBT が送付される |
| LocalStorage | 保存 | 後で参照するために保存 |

### 2. ネットワーク整合性

```javascript
// トランザクション監視時の確認
for (const session of pendingSessions) {
  if (session.chainId !== chainId) continue;  // ⭐ ネットワーク確認
  // この session に対してのみ監視を実行
}
```

### 3. 時間管理

| 項目 | 処理 | 備考 |
|------|------|------|
| QRコード有効期限 | 1秒ごと更新 | useEffect interval: 1000ms |
| トランザクション監視 | 5秒ごと実行 | useEffect interval: 5000ms |
| 自動期限切れ | 0秒到達で自動 | status: 'expired' |
| 表示形式 | MM:SS | `Math.floor(秒/60):残りの秒.padStart(2)` |

### 4. エラーハンドリング

```javascript
try {
  // トランザクション監視処理
} catch (error) {
  console.error(`Transaction monitoring error for ${session.id}:`, error);
  // エラーはログに出力、処理は継続
  // ユーザーには通知しない（監視を続行）
}
```

---

## セキュリティ考慮事項

### 実装済み

- ✅ ネットワークチェーン ID 確認
- ✅ トランザクションハッシュ確認
- ✅ 支払い元アドレス自動抽出（ユーザー入力不要）
- ✅ LocalStorage でのブラウザローカル保存

### 今後の実装推奨

- ⚠ バックエンド署名検証
- ⚠ スマートコントラクト統合（SBT Mint 機能）
- ⚠ 支払い確認ロジック（ブロックチェーン検証）
- ⚠ 二重発行防止メカニズム

---

## トラブルシューティング

### QRコードが表示されない

```javascript
原因: Canvas/SVG レンダリング失敗
解決: ブラウザコンソール確認
     → QRCodeDisplay.tsx のエラーログ確認
```

### トランザクションが検知されない

```javascript
原因1: ネットワーク不一致
解決: 支払いネットワークとウォレット接続ネットワークを同じに

原因2: ブロック検索範囲不足
解決: 過去100ブロック以内に収まっていることを確認
     → ガス遅延の場合は拡大検討

原因3: 監視タイミング
解決: 5秒ごとの監視なので最大5秒遅延あり
```

### SBT が受け取れない

```javascript
原因1: 支払者アドレス未抽出
解決: トランザクション監視が成功しているか確認
     → LocalStorage の completedPaymentSessions に payerAddress あるか確認

原因2: テンプレート選択漏れ
解決: テンプレートが作成されているか確認
     → 「新規作成」から作成

原因3: ウォレット接続状態
解決: ウォレットが接続されているか確認
     → 設定ページで接続状態を確認
```

---

## 参考資料

### ファイル構成

```
src/
├── pages/
│   ├── QRPayment.tsx         # QR決済ページ
│   ├── SBTManagement.tsx     # SBT管理ページ
│   ├── Settings.tsx          # 設定ページ
│   └── Dashboard.tsx         # ダッシュボード
├── config/
│   ├── networks.ts           # ネットワーク設定
│   └── shop.ts               # 店舗設定
├── context/
│   └── WalletContext.tsx     # ウォレット状態管理
├── types/
│   └── payment.ts            # 支払い関連型定義
└── components/
    ├── QRCodeDisplay.tsx     # QRコード表示コンポーネント
    └── layout/
        ├── Navigation.tsx
        └── Footer.tsx
```

### 関連するネットワーク設定

```typescript
// src/config/networks.ts

export const NETWORKS = {
  // Polygon
  [137]: {
    displayName: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    isTestnet: false,
  },
  [80002]: {
    displayName: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
    isTestnet: true,
  },
  // ... その他のネットワーク
};

export const JPYC = '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29';  // Polygon
```

---

## まとめ

このシステムの核となるのは以下の3つのステップです：

1. **自動トランザクション検知**: 店舗画面が5秒ごとにブロックチェーンを監視
2. **支払者アドレス抽出**: トランザクション詳細から支払者のウォレットアドレスを自動抽出
3. **自動SBT発行**: 抽出したアドレスにスタンプカード（SBT）を発行

これにより、お客様が支払いを完了すると、店舗の手作業なしに自動的にスタンプカード（SBT）がお客様のウォレットに届く仕組みが実現されています。

