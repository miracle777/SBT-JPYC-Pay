# SBT JPYC Pay - 実装内容サマリー

## 実装日: 2025年11月14日

### 📋 実装内容

#### 1. 金額計算の簡略化 ✅

**変更対象**: `src/pages/QRPayment.tsx` (Line 182)

**変更内容**:
- JPYCは1 JPYC = 1円で固定されているため、小数点計算を削除
- `Math.floor(amountNum * 1e18)` → `amountNum * BigInt(10 ** 18)` に変更
- 整数値のみを使用（`parseInt` を優先）

**変更前**:
```typescript
const amountNum = parseFloat(amount);
const amountInWei = (BigInt(Math.floor(amountNum * 1e18))).toString();
```

**変更後**:
```typescript
const amountNum = parseInt(amount) || parseFloat(amount);
const amountInWei = (BigInt(amountNum) * BigInt(10 ** 18)).toString();
```

**効果**: 
- 小数点誤差なし
- 100 JPYCは正確に100.00として表示・送信される
- 計算がシンプルで保守性向上

---

#### 2. SBT発行パターンの拡張 ✅

**変更対象**: `src/pages/SBTManagement.tsx`

**追加型定義**:
```typescript
type IssuePattern = 'per_payment' | 'after_count' | 'time_period';
```

**拡張インターフェース**:
```typescript
interface SBTTemplate {
  // ... 既存フィールド
  issuePattern: IssuePattern;        // 発行パターン
  timePeriodDays?: number;           // 期間内発行の有効期間
  imageMimeType: string;             // 画像MIMEタイプ
}
```

**実装した3つの発行パターン**:

##### パターン1: 毎回発行（per_payment）
- 支払いの度にSBT（スタンプ）を発行
- 例: 毎回のコーヒー購入で1スタンプ、10スタンプでコーヒー1杯無料

##### パターン2: N回後発行（after_count）
- 指定回数の支払い達成時に1回だけSBT発行
- 例: 10回購入で「VIP会員」SBT発行
- 設定項目: 達成条件回数、報酬内容

##### パターン3: 期間内発行（time_period）
- 指定期間内の支払いでSBT発行
- 例: 11月14日～30日のキャンペーン期間内に支払い＝特別SBT獲得
- 設定項目: 有効期間（日数）、期間限定特典説明

**UI表示**: テンプレートカードに発行パターンをバッジ表示
```
🎁 毎回発行
🔢 10回後発行
📅 30日間キャンペーン
```

---

#### 3. SBT画像アップロード機能の実装 ✅

**変更対象**: `src/pages/SBTManagement.tsx`

**実装機能**:

##### 画像ファイル要件
- **解像度**: 512px × 512px
- **ファイル形式**: JPEG のみ
- **最大ファイルサイズ**: 3MB
- **形状**: 丸形アイコン（メダル、はんこなどをイメージ）

##### アップロード処理フロー

1. ファイル選択入力フィールド
   ```tsx
   <input 
     type="file" 
     accept="image/jpeg"
     onChange={handleImageUpload}
   />
   ```

2. ファイル検証
   - ファイルサイズ: 3MB以下チェック
   - ファイル形式: JPEG チェック
   - 不正時はエラートーストを表示

3. Base64 変換
   ```javascript
   const reader = new FileReader();
   reader.readAsDataURL(file);  // Base64 エンコード
   ```

4. プレビュー表示
   - 512×512px の丸形フレーム内に表示
   - リアルタイム確認可能

5. テンプレート保存時に含める
   - `imageUrl`: Base64 データ
   - `imageMimeType`: 'image/jpeg'

##### 実装コード

```typescript
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ファイルサイズチェック（3MB以下）
  if (file.size > 3 * 1024 * 1024) {
    toast.error('画像サイズは3MB以下にしてください');
    return;
  }

  // ファイル形式チェック（JPEG のみ）
  if (!file.type.includes('jpeg')) {
    toast.error('JPEGファイルをアップロードしてください');
    return;
  }

  // Base64 に変換
  const reader = new FileReader();
  reader.onload = (event) => {
    const base64String = event.target?.result as string;
    setNewTemplate({
      ...newTemplate,
      imageUrl: base64String,
      imageMimeType: file.type,
    });
    setImagePreview(base64String);
    toast.success('画像をアップロードしました');
  };
  reader.readAsDataURL(file);
};
```

##### UI表示
- ファイルアップロード入力 + プレビュー画像（丸形）を並べて表示
- テンプレートカード内に丸形の画像を表示

---

### 📁 ファイル変更一覧

| ファイル | 変更内容 | 行数 |
|---------|---------|------|
| `src/pages/QRPayment.tsx` | 金額計算簡略化 | 1箇所 |
| `src/pages/SBTManagement.tsx` | 発行パターン追加、画像アップロード機能、テンプレート拡張 | 複数箇所 |
| `FLOW_GUIDE.md` | ドキュメント更新 | 追記 |

### ✅ 検証状況

- **TypeScript コンパイルエラー**: なし ✅
- **実装完了**: 金額計算、発行パターン、画像アップロード ✅

---

## 技術仕様

### SBTテンプレート拡張インターフェース

```typescript
type IssuePattern = 'per_payment' | 'after_count' | 'time_period';

interface SBTTemplate {
  id: string;                          // テンプレートID
  name: string;                        // テンプレート名
  description: string;                 // 説明
  issuePattern: IssuePattern;          // 発行パターン
  maxStamps: number;                   // スタンプ最大数
  timePeriodDays?: number;             // 期間内発行の場合の有効期間（日数）
  rewardDescription: string;           // 報酬内容
  imageUrl: string;                    // Base64 JPEG画像データ
  imageMimeType: string;               // 'image/jpeg'
  createdAt: string;                   // 作成日
  status: 'active' | 'inactive';       // ステータス
}
```

### 発行パターン別の設定例

#### 毎回発行（per_payment）
```typescript
{
  issuePattern: 'per_payment',
  maxStamps: 10,
  rewardDescription: 'コーヒー1杯無料',
}
```

#### N回後発行（after_count）
```typescript
{
  issuePattern: 'after_count',
  maxStamps: 10,  // 10回達成時に発行
  rewardDescription: 'VIP会員特典',
}
```

#### 期間内発行（time_period）
```typescript
{
  issuePattern: 'time_period',
  maxStamps: 5,               // 期間内最大5スタンプ
  timePeriodDays: 30,         // 30日間有効
  rewardDescription: 'キャンペーン参加記念',
}
```

---

## 使用方法

### テンプレート作成フロー

1. SBT管理ページ → 「新規作成」ボタンをクリック
2. テンプレート情報を入力
   - テンプレート名
   - 説明
   - 発行パターン選択 ← **新規**
   - SBT画像ファイル選択 ← **新規**
   - その他設定（スタンプ数、報酬内容など）
3. 「作成」ボタンをクリック

### 画像アップロード

1. 「SBT画像」セクションで「ファイル選択」をクリック
2. 512px × 512px の JPEG ファイルを選択
3. プレビューで確認
4. テンプレート作成時に自動保存

---

## 今後の推奨事項

1. **バックエンド統合**
   - 画像の IPFS 保存検討
   - テンプレート情報のデータベース化

2. **SBT発行ロジック実装**
   - `issuePattern` に応じた自動発行ロジック
   - `after_count` パターン: 支払い数カウント → 達成時に自動発行
   - `time_period` パターン: 期間チェック → 有効期間内なら発行

3. **UI改善**
   - 画像クロップ機能（正確な512×512に調整）
   - テンプレート編集機能
   - ダークモード対応

4. **セキュリティ**
   - 画像ウイルススキャン
   - Base64 データサイズの厳密チェック
   - アップロード数の制限

---

## 質問・トラブルシューティング

### Q: 画像がアップロードできない
A: 以下をご確認ください：
- ファイル形式が JPEG か確認
- ファイルサイズが 3MB 以下か確認
- ブラウザの開発者ツール → コンソールでエラー確認

### Q: 発行パターンを変更したい
A: 現在は新規作成時のみ選択可能です。編集機能は実装予定です。

### Q: 画像の解像度について
A: 512px × 512px を推奨していますが、アップロード後は自動的に丸形トリミングされます。

---

## 参考資料

- `FLOW_GUIDE.md` - 詳細なフロー説明
- `README.md` - プロジェクト概要
- TypeScript型定義を参照してください

