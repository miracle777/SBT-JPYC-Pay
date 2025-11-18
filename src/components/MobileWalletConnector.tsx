import React, { useState, useEffect } from 'react';
import { Smartphone, ExternalLink, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { 
  isMobileDevice, 
  detectMetaMaskMobile, 
  getMetaMaskMobileConnectUrl,
  waitForWalletConnection,
  enhanceMobileWalletDetection,
  isIOS,
  isAndroid
} from '../utils/mobileWallet';

interface MobileWalletConnectorProps {
  onConnectionAttempt: () => void;
  onConnectionSuccess: () => void;
  onConnectionFailure: (error: string) => void;
}

export const MobileWalletConnector: React.FC<MobileWalletConnectorProps> = ({
  onConnectionAttempt,
  onConnectionSuccess,
  onConnectionFailure
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isWalletDetected, setIsWalletDetected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStep, setConnectionStep] = useState<'detect' | 'redirect' | 'waiting' | 'success' | 'failed'>('detect');

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);

    if (mobile) {
      enhanceMobileWalletDetection();
      checkWalletDetection();

      // ethereum#initializedイベントのリスナー追加
      const handleEthereumInitialized = () => {
        checkWalletDetection();
      };

      window.addEventListener('ethereum#initialized', handleEthereumInitialized);
      
      return () => {
        window.removeEventListener('ethereum#initialized', handleEthereumInitialized);
      };
    }
  }, []);

  const checkWalletDetection = () => {
    const detected = detectMetaMaskMobile();
    setIsWalletDetected(detected);
    
    if (detected) {
      setConnectionStep('success');
    }
  };

  const handleDirectConnect = async () => {
    onConnectionAttempt();
    
    if (window.ethereum && detectMetaMaskMobile()) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts && accounts.length > 0) {
          onConnectionSuccess();
          setConnectionStep('success');
        }
      } catch (error: any) {
        onConnectionFailure(error.message || 'ウォレット接続に失敗しました');
        setConnectionStep('failed');
      }
    } else {
      setConnectionStep('redirect');
    }
  };

  const handleMetaMaskRedirect = async () => {
    setIsConnecting(true);
    setConnectionStep('redirect');
    
    try {
      const connectUrl = getMetaMaskMobileConnectUrl();
      
      // MetaMaskアプリにリダイレクト
      window.location.href = connectUrl;
      
      // リダイレクト後の待機
      setConnectionStep('waiting');
      
      // ウォレット接続を待機
      const connected = await waitForWalletConnection(15000);
      
      if (connected) {
        setConnectionStep('success');
        onConnectionSuccess();
      } else {
        setConnectionStep('failed');
        onConnectionFailure('MetaMaskアプリとの接続がタイムアウトしました');
      }
      
    } catch (error: any) {
      setConnectionStep('failed');
      onConnectionFailure(error.message || 'MetaMaskアプリとの接続に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetryDetection = () => {
    setConnectionStep('detect');
    checkWalletDetection();
  };

  if (!isMobile) {
    return null; // モバイル環境以外では表示しない
  }

  const renderConnectionStep = () => {
    switch (connectionStep) {
      case 'detect':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                モバイルウォレット接続
              </h3>
              <p className="text-sm text-gray-600">
                MetaMaskモバイルアプリでの接続を検出中...
              </p>
            </div>

            {isWalletDetected ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">MetaMaskが検出されました！</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  下のボタンをクリックしてウォレットを接続してください。
                </p>
                <Button
                  onClick={handleDirectConnect}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700"
                >
                  ウォレットに接続
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 text-amber-800">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold">MetaMaskが見つかりません</span>
                      <p className="text-sm mt-1">
                        以下の方法をお試しください：
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={handleMetaMaskRedirect}
                    disabled={isConnecting}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    MetaMaskアプリで開く
                  </Button>
                  
                  <Button
                    onClick={handleRetryDetection}
                    variant="outline"
                    disabled={isConnecting}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    再検出
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'redirect':
        return (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <ExternalLink className="w-12 h-12 text-orange-600 mx-auto mb-3" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                MetaMaskアプリに移動中...
              </h3>
              <p className="text-sm text-gray-600">
                MetaMaskアプリが開かない場合は、手動でアプリを起動してください。
              </p>
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ウォレット接続を待機中...
              </h3>
              <p className="text-sm text-gray-600">
                MetaMaskアプリで接続を承認してください。
              </p>
            </div>
            <Button
              onClick={() => setConnectionStep('detect')}
              variant="outline"
            >
              キャンセル
            </Button>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                接続成功！
              </h3>
              <p className="text-sm text-green-700">
                MetaMaskウォレットが正常に接続されました。
              </p>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                接続に失敗しました
              </h3>
              <p className="text-sm text-red-700">
                MetaMaskアプリがインストールされているか確認してください。
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => setConnectionStep('detect')}
                className="w-full"
              >
                再試行
              </Button>
              <a
                href={isIOS() ? 
                  "https://apps.apple.com/app/metamask/id1438144202" : 
                  "https://play.google.com/store/apps/details?id=io.metamask"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  MetaMaskをインストール
                </Button>
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      {renderConnectionStep()}
    </div>
  );
};

export default MobileWalletConnector;