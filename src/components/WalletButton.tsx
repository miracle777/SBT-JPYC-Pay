import React, { useState } from 'react';
import { Wallet, LogOut, ExternalLink, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import MobileWalletConnector from './MobileWalletConnector';
import { isMobileDevice, isIOS, isAndroid } from '../utils/mobileWallet';

export const WalletButton: React.FC = () => {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    connect, 
    disconnect, 
    isPWA,
    isMetaMaskAvailable 
  } = useWallet();

  const [showPWAWarning, setShowPWAWarning] = useState(false);
  const [showMobileConnector, setShowMobileConnector] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('ウォレットが接続されました');
    } catch (error: any) {
      if (error.message === 'PWA_NO_METAMASK') {
        setShowPWAWarning(true);
        toast.error('PWAではブラウザ版をご利用ください', {
          duration: 4000,
        });
      } else if (error.message === 'PWA_CONNECTION_FAILED') {
        setShowPWAWarning(true);
        toast.error('PWA環境でのウォレット接続に失敗しました', {
          duration: 4000,
        });
      } else if (error.message === 'NO_METAMASK_MOBILE' || error.message === 'PWA_NO_METAMASK_MOBILE') {
        setShowMobileConnector(true);
        toast.error('MetaMaskモバイルアプリが必要です', {
          duration: 4000,
        });
      } else if (error.message === 'MOBILE_CONNECTION_FAILED') {
        setShowMobileConnector(true);
        toast.error('モバイルウォレット接続に失敗しました', {
          duration: 4000,
        });
      } else {
        toast.error('ウォレット接続に失敗しました');
      }
    }
  };

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
            <h3 className="text-lg font-semibold mb-4">PWAでのウォレット接続</h3>
            <p className="text-sm text-gray-600 mb-4">
              PWAアプリからはMetaMask拡張機能にアクセスできません。
              ウォレット接続と残高表示には、ブラウザ版をご利用ください。
            </p>
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

      {/* モバイルウォレットコネクターモーダル */}
      {showMobileConnector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">モバイルウォレット接続</h3>
              <button
                onClick={() => setShowMobileConnector(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <MobileWalletConnector
              onConnectionAttempt={() => {
                // 接続試行時の処理
              }}
              onConnectionSuccess={() => {
                setShowMobileConnector(false);
                toast.success('ウォレットが接続されました！');
                // 再接続を試行
                handleConnect();
              }}
              onConnectionFailure={(error) => {
                toast.error(`接続エラー: ${error}`);
              }}
            />
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
            {isMobileDevice() ? <Smartphone className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            {isConnecting ? '接続中...' : isMobileDevice() ? 'ウォレット接続' : 'ウォレット接続'}
          </button>
          
          {/* PWAで MetaMask が利用できない場合の警告 */}
          {isPWA && !isMetaMaskAvailable && !isMobileDevice() && (
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
