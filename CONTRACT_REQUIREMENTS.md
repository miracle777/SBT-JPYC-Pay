# スマートコントラクト デプロイ要件チェックリスト

## 📋 概要
このドキュメントは、SBTスタンプシステムのスマートコントラクトをデプロイする際に**必ず満たすべき要件**を定義しています。テストネットで動作確認した機能が本番環境で問題なく動作することを保証するため、デプロイ前に必ずこのチェックリストを確認してください。

## 🎯 基本原則
- **テストネットで動作した機能は本番環境でも同じように動作すること**
- **コントラクトのソースコード（.solファイル）はテストネットと本番環境で完全に同一であること**
- **デプロイ前にコントラクトABIが正しく設定されていること**

## ⚠️ 重要: ネットワークとコントラクトアドレスの関係

**テストネットと本番環境は完全に別のブロックチェーンです:**

| 項目 | テストネット（Amoy） | 本番環境（Mainnet） |
|------|---------------------|---------------------|
| Chain ID | 80002 | 137 |
| ネットワーク | Polygon Amoy | Polygon Mainnet |
| コントラクトソースコード | 同じ `.sol` ファイル | 同じ `.sol` ファイル |
| **コントラクトアドレス** | **別のアドレス** | **別のアドレス** |
| 通貨 | テストMATIC（無料） | POL/MATIC（実通貨） |

**つまり:**
1. ✅ 同じ `.sol` ファイルを使う
2. ✅ 各ネットワークに**別々にデプロイ**する
3. ❌ テストネットのアドレスを本番では使えない
4. ✅ デプロイ後に `contracts.ts` の該当ネットワークのアドレスを更新

---

## ✅ 必須機能チェックリスト

### 1. コア機能（SBT発行）

#### 1.1 mintSBT関数
```solidity
function mintSBT(
    address to,
    uint256 shopId,
    string calldata tokenURI_
) external returns (uint256 tokenId)
```

**要件:**
- ✅ 関数名が `mintSBT` であること
- ✅ 戻り値が `uint256 tokenId` であること（重要！）
- ✅ `to`, `shopId`, `tokenURI_` の3つのパラメータを持つこと
- ✅ オーナーまたはショップオーナーのみ実行可能
- ✅ SBTMintedイベントを発火すること

**検証方法:**
```javascript
// デプロイスクリプトで確認
const abi = artifacts.readArtifactSync('JpycStampSBT').abi;
const mintFunction = abi.find(f => f.name === 'mintSBT' && f.type === 'function');
console.log('mintSBT戻り値:', mintFunction.outputs[0].type); // "uint256" であること
```

#### 1.2 batchMintSBT関数
```solidity
function batchMintSBT(
    address[] calldata recipients,
    uint256 shopId,
    string[] calldata tokenURIs_
) external
```

**要件:**
- ✅ 複数のSBTを一度に発行できること
- ✅ 配列の長さが一致することをチェックすること
- ✅ 各発行でSBTMintedイベントを発火すること

---

### 2. ショップ管理機能

#### 2.1 registerShop関数
```solidity
function registerShop(
    uint256 shopId,
    string calldata name,
    string calldata description,
    address shopOwner,
    uint256 requiredVisits
) external onlyOwner
```

**要件:**
- ✅ ショップ情報を登録できること
- ✅ ShopRegisteredイベントを発火すること
- ✅ オーナーのみ実行可能

#### 2.2 updateShop関数
```solidity
function updateShop(
    uint256 shopId,
    string calldata name,
    string calldata description,
    uint256 requiredVisits
) external
```

**要件:**
- ✅ ショップ情報を更新できること
- ✅ オーナーまたはショップオーナーが実行可能
- ✅ ShopUpdatedイベントを発火すること

#### 2.3 activateShop / deactivateShop関数
```solidity
function activateShop(uint256 shopId) external onlyOwner
function deactivateShop(uint256 shopId) external onlyOwner
```

**要件:**
- ✅ ショップの有効/無効を切り替えられること
- ✅ オーナーのみ実行可能

---

### 3. 閲覧系機能

#### 3.1 balanceOfShop関数
```solidity
function balanceOfShop(address user, uint256 shopId) external view returns (uint256)
```

**要件:**
- ✅ ユーザーの特定ショップにおけるSBT保有数を取得できること

#### 3.2 getShopInfo関数
```solidity
function getShopInfo(uint256 shopId) external view returns (ShopInfo memory)
```

**要件:**
- ✅ ショップ情報を取得できること
- ✅ ShopInfo構造体を返すこと

#### 3.3 totalSupplyOfShop関数
```solidity
function totalSupplyOfShop(uint256 shopId) external view returns (uint256)
```

**要件:**
- ✅ ショップごとの発行済みSBT総数を取得できること

#### 3.4 isActiveShop関数
```solidity
function isActiveShop(uint256 shopId) external view returns (bool)
```

**要件:**
- ✅ ショップがアクティブかどうかを確認できること

---

### 4. Soulbound機能（譲渡禁止）

#### 4.1 転送禁止
**要件:**
- ✅ mint（from == 0）とburn（to == 0）以外の転送が禁止されていること
- ✅ `_update`関数で転送を検知して`revert`すること

#### 4.2 approve禁止
**要件:**
- ✅ `approve`関数が`revert`すること
- ✅ `setApprovalForAll`関数が`revert`すること
- ✅ `getApproved`が常に`address(0)`を返すこと
- ✅ `isApprovedForAll`が常に`false`を返すこと

---

### 5. イベント

#### 5.1 SBTMintedイベント
```solidity
event SBTMinted(
    address indexed to,
    uint256 indexed tokenId,
    uint256 indexed shopId,
    string tokenURI
)
```

**要件:**
- ✅ SBT発行時に正しいパラメータで発火すること

#### 5.2 ShopRegisteredイベント
```solidity
event ShopRegistered(
    uint256 indexed shopId,
    string name,
    address indexed owner
)
```

**要件:**
- ✅ ショップ登録時に発火すること

#### 5.3 ShopUpdatedイベント
```solidity
event ShopUpdated(
    uint256 indexed shopId,
    string name,
    uint256 requiredVisits
)
```

**要件:**
- ✅ ショップ更新時に発火すること

---

## 🔧 デプロイ前チェック手順

### ステップ1: コントラクトコードの確認
```bash
# contracts/contracts/JpycStampSBT.sol を確認
# 上記の全ての関数が実装されていることを確認
```

### ステップ2: ABIの生成と確認
```bash
cd contracts
npx hardhat compile

# ABIの確認
node -e "
const abi = require('./artifacts/contracts/JpycStampSBT.sol/JpycStampSBT.json').abi;
const mintSBT = abi.find(f => f.name === 'mintSBT' && f.type === 'function');
console.log('mintSBT outputs:', JSON.stringify(mintSBT.outputs, null, 2));
"
```

**期待される出力:**
```json
[
  {
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
  }
]
```

### ステップ3: フロントエンドのABI更新
```bash
# コンパイル後のABIをフロントエンドにコピー
# src/config/contracts.ts の JPYC_STAMP_SBT_ABI を更新
```

### ステップ4: テストネットでの動作確認
```bash
# Polygon Amoyにデプロイ（テスト環境）
npx hardhat run scripts/deploy-testnet.js --network amoy

# ⬇ デプロイ成功後、テストネット用のアドレスが発行される
# 例: 0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E

# contracts.ts を更新（テストネット用）
# SBT_CONTRACT_ADDRESS[80002] = '0x6b39...'

# 全ての機能が動作することを確認:
# 1. ショップ登録
# 2. SBT発行（単発）
# 3. SBT一括発行
# 4. balanceOfShop確認
# 5. getShopInfo確認
```

### ステップ5: 本番デプロイ（新しいアドレスが発行される）
```bash
# テストネットで全機能が動作確認できたら本番デプロイ
npx hardhat run scripts/deploy-mainnet.js --network polygon

# ⬇ デプロイ成功後、**本番環境用の新しいアドレス**が発行される
# 例: 0x1234abcd... （テストネットとは異なるアドレス）

# contracts.ts を更新（本番環境用）
# SBT_CONTRACT_ADDRESS[137] = '0x1234abcd...'
```

**重要:** テストネットのアドレス（80002）と本番のアドレス（137）は**必ず異なります**。

---

## 🚨 過去の問題事例

### 問題1: mintSBT関数の戻り値がない
**発生日:** 2025年1月20日
**症状:** Amoyテストネットでは動作したが、Polygon Mainnetでエラー
**原因:** コントラクトの`mintSBT`関数に`returns (uint256)`が定義されていなかった
**解決:** コントラクトを修正して再デプロイ

**教訓:**
- ✅ テストネットと本番環境のコントラクト**ソースコード（.solファイル）**は完全に同一であること
- ✅ 各ネットワークには別々にデプロイし、**異なるアドレス**が発行される
- ✅ デプロイ前にABIを確認すること
- ✅ 戻り値の型が正しく定義されていることを確認すること

### 補足: ネットワークとアドレスの関係
```typescript
// src/config/contracts.ts の例
export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // 本番環境（別ネットワーク = 別アドレス）
  137: '0x新しいアドレス_本番デプロイ時に発行される',
  
  // テスト環境（別ネットワーク = 別アドレス）
  80002: '0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E',
};
```

**同じ `.sol` ファイルを使うが、デプロイ先が違うため、アドレスも異なる。**

---

## 📝 デプロイ時のチェックシート

デプロイ担当者は以下を確認してください:

### テストネットデプロイ前:
- [ ] `JpycStampSBT.sol`に全ての必須関数が実装されている
- [ ] `mintSBT`関数が`returns (uint256 tokenId)`を持っている
- [ ] コントラクトをコンパイルしてABIを生成した
- [ ] ABIの`mintSBT`関数に`outputs`配列があることを確認した
- [ ] フロントエンドの`contracts.ts`のABIを最新版に更新した

### テストネットデプロイ後:
- [ ] Polygon Amoy (80002) にデプロイ成功
- [ ] 発行されたテストネット用アドレスを`contracts.ts`の`SBT_CONTRACT_ADDRESS[80002]`に設定
- [ ] テストネットで全機能の動作確認をした（ショップ登録、SBT発行など）

### 本番デプロイ前:
- [ ] テストネットで全機能が正常に動作することを確認済み
- [ ] 同じ`.sol`ファイルを使用することを確認
- [ ] 本番用のウォレットに十分なPOL/MATICがあることを確認

### 本番デプロイ後:
- [ ] Polygon Mainnet (137) にデプロイ成功
- [ ] **発行された本番用アドレスを`contracts.ts`の`SBT_CONTRACT_ADDRESS[137]`に設定**
- [ ] **テストネットのアドレスと本番のアドレスが異なることを確認**
- [ ] 本番環境でSBT発行のテストを実施した

---

## 🔗 関連ドキュメント

- [デプロイガイド](./MAINNET_DEPLOYMENT_GUIDE.md)
- [SBT発行ガイド](./docs/SBT_ISSUANCE_GUIDE.md)
- [コントラクト仕様](./contracts/contracts/JpycStampSBT.sol)

---

## 📞 問題発生時の対応

問題が発生した場合は、以下を確認してください:

1. **ABIの確認**: `contracts.ts`のABIが最新のコンパイル結果と一致しているか
2. **コントラクトアドレス**: 正しいネットワークの正しいアドレスを使用しているか
3. **関数シグネチャ**: 呼び出している関数名とパラメータが正しいか
4. **戻り値の型**: フロントエンドが期待する戻り値の型とコントラクトの定義が一致しているか

---

## 更新履歴

- **2025/01/20**: 初版作成 - mintSBT戻り値問題を受けて要件を文書化
