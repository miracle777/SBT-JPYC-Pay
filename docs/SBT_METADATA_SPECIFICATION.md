# SBT メタデータ仕様書

## 📋 メタデータ標準仕様

### バージョン情報
- **仕様バージョン**: v2.0.0
- **実装日**: 2024年11月17日
- **準拠標準**: ERC-721 Metadata Standard + 拡張フィールド

### 基本構造

```typescript
interface SBTMetadata {
  // ERC-721標準フィールド
  name: string;                    // SBT名称
  description: string;             // SBT説明
  image: string;                   // IPFS画像URI

  // SBT-JPYC-Pay拡張フィールド
  shopId?: number;                 // 店舗識別ID
  required_visits?: number;        // 必要訪問回数
  benefits?: string[];             // 特典リスト

  // OpenSea互換属性
  attributes: Array<{
    trait_type: string;            // 属性タイプ
    value: string | number;        // 属性値
    display_type?: string;         // 表示形式（optional）
  }>;
}
```

## 🎯 属性定義

### 必須属性（Required Attributes）

#### 1. Shop Name
```json
{
  "trait_type": "Shop Name",
  "value": "店舗名（設定画面から取得）"
}
```
- **データ源**: `getShopSettings().name`
- **用途**: NFTマーケットプレース、ウォレットでの表示
- **例**: "Cafe JPYC", "Pizza Roma", "Beauty Salon Luna"

#### 2. Shop Category
```json
{
  "trait_type": "Shop Category", 
  "value": "店舗カテゴリ（設定画面から取得）"
}
```
- **データ源**: `getShopSettings().category`
- **用途**: カテゴリ別SBT検索・フィルタリング
- **例**: "カフェ・飲食", "小売店", "サービス業", "美容・健康"

#### 3. Required Visits
```json
{
  "trait_type": "Required Visits",
  "value": "必要訪問回数（テンプレートのmaxStampsから取得）"
}
```
- **データ源**: `template.maxStamps`
- **データ型**: number
- **用途**: ランク判定、達成難易度表示

#### 4. Rank
```json
{
  "trait_type": "Rank",
  "value": "自動決定されたランク"
}
```
- **データ源**: `getSBTRank(template.maxStamps)`
- **可能値**: "bronze" | "silver" | "gold" | "platinum"
- **決定ロジック**:
  ```typescript
  function getSBTRank(requiredVisits: number): string {
    if (requiredVisits >= 50) return 'platinum';
    if (requiredVisits >= 20) return 'gold';
    if (requiredVisits >= 10) return 'silver';
    return 'bronze';
  }
  ```

### オプション属性（Optional Attributes）

#### 5. 発行パターン
```json
{
  "trait_type": "発行パターン",
  "value": "テンプレートの発行条件"
}
```
- **データ源**: `template.issuePattern`
- **可能値**: 
  - `"per_payment"`: 毎回発行
  - `"after_count"`: N回後に発行
  - `"time_period"`: 期間内に発行
  - `"period_range"`: 期間指定

#### 6. カスタム属性
店舗独自の属性を追加可能：
```json
{
  "trait_type": "営業時間",
  "value": "9:00-21:00"
},
{
  "trait_type": "駐車場",
  "value": "有り"
},
{
  "trait_type": "Wi-Fi",
  "value": "無料"
}
```

## 🏪 拡張フィールド仕様

### shopId
- **型**: number
- **範囲**: 1-65535
- **生成方法**: `generateUniqueShopId()`
- **用途**: スマートコントラクトでの店舗識別
- **例**: 1, 2, 1024, 65535

### required_visits
- **型**: number  
- **範囲**: 1以上
- **データ源**: テンプレートの`maxStamps`
- **用途**: アプリでの進捗表示、ランク判定
- **例**: 5, 10, 20, 50

### benefits
- **型**: string[]
- **生成方法**: `generateBenefits(template.rewardDescription)`
- **分割文字**: カンマ(`,`)、読点(`、`)、改行(`\n`)、箇条書き(`・`)
- **用途**: 特典一覧表示、顧客への訴求
- **例**: 
  ```json
  [
    "10%割引",
    "無料ドリンクアップグレード",
    "Wi-Fi優先接続",
    "誕生日特典"
  ]
  ```

## 🔧 生成アルゴリズム

### 1. 特典リスト生成

```typescript
function generateBenefits(rewardDescription: string): string[] {
  if (!rewardDescription.trim()) {
    return ['特典なし'];
  }

  // 区切り文字で分割
  const benefits = rewardDescription
    .split(/[,、\n・]/)              // カンマ、読点、改行、箇条書き
    .map(item => item.trim())        // 前後の空白除去
    .filter(item => item.length > 0) // 空文字列除外
    .filter(item => !item.match(/^[\s　]*$/)); // 空白のみの文字列除外

  return benefits.length > 0 ? benefits : [rewardDescription];
}
```

### 2. ランク決定

```typescript
function getSBTRank(requiredVisits: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  const rankThresholds = [
    { min: 50, rank: 'platinum' as const },
    { min: 20, rank: 'gold' as const },
    { min: 10, rank: 'silver' as const },
    { min: 1,  rank: 'bronze' as const }
  ];

  return rankThresholds.find(t => requiredVisits >= t.min)?.rank || 'bronze';
}
```

### 3. 動的属性配列構築

```typescript
function buildAttributes(
  shopSettings: ShopSettings,
  template: SBTTemplate
): Array<{ trait_type: string; value: string | number }> {
  const rank = getSBTRank(template.maxStamps);
  
  const baseAttributes = [
    { trait_type: 'Shop Name', value: shopSettings.name },
    { trait_type: 'Shop Category', value: shopSettings.category || 'その他' },
    { trait_type: 'Required Visits', value: template.maxStamps },
    { trait_type: 'Rank', value: rank }
  ];

  // 発行パターンが設定されている場合のみ追加
  if (template.issuePattern) {
    baseAttributes.push({
      trait_type: '発行パターン',
      value: template.issuePattern
    });
  }

  return baseAttributes;
}
```

## 📊 メタデータ実例

### 実例1: カフェ
```json
{
  "name": "Coffee Master Card",
  "description": "山田コーヒー店の常連客証明SBT。10回来店で取得できます。",
  "image": "ipfs://QmYaXVtPNdGmhPVvFaV8cKnbZJ2eB1A7bCdEfGhIjKlMnO",
  "shopId": 1024,
  "required_visits": 10,
  "benefits": [
    "ドリンク10%割引",
    "フードメニュー50円引き",
    "新商品先行試食",
    "誕生日月無料券1枚"
  ],
  "attributes": [
    { "trait_type": "Shop Name", "value": "山田コーヒー店" },
    { "trait_type": "Shop Category", "value": "カフェ・飲食" },
    { "trait_type": "Required Visits", "value": 10 },
    { "trait_type": "Rank", "value": "silver" },
    { "trait_type": "発行パターン", "value": "after_count" }
  ]
}
```

### 実例2: 美容室
```json
{
  "name": "Beauty VIP Member",
  "description": "Salon Lunaのプレミアム会員証。20回利用でプラチナステータス。",
  "image": "ipfs://QmBeautyVIPmemberTokenImageHashExample123456",
  "shopId": 2048,
  "required_visits": 20,
  "benefits": [
    "全メニュー15%割引",
    "トリートメント無料アップグレード", 
    "専用予約枠利用可能",
    "新トリートメント無料体験"
  ],
  "attributes": [
    { "trait_type": "Shop Name", "value": "Salon Luna" },
    { "trait_type": "Shop Category", "value": "美容・健康" },
    { "trait_type": "Required Visits", "value": 20 },
    { "trait_type": "Rank", "value": "gold" },
    { "trait_type": "発行パターン", "value": "after_count" }
  ]
}
```

### 実例3: 小売店
```json
{
  "name": "Green Market Friend",
  "description": "グリーンマーケットの エコフレンド会員証。環境に優しいお買い物を応援。",
  "image": "ipfs://QmGreenMarketEcoFriendTokenImageHash",
  "shopId": 512,
  "required_visits": 5,
  "benefits": [
    "エコ商品5%割引",
    "マイバッグ持参でポイント2倍"
  ],
  "attributes": [
    { "trait_type": "Shop Name", "value": "グリーンマーケット" },
    { "trait_type": "Shop Category", "value": "小売店" },
    { "trait_type": "Required Visits", "value": 5 },
    { "trait_type": "Rank", "value": "bronze" },
    { "trait_type": "発行パターン", "value": "after_count" }
  ]
}
```

## 🔍 バリデーション

### フィールド検証

#### 必須フィールド検証
```typescript
function validateSBTMetadata(metadata: SBTMetadata): ValidationResult {
  const errors: string[] = [];

  // 必須フィールドの存在確認
  if (!metadata.name?.trim()) errors.push('name is required');
  if (!metadata.description?.trim()) errors.push('description is required');
  if (!metadata.image?.startsWith('ipfs://')) errors.push('image must be IPFS URI');
  if (!Array.isArray(metadata.attributes)) errors.push('attributes must be array');

  // shopIdの範囲確認
  if (metadata.shopId !== undefined) {
    if (!Number.isInteger(metadata.shopId) || metadata.shopId < 1 || metadata.shopId > 65535) {
      errors.push('shopId must be integer between 1-65535');
    }
  }

  // required_visitsの確認
  if (metadata.required_visits !== undefined) {
    if (!Number.isInteger(metadata.required_visits) || metadata.required_visits < 1) {
      errors.push('required_visits must be positive integer');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

#### 属性検証
```typescript
function validateAttributes(attributes: Array<{trait_type: string; value: string | number}>): boolean {
  const requiredTraits = ['Shop Name', 'Shop Category', 'Required Visits', 'Rank'];
  
  const presentTraits = attributes.map(attr => attr.trait_type);
  
  return requiredTraits.every(required => 
    presentTraits.includes(required)
  );
}
```

## 📱 フロントエンド表示例

### React コンポーネント例

```tsx
import React from 'react';

interface SBTDisplayProps {
  metadata: SBTMetadata;
}

const SBTDisplay: React.FC<SBTDisplayProps> = ({ metadata }) => {
  const shopNameAttr = metadata.attributes.find(attr => attr.trait_type === 'Shop Name');
  const categoryAttr = metadata.attributes.find(attr => attr.trait_type === 'Shop Category');
  const rankAttr = metadata.attributes.find(attr => attr.trait_type === 'Rank');

  const getRankColor = (rank: string) => {
    const colors = {
      bronze: 'text-orange-600 bg-orange-50',
      silver: 'text-gray-600 bg-gray-50', 
      gold: 'text-yellow-600 bg-yellow-50',
      platinum: 'text-purple-600 bg-purple-50'
    };
    return colors[rank as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{metadata.name}</h3>
          <p className="text-gray-600">{shopNameAttr?.value}</p>
        </div>
        {rankAttr && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRankColor(String(rankAttr.value))}`}>
            {rankAttr.value}
          </span>
        )}
      </div>

      {/* 画像 */}
      {metadata.image && (
        <img 
          src={metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')} 
          alt={metadata.name}
          className="w-full h-48 object-cover rounded-lg mb-4"
        />
      )}

      {/* 説明 */}
      <p className="text-gray-700 mb-4">{metadata.description}</p>

      {/* カテゴリ */}
      {categoryAttr && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">カテゴリ: </span>
          <span className="text-sm font-medium">{categoryAttr.value}</span>
        </div>
      )}

      {/* 必要訪問回数 */}
      {metadata.required_visits && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">必要訪問回数: </span>
          <span className="text-sm font-medium text-blue-600">{metadata.required_visits}回</span>
        </div>
      )}

      {/* 特典リスト */}
      {metadata.benefits && metadata.benefits.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">特典内容</h4>
          <ul className="space-y-1">
            {metadata.benefits.map((benefit, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 属性詳細 */}
      <details className="mt-4">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">
          詳細属性
        </summary>
        <div className="mt-2 space-y-1">
          {metadata.attributes.map((attr, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-500">{attr.trait_type}:</span>
              <span className="text-gray-900 font-medium">{attr.value}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default SBTDisplay;
```

## 🛠️ 開発ツール

### メタデータ生成ツール

```typescript
/**
 * 開発・テスト用のメタデータ生成ヘルパー
 */
export class SBTMetadataBuilder {
  private metadata: Partial<SBTMetadata> = {
    attributes: []
  };

  setBasicInfo(name: string, description: string, imageUri: string): this {
    this.metadata.name = name;
    this.metadata.description = description;
    this.metadata.image = imageUri;
    return this;
  }

  setShopInfo(shopId: number, shopName: string, category?: string): this {
    this.metadata.shopId = shopId;
    this.addAttribute('Shop Name', shopName);
    if (category) {
      this.addAttribute('Shop Category', category);
    }
    return this;
  }

  setVisitInfo(requiredVisits: number): this {
    this.metadata.required_visits = requiredVisits;
    this.addAttribute('Required Visits', requiredVisits);
    this.addAttribute('Rank', getSBTRank(requiredVisits));
    return this;
  }

  setBenefits(benefits: string[]): this {
    this.metadata.benefits = benefits;
    return this;
  }

  addAttribute(trait_type: string, value: string | number): this {
    if (!this.metadata.attributes) this.metadata.attributes = [];
    this.metadata.attributes.push({ trait_type, value });
    return this;
  }

  build(): SBTMetadata {
    const result = this.metadata as SBTMetadata;
    
    // バリデーション
    const validation = validateSBTMetadata(result);
    if (!validation.valid) {
      throw new Error(`Invalid metadata: ${validation.errors.join(', ')}`);
    }

    return result;
  }
}

// 使用例
const metadata = new SBTMetadataBuilder()
  .setBasicInfo('VIP Member Card', 'プレミアム会員証', 'ipfs://Qm...')
  .setShopInfo(1024, 'Cafe JPYC', 'カフェ・飲食')
  .setVisitInfo(10)
  .setBenefits(['10%割引', '無料Wi-Fi'])
  .addAttribute('発行パターン', 'after_count')
  .build();
```

---

*このメタデータ仕様書は、SBT-JPYC-Payアプリケーションの動的メタデータ機能の完全な技術仕様を記述しています。実装時は本仕様に準拠してください。*