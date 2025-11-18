"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, AlertCircle, CheckCircle2, X } from "lucide-react";

export const WalletButton: React.FC = () => {
  const { isConnected } = useAccount();
  const [error, setError] = React.useState<string | null>(null);

  const clearError = () => setError(null);

  // 接続済みでもボタン領域を表示して接続状態を示す（消えてしまわないようにする）

  // デスクトップではフローティングではなく、ヘッダー内に置かれる通常表示に戻す
  return (
    <div className="inline-flex items-center p-0">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            className="mb-2 p-2 bg-red-50 rounded border border-red-200 w-full max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
              <button onClick={clearError} className="text-red-600"><X className="h-4 w-4"/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        <div className="text-left">
          <div className="mb-0 flex items-center gap-3">
            <Wallet className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">ウォレットを接続</h3>
              <p className="text-xs text-gray-500">JPYC決済をご利用ください</p>
            </div>
          </div>

          <div className="ml-4">
            <ConnectButton.Custom>
              {({ account, chain, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                const truncate = (addr?: string) => {
                  if (!addr) return '';
                  return addr.slice(0, 6) + '...' + addr.slice(-4);
                };

                return (
                  <div {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' } })}>
                    {!connected ? (
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
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <Wallet className="h-4 w-4" />
                        ウォレット接続
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-700 font-medium">{truncate(account.address)}</div>
                        <button onClick={() => openChainModal?.()} type="button" className="text-xs text-blue-600 underline">ネットワーク変更</button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          <div className="text-xs text-gray-500 space-y-0.5 mt-3">
            <p>• Sepolia / Polygon Amoy / Polygon 対応</p>
            <p>• ウォレットのネットワーク設定を優先</p>
            <p>• MetaMask推奨</p>
            <button onClick={async () => {
              try {
                if (typeof window !== 'undefined' && (window as any).ethereum) {
                  await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                } else {
                  window.open('https://metamask.io/download/', '_blank');
                }
              } catch (error) {
                console.error('Failed to connect MetaMask:', error);
              }
            }} className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-xs font-medium transition-colors">🦊 MetaMaskをダウンロード</button>
          </div>
        </div>
      </div>
  );
};
