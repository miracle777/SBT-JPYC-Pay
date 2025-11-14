# 🔗 トランザクション検証ガイド

**完全な決済フロー検証マニュアル**

本ドキュメントは、JPYC 決済と SBT 発行のトランザクションを検証するための完全ガイドです。

---

## 📊 全体フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                    SBT-JPYC-Pay アプリケーション                  │
│                      （PWA: デスクトップ/モバイル）               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
           ┌────────────────────────────────────┐
           │    1️⃣ JPYC 決済トランザクション      │
           │  （ERC-20 トークン転送）             │
           └────────────────────────────────────┘
                            ↓
              【ユーザーがMetaMask で承認】
                            ↓
           ┌────────────────────────────────────┐
           │   Polygon ブロックチェーン            │
           │   JPYC 転送完了（TxHash 記録）       │
           └────────────────────────────────────┘
                            ↓
           ┌────────────────────────────────────┐
           │    2️⃣ SBT 発行トランザクション       │
           │  （ERC-721 mint）                   │
           └────────────────────────────────────┘
                            ↓
              【ユーザーがMetaMask で承認】
                            ↓
           ┌────────────────────────────────────┐
           │   Polygon ブロックチェーン            │
           │   SBT mint 完了（TxHash 記録）       │
           └────────────────────────────────────┘
                            ↓
           ┌────────────────────────────────────┐
           │  アプリ内に両トランザクション記録      │
           │  IndexedDB + localStorage に保存    │
           └────────────────────────────────────┘
                            ↓
           ┌────────────────────────────────────┐
           │  Polygonscan で外部検証可能          │
           │  トランザクションハッシュをクリック   │
           └────────────────────────────────────┘
```

---

## 1️⃣ JPYC 決済トランザクション

### 📍 概要

**ユーザーが QR コードをスキャンして JPYC を送金するトランザクション**

- **タイプ**: ERC-20 トークン転送（transfer）
- **トークン**: JPYC（Japanese Yen Coin）
- **チェーン**: Polygon Mainnet (137) / Polygon Amoy Testnet (80002)
- **自動検知**: ✅ アプリが 5 秒ごとに監視

### 🔍 トランザクション詳細

```
┌─────────────────────────────────────────┐
│        JPYC 決済トランザクション         │
├─────────────────────────────────────────┤
│                                         │
│ From:        ユーザーウォレット         │
│ To:          ショップ受取ウォレット     │
│ Value:       JPYC 金額                 │
│ Token:       0x6AE7Dfc...（JPYC）      │
│ Function:    transfer()                │
│ Gas:         標準的な ERC-20 転送       │
│ Status:      ✓ Success                 │
│                                         │
└─────────────────────────────────────────┘
```

### 📝 実装詳細（アプリ側）

**ファイル**: `src/pages/QRPayment.tsx`

```typescript
// トランザクション監視（5秒ごと）
useEffect(() => {
  const monitorTransactions = async () => {
    // pending セッションを抽出
    const pendingSessions = paymentSessions.filter(
      (s) => s.status === 'pending' && !s.transactionHash
    );

    if (pendingSessions.length === 0) return;

    // 現在のブロック番号を取得
    const provider = new BrowserProvider(window.ethereum);
    const latestBlockNumber = await provider.getBlockNumber();

    // 過去 100 ブロックを検索
    const searchFromBlock = Math.max(0, latestBlockNumber - 100);

    // ショップウォレットへの JPYC 転送を検索
    // From: ユーザーウォレット
    // To: ショップウォレット
    // Function: transfer()

    // トランザクションハッシュを抽出
    // → PaymentSession に記録
    // → SBT 発行時に参照
  };

  const interval = setInterval(monitorTransactions, 5000);
  return () => clearInterval(interval);
}, [paymentSessions]);
```

### 🧮 データ構造

```typescript
interface PaymentSession {
  id: string;                    // セッション ID
  amount: number;                // JPYC 金額
  currency: string;              // "JPYC"
  chainId: number;               // 137 or 80002
  chainName: string;             // "Polygon" など
  qrCodeData: string;            // QR コード内の JSON
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;             // ISO8601
  expiresAt: string;             // ISO8601
  expiresAtTimestamp: number;    // Unix timestamp
  transactionHash?: string;      // ✅ 決済 Tx ハッシュ
  detectedAt?: string;           // 検知時刻
  payerAddress?: string;         // 支払者ウォレット（SBT 配布先）
}
```

### ✅ 確認方法

#### **方法 1: アプリ内で確認**

```
1. 「QR 決済」ページを開く
2. 「支払い中のセッション」セクション
3. ステータスが「✓ 完了」に変わる
4. トランザクションハッシュが表示される
```

#### **方法 2: MetaMask で確認**

```
1. MetaMask ウォレットアイコンをクリック
2. 「アクティビティ」タブを開く
3. JPYC 送金トランザクションを検索
4. Status: "✓ Success" を確認
```

#### **方法 3: Polygonscan で確認（外部検証）**

```
【Mainnet】
https://polygonscan.com/tx/{transactionHash}

【Testnet (Amoy)】
https://amoy.polygonscan.com/tx/{transactionHash}

確認項目:
✅ From: ユーザーウォレット
✅ To: ショップウォレット
✅ Value: 送金額（Wei 単位）
✅ Token: JPYC
✅ Function: transfer
✅ Status: Success ✓
✅ Gas Used: トランザクション実行コスト
✅ Timestamp: 処理日時
```

---

## 2️⃣ SBT 発行トランザクション（⭐ NEW）

### 📍 概要

**ユーザーのウォレットに SBT をブロックチェーンに記録するトランザクション**

- **タイプ**: ERC-721 mint（NFT 生成）
- **コントラクト**: JpycStampSBT.sol
- **チェーン**: Polygon Mainnet (137) / Polygon Amoy Testnet (80002)
- **記録方式**: ✅ ブロックチェーンに永続記録（消えない）

### 🔍 トランザクション詳細

```
┌──────────────────────────────────────┐
│      SBT 発行トランザクション         │
├──────────────────────────────────────┤
│                                      │
│ From:       ショップ（管理者）        │
│ To:         SBT コントラクト         │
│ Function:   mintSBT()               │
│ Parameters:                          │
│   - to: ユーザーウォレット           │
│   - shopId: 1（ショップID）          │
│   - tokenURI: ipfs://...（メタ）     │
│                                      │
│ Output:     tokenId（SBT ID）        │
│ Status:     ✓ Success               │
│                                      │
│ Event:      SBTMinted               │
│   indexed to: ユーザーアドレス       │
│   indexed tokenId: SBT ID           │
│   indexed shopId: 1                 │
│                                      │
└──────────────────────────────────────┘
```

### 📝 実装詳細（アプリ側）

**ファイル**: `src/utils/sbtMinting.ts`

```typescript
/**
 * SBT を発行する（ブロックチェーンに記録）
 */
export async function mintSBT(params: MintSBTParams): Promise<MintSBTResult> {
  const { recipientAddress, shopId, tokenURI, chainId } = params;

  // 1. MetaMask Provider と Signer を取得
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // 2. ネットワーク確認
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(chainId)) {
    throw new Error('ネットワークが一致していません');
  }

  // 3. SBT コントラクトアドレスを取得
  const contractAddress = SBT_CONTRACT_ADDRESS[chainId];

  // 4. コントラクトインスタンスを作成
  const contract = new Contract(
    contractAddress,
    JPYC_STAMP_SBT_ABI,
    signer
  );

  // 5. SBT mint トランザクション送信
  const tx = await contract.mintSBT(
    recipientAddress,
    shopId,
    tokenURI
  );

  // 6. トランザクション完了を待機
  const receipt = await tx.wait();

  // 7. トランザクションハッシュを返却
  return {
    success: true,
    transactionHash: receipt?.transactionHash,
    tokenId: receipt?.events?.[0]?.args?.tokenId?.toString(),
  };
}
```

**ファイル**: `src/pages/SBTManagement.tsx`

```typescript
// SBT 発行フロー
const issueSBT = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. テンプレート取得
  const template = templates.find(t => t.id === newIssuance.templateId);

  // 2. UI に pending 状態で一度表示
  const sbt: IssuedSBT = {
    id: `sbt-${Date.now()}`,
    templateId: template.id,
    templateName: template.name,
    recipientAddress,
    currentStamps: 0,
    maxStamps: template.maxStamps,
    issuedAt: new Date().toISOString().split('T')[0],
    status: 'active',
    sbtMintStatus: 'pending',  // ← ブロックチェーン処理中
    chainId: currentChainId,
  };

  setIssuedSBTs([sbt, ...issuedSBTs]);

  // 3. ⭐ ブロックチェーンに mint（非同期）
  try {
    const result = await mintSBT({
      recipientAddress,
      shopId: 1,
      tokenURI: template.imageUrl,
      chainId: currentChainId,
    });

    if (result.success && result.transactionHash) {
      // ✅ mint 成功
      sbt.sbtTransactionHash = result.transactionHash;
      sbt.sbtMintStatus = 'success';
      
      // IndexedDB に保存
      await sbtStorage.saveSBT(sbt);

      // UI 更新
      setIssuedSBTs(prev =>
        prev.map(s => (s.id === sbt.id ? sbt : s))
      );

      toast.success(`✅ SBT をブロックチェーンに記録しました！`);
    } else {
      // ❌ mint 失敗
      sbt.sbtMintStatus = 'failed';
      toast.error(`❌ SBT 記録失敗: ${result.error}`);
    }
  } catch (error) {
    sbt.sbtMintStatus = 'failed';
    toast.error(`SBT 記録エラー: ${error.message}`);
  }
};
```

### 🧮 データ構造

```typescript
interface IssuedSBT {
  id: string;                        // アプリ内 ID
  templateId: string;                // テンプレート ID
  templateName: string;              // "スタンプカード" など
  recipientAddress: string;          // SBT 受け取るウォレット
  currentStamps: number;             // 現在のスタンプ数
  maxStamps: number;                 // 最大スタンプ数
  issuedAt: string;                  // 発行日（YYYY-MM-DD）
  status: 'active' | 'redeemed';     // ステータス
  sourcePaymentId?: string;          // JPYC 決済セッション ID
  transactionHash?: string;          // JPYC 決済 Tx ハッシュ
  sbtTransactionHash?: string;       // ✅ SBT mint Tx ハッシュ
  sbtMintStatus?: 'pending' | 'success' | 'failed';  // mint ステータス
  chainId?: number;                  // ブロックチェーン ID
}
```

### ✅ 確認方法

#### **方法 1: アプリ内で確認**

```
1. 「SBT 管理」ページを開く
2. 「発行されたSBT一覧」セクション
3. SBT カードの「🎖️ SBT Mint トランザクション」欄
4. ステータス確認:
   ✅ 記録完了 → Tx ハッシュ表示
   ⏳ 処理中 → ローディング
   ❌ 失敗 → エラーメッセージ
```

#### **方法 2: SBTCard コンポーネント**

**ファイル**: `src/components/SBTCard.tsx`

```typescript
// SBT カード表示
<div className="rounded-lg p-3 border border-green-200">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-medium">🎖️ SBT Mint トランザクション</span>
    <span className="text-xs font-semibold px-2 py-1 rounded">
      ✅ 記録完了
    </span>
  </div>

  {/* トランザクションハッシュをクリック */}
  <a
    href={getBlockExplorerUrl(sbt.sbtTransactionHash, sbt.chainId || 137)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-blue-600 hover:text-blue-800 font-mono flex items-center gap-2"
  >
    {sbt.sbtTransactionHash}
    <ExternalLink className="w-3 h-3" />
  </a>

  <p className="text-xs text-gray-600 mt-2">
    ネットワーク: {network.displayName}
  </p>
</div>
```

#### **方法 3: Polygonscan で確認（外部検証）**

```
【Mainnet】
https://polygonscan.com/tx/{sbtTransactionHash}

【Testnet (Amoy)】
https://amoy.polygonscan.com/tx/{sbtTransactionHash}

確認項目:
✅ From: ショップウォレット（または App ウォレット）
✅ To: SBT コントラクトアドレス
✅ Function: mintSBT
✅ Input Data:
   - to: ユーザーアドレス
   - shopId: 1
   - tokenURI: ipfs://...
✅ Status: Success ✓
✅ Gas Used: 実際に消費したガス
✅ Logs:
   - Event: SBTMinted
   - indexed to: ユーザーアドレス
   - indexed tokenId: NFT ID
   - indexed shopId: 1
```

---

## 🔗 両トランザクションの関連付け

### 📋 データフロー

```
【QR 決済セッション】
┌─────────────────────────────────┐
│ id: "session-1731..."           │
│ amount: 1000 JPYC              │
│ payerAddress: 0x123...         │
│ transactionHash: 0xabc...      │  ← 決済 Tx
└─────────────────────────────────┘
            ↓
      【SBT 自動発行】
            ↓
┌─────────────────────────────────┐
│ id: "sbt-1731..."               │
│ recipientAddress: 0x123...      │  ← 支払者が受け取る
│ sourcePaymentId: "session-..."  │  ← 決済セッションと紐付け
│ transactionHash: 0xabc...       │  ← 決済 Tx
│ sbtTransactionHash: 0xdef...    │  ← SBT mint Tx
└─────────────────────────────────┘
```

### 🔍 確認方法

```
1. SBT 発行履歴で「💳 決済トランザクション」をクリック
   → Polygonscan で JPYC 転送を確認

2. 同じ SBT カードで「🎖️ SBT Mint トランザクション」をクリック
   → Polygonscan で SBT mint を確認

3. 両トランザクションの「From」アドレスが同じユーザー
   → 同じ決済から発行されたことが証明される
```

---

## 💡 テストネットでの検証手順

### ✅ 前提条件

```
1. MetaMask インストール済み
2. Polygon Amoy Testnet に接続
3. Amoy テスト MATIC 保有（ガス代用）
4. SBT コントラクトがデプロイ済み
5. SBT_CONTRACT_ADDRESS が設定済み
```

### 📝 ステップバイステップ

#### **ステップ 1: SBT テンプレート作成**

```
1. アプリを開く
2. 「SBT 管理」ページ → 「テンプレート作成」
3. テンプレート情報を入力
   - 名前: "テスト SBT"
   - 説明: "テスト用"
   - 最大スタンプ: 10
   - 画像: JPEG をアップロード
4. 「作成」ボタンをクリック
5. テンプレートが一覧に追加される
```

#### **ステップ 2: SBT 手動発行**

```
1. 「SBT 管理」ページ
2. 「新規発行」ボタンをクリック
3. テンプレートを選択
4. 「発行」ボタンをクリック
   ↓
   MetaMask ポップアップ表示
   ├─ Function: mintSBT
   ├─ To: ユーザーアドレス
   ├─ shopId: 1
   └─ Gas 見積もり
5. 「確認」ボタンをクリック
   ↓
   トランザクション送信
6. UI に「🔄 SBT をブロックチェーンに記録中...」表示
7. ブロック確認後「✅ SBT をブロックチェーンに記録しました！」表示
8. トランザクションハッシュが表示される
```

#### **ステップ 3: Polygonscan で確認**

```
1. SBT カードの「🎖️ SBT Mint トランザクション」をクリック
   ↓
   Polygonscan が別タブで開く
   
2. Polygonscan で確認する項目:
   ✅ Status: Success ✓
   ✅ From: 表示されるアドレス
   ✅ To: SBT コントラクトアドレス
   ✅ Input Data:
      - Function Selector: 0xa...（mintSBT）
      - to: ユーザーアドレス
      - shopId: 1
      - tokenURI: base64 データ
   ✅ Logs:
      - Event Name: SBTMinted
      - to: ユーザーアドレス
      - tokenId: SBT ID
      - shopId: 1

3. MetaMask でも確認
   ウォレット → アクティビティ → トランザクション詳細
```

---

## 🎯 トランザクション検証チェックリスト

### JPYC 決済トランザクション

```
☐ アプリで検出
  ├─ ステータスが「✓ 完了」に変わる
  ├─ トランザクションハッシュが表示される
  └─ 支払者アドレスが抽出される

☐ MetaMask で確認
  ├─ アクティビティに表示される
  ├─ Status: Success ✓
  └─ JPYC 送金額が正しい

☐ Polygonscan で確認
  ├─ From: ユーザーウォレット
  ├─ To: ショップ受取ウォレット
  ├─ Function: transfer (ERC-20)
  ├─ Status: Success ✓
  └─ ブロック確認完了
```

### SBT 発行トランザクション

```
☐ アプリで検出
  ├─ SBT カード作成
  ├─ 「🎖️ SBT Mint トランザクション」欄にハッシュ表示
  ├─ ステータス: ✅ 記録完了
  └─ IndexedDB に保存

☐ MetaMask で確認
  ├─ アクティビティに表示される
  ├─ Status: Success ✓
  └─ SBT コントラクト操作

☐ Polygonscan で確認
  ├─ From: ショップウォレット
  ├─ To: SBT コントラクト
  ├─ Function: mintSBT
  ├─ Input Parameters 確認
  │  ├─ to: ユーザーアドレス
  │  ├─ shopId: 1
  │  └─ tokenURI: 正しい形式
  ├─ Status: Success ✓
  └─ Logs:
     └─ SBTMinted イベント発火
        ├─ to: ユーザーアドレス
        ├─ tokenId: 有効な ID
        └─ shopId: 1
```

---

## 🔐 セキュリティ・検証ポイント

### トランザクションハッシュの検証

```
✅ トランザクションハッシュの形式
   ├─ 0x で始まる
   ├─ 64 文字の 16 進数
   └─ 例: 0xabc123def456...

✅ 記録位置の多重性
   ├─ アプリ内: IndexedDB + localStorage
   ├─ ブロックチェーン: Polygon ノード
   └─ エクスプローラー: Polygonscan
```

### 不変性の確認

```
ブロックチェーンに記録されたら：
✅ 削除不可能
✅ 改ざん不可能
✅ 永遠に追跡可能
✅ 公開検証可能

Polygonscan が示すトランザクションは
ブロックチェーンの事実を反映しています
```

---

## 📚 参考資料

### Polygonscan

- **Mainnet**: https://polygonscan.com/
- **Testnet (Amoy)**: https://amoy.polygonscan.com/

### ERC-20 / ERC-721 仕様

- JPYC (ERC-20): https://polygonscan.com/token/0x6AE7Dfc73E0dDE900d3200647D263F27C7e0dd5c
- JpycStampSBT (ERC-721): デプロイ後のアドレス

### MetaMask

- 公式サイト: https://metamask.io/
- ドキュメント: https://docs.metamask.io/

### Polygon

- ドキュメント: https://polygon.technology/
- RPC エンドポイント: https://rpc-amoy.polygon.technology/

---

## 🎓 まとめ

### 実装の特徴

```
✅ 両トランザクション完全サポート
   ├─ JPYC 決済: 自動検知 + 記録
   └─ SBT 発行: ブロックチェーン記録 + 確認リンク

✅ 外部ツール不要
   ├─ 別途デプロイツール不要
   ├─ 別途管理画面不要
   └─ このアプリのみで完結

✅ 完全な検証可能性
   ├─ アプリ内で確認可能
   ├─ MetaMask で確認可能
   └─ Polygonscan で外部検証可能

✅ PWA 対応
   ├─ デスクトップ/モバイル両対応
   ├─ インストール可能
   └─ オフライン（データ参照のみ）
```

### 次のステップ

```
1. SBT コントラクトをデプロイ
2. デプロイアドレスを config に設定
3. Amoy テストネットで検証
4. Mainnet デプロイ（本番運用開始）
```

---

**作成日**: 2025年11月14日  
**バージョン**: 1.0.0  
**対応ネットワーク**: Polygon Mainnet (137) / Amoy Testnet (80002)
