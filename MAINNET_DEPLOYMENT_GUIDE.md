# 本番デプロイガイド

> **⚠️ デプロイ前の必須確認**
> 
> 本番環境にデプロイする前に、必ず [コントラクト要件チェックリスト](./CONTRACT_REQUIREMENTS.md) を確認してください。テストネットで動作した機能が本番環境でも確実に動作するよう、全ての要件を満たしていることを確認してください。

## 現在の設定状況

### ✅ JPYC Prepaid トークン（既存デプロイ済み）
- **Ethereum Mainnet (ChainID: 1)**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **Polygon Mainnet (ChainID: 137)**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **Avalanche C-Chain (ChainID: 43114)**: `0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29`
- **ステータス**: 公式デプロイ済み・決済システム連携可能

### ✅ テストネット環境（正常動作中）
- **Polygon Amoy (Chain ID: 80002)**
- **SBTコントラクトアドレス**: `0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E`
- **ステータス**: デプロイ済み・動作確認済み

### ⚠️ 本番環境（デプロイ待ち）
- **Polygon Mainnet (Chain ID: 137)**
- **SBTコントラクトアドレス**: `0x0000000000000000000000000000000000000000` (未デプロイ)
- **ステータス**: デプロイが必要

## 本番デプロイ手順

### 1. 環境準備
```bash
# .env ファイルに以下を設定
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=あなたの秘密鍵
POLYGONSCAN_API_KEY=あなたのPolygonscanAPIキー
```

### 2. アカウント残高確認
- 最低 **0.01 POL** のガス代が必要
- [Polygon Faucet](https://faucet.polygon.technology/) またはDEXで取得

### 3. コントラクトデプロイ実行
```bash
cd contracts
npx hardhat run deploy-mainnet.js --network polygon
```

### 4. デプロイ結果の設定更新
デプロイ成功後、`src/config/contracts.ts` を更新:
```typescript
export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // Mainnet
  137: '0x新しいコントラクトアドレス', // ⭐ ここを更新
  // ... 他の設定
};
```

### 5. アプリケーションの設定変更
`src/pages/SBTManagement.tsx` のデフォルトチェーンを本番に変更:
```typescript
const [selectedChainForSBT, setSelectedChainForSBT] = useState(137); // Mainnet
```

## 注意事項

### ⚠️ テスト vs 本番の違い
- **テストネット**: 無料で試験可能、実価値なし
- **本番**: 実際のPOLトークンが必要、すべての取引が実行される

### 🔐 セキュリティ考慮事項
- 秘密鍵は絶対に公開しない
- 本番デプロイ前に必ずテストネットで動作確認
- コントラクト所有者権限を適切に管理

### 💰 コスト見積もり
- デプロイ費用: 約 0.005-0.01 POL
- SBT発行費用: 約 0.001-0.003 POL/回
- ガス価格変動により変化

## トラブルシューティング

### デプロイ失敗
```bash
# ガス価格を確認
npx hardhat run scripts/check-gas.js --network polygon

# ネットワーク接続確認
npx hardhat run scripts/test-connection.js --network polygon
```

### 検証エラー
```bash
# Polygonscanでの検証
npx hardhat verify --network polygon コントラクトアドレス "所有者アドレス"
```

## 現在のアプリケーション状態
- ✅ デフォルトはテストネット（Polygon Amoy）
- ✅ 本番用コントラクトアドレスは未設定（0x000...000）
- ✅ 本番デプロイ後に設定更新が必要