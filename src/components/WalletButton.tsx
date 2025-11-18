import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, AlertCircle, CheckCircle2, X, LogOut } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [error, setError] = React.useState<string | null>(null);

  const clearError = () => setError(null);

  // 接続済み時のアドレス表示コンポーネント
  if (isConnected && address) {
    const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-3 py-2 rounded-lg border border-green-200 whitespace-nowrap"
      >
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs xs:text-sm font-medium">{displayAddress}</span>
        <button
          onClick={() => disconnect()}
          className="p-0.5 hover:bg-green-100 rounded transition-colors flex-shrink-0"
          title="ウォレットを切断"
        >
          <LogOut className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-green-700" />
        </button>
      </motion.div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain;

        return (
          <div>
            {!ready ? (
              // ローディング状態
              <button
                disabled
                type="button"
                className="bg-gray-300 text-white font-semibold py-2 px-4 xs:px-6 rounded-lg opacity-50 cursor-not-allowed flex items-center gap-2 text-sm xs:text-base whitespace-nowrap"
              >
                <Wallet className="h-4 w-4" />
                読込中...
              </button>
            ) : !connected ? (
              // 接続していない状態
              <button
                onClick={() => {
                  try {
                    clearError();
                    openConnectModal?.();
                  } catch (err: unknown) {
                    console.error('Connect error:', err);
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    setError(errorMessage?.includes('User rejected') || errorMessage?.includes('user rejected') ? 'ウォレットでの接続要求が拒否されました。再度お試しください。' : 'ウォレット接続中にエラーが発生しました。');
                  }
                }}
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 xs:px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto text-sm xs:text-base whitespace-nowrap"
              >
                <Wallet className="h-4 w-4" />
                ウォレット接続
              </button>
            ) : chain?.unsupported ? (
              // サポートされていないチェーン
              <div className="space-y-2">
                <div className="p-2 xs:p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-yellow-800">サポートされていないネットワークです</span>
                  </div>
                </div>
                <button onClick={() => openChainModal?.()} type="button" className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-3 rounded text-xs">ネットワークを切り替え</button>
              </div>
            ) : null}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
