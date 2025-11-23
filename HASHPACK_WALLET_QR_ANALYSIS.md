# HashPack Wallet（Hash Port Wallet） QRコード対応状況 分析レポート

**作成日**: 2025年11月23日  
**対象ウォレット**: HashPack (Hash Port Wallet)  
**問題**: EIP-681対応していない、QRコードで「ethereum」という文字が見える

## 🔍 問題の詳細

### ユーザーが遭遇している問題
- HashPack WalletでQRコードを読み取ると「アドレスが違う」とエラー表示
- QRコード内に「ethereum」という文字が見える
- EIP-681形式に対応していない可能性

### 予想される原因
1. **HashPack = Hederaネットワーク専用ウォレット**
2. **EthereumのEIP-681形式は非対応**  
3. **Hederaネットワーク独自のQRコード形式が必要**

## 🌐 HashPack Walletについて

### 基本情報
- **正式名称**: HashPack
- **対応ネットワーク**: Hedera Hashgraph（HBAR）
- **種類**: Hederaエコシステム専用ウォレット
- **開発元**: HashPack チーム
- **公式サイト**: https://www.hashpack.app/

### 対応している機能
- ✅ Hedera Native Token (HBAR) 送受信
- ✅ Hedera Token Service (HTS) トークン
- ✅ NFT (Non-Fungible Tokens)
- ✅ WalletConnect (Hedera専用)
- ✅ DeFi (SaucerSwap等)
- ❌ **Ethereum/EVM系ネットワーク非対応**

## ❌ EIP-681 非対応の理由

### 1. ネットワークの違い
```text
【現在のQRコード】 - EIP-681形式（Ethereum系）
ethereum:0x6AE7...@137/transfer?address=0x1234...&uint256=100000...

【HashPack対応】 - Hedera独自形式（推測）
hbar:0.0.12345?amount=100&memo=決済
```

### 2. 異なるアドレス形式
| ネットワーク | アドレス形式 | 例 |
|-------------|-------------|-----|
| Ethereum | 0x... (40桁hex) | 0x1234567890abcdef... |
| Hedera | 0.0.xxxxx (Account ID) | 0.0.12345 |

### 3. 異なるトークン規格
| ネットワーク | トークン規格 | 例 |
|-------------|-------------|-----|
| Ethereum | ERC-20 | JPYC (0x431D5dfF03120AFA...) |
| Hedera | HTS (Hedera Token Service) | Token ID: 0.0.456789 |

## 🔧 対応形式の調査

### Hedera対応のQRコード形式（予想）

#### 1. Hedera URI Scheme形式
```text
# HBAR送金
hbar:0.0.12345?amount=100&memo=Payment

# HTS トークン送金  
hts:0.0.456789?to=0.0.12345&amount=100
```

#### 2. WalletConnect形式
```text
# Hedera WalletConnect
wc:...@1?bridge=...&key=...（Hedera専用）
```

#### 3. HashPack独自JSON形式
```json
{
  "type": "hedera_payment",
  "network": "mainnet",
  "to": "0.0.12345",
  "amount": "100",
  "token": "0.0.456789", 
  "memo": "JPYC Payment"
}
```

## 📊 対応策の提案

### 方法1: Hedera JPYC トークンの確認
```bash
# Hedera上のJPYCトークンID確認が必要
# 現在、Hedera上にJPYCトークンが存在するか調査要
```

### 方法2: HashPackサポートに問い合わせ
- 対応QRコード形式の確認
- Ethereum系トークン送金の対応可否
- Hedera⇔Ethereum ブリッジ利用可否

### 方法3: 代替ソリューション
1. **MetaMask等のEthereumウォレット使用を推奨**
2. **Hedera⇔Ethereum ブリッジサービス利用**
3. **HashPack専用のQRコード生成機能追加**

## 🧪 テスト用QRコード生成

### EIP-681形式（現在の実装）
```typescript
// 現在のEIP-681形式（HashPackでは動かない）
const eip681Uri = `ethereum:${contractAddress}@${chainId}/transfer?address=${recipient}&uint256=${amount}`;
```

### Hedera形式（推測）
```typescript
// Hedera形式（要検証）
function generateHederaQR(params: {
  recipient: string; // 0.0.xxxxx形式  
  amount: string;
  tokenId?: string; // HTS Token ID
  memo?: string;
}): string {
  if (params.tokenId) {
    // HTS Token送金
    return `hts:${params.tokenId}?to=${params.recipient}&amount=${params.amount}&memo=${params.memo}`;
  } else {
    // HBAR送金
    return `hbar:${params.recipient}?amount=${params.amount}&memo=${params.memo}`;
  }
}
```

## 🔍 次のアクションアイテム

### 1. 緊急対応
- [x] HashPack Walletの正確な仕様調査
- [ ] HashPack公式ドキュメント確認
- [ ] サポートへの問い合わせ

### 2. 中期対応  
- [ ] Hedera上のJPYC展開状況調査
- [ ] HashPortブリッジサービス調査
- [ ] HashPack用QRコード形式実装

### 3. 長期対応
- [ ] マルチネットワーク対応
- [ ] ウォレット検出ロジック強化
- [ ] ユーザーガイド作成

## 💡 推奨対応

### 即座に可能な対応
1. **MetaMaskやTrust Walletの使用を案内**
2. **EIP-681対応ウォレットのリスト提示**  
3. **Hash Port（HashPack）は現在非対応の旨を明示**

### HashPack用の実装例
```tsx
// ウォレット検出時の分岐処理
if (isHashPackWallet(window.ethereum)) {
  toast.error(`
    ⚠️ HashPack Walletをご利用中です
    現在、HashPack WalletはEthereum系の決済に対応しておりません。
    
    📱 代替案:
    • MetaMask Walletのご利用
    • Trust Walletのご利用
    • Coinbase Walletのご利用
  `);
  return;
}
```

## 📚 参考資料

### HashPack公式
- [HashPack公式サイト](https://www.hashpack.app/)
- [HashPack Docs](https://docs.hashpack.app/)
- [GitHub: Hedera WalletConnect](https://github.com/hashgraph/hedera-wallet-connect)

### Hedera関連
- [Hedera公式ドキュメント](https://docs.hedera.com/)
- [HashPort ブリッジ](https://www.hashport.network/)
- [Hedera Token Service](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service)

### EIP-681関連
- [EIP-681仕様](https://eips.ethereum.org/EIPS/eip-681)
- [MetaMask QRコード対応](https://docs.metamask.io/)

---

**結論**: HashPack WalletはHedera専用のため、Ethereum系のEIP-681形式QRコードには対応していません。ユーザーにはEthereum対応ウォレット（MetaMask等）の使用を推奨してください。