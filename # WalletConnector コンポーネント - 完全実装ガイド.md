# WalletConnector コンポーネント - 完全実装ガイド

**プロジェクト**: SBT-JPYC-QR-Scanner  
**ファイル名**: `src/components/WalletConnector.tsx`  
**用途**: MetaMaskおよび主要ウォレットの接続処理

---

## 📋 ファイル全体のコード

```tsx
'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, AlertCircle, CheckCircle2, X } from 'lucide-react';

export function WalletConnector() {
  const { isConnected, isConnecting } = useAccount();
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // 接続済みの場合は何も表示しない
  if (isConnected) {
    return null;
  }

  return (
    <div className="flex flex-col items-center p-4">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 w-full max-w-sm"
          >
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-700 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center w-full"
      >
        <div className="mb-4">
          <Wallet className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            ウォレットを接続
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            JPYC決済をご利用ください
          </p>
        </div>

        <div>
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={() => {
                            try {
                              clearError();
                              openConnectModal();
                            } catch (err: unknown) {
                              console.error('Connect error:', err);
                              const errorMessage = err instanceof Error ? err.message : String(err);
                              setError(
                                errorMessage?.includes('User rejected') || 
                                errorMessage?.includes('user rejected')
                                  ? 'ウォレットでの接続要求が拒否されました。再度お試しください。'
                                  : 'ウォレット接続中にエラーが発生しました。'
                              );
                            }
                          }}
                          disabled={isConnecting}
                          type="button"
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                        >
                          <Wallet className="h-4 w-4" />
                          {isConnecting ? '接続中...' : 'ウォレット接続'}
                        </button>
                      );
                    }

                    if (chain?.unsupported) {
                      return (
                        <div className="space-y-2">
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                サポートされていないネットワークです
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={openChainModal}
                            type="button"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            ネットワークを切り替え
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">接続済み</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 mt-3">
            <p>• Sepolia / Polygon Amoy / Polygon 対応</p>
            <p>• ウォレットのネットワーク設定を優先</p>
            <p>• MetaMask推奨</p>
            <button
              onClick={async () => {
                try {
                  if (typeof window !== 'undefined' && window.ethereum) {
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                  } else {
                    window.open('https://metamask.io/download/', '_blank');
                  }
                } catch (error) {
                  console.error('Failed to connect MetaMask:', error);
                }
              }}
              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs font-medium transition-colors"
            >
              🦊 MetaMaskをダウンロード
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
```

---

## 🔑 主要な機能解説

### 1. **ウォレット接続状態の管理**

```tsx
const { isConnected, isConnecting } = useAccount();
const [error, setError] = useState<string | null>(null);
```

- `isConnected`: ウォレットが接続されているかを判定
- `isConnecting`: 接続処理中かどうかを判定
- `error`: エラーメッセージの状態管理

### 2. **接続済みの場合は非表示**

```tsx
if (isConnected) {
  return null;
}
```

接続完了後はコンポーネント全体が何も表示されません。

### 3. **RainbowKit ConnectButtonの カスタマイズ**

```tsx
<ConnectButton.Custom>
  {({
    account,
    chain,
    openChainModal,
    openConnectModal,
    authenticationStatus,
    mounted,
  }) => {
    // カスタムUI実装
  }}
</ConnectButton.Custom>
```

**パラメーター説明**:

| パラメーター | 型 | 説明 |
|-------------|-----|------|
| `account` | object | 接続中のアカウント情報 |
| `chain` | object | 現在のネットワーク情報 |
| `openChainModal` | function | ネットワーク切り替えモーダルを開く |
| `openConnectModal` | function | ウォレット接続モーダルを開く |
| `authenticationStatus` | string | 認証ステータス |
| `mounted` | boolean | コンポーネントがマウント済みか |

### 4. **エラーハンドリング**

```tsx
onClick={() => {
  try {
    clearError();
    openConnectModal();
  } catch (err: unknown) {
    console.error('Connect error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    setError(
      errorMessage?.includes('User rejected') || 
      errorMessage?.includes('user rejected')
        ? 'ウォレットでの接続要求が拒否されました。再度お試しください。'
        : 'ウォレット接続中にエラーが発生しました。'
    );
  }
}}
```

ユーザーが拒否した場合と、その他のエラーを区別して表示します。

### 5. **ネットワーク検証**

```tsx
if (chain?.unsupported) {
  return (
    <div className="space-y-2">
      <div className="p-3 bg-yellow-50 ...">
        <span>サポートされていないネットワークです</span>
      </div>
      <button onClick={openChainModal}>
        ネットワークを切り替え
      </button>
    </div>
  );
}
```

サポートされていないネットワークの場合、ネットワーク切り替えボタンを表示します。

### 6. **MetaMask直接接続オプション**

```tsx
<button
  onClick={async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        window.open('https://metamask.io/download/', '_blank');
      }
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
    }
  }}
  className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs font-medium transition-colors"
>
  🦊 MetaMaskをダウンロード
</button>
```

MetaMaskがインストールされている場合は直接接続、ない場合はダウンロードページを開きます。

---

## 🎨 UI状態の3パターン

### **パターン1: 未接続状態**

```
┌─────────────────────────────┐
│  👛 ウォレットを接続        │
│  JPYC決済をご利用ください    │
│                             │
│  [ウォレット接続ボタン]      │
│                             │
│  • Sepolia / Polygon対応    │
│  • MetaMask推奨            │
│  [🦊 MetaMaskをダウンロード] │
└─────────────────────────────┘
```

### **パターン2: 未対応ネットワーク**

```
┌─────────────────────────────┐
│  ⚠️ サポートされていない    │
│     ネットワークです        │
│                             │
│  [ネットワークを切り替え]    │
└─────────────────────────────┘
```

### **パターン3: 接続済み**

何も表示されません（`return null`）。

---

## 📦 必要な依存パッケージ

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "@rainbow-me/rainbowkit": "^2.0.0",
    "wagmi": "^2.0.0",
    "framer-motion": "^10.0.0",
    "lucide-react": "^0.0.1"
  }
}
```

### インストールコマンド

```bash
npm install @rainbow-me/rainbowkit wagmi framer-motion lucide-react
```

---

## 🚀 使用方法

### Step1: RainbowKitのセットアップ（layout.tsx）

```tsx
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { sepolia, polygonAmoy, polygon } from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'SBT-JPYC-QR-Scanner',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // WalletConnectから取得
  chains: [sepolia, polygonAmoy, polygon],
  ssr: true,
});

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
```

### Step2: ページで使用

```tsx
import { WalletConnector } from '@/components/WalletConnector';

export default function Page() {
  return (
    <div>
      <WalletConnector />
      {/* その他のコンポーネント */}
    </div>
  );
}
```

---

## 🐛 スマホでの接続トラブルシューティング

### よくある問題と解決策

#### ❌ MetaMaskアプリが起動しない

**原因**: モバイルブラウザでMetaMaskアプリが検出されていない

**解決策**:
```tsx
// window.ethereumの存在確認を強化
if (typeof window !== 'undefined' && window.ethereum) {
  console.log('MetaMask detected');
  await window.ethereum.request({ method: 'eth_requestAccounts' });
} else {
  // MetaMaskアプリ内ブラウザで開く
  window.location.href = 'https://metamask.app.link/dapp/yourapp.com';
}
```

#### ❌ ネットワークが切り替わらない

**原因**: RainbowKit側でのネットワーク設定ミス

**解決策**: `getDefaultConfig`で対応チェーンを明示的に設定

```tsx
chains: [sepolia, polygonAmoy, polygon]
```

#### ❌ 「User rejected」エラー

**原因**: ユーザーがウォレットアプリで拒否した

**対策**: アプリ内メッセージで再試行を促す（現在の実装に含まれています）

---

## 💡 カスタマイズ例

### DarkMode対応を改善する場合

```tsx
// 現在のコード
className="bg-blue-600 hover:bg-blue-700 ..."

// 改善版
className="dark:bg-blue-500 dark:hover:bg-blue-600 ..."
```

### 接続ボタンのテキストを変更する場合

```tsx
{isConnecting ? '接続中...' : 'ウォレット接続'}

// ↓ 変更例
{isConnecting ? '接続処理中です...' : 'MetaMaskと接続'}
```

### エラーアラートの表示時間を制限する場合

```tsx
useEffect(() => {
  if (error) {
    const timer = setTimeout(() => setError(null), 5000); // 5秒後に消える
    return () => clearTimeout(timer);
  }
}, [error]);
```

---

## 📊 ネットワーク対応状況

| ネットワーク | 対応状況 | 用途 |
|------------|--------|------|
| Sepolia | ✅ | テスト環境（推奨） |
| Polygon Amoy | ✅ | テスト環境 |
| Polygon | ✅ | 本番環境 |

---

## 📝 注記

- このコンポーネントは**クライアントサイドのみ**で動作します（`'use client'`指定）
- RainbowKitの`ConnectButton.Custom`は柔軟なUI カスタマイズが可能です
- エラーハンドリングはユーザーフレンドリーな日本語メッセージが表示されます

---

**© 2025 SBT-JPYC-QR-Scanner Project**
