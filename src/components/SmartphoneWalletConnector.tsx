import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  Bug
} from 'lucide-react';
import { Button } from './ui/Button';
import { 
  getMobileBrowserInfo,
  detectMetaMaskWithRetry,
  createMetaMaskDeepLink,
  createExternalBrowserUrl,
  getConnectionGuidance,
  waitForConnection,
  collectDebugInfo
} from '../utils/smartphoneWallet';

interface SmartphoneWalletConnectorProps {
  onConnectionSuccess: () => void;
  onConnectionFailure: (error: string) => void;
}

export const SmartphoneWalletConnector: React.FC<SmartphoneWalletConnectorProps> = ({
  onConnectionSuccess,
  onConnectionFailure
}) => {
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [isMetaMaskDetected, setIsMetaMaskDetected] = useState(false);
  const [connectionStep, setConnectionStep] = useState<'detecting' | 'guidance' | 'connecting' | 'waiting' | 'success' | 'failed'>('detecting');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [guidance, setGuidance] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeConnection();
  }, []);

  const initializeConnection = async () => {
    try {
      const browserDetails = getMobileBrowserInfo();
      setBrowserInfo(browserDetails);
      
      const connectionGuidance = getConnectionGuidance();
      setGuidance(connectionGuidance);
      
      const debug = collectDebugInfo();
      setDebugInfo(debug);
      
      // MetaMaskの検出を試行
      const detected = await detectMetaMaskWithRetry();
      setIsMetaMaskDetected(detected);
      
      if (detected) {
        setConnectionStep('connecting');
        await attemptDirectConnection();
      } else {
        setConnectionStep('guidance');
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      setConnectionStep('failed');
      setError('初期化に失敗しました');
    }
  };

  const attemptDirectConnection = async () => {
    if (!window.ethereum) {
      setConnectionStep('guidance');
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setConnectionStep('success');
        onConnectionSuccess();
      }
    } catch (error: any) {
      console.error('Direct connection failed:', error);
      if (error.code === 4001) {
        // ユーザーがキャンセル
        setConnectionStep('guidance');
        setError('接続をキャンセルしました');
      } else {
        setConnectionStep('failed');
        setError(error.message || '接続に失敗しました');
        onConnectionFailure(error.message || '接続に失敗しました');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMetaMaskDeepLink = async () => {
    setIsConnecting(true);
    setConnectionStep('waiting');
    
    try {
      const deepLink = createMetaMaskDeepLink();
      
      // MetaMaskアプリを開く
      if (browserInfo.isIOS) {
        // iOS: window.location を使用
        window.location.href = deepLink;
      } else {
        // Android: window.open を試行後、location にフォールバック
        const popup = window.open(deepLink, '_blank');
        
        if (!popup || popup.closed || popup.closed === undefined) {
          window.location.href = deepLink;
        }
      }
      
      // 接続の待機
      const connected = await waitForConnection(30000);
      
      if (connected) {
        setConnectionStep('success');
        onConnectionSuccess();
      } else {
        setConnectionStep('failed');
        setError('MetaMaskアプリとの接続がタイムアウトしました');
      }
      
    } catch (error: any) {
      setConnectionStep('failed');
      setError(error.message || 'DeepLink接続に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenExternalBrowser = () => {
    try {
      const externalUrl = createExternalBrowserUrl();
      window.open(externalUrl, '_blank');
    } catch (error) {
      // フォールバック: 現在のURLをコピーしてユーザーに案内
      navigator.clipboard?.writeText(window.location.href).then(() => {
        alert('URLをコピーしました。外部ブラウザに貼り付けて開いてください。');
      });
    }
  };

  const renderConnectionStatus = () => {
    switch (connectionStep) {
      case 'detecting':
        return (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">環境を確認中...</h3>
              <p className="text-sm text-gray-600">MetaMaskアプリを検出しています</p>
            </div>
          </div>
        );

      case 'guidance':
        return (
          <div className="space-y-4">
            {/* ブラウザ環境情報 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">環境情報</span>
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <div>OS: {browserInfo?.isIOS ? 'iOS' : browserInfo?.isAndroid ? 'Android' : 'Unknown'}</div>
                <div>ブラウザ: {browserInfo?.browserName || 'Unknown'}</div>
                {browserInfo?.isInAppBrowser && (
                  <div className="text-orange-700 font-semibold">⚠️ アプリ内ブラウザ</div>
                )}
              </div>
            </div>

            {/* 接続ガイダンス */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{guidance?.title}</h3>
              <ol className="text-sm text-gray-700 space-y-2">
                {guidance?.steps?.map((step: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* アクションボタン */}
            <div className="space-y-2">
              {browserInfo?.isInAppBrowser ? (
                <Button
                  onClick={handleOpenExternalBrowser}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  外部ブラウザで開く
                </Button>
              ) : (
                <Button
                  onClick={handleMetaMaskDeepLink}
                  disabled={isConnecting}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  MetaMaskアプリで開く
                </Button>
              )}
              
              <Button
                onClick={initializeConnection}
                variant="outline"
                disabled={isConnecting}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                再検出
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={browserInfo?.isIOS ? 
                    "https://apps.apple.com/app/metamask/id1438144202" : 
                    "https://play.google.com/store/apps/details?id=io.metamask"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    アプリ取得
                  </Button>
                </a>
                
                <Button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  variant="outline"
                  className="text-xs"
                >
                  <Bug className="w-3 h-3 mr-1" />
                  デバッグ
                </Button>
              </div>
            </div>
          </div>
        );

      case 'connecting':
        return (
          <div className="text-center space-y-4">
            <div className="animate-pulse">
              <Smartphone className="w-12 h-12 text-blue-600 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">接続中...</h3>
              <p className="text-sm text-gray-600">MetaMaskで接続を承認してください</p>
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center space-y-4">
            <div className="animate-bounce">
              <ExternalLink className="w-12 h-12 text-orange-600 mx-auto" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">MetaMaskアプリを起動中...</h3>
              <p className="text-sm text-gray-600">
                アプリで接続を承認すると、自動的にブラウザに戻ります
              </p>
              <p className="text-xs text-gray-500 mt-2">
                最大30秒お待ちください
              </p>
            </div>
            <Button
              onClick={() => setConnectionStep('guidance')}
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
              <h3 className="text-lg font-semibold text-green-900">接続成功！</h3>
              <p className="text-sm text-green-700">
                MetaMaskウォレットが正常に接続されました
              </p>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">接続に失敗しました</h3>
              {error && (
                <p className="text-sm text-red-700 mt-2 p-2 bg-red-50 rounded">
                  {error}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Button
                onClick={initializeConnection}
                className="w-full"
              >
                再試行
              </Button>
              <Button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                variant="outline"
                className="w-full"
              >
                <Bug className="w-4 h-4 mr-2" />
                詳細情報
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      {renderConnectionStatus()}
      
      {/* デバッグ情報 */}
      {showDebugInfo && debugInfo && (
        <div className="bg-gray-50 border rounded-lg p-3">
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2 w-full"
          >
            {showDebugInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            デバッグ情報
          </button>
          
          {showDebugInfo && (
            <pre className="text-xs text-gray-600 bg-white rounded p-2 overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartphoneWalletConnector;