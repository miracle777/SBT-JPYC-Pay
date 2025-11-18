import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { Button } from './ui/Button';

interface PWAWalletHandlerProps {
  isConnected: boolean;
  onBrowserRedirect: () => void;
}

export const PWAWalletHandler: React.FC<PWAWalletHandlerProps> = ({ 
  isConnected, 
  onBrowserRedirect 
}) => {
  const [isPWA, setIsPWA] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showPWAWarning, setShowPWAWarning] = useState(false);

  useEffect(() => {
    // PWA環境の検出
    const checkPWAEnvironment = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true
        || window.matchMedia('(display-mode: window-controls-overlay)').matches;
      
      const isDesktopPlatform = !(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      
      setIsPWA(isStandalone);
      setIsDesktop(isDesktopPlatform);
      
      // PWAかつデスクトップかつ未接続の場合に警告を表示
      if (isStandalone && isDesktopPlatform && !isConnected) {
        setShowPWAWarning(true);
      }
    };

    checkPWAEnvironment();

    // display-modeの変更を監視
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addListener(checkPWAEnvironment);

    return () => {
      standaloneQuery.removeListener(checkPWAEnvironment);
    };
  }, [isConnected]);

  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href;
    
    // デスクトップブラウザで開く
    if (isDesktop) {
      // 新しいウィンドウでブラウザ版を開く
      window.open(currentUrl, '_blank', 'width=1200,height=800');
    } else {
      // モバイルの場合はブラウザにリダイレクト
      window.location.href = currentUrl;
    }
    
    onBrowserRedirect();
  };

  const handleWalletConnectOption = () => {
    // WalletConnect実装用のプレースホルダー
    alert('WalletConnect実装は今後のアップデートで対応予定です。現在はブラウザ版をご利用ください。');
  };

  if (!isPWA || !showPWAWarning) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 mb-2">
            PWAでのウォレット接続について
          </h3>
          
          <div className="text-sm text-amber-800 space-y-2 mb-4">
            <p>
              PWAアプリからはブラウザのMetaMask拡張機能に直接アクセスできません。
              ウォレット接続と残高表示には以下の方法をご利用ください：
            </p>
          </div>

          <div className="space-y-3">
            {/* ブラウザで開く option */}
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                {isDesktop ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                <span className="font-medium text-amber-900">推奨: ブラウザ版を使用</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                MetaMask拡張機能が利用できるブラウザ環境でウォレット接続を行います
              </p>
              <Button
                onClick={handleOpenInBrowser}
                variant="outline"
                className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                ブラウザで開く
              </Button>
            </div>

            {/* WalletConnect option (将来実装) */}
            <div className="bg-white rounded-lg p-3 border border-amber-200 opacity-75">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4" />
                <span className="font-medium text-amber-900">今後対応予定: WalletConnect</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                モバイルウォレットアプリとの連携（開発中）
              </p>
              <Button
                onClick={handleWalletConnectOption}
                variant="outline"
                disabled
                className="w-full text-amber-600 border-amber-300"
              >
                WalletConnect（未実装）
              </Button>
            </div>
          </div>

          <div className="mt-4 p-2 bg-amber-100 rounded text-xs text-amber-700">
            💡 <strong>ヒント:</strong> PWAはオフライン機能に最適化されています。
            SBT発行などのブロックチェーン操作はブラウザ版をご利用ください。
          </div>

          <div className="mt-3 text-right">
            <button
              onClick={() => setShowPWAWarning(false)}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              この警告を閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAWalletHandler;