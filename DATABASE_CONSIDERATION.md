# 📊 データベース利用の検討

## ブロックチェーンだけで運用できるか?

### ✅ ブロックチェーン上に記録されるデータ

スマートコントラクト (`JpycStampSBT.sol`) に以下が記録されます:

```solidity
struct Shop {
    string name;              // ショップ名
    string description;       // 説明
    address owner;            // オーナーアドレス
    uint256 requiredVisits;   // 必要利用回数
    bool active;              // 有効フラグ
}

mapping(uint256 => Shop) public shops;  // ショップID → ショップ情報
```

**オンチェーンで確認可能な情報:**
- ✅ ショップID
- ✅ ショップ名
- ✅ ショップオーナーのウォレットアドレス
- ✅ 有効/無効ステータス
- ✅ 必要利用回数

### ❌ ブロックチェーン上に記録されないデータ

以下の情報はスマートコントラクトには**含まれていません**:

- ❌ ショップオーナーの本名
- ❌ 連絡先（メール、電話番号）
- ❌ 店舗の住所
- ❌ 法人名・屋号
- ❌ 登録日時（正確な日本時間）
- ❌ 契約書類
- ❌ 顧客サポート履歴

---

## データベースが必要なケース

### 🏢 ケース1: 事業化して複数店舗を管理

**必要な情報:**

| 項目 | ブロックチェーン | データベース | 必要性 |
|-----|-----------------|-------------|--------|
| ショップID | ✅ | ✅ | 必須 |
| ショップ名 | ✅ | ✅ | 必須 |
| オーナーアドレス | ✅ | ✅ | 必須 |
| **法人名/屋号** | ❌ | ✅ | **必須** |
| **代表者名** | ❌ | ✅ | **必須** |
| **メールアドレス** | ❌ | ✅ | **必須** |
| **電話番号** | ❌ | ✅ | **必須** |
| **店舗住所** | ❌ | ✅ | 推奨 |
| 登録日 | △ (ブロックタイムスタンプ) | ✅ | 推奨 |
| 契約ステータス | ❌ | ✅ | 推奨 |

**結論:** 事業化するなら**データベースは必須**です。

---

## 推奨データベース設計

### 📋 テーブル構造案

#### 1. `shops` テーブル

```sql
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER UNIQUE NOT NULL,           -- ブロックチェーンのショップID
    owner_address VARCHAR(42) NOT NULL,        -- 0x... ウォレットアドレス
    shop_name VARCHAR(255) NOT NULL,           -- ショップ名
    legal_name VARCHAR(255) NOT NULL,          -- 法人名/屋号
    representative_name VARCHAR(255) NOT NULL, -- 代表者名
    email VARCHAR(255) NOT NULL,               -- メールアドレス
    phone VARCHAR(20),                         -- 電話番号
    address TEXT,                              -- 店舗住所
    contract_status VARCHAR(50) DEFAULT 'active', -- 契約ステータス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blockchain_tx_hash VARCHAR(66),            -- 登録時のトランザクションハッシュ
    notes TEXT                                 -- 備考
);

-- インデックス
CREATE INDEX idx_shops_shop_id ON shops(shop_id);
CREATE INDEX idx_shops_owner_address ON shops(owner_address);
CREATE INDEX idx_shops_email ON shops(email);
```

#### 2. `shop_registration_requests` テーブル（問い合わせ管理）

```sql
CREATE TABLE shop_registration_requests (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,        -- 会社名/屋号
    representative_name VARCHAR(255) NOT NULL, -- 代表者名
    email VARCHAR(255) NOT NULL,               -- メールアドレス
    phone VARCHAR(20),                         -- 電話番号
    wallet_address VARCHAR(42),                -- ウォレットアドレス（任意）
    shop_name VARCHAR(255),                    -- 希望ショップ名
    message TEXT,                              -- メッセージ
    status VARCHAR(50) DEFAULT 'pending',      -- pending/approved/rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(42),                  -- 処理者のウォレットアドレス
    approved_shop_id INTEGER,                  -- 承認後のショップID
    notes TEXT                                 -- 備考
);
```

#### 3. `sbt_issuance_logs` テーブル（発行履歴）

```sql
CREATE TABLE sbt_issuance_logs (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER NOT NULL,                  -- ショップID
    token_id INTEGER NOT NULL,                 -- SBTトークンID
    recipient_address VARCHAR(42) NOT NULL,    -- 受取人アドレス
    issuer_address VARCHAR(42) NOT NULL,       -- 発行者アドレス
    template_name VARCHAR(255),                -- テンプレート名
    tx_hash VARCHAR(66) NOT NULL,              -- トランザクションハッシュ
    chain_id INTEGER NOT NULL,                 -- チェーンID (137/80002)
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata_uri TEXT                          -- IPFSメタデータURI
);

-- インデックス
CREATE INDEX idx_sbt_shop_id ON sbt_issuance_logs(shop_id);
CREATE INDEX idx_sbt_recipient ON sbt_issuance_logs(recipient_address);
CREATE INDEX idx_sbt_tx_hash ON sbt_issuance_logs(tx_hash);
```

---

## データベース不要で運用する場合

### 🔧 最小限の運用方法

**条件:**
- 自分1人だけでショップ運営
- 顧客管理は不要
- 法的記録は別途エクセルなどで管理

**必要な操作:**

```bash
# 1. 自分をショップオーナーとして登録
# ショップ管理画面 (/shop-admin) で:
ショップID: 1
ショップ名: 私のカフェ
オーナーアドレス: 0x5888...D8Fd (自分のアドレス)

# 2. 顧客情報は手動管理
# Excel/Google Spreadsheetsで:
| 顧客ウォレットアドレス | 氏名 | 発行日 | SBT ID | 備考 |
|----------------------|------|--------|--------|------|
| 0x1111...1111        | 田中 | 2025/01/20 | 1 | 初回 |
```

**メリット:**
- ✅ サーバー費用不要
- ✅ データベース管理不要
- ✅ すぐに開始可能

**デメリット:**
- ❌ スケールしない（顧客が増えると管理困難）
- ❌ 自動化できない
- ❌ 検索・分析が困難

---

## 推奨データベースソリューション

### 1️⃣ **Supabase** (推奨)

**特徴:**
- ✅ PostgreSQL完全互換
- ✅ 無料プラン: 500MB、無制限API
- ✅ リアルタイム機能
- ✅ 認証機能付き
- ✅ REST API自動生成

**セットアップ:**
```bash
# 1. Supabaseでプロジェクト作成
https://supabase.com/dashboard

# 2. テーブル作成（SQL Editorで実行）
# 上記のCREATE TABLE文を実行

# 3. 環境変数設定
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 2️⃣ **Airtable** (簡易版)

**特徴:**
- ✅ スプレッドシート感覚
- ✅ 無料プラン: 1,200レコード/ベース
- ✅ API自動生成
- ❌ リレーショナルDBとしては弱い

### 3️⃣ **Google Sheets + Apps Script** (最小限)

**特徴:**
- ✅ 完全無料
- ✅ 簡単に開始可能
- ❌ パフォーマンス低い
- ❌ セキュリティ弱い

---

## 実装例: Supabaseとの連携

### フロントエンド統合

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ショップ登録リクエスト送信
export async function submitShopRegistrationRequest(data: {
  companyName: string
  representativeName: string
  email: string
  phone?: string
  walletAddress?: string
  shopName?: string
  message?: string
}) {
  const { data: result, error } = await supabase
    .from('shop_registration_requests')
    .insert([{
      company_name: data.companyName,
      representative_name: data.representativeName,
      email: data.email,
      phone: data.phone,
      wallet_address: data.walletAddress,
      shop_name: data.shopName,
      message: data.message,
      status: 'pending'
    }])
  
  if (error) throw error
  return result
}

// ショップ情報保存（ブロックチェーン登録後）
export async function saveShopToDatabase(data: {
  shopId: number
  ownerAddress: string
  shopName: string
  legalName: string
  representativeName: string
  email: string
  phone?: string
  address?: string
  txHash: string
}) {
  const { data: result, error } = await supabase
    .from('shops')
    .insert([{
      shop_id: data.shopId,
      owner_address: data.ownerAddress,
      shop_name: data.shopName,
      legal_name: data.legalName,
      representative_name: data.representativeName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      blockchain_tx_hash: data.txHash,
      contract_status: 'active'
    }])
  
  if (error) throw error
  return result
}

// SBT発行ログ保存
export async function logSBTIssuance(data: {
  shopId: number
  tokenId: number
  recipientAddress: string
  issuerAddress: string
  templateName: string
  txHash: string
  chainId: number
  metadataUri: string
}) {
  const { data: result, error } = await supabase
    .from('sbt_issuance_logs')
    .insert([data])
  
  if (error) throw error
  return result
}
```

### ショップ管理画面での統合

```typescript
// ShopAdmin.tsx に追加
const handleRegisterShop = async () => {
  // 1. まず追加情報を入力してもらう
  const legalInfo = await showLegalInfoForm(); // モーダルで入力
  
  // 2. ブロックチェーンに登録
  const result = await registerShop({
    shopId,
    shopName: newShop.name,
    // ...
  });
  
  if (result.success) {
    // 3. データベースにも保存
    await saveShopToDatabase({
      shopId,
      ownerAddress: newShop.ownerAddress,
      shopName: newShop.name,
      legalName: legalInfo.legalName,
      representativeName: legalInfo.representativeName,
      email: legalInfo.email,
      phone: legalInfo.phone,
      address: legalInfo.address,
      txHash: result.txHash
    });
    
    toast.success('✅ ショップ登録完了（ブロックチェーン + DB）');
  }
};
```

---

## まとめ

### 📊 判断基準

| 運用規模 | データベース | 推奨ソリューション |
|---------|-------------|-------------------|
| **個人利用** | 不要 | ブロックチェーンのみ + Excel |
| **小規模事業（〜10店舗）** | 推奨 | Supabase 無料プラン |
| **中規模事業（10〜100店舗）** | 必須 | Supabase Pro |
| **大規模事業（100店舗〜）** | 必須 | PostgreSQL (自前サーバー) |

### ✅ あなたの場合の推奨

**現状（個人開発・検証段階）:**
- ブロックチェーンのみで十分
- 連絡先などはExcelで管理

**事業化する場合:**
- Supabaseを導入（無料で開始）
- 上記のテーブル設計を実装
- ショップ登録時にDB保存も追加

---

## 次のステップ

### すぐに実装する場合:

1. Supabaseアカウント作成
2. プロジェクト作成
3. SQL Editorでテーブル作成
4. フロントエンドに統合コード追加
5. ショップ管理画面でDB保存処理追加

**必要な時間:** 約2〜3時間

実装しますか? それとも現状はブロックチェーンのみで進めますか?
