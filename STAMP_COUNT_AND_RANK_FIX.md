# スタンプカード累計カウント & ランク設定カスタマイズ - 修正完了レポート

## 📅 修正日時
2025年11月19日

## 🔍 問題点

### 1. スタンプカードの累計カウントが機能していない
**症状**: 
- 同じ支払者（ウォレットアドレス）が2回目、3回目の支払いをしても、毎回新しいSBTが発行される
- `currentStamps: 0` で常に新規SBT作成
- MetaMaskで「2失敗」と表示されても、発行完了リストには2つのSBTが別々に表示される

**原因**: 
- SBT発行処理で既存SBTの検索が行われていない
- 毎回 `currentStamps: 0` の新規SBTオブジェクトを作成していた

### 2. ランク設定がハードコーディング
**症状**:
- ブロンズ、シルバー、ゴールド、プラチナのランクが固定値
- ショップごとにランク設定をカスタマイズできない

**原因**:
- `src/utils/shopSettings.ts` の `getSBTRank` 関数が固定閾値を使用
  - Bronze: 1-9回
  - Silver: 10-19回
  - Gold: 20-49回
  - Platinum: 50回以上

### 3. 設定画面にランク設定項目がない
- ショップオーナーがランク閾値を変更する手段がない

---

## ✅ 実装した修正

### 1. スタンプ累計カウント機能の実装

#### 📝 `src/pages/SBTManagement.tsx` (1020-1070行目付近)

**修正内容**:
```typescript
// ⭐ 同じウォレット + 同じテンプレートの既存SBTを検索（累計カウント機能）
const existingSBT = issuedSBTs.find(
  (sbt) => sbt.recipientAddress.toLowerCase() === recipientAddress.toLowerCase() && 
           sbt.templateId === template.id &&
           sbt.status === 'active' // 有効なSBTのみカウント
);

let sbt: IssuedSBT;
let isNewSBT = !existingSBT;

if (existingSBT) {
  // 既存のSBTが見つかった場合、スタンプを+1
  console.log('✅ 既存SBT発見 - スタンプを累計します:', existingSBT);
  
  // currentStampsを+1
  existingSBT.currentStamps += 1;
  
  // maxStampsに達したかチェック
  if (existingSBT.currentStamps >= existingSBT.maxStamps) {
    existingSBT.status = 'redeemed';
    toast.success(`🎉 スタンプカード完成！ ${existingSBT.currentStamps}/${existingSBT.maxStamps} - 特典を受け取れます！`);
  } else {
    toast.success(`✅ スタンプ+1！ ${existingSBT.currentStamps}/${existingSBT.maxStamps}`);
  }

  // IndexedDBとlocalStorageを更新
  await sbtStorage.saveSBT(existingSBT);
  
  // 状態更新
  setIssuedSBTs(issuedSBTs.map(s => s.id === existingSBT.id ? existingSBT : s));
  setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
  setShowIssuanceForm(false);
  
  return; // 既存SBT更新の場合、ここで終了（新規mint不要）
}

// 新規SBTを作成（初回のみ）
console.log('🆕 新規SBT発行 - 初回スタンプ');
sbt = {
  id: `sbt-${Date.now()}`,
  templateId: template.id,
  templateName: template.name,
  recipientAddress,
  currentStamps: 1, // 初回は1スタンプ
  maxStamps: template.maxStamps,
  issuedAt: new Date().toISOString().split('T')[0],
  status: 'active',
  sourcePaymentId,
  transactionHash,
  sbtMintStatus: 'pending',
  chainId: currentChainId || undefined,
};
```

**動作**:
1. 同じウォレットアドレス + 同じテンプレートIDの有効なSBTを検索
2. 既存SBTがあれば `currentStamps` を +1
3. `maxStamps` に達したら `status` を `redeemed` に変更
4. 既存SBTがない場合のみ、新規SBT作成（初回スタンプは1）

---

### 2. ランク設定のカスタマイズ機能

#### 📝 `src/utils/shopSettings.ts`

**追加した型定義**:
```typescript
export interface RankThresholds {
  bronzeMin: number;
  silverMin: number;
  goldMin: number;
  platinumMin: number;
}

export interface ShopSettings {
  name: string;
  id: string;
  category: string;
  description: string;
  rankThresholds?: RankThresholds; // ⭐ 追加
}

/**
 * デフォルトのランク閾値
 */
export const DEFAULT_RANK_THRESHOLDS: RankThresholds = {
  bronzeMin: 1,
  silverMin: 10,
  goldMin: 20,
  platinumMin: 50,
};
```

**修正した関数**:
```typescript
/**
 * SBTランクを決定
 * 必要訪問回数に応じてランクを自動設定
 * @param requiredVisits 必要訪問回数
 * @param shopSettings 店舗設定(ランク閾値を含む)
 */
export function getSBTRank(
  requiredVisits: number,
  shopSettings?: ShopSettings
): 'bronze' | 'silver' | 'gold' | 'platinum' {
  const thresholds = shopSettings?.rankThresholds || DEFAULT_RANK_THRESHOLDS;
  
  if (requiredVisits >= thresholds.platinumMin) return 'platinum';
  if (requiredVisits >= thresholds.goldMin) return 'gold';
  if (requiredVisits >= thresholds.silverMin) return 'silver';
  return 'bronze';
}
```

---

### 3. 設定画面にランク設定UIを追加

#### 📝 `src/pages/Settings.tsx`

**状態管理の追加**:
```typescript
// 🎖️ ランク設定の状態管理
const [rankThresholds, setRankThresholds] = useState<RankThresholds>(DEFAULT_RANK_THRESHOLDS);
```

**読み込み処理**:
```typescript
if (shop.rankThresholds) {
  setRankThresholds(shop.rankThresholds);
}
```

**保存処理**:
```typescript
const shopData = {
  ...shopInfo,
  name: shopInfo.name.trim(),
  category: shopInfo.category.trim(),
  description: shopInfo.description.trim(),
  rankThresholds: rankThresholds, // ⭐ 追加
  updatedAt: new Date().toISOString(),
};
```

**UI追加**:
```tsx
{/* 🎖️ SBTランク設定 */}
<div className="bg-white rounded-xl shadow-lg p-8">
  <h2 className="text-lg font-bold text-gray-900 mb-6">🎖️ SBTランク設定</h2>
  
  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
    <h3 className="font-semibold text-purple-900 mb-2">📊 ランク自動判定について</h3>
    <p className="text-sm text-purple-800 mb-2">
      スタンプカードの必要訪問回数に応じて、SBTのランク（Bronze/Silver/Gold/Platinum）が自動的に決定されます。
    </p>
    <p className="text-sm text-purple-800">
      例: 必要訪問回数が15回の場合 → Silverランク（10回以上20回未満）
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        🥉 ブロンズ（最小訪問回数）
      </label>
      <input
        type="number"
        min="1"
        value={rankThresholds.bronzeMin}
        onChange={(e) => setRankThresholds({ ...rankThresholds, bronzeMin: parseInt(e.target.value) || 1 })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">デフォルト: 1回</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        🥈 シルバー（最小訪問回数）
      </label>
      <input
        type="number"
        min="1"
        value={rankThresholds.silverMin}
        onChange={(e) => setRankThresholds({ ...rankThresholds, silverMin: parseInt(e.target.value) || 10 })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">デフォルト: 10回</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        🥇 ゴールド（最小訪問回数）
      </label>
      <input
        type="number"
        min="1"
        value={rankThresholds.goldMin}
        onChange={(e) => setRankThresholds({ ...rankThresholds, goldMin: parseInt(e.target.value) || 20 })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">デフォルト: 20回</p>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        💎 プラチナ（最小訪問回数）
      </label>
      <input
        type="number"
        min="1"
        value={rankThresholds.platinumMin}
        onChange={(e) => setRankThresholds({ ...rankThresholds, platinumMin: parseInt(e.target.value) || 50 })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-xs text-gray-500 mt-1">デフォルト: 50回</p>
    </div>
  </div>

  <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <p className="text-sm font-semibold text-gray-700 mb-2">現在の設定:</p>
    <div className="text-xs text-gray-600 space-y-1">
      <p>• 🥉 ブロンズ: {rankThresholds.bronzeMin}～{rankThresholds.silverMin - 1}回</p>
      <p>• 🥈 シルバー: {rankThresholds.silverMin}～{rankThresholds.goldMin - 1}回</p>
      <p>• 🥇 ゴールド: {rankThresholds.goldMin}～{rankThresholds.platinumMin - 1}回</p>
      <p>• 💎 プラチナ: {rankThresholds.platinumMin}回以上</p>
    </div>
  </div>

  <button
    onClick={handleSave}
    className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
  >
    <Save className="w-4 h-4" /> ランク設定を保存
  </button>
</div>
```

---

### 4. Pinataサービスの修正

#### 📝 `src/utils/pinata.ts`

**インポート追加**:
```typescript
import { getSBTRank, generateBenefits, type ShopSettings } from './shopSettings';
```

**関数シグネチャ修正**:
```typescript
async createDynamicSBTWithImage(
  imageFile: File,
  sbtName: string,
  sbtDescription: string,
  shopSettings: ShopSettings, // ⭐ 型を ShopSettings に変更
  template: {
    shopId: number;
    maxStamps: number;
    rewardDescription: string;
    issuePattern: string;
  }
): Promise<{ imageHash: string; metadataHash: string; tokenURI: string }> {
```

**ランク決定処理**:
```typescript
// 2. ランクを決定（shopSettingsのカスタム閾値を使用）
const rank = getSBTRank(template.maxStamps, shopSettings);

// 3. 特典リストを生成
const benefits = generateBenefits(template.rewardDescription);
```

---

## 🎯 動作仕様

### スタンプカード累計カウント

1. **初回支払い**: 
   - 新規SBT作成
   - `currentStamps: 1`
   - トースト: "🆕 新規SBT発行 - 初回スタンプ"

2. **2回目以降の支払い**:
   - 既存SBT検索（ウォレットアドレス + テンプレートID）
   - `currentStamps += 1`
   - トースト: "✅ スタンプ+1！ 2/10"

3. **カード完成時**:
   - `currentStamps >= maxStamps`
   - `status: 'redeemed'`
   - トースト: "🎉 スタンプカード完成！ 10/10 - 特典を受け取れます！"

### ランク自動判定

| ランク | デフォルト閾値 | カスタマイズ可能 |
|--------|--------------|-----------------|
| 🥉 ブロンズ | 1～9回 | ✅ |
| 🥈 シルバー | 10～19回 | ✅ |
| 🥇 ゴールド | 20～49回 | ✅ |
| 💎 プラチナ | 50回以上 | ✅ |

**設定方法**:
1. 設定ページの「🎖️ SBTランク設定」セクション
2. 各ランクの最小訪問回数を入力
3. 「ランク設定を保存」ボタンをクリック

---

## 📊 修正ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/utils/shopSettings.ts` | RankThresholds型追加、getSBTRank関数修正、デフォルト閾値定義 |
| `src/pages/Settings.tsx` | ランク設定UIの追加、状態管理、保存処理 |
| `src/pages/SBTManagement.tsx` | 累計カウントロジック実装、既存SBT検索 |
| `src/utils/pinata.ts` | ShopSettings型使用、getSBTRank呼び出し修正 |

---

## 🧪 テスト項目

- [x] 同じウォレットアドレスで2回目の支払い → スタンプ+1
- [x] maxStamps達成時にstatus='redeemed'に変更
- [x] ランク設定の保存と読み込み
- [x] カスタムランク閾値でSBT発行
- [x] トースト通知が適切に表示される

---

## 💡 使用方法

### ショップオーナー向け

1. **ランク設定のカスタマイズ**:
   - 設定ページ → 「🎖️ SBTランク設定」
   - 各ランクの最小訪問回数を設定
   - 保存ボタンをクリック

2. **スタンプカード発行**:
   - 初回: 自動的に新規SBT作成（1スタンプ）
   - 2回目以降: 自動的に既存SBTのスタンプ+1
   - カード完成: 自動的に「特典獲得済み」ステータスに

---

## 🔒 後方互換性

- 既存のSBTデータには影響なし
- ランク設定がない場合はデフォルト値を使用
- 既存のテンプレートは正常に動作

---

## ✅ 完了確認

- [x] スタンプ累計カウント機能の実装
- [x] ランク設定のカスタマイズ機能
- [x] 設定画面UIの追加
- [x] 型定義の更新
- [x] エラーチェック完了（No errors found）
- [x] ドキュメント作成

修正は完全に完了しました。同じ支払者の2回目以降の支払いでスタンプが累計され、ショップごとにランク設定をカスタマイズできるようになりました。
