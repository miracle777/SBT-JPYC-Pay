import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { motion } from "framer-motion";
import { Wallet, AlertCircle, CheckCircle2, LogOut } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [error, setError] = React.useState<string | null>(null);

  const clearError = () => setError(null);

  // デバッグ: ウォレット状態をログ出力
  React.useEffect(() => {
    console.log('🔍 WalletButton状態変更:', {
      isConnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, address]);

  // 接続済み時のアドレス表示コンポーネント
  if (isConnected && address) {
    // スマートフォン向けにさらに短縮したアドレス表示
    const displayAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1 sm:gap-2 bg-green-50 text-green-800 px-2 py-1.5 sm:py-2 lg:px-3 rounded-lg border border-green-200 max-w-full w-auto"
      >
        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate min-w-0 flex-1 max-w-[120px] sm:max-w-[160px] lg:max-w-none">{displayAddress}</span>
        <button
          onClick={() => disconnect()}
          className="p-0.5 hover:bg-green-100 rounded transition-colors flex-shrink-0"
          title="ウォレットを切断"
        >
          <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-green-700" />
        </button>
      </motion.div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain;

        // Debug modal state
        if (!ready) {
          console.log('🔄 ConnectButton: Initializing...');
        }

        return (
          <div>
            {!ready ? (
              // ローディング状態
              <button
                disabled
                type="button"
                className="bg-gray-300 text-white font-semibold py-2 px-3 sm:px-4 lg:px-6 rounded-lg opacity-50 cursor-not-allowed flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base w-full max-w-xs sm:max-w-sm lg:max-w-none lg:w-auto"
              >
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">読込中...</span>
              </button>
            ) : !connected ? (
              // 接続していない状態
              <button
                onClick={() => {
                  try {
                    clearError();
                    console.log('📱 Opening RainbowKit modal...');
                    console.log('  openConnectModal function exists:', !!openConnectModal);
                    openConnectModal?.();
                  } catch (err: unknown) {
                    console.error('❌ Connect error:', err);
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    setError(errorMessage?.includes('User rejected') || errorMessage?.includes('user rejected') ? 'ウォレットでの接続要求が拒否されました。再度お試しください。' : 'ウォレット接続中にエラーが発生しました。');
                  }
                }}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 sm:px-4 lg:px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 sm:gap-2 mx-auto text-xs sm:text-sm lg:text-base w-full max-w-xs sm:max-w-sm lg:max-w-none lg:w-auto"
              >
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">ウォレット接続</span>
              </button>
            ) : chain?.unsupported ? (
              // サポートされていないチェーン
              <div className="space-y-2 w-full max-w-xs sm:max-w-sm lg:max-w-none">
                <div className="p-2 sm:p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-yellow-800 truncate">サポートされていないネットワークです</span>
                  </div>
                </div>
                <button onClick={() => openChainModal?.()} type="button" className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 sm:px-4 rounded text-xs sm:text-sm w-full lg:w-auto truncate">ネットワークを切り替え</button>
              </div>
            ) : null}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
