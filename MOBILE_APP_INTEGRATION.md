# スマホアプリ統合ガイド

## 📱 概要

このドキュメントは、SBT-JPYC-Pay ショップアプリと連携するスマホ支払いアプリの実装ガイドです。
スマホアプリは以下の機能を提供します：
- QRコード決済読み込み
- JPYC（安定資産ステーブルコイン）の送金
- SBT（ソウルバウンドトークン）の受取
- 決済履歴管理

---

## 🏗️ アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│                    ショップ側（Web）                    │
│  - QRコード生成 (QRPayment.tsx)                      │
│  - SBT・テンプレート管理                               │
│  - 統計・配布状況表示                                  │
└─────────────────────────────────────────────────────┘
                           ↕️ QRコード
┌─────────────────────────────────────────────────────┐
│                   スマホアプリ（モバイル）               │
│  - QRコード読み込み                                   │
│  - 決済実行（MetaMask/Web3Modal連携）                 │
│  - 受け取ったSBT表示                                  │
│  - 決済履歴表示                                       │
└─────────────────────────────────────────────────────┘
                           ↕️ ブロックチェーン
┌─────────────────────────────────────────────────────┐
│              ブロックチェーンネットワーク（Polygon等）    │
│  - JPYC スマートコントラクト（ERC-20）                 │
│  - SBT スマートコントラクト（カスタム）                  │
└─────────────────────────────────────────────────────┘
```

---

## 📊 QRコード仕様

### QRコード生成（ショップ側）

**ファイル位置**: `src/pages/QRPayment.tsx`

#### 生成フロー
```typescript
// QRペイメント情報構造
interface PaymentQRData {
  id: string;                      // セッションID
  shopName: string;                // ショップ名
  amount: number;                  // 支払い金額（JPYC）
  description: string;             // 支払い説明
  recipientAddress: string;        // ショップのウォレット
  chainId: number;                 // ⭐ ネットワーク ID
  jpycContractAddress: string;     // ⭐ JPYC コントラクト
  sbtTemplates?: Array<{           // オプション：自動SBT発行
    templateId: string;
    name: string;
  }>;
  timestamp: number;               // タイムスタンプ
}
```

#### 現在の実装
```javascript
const generateQRData = () => {
  const data = {
    id: `session-${Date.now()}`,
    shopName: shopName,
    amount: parseFloat(amount),
    description: description,
    recipientAddress: walletAddress || '',
    chainId: 137,  // Polygon Mainnet
    jpycContractAddress: '0x6AE7Dfc73E0dDE900d3200647D263F27C7e0dd5c',
    timestamp: Date.now(),
  };
  return JSON.stringify(data);
};

const qrCodeUrl = `https://qr.example.com/?data=${encodeURIComponent(data)}`;
```

### ⭐ ネットワーク情報の含有

✅ **YES - QRコード内に含まれます**

QRコードには以下の情報が含まれています：

| 情報 | キー | 例 | 用途 |
|-----|------|-----|------|
| **ネットワークID** | `chainId` | `137` | チェーン自動選択 |
| **JPYCコントラクト** | `jpycContractAddress` | `0x6AE7D...` | トークン識別 |
| **ショップウォレット** | `recipientAddress` | `0x1234...` | 受取先アドレス |
| **金額** | `amount` | `100` | 送金額 |

---

## 🔗 ネットワーク自動設定

### スマホ側の実装パターン

```typescript
// QRコード読み込み後
async function processQRData(qrData: PaymentQRData) {
  try {
    // 1️⃣ QRから取得したネットワークID
    const targetChainId = qrData.chainId;  // 137 (Polygon)

    // 2️⃣ 現在のウォレットが接続しているネットワーク
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = network.chainId;

    // 3️⃣ ネットワーク切り替えが必要かチェック
    if (Number(currentChainId) !== targetChainId) {
      await switchNetwork(targetChainId);
    }

    // 4️⃣ JPYC 送金実行
    await executePayment(qrData);

  } catch (error) {
    console.error('決済処理エラー:', error);
  }
}

// ネットワーク自動切り替え
async function switchNetwork(chainId: number) {
  const chainHexId = '0x' + chainId.toString(16);
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHexId }],
    });
  } catch (error: any) {
    // ネットワークが追加されていない場合
    if (error.code === 4902) {
      await addNetwork(chainId);
    }
  }
}

// ネットワーク追加
async function addNetwork(chainId: number) {
  const networks: Record<number, any> = {
    137: {
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      rpcUrls: ['https://polygon-rpc.com/'],
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorerUrls: ['https://polygonscan.com/'],
    },
    80002: {
      chainId: '0x13882',
      chainName: 'Polygon Amoy Testnet',
      rpcUrls: ['https://rpc-amoy.polygon.technology/'],
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      blockExplorerUrls: ['https://amoy.polygonscan.com/'],
    },
  };

  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [networks[chainId]],
  });
}
```

---

## 💰 JPYC 送金実装

### コントラクト情報

```typescript
// JPYC (ERC-20)
interface JPYCContract {
  contractAddress: string;
  network: string;
  symbol: string;
  decimals: 18;
}

const JPYC_CONFIGS = {
  137: {  // Polygon Mainnet
    address: '0x6AE7Dfc73E0dDE900d3200647D263F27C7e0dd5c',
    rpcUrl: 'https://polygon-rpc.com/',
  },
  80002: {  // Polygon Amoy Testnet (推奨：テスト用)
    address: '0x...',  // テストネット JPYC アドレス
    rpcUrl: 'https://rpc-amoy.polygon.technology/',
  },
};
```

### 送金フロー

```typescript
async function executePayment(qrData: PaymentQRData) {
  // 1️⃣ ERC-20 コントラクトインスタンス作成
  const erc20ABI = [
    'function transfer(address to, uint256 amount) public returns (bool)',
    'function approve(address spender, uint256 amount) public returns (bool)',
  ];

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const contract = new ethers.Contract(
    qrData.jpycContractAddress,
    erc20ABI,
    signer
  );

  // 2️⃣ 金額をWei単位に変換（小数点18位）
  const amountWei = ethers.parseUnits(qrData.amount.toString(), 18);

  // 3️⃣ Transfer 実行
  const tx = await contract.transfer(
    qrData.recipientAddress,
    amountWei
  );

  // 4️⃣ トランザクション完了待機
  const receipt = await tx.wait();

  // 5️⃣ 成功時、決済情報を保存
  savePaymentRecord({
    sessionId: qrData.id,
    amount: qrData.amount,
    recipient: qrData.recipientAddress,
    transactionHash: receipt.transactionHash,
    chainId: qrData.chainId,
    timestamp: Date.now(),
  });

  return receipt.transactionHash;
}
```

---

## 🎯 SBT 受取処理

### イベントリスナー

```typescript
// ショップ側: SBT発行後、スマホに通知（オプション）
async function notifyMobileApp(paymentSessionId: string, sbtInfo: any) {
  // Firebase Cloud Messaging または WebSocket で通知
  await fetch('/api/notify-payment', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: paymentSessionId,
      sbtReceived: {
        templateName: sbtInfo.name,
        transactionHash: sbtInfo.transactionHash,
      },
    }),
  });
}
```

### スマホ側: SBT表示

```typescript
// スマホのローカルストレージから SBT 一覧を読み込み
async function loadReceivedSBTs() {
  const sbts = await getFromLocalStorage('receivedSBTs');
  
  return sbts.map(sbt => ({
    id: sbt.id,
    name: sbt.templateName,
    image: sbt.imageUrl,
    status: sbt.status,  // 'active' | 'redeemed'
    createdAt: sbt.issuedAt,
  }));
}
```

---

## 📋 決済履歴管理

### ショップ側での記録

**ファイル位置**: `src/pages/QRPayment.tsx`

```typescript
// localStorage に保存
interface CompletedPaymentSession {
  id: string;
  sessionId: string;
  payerAddress: string;
  shopName: string;
  amount: number;
  transactionHash: string;
  chainId: number;
  completedAt: string;  // ISO 8601
  sbtTemplates?: string[];  // 発行したSBT Template IDs
}

const savePaymentSession = (session: CompletedPaymentSession) => {
  const sessions = JSON.parse(
    localStorage.getItem('completedPaymentSessions') || '[]'
  );
  sessions.push(session);
  localStorage.setItem(
    'completedPaymentSessions',
    JSON.stringify(sessions)
  );
};
```

### スマホ側での記録

```typescript
// スマホ: 支払い履歴を保存
interface PaymentHistory {
  id: string;
  shopName: string;
  amount: number;
  currency: string;  // 'JPYC'
  transactionHash: string;
  chainId: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  sbtReceived?: {
    templateId: string;
    name: string;
  }[];
}

const savePaymentHistory = (payment: PaymentHistory) => {
  const history = JSON.parse(
    localStorage.getItem('paymentHistory') || '[]'
  );
  history.push(payment);
  localStorage.setItem('paymentHistory', JSON.stringify(history));
};
```

---

## 🔐 セキュリティ考慮事項

### 1. QRコード検証

```typescript
// スマホ側: QRコード受け取り時の検証
function validateQRData(data: PaymentQRData): boolean {
  const checks = [
    // ネットワークID チェック
    [137, 80002].includes(data.chainId),
    // アドレス形式チェック
    ethers.isAddress(data.recipientAddress),
    ethers.isAddress(data.jpycContractAddress),
    // 金額チェック
    data.amount > 0 && data.amount < 1000000,
    // タイムスタンプチェック（5分以内）
    Date.now() - data.timestamp < 5 * 60 * 1000,
  ];
  
  return checks.every(check => check === true);
}
```

### 2. トランザクション確認

```typescript
// ユーザーが実行する前に必ず確認ダイアログを表示
async function confirmPayment(qrData: PaymentQRData) {
  const confirm = await showConfirmDialog({
    title: '支払い確認',
    message: `
      ショップ: ${qrData.shopName}
      金額: ${qrData.amount} JPYC
      ネットワーク: Polygon
      
      この内容で支払いますか？
    `,
  });
  
  return confirm;
}
```

### 3. オフライン対応

```typescript
// インターネット接続がない場合のフォールバック
const fallbackNetworks = {
  137: {
    rpcUrl: 'https://polygon-rpc.com/',
    fallbackRpc: 'https://1rpc.io/matic',
  },
};
```

---

## 📡 データ同期フロー

### ショップ → スマホ

```
QRコード生成（ショップ）
    ↓
QRコード表示
    ↓
QRスキャン（スマホ）
    ↓
QRコード情報解析
    ↓
ネットワーク自動設定 ⭐
    ↓
支払い確認ダイアログ表示
    ↓
JPYC 送金実行
    ↓
トランザクション確認
    ↓
SBT受取（自動）
    ↓
ローカルストレージに記録
```

### ショップ ← スマホ

```
完了した支払いセッション
    ↓
localStorage に保存
    ↓
次回QRペイメント画面を開くと
    ↓
"完了した支払い一覧"に表示
```

---

## 🧪 テストネット対応

### Polygon Amoy テストネット設定

```typescript
const TESTNET_CONFIG = {
  chainId: 80002,
  chainName: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  
  // テスト用コントラクト
  jpycTestAddress: '0x...', // テスト JPYC
  
  // テスト用Faucet
  maticFaucet: 'https://faucet.polygon.technology/',
  jpycFaucet: 'https://amoy-faucet.polygon.technology/',
};
```

### テストフロー

1. **MetaMask に Amoy テストネット追加**
2. **Faucet から MATIC と JPYC 取得**
3. **QR生成時に `chainId: 80002` を使用**
4. **スマホアプリで QR読み込み**
5. **自動ネットワーク切り替え検証**

---

## 📦 スマホアプリ実装チェックリスト

### 必須機能

- [ ] QRコードスキャン（react-qr-reader 推奨）
- [ ] QRコードデータ解析
- [ ] ネットワーク自動設定 ⭐
- [ ] MetaMask/Web3Modal 連携
- [ ] JPYC Transfer 実行
- [ ] トランザクション待機
- [ ] 決済履歴保存（localStorage）

### 推奨機能

- [ ] SBT一覧表示
- [ ] 決済履歴フィルター
- [ ] トランザクションハッシュ表示（PolygonScan リンク）
- [ ] オフラインインジケーター
- [ ] エラーハンドリング表示

### テスト項目

- [ ] ネットワーク自動切り替え
- [ ] QRコード無効時のエラー処理
- [ ] インターネット接続なし時の動作
- [ ] ウォレット接続なし時のエラー
- [ ] ガス不足時のエラー処理

---

## 🚀 デプロイメント

### ショップアプリ（Web）

```bash
# 本番ビルド
npm run build

# PWA として配布
# - `dist/` をサーバーにアップロード
# - HTTPS 必須
# - manifest.json が含まれていることを確認
```

### スマホアプリ

```bash
# iOS（React Native / Flutter）
npm run build:ios

# Android（React Native / Flutter）
npm run build:android

# Web-based PWA as mobile app
# - `http://localhost:3000/` を PWA インストール
```

---

## 📞 トラブルシューティング

### ネットワーク切り替えができない

```typescript
// 原因: MetaMask が Polygon Amoy を知らない
// 解決: wallet_addEthereumChain を実行

await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x13882',  // Amoy チェーンID
    chainName: 'Polygon Amoy Testnet',
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['https://amoy.polygonscan.com/'],
  }],
});
```

### トランザクション失敗

```typescript
// 原因1: ガス不足
// → MATIC 残高を確認

// 原因2: JPYC 残高不足
// → JPYC 残高を確認 (ERC-20 balance)

// 原因3: Approve が必要
// → 初回のみ contract.approve() を実行
```

---

## 📚 参考ファイル

| ファイル | 用途 | 参照項目 |
|---------|------|---------|
| `src/pages/QRPayment.tsx` | QRコード生成 | `generateQRData()` 関数 |
| `src/pages/SBTManagement.tsx` | SBT管理 | テンプレート構造 |
| `src/utils/storage.ts` | ローカルストレージ | IndexedDB 操作 |
| `src/context/WalletContext.tsx` | ウォレット管理 | ウォレット接続 |
| `PWA_GUIDE.md` | PWA 設定 | Service Worker |

---

## 🎯 次のステップ

1. **スマホアプリ リポジトリ作成**
   - 別リポジトリとして新規作成
   - このドキュメントを参照

2. **テストネット検証**
   - Polygon Amoy で全機能テスト
   - ネットワーク自動切り替え確認

3. **本番環境デプロイ**
   - Polygon Mainnet 設定
   - HTTPS サーバー配置
   - PWA インストール確認

---

**作成日**: 2025-11-14  
**対象バージョン**: SBT-JPYC-Pay v1.0.0  
**最終更新**: 2025-11-14
