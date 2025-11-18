# ウォレット表示問題の解決プラン

## 🔍 問題の診断

**症状:**
- RainbowKit モーダルが開くが、ウォレット一覧が空白
- MetaMask がブラウザで検出されているが、モーダルに表示されない

**原因:**
現在のコネクタ設定が RainbowKit v2.2.9 と完全に互換性がない可能性があります。

## ✅ 解決策

RainbowKit 公式の `getDefaultConfig` を使用して、デフォルト設定に変更します。

### 変更が必要な箇所：

1. **import 文の変更:**
```typescript
// 現在
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { createConfig, WagmiConfig } from 'wagmi';
import { metaMask, injected, walletConnect } from '@wagmi/connectors';

// 変更後
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
```

2. **設定の作成:**
```typescript
// 現在
const connectors = [metaMask(...), injected(...), walletConnect(...)];
const wagmiConfig = createConfig({ chains, connectors, transports });

// 変更後
const config = getDefaultConfig({
  appName: 'SBT JPYC Pay',
  projectId,
  chains: [mainnet, polygon, sepolia],
  ssr: false,
});
```

3. **Provider の変更:**
```typescript
// 現在
<WagmiConfig config={wagmiConfig}>

// 変更後
<WagmiProvider config={config}>
```

この変更により、RainbowKit が自動的に以下のウォレットをサポートします：
- MetaMask
- Rainbow
- Coinbase Wallet
- WalletConnect
- その他の injected wallets

## 📝 実装手順

手動で `src/main.tsx` を編集してください。変更箇所が多いため、一括置換ではなく、段階的に確認しながら進めることを推奨します。
