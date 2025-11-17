# SBT発行完全ガイド

## 📖 概要

このドキュメントは、SBT-JPYC-Payアプリケーションにおけるソウルバウンドトークン（SBT）の発行プロセス、メタデータ構造、および技術実装の詳細を記録したものです。

## 🎯 SBT発行フロー

### 1. 事前準備

#### 必要な設定
- **Pinata API設定**: IPFS画像・メタデータストレージ用
- **ウォレット接続**: MetaMask等のWeb3ウォレット
- **店舗設定**: 設定画面での店舗情報入力

#### 店舗設定項目
```typescript
interface ShopSettings {
  name: string;        // 店舗名（例: "Cafe JPYC"）
  id: string;          // 店舗ID（例: "shop-001"）
  category: string;    // 店舗カテゴリ（例: "カフェ・飲食"）
  description: string; // 店舗説明
}
```

### 2. SBTテンプレート作成

#### テンプレート構造
```typescript
interface SBTTemplate {
  id: string;                    // テンプレート固有ID
  shopId: number;               // ブロックチェーン上のショップID
  name: string;                 // SBT名称
  description: string;          // SBT説明
  issuePattern: IssuePattern;   // 発行パターン
  maxStamps: number;            // 必要訪問回数
  rewardDescription: string;    // 報酬説明
  imageUrl: string;             // 画像データ（Base64またはURL）
  imageMimeType: string;        // 画像形式
}
```

#### 発行パターン種別
- `per_payment`: 毎回発行
- `after_count`: N回後に発行
- `time_period`: 期間内に発行
- `period_range`: 期間指定

### 3. 動的メタデータ生成

#### 生成プロセス

1. **店舗設定取得**
   ```typescript
   const shopSettings = getShopSettings();
   ```

2. **ランク自動決定**
   ```typescript
   function getSBTRank(requiredVisits: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
     if (requiredVisits >= 50) return 'platinum';
     if (requiredVisits >= 20) return 'gold';
     if (requiredVisits >= 10) return 'silver';
     return 'bronze';
   }
   ```

3. **特典リスト生成**
   ```typescript
   function generateBenefits(rewardDescription: string): string[] {
     return rewardDescription
       .split(/[,、\n・]/)
       .map(item => item.trim())
       .filter(item => item.length > 0);
   }
   ```

#### 最終メタデータ構造
```json
{
  "name": "カフェ常連客証明",
  "description": "Cafe JPYCの常連客証明SBT",
  "image": "ipfs://QmXXXXXXXXXXXXXXXXXXXX",
  "shopId": 2,
  "required_visits": 5,
  "benefits": [
    "10%割引",
    "無料ドリンクアップグレード",
    "Wi-Fi優先接続"
  ],
  "attributes": [
    {
      "trait_type": "Shop Name",
      "value": "Cafe JPYC"
    },
    {
      "trait_type": "Shop Category",
      "value": "カフェ・飲食"
    },
    {
      "trait_type": "Required Visits",
      "value": 5
    },
    {
      "trait_type": "Rank",
      "value": "silver"
    },
    {
      "trait_type": "発行パターン",
      "value": "after_count"
    }
  ]
}
```

## 🔧 技術実装詳細

### IPFS アップロード処理

#### 画像アップロード
```typescript
// 1. 画像をIPFSにアップロード
const imageResult = await pinataService.uploadFile(imageFile, {
  name: `${sbtName} - Image`,
  description: `Image for SBT: ${sbtName}`,
});

// 2. IPFSハッシュ取得
const imageHash = imageResult.IpfsHash;
const imageUri = `ipfs://${imageHash}`;
```

#### メタデータアップロード
```typescript
// 1. メタデータ作成
const metadata: SBTMetadata = {
  name: sbtName,
  description: sbtDescription,
  image: imageUri,
  shopId: template.shopId,
  required_visits: template.maxStamps,
  benefits: generateBenefits(template.rewardDescription),
  attributes: [/* 動的属性配列 */]
};

// 2. メタデータをIPFSにアップロード
const metadataResult = await pinataService.uploadJSON(metadata);
const tokenURI = `ipfs://${metadataResult.IpfsHash}`;
```

### スマートコントラクト連携

#### SBT発行実行
```typescript
const mintResult = await mintSBT({
  recipientAddress: userWalletAddress,
  shopId: template.shopId,  // テンプレートのshopIdを使用
  tokenURI: tokenURI,       // IPFSメタデータURI
  chainId: selectedChainId  // 選択されたブロックチェーン
});
```

#### コントラクト関数呼び出し
```solidity
function mintSBT(
    address to,
    uint256 shopId,
    string calldata tokenURI_
) external onlyOwner returns (uint256 tokenId)
```

## 📋 メタデータ属性詳細

### 標準属性

| 属性名 | trait_type | 型 | 説明 | 例 |
|--------|-----------|----|----|-----|
| 店舗名 | Shop Name | string | 設定画面で入力した店舗名 | "Cafe JPYC" |
| 店舗カテゴリ | Shop Category | string | 店舗の業種・カテゴリ | "カフェ・飲食" |
| 必要訪問回数 | Required Visits | number | SBT取得に必要な来店回数 | 5 |
| ランク | Rank | string | 自動決定されるSBTランク | "silver" |
| 発行パターン | 発行パターン | string | SBTの発行条件 | "after_count" |

### 追加メタデータフィールド

| フィールド名 | 型 | 説明 | 例 |
|------------|----|----|-----|
| shopId | number | ブロックチェーン上の店舗識別ID | 2 |
| required_visits | number | 必要訪問回数（attributes内とは別） | 5 |
| benefits | string[] | 特典リスト配列 | ["10%割引", "無料アップグレード"] |

## 🎖️ ランクシステム

### 自動ランク決定基準

| ランク | 必要訪問回数 | 説明 |
|-------|------------|-----|
| bronze | 1-9回 | 初級レベル |
| silver | 10-19回 | 中級レベル |
| gold | 20-49回 | 上級レベル |
| platinum | 50回以上 | 最上級レベル |

### ランク表示例

```json
{
  "trait_type": "Rank",
  "value": "silver"
}
```

## 🏪 ショップ管理

### ショップ登録

#### 自動登録プロセス
1. テンプレート作成時にユニークなshopIdを自動生成
2. ブロックチェーン上でショップ情報を登録
3. 店舗設定の名前・説明を使用

#### 登録パラメータ
```typescript
await registerShop({
  shopId: template.shopId,                    // 自動生成されたID
  shopName: shopSettings.name,               // 設定画面の店舗名
  description: shopSettings.description,      // 設定画面の説明
  shopOwnerAddress: walletAddress,            // 現在のウォレット
  requiredVisits: template.maxStamps,         // テンプレートの必要回数
  chainId: selectedChainId                    // 対象ブロックチェーン
});
```

### ショップID管理

#### ID生成アルゴリズム
```typescript
// 1. 16進数形式でのID表示
function formatShopIdAsHex(shopId: number): string {
  return `0x${shopId.toString(16).padStart(4, '0').toUpperCase()}`;
}

// 2. 重複回避でのID生成
function generateUniqueShopId(): number {
  const usedIds = JSON.parse(localStorage.getItem('used-shop-ids') || '[]');
  let shopId = Math.floor(Math.random() * 65535) + 1;
  while (usedIds.includes(shopId)) {
    shopId = Math.floor(Math.random() * 65535) + 1;
  }
  return shopId;
}
```

## 💾 データ永続化

### ローカルストレージ

#### 店舗設定
```typescript
// 保存
localStorage.setItem('shop-info', JSON.stringify(shopSettings));

// 読み込み
const saved = localStorage.getItem('shop-info');
const settings = saved ? JSON.parse(saved) : defaultSettings;
```

#### テンプレート管理
- IndexedDBを使用したテンプレート保存
- バックアップ・復元機能対応

### IPFS ストレージ

#### Pinata 設定
```env
VITE_PINATA_API_KEY=your_api_key
VITE_PINATA_API_SECRET=your_secret_key
VITE_PINATA_JWT=your_jwt_token
```

#### ファイル形式サポート
- **画像**: JPEG, PNG, GIF, SVG, WebP
- **サイズ制限**: 10MB以下
- **メタデータ**: JSON形式

## 🔄 エラーハンドリング

### よくあるエラーとその対処

#### 1. IPFS アップロード失敗
```typescript
try {
  const result = await pinataService.createDynamicSBTWithImage(/* ... */);
} catch (uploadError) {
  // フォールバック: ダミーURI使用
  const dummyHash = `Qm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 15)}`.padEnd(46, '0');
  tokenURI = `ipfs://${dummyHash}`;
  console.warn('⚠️ ダミーURI使用:', tokenURI);
}
```

#### 2. ネットワーク切り替えエラー
```typescript
const ensureNetwork = async (targetChainId: number) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      // チェーンをウォレットに追加
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParams[targetChainId]],
      });
    }
  }
};
```

#### 3. ガス不足エラー
```typescript
try {
  const gasEstimate = await contract.mintSBT.estimateGas(recipient, shopId, tokenURI);
  const gasLimit = gasEstimate * 120n / 100n; // 20%マージン
  const tx = await contract.mintSBT(recipient, shopId, tokenURI, { gasLimit });
} catch (gasError) {
  // デフォルトガス制限でリトライ
  const tx = await contract.mintSBT(recipient, shopId, tokenURI, {
    gasLimit: BigInt(250000)
  });
}
```

## 📱 フロントエンド統合

### React コンポーネント例

```tsx
// SBT発行ボタンコンポーネント
const MintSBTButton: React.FC<{ template: SBTTemplate }> = ({ template }) => {
  const handleMint = async () => {
    const shopSettings = getShopSettings();
    
    // 動的メタデータでSBT発行
    const result = await pinataService.createDynamicSBTWithImage(
      imageFile,
      template.name,
      template.description,
      shopSettings,
      {
        shopId: template.shopId,
        maxStamps: template.maxStamps,
        rewardDescription: template.rewardDescription,
        issuePattern: template.issuePattern,
      }
    );

    const mintResult = await mintSBT({
      recipientAddress: userAddress,
      shopId: template.shopId,
      tokenURI: result.tokenURI,
      chainId: selectedChainId,
    });

    if (mintResult.success) {
      toast.success('SBT発行完了！');
    }
  };

  return (
    <button onClick={handleMint} className="mint-button">
      SBTを発行
    </button>
  );
};
```

## 🧪 テスト手順

### 1. 設定確認
- [ ] 店舗設定が正しく保存・読み込みされる
- [ ] Pinata API接続が成功する
- [ ] ウォレットが接続されている

### 2. テンプレート作成
- [ ] 画像アップロードが成功する
- [ ] ユニークなshopIdが生成される
- [ ] テンプレート情報が正しく保存される

### 3. SBT発行テスト
- [ ] 動的メタデータが正しく生成される
- [ ] IPFSアップロードが成功する
- [ ] ブロックチェーン トランザクションが成功する
- [ ] 正しいshopIdでSBTが発行される

### 4. メタデータ検証
- [ ] 店舗設定の情報が反映されている
- [ ] ランクが正しく決定されている
- [ ] 特典リストが適切に配列化されている
- [ ] 全ての必須属性が含まれている

## 📊 運用監視

### ログ出力例

```typescript
console.log('📋 動的SBTメタデータ生成:', metadata);
console.log('✅ IPFS Upload成功:', tokenURI);
console.log('✅ SBT Mint完了:', transactionHash);
```

### 成功指標

- **メタデータ品質**: 必須フィールドの完全性
- **IPFS可用性**: アップロード成功率 > 95%
- **ブロックチェーン記録**: トランザクション成功率 > 98%
- **ユーザビリティ**: 設定から発行までの一貫性

## 🔍 トラブルシューティング

### よくある問題

1. **「知らない店舗名が表示される」**
   - **原因**: ハードコーディングされた固定値使用
   - **解決**: 動的メタデータ機能で設定値を使用

2. **「テンプレートが反映されない」**
   - **原因**: 旧コードでのstatic属性使用
   - **解決**: `createDynamicSBTWithImage` メソッド使用

3. **「ショップIDが重複する」**
   - **原因**: ID生成時の重複チェック不足
   - **解決**: `generateUniqueShopId` 使用

### デバッグ手順

1. ブラウザコンソールでログを確認
2. 設定画面で店舗情報が正しく保存されているか確認
3. IPFSゲートウェイでメタデータにアクセス可能か確認
4. ブロックエクスプローラーでトランザクション状態を確認

---

*このドキュメントは2024年11月17日時点での実装を基に作成されています。最新の実装状況については、実際のコードを確認してください。*