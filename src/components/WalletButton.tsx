import React, { useState } from 'react';
import { Wallet, LogOut, ExternalLink, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import SmartphoneWalletConnector from './SmartphoneWalletConnector';
import { getMobileBrowserInfo } from '../utils/smartphoneWallet';

export const WalletButton: React.FC = () => {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    isPWA,
    isMetaMaskAvailable,
    pwaWalletInfo,
    openWalletModal
  } = useWallet();

  const [showPWAWarning, setShowPWAWarning] = useState(false);
  const [showSmartphoneConnector, setShowSmartphoneConnector] = useState(false);

  // モバイル環境の判定
  const browserInfo = getMobileBrowserInfo();
  const isMobile = browserInfo.isIOS || browserInfo.isAndroid;

  const handleConnect = async () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.log('🔗 WalletButton - ウォレット接続クリック (モバイル:', isMobile, ')');
    
    // すべての環境で標準ウォレットモーダルを使用
    openWalletModal();
    
    // スマートフォンコネクターは無効化
    // if (isMobile) {
    //   setShowSmartphoneConnector(true);
    //   return;
    // }
  };
  // 古いエラー処理部分を削除
  // PWAやモバイル固有のエラー処理は標準ウォレットモーダル内で行う

  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank', 'width=1200,height=800');
    setShowPWAWarning(false);
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('ウォレットを切断しました');
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div>
      {/* PWA警告モーダル */}
      {showPWAWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">{pwaWalletInfo.title}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {pwaWalletInfo.message}
            </p>
            {pwaWalletInfo.solutions.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-800 mb-2">推奨解決策：</p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {pwaWalletInfo.solutions.map((solution, index) => (
                    <li key={index}>{solution}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleOpenInBrowser}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                ブラウザで開く
              </button>
              <button
                onClick={() => setShowPWAWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スマートフォン専用ウォレットコネクターモーダル */}
      {showSmartphoneConnector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">スマートフォンでウォレット接続</h3>
              <button
                onClick={() => setShowSmartphoneConnector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <SmartphoneWalletConnector
                onConnectionSuccess={() => {
                  setShowSmartphoneConnector(false);
                  toast.success('ウォレットが接続されました！');
                  // 接続状態を更新するために再レンダリング
                  window.location.reload();
                }}
                onConnectionFailure={(error) => {
                  toast.error(`接続エラー: ${error}`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            {shortAddress}
          </div>
          <button
            onClick={handleDisconnect}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="切断"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition duration-200"
          >
            {isMobile ? <Smartphone className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            {isConnecting ? '接続中...' : 'ウォレットを選択'}
          </button>
          
          {/* PWAで MetaMask が利用できない場合の警告 */}
          {isPWA && !isMetaMaskAvailable && !isMobile && (
            <button
              onClick={() => setShowPWAWarning(true)}
              className="p-2 text-amber-600 hover:text-amber-800 transition"
              title="PWA環境での制限について"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
