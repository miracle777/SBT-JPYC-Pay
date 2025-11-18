import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    // PWA インストール状態をチェック
    checkInstallStatus();

    // インストールプロンプト事前準備
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('📱 PWA Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      updateDebugInfo('installPromptCaptured', true);
    };

    // インストール完了検出
    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      updateDebugInfo('appInstalled', true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkInstallStatus = () => {
    const info: any = {
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: getDisplayMode(),
      serviceWorkerSupported: 'serviceWorker' in navigator,
      beforeInstallPromptSupported: 'onbeforeinstallprompt' in window,
    };

    // PWAインストール状態判定
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      info.isInstalled = true;
      info.installMethod = 'display-mode: standalone';
    } else if ((window.navigator as any).standalone === true) {
      setIsInstalled(true);
      info.isInstalled = true;
      info.installMethod = 'iOS standalone';
    }

    setDebugInfo(info);
  };

  const updateDebugInfo = (key: string, value: any) => {
    setDebugInfo((prev: any) => ({ ...prev, [key]: value }));
  };

  const getDisplayMode = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    return 'browser';
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ Install prompt not available');
      updateDebugInfo('installAttemptWithoutPrompt', true);
      
      // プラットフォーム固有のガイダンス
      showManualInstallGuidance();
      return;
    }

    try {
      updateDebugInfo('installAttemptStarted', new Date().toISOString());
      
      // インストールプロンプトを表示
      await deferredPrompt.prompt();
      
      // ユーザーの選択を待機
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`📊 PWA install outcome: ${outcome}`);
      
      updateDebugInfo('installOutcome', outcome);
      
      if (outcome === 'accepted') {
        console.log('🎉 User accepted PWA install');
        setIsInstallable(false);
        setDeferredPrompt(null);
      } else {
        console.log('❌ User dismissed PWA install');
      }
    } catch (error) {
      console.error('❌ PWA install error:', error);
      updateDebugInfo('installError', error);
    }
  };

  const showManualInstallGuidance = () => {
    const userAgent = navigator.userAgent;
    let guidance = '';

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      guidance = 'iOS Safari: 共有ボタン → ホーム画面に追加';
    } else if (/Android/i.test(userAgent)) {
      if (/Chrome/i.test(userAgent)) {
        guidance = 'Android Chrome: メニュー → ホーム画面に追加';
      } else {
        guidance = 'Android: ブラウザメニューからホーム画面に追加';
      }
    } else if (/Windows/i.test(userAgent)) {
      guidance = 'Windows: アドレスバーのインストールボタンまたは設定メニュー';
    } else if (/Mac/i.test(userAgent)) {
      guidance = 'macOS: アドレスバーのインストールボタンまたは設定メニュー';
    }

    alert(`PWA インストール方法:\n\n${guidance}`);
    updateDebugInfo('manualGuidanceShown', guidance);
  };

  const testServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      updateDebugInfo('swTestResult', 'Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      updateDebugInfo('swTestResult', {
        registered: !!registration,
        active: !!registration?.active,
        installing: !!registration?.installing,
        waiting: !!registration?.waiting,
        scope: registration?.scope,
      });
    } catch (error) {
      updateDebugInfo('swTestResult', { error: error });
    }
  };

  const copyDebugInfo = () => {
    const info = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(info).then(() => {
      alert('デバッグ情報をクリップボードにコピーしました');
    });
  };

  // PWAが既にインストール済みの場合は何も表示しない
  if (isInstalled) {
    return null;
  }

  return (
    <div className="space-y-2 xs:space-y-4 text-xs xs:text-sm landscape:space-y-1">
      {isInstallable && (
        <Button
          onClick={handleInstallClick}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs xs:text-sm py-1.5 px-3 xs:py-2 xs:px-4 landscape:py-1 landscape:px-2 landscape:text-xs"
        >
          <span className="hidden xs:inline">📱 アプリとしてインストール</span>
          <span className="xs:hidden">📱 インストール</span>
        </Button>
      )}

      {!isInstallable && !isInstalled && (
        <div className="text-xs xs:text-sm text-gray-600 space-y-1 xs:space-y-2 landscape:space-y-1">
          <p className="hidden xs:block">💡 このアプリはPWA（Progressive Web App）として利用できます</p>
          <p className="xs:hidden">💡 PWA利用可能</p>
          <Button
            onClick={showManualInstallGuidance}
            variant="outline"
            className="text-xs py-1 px-2 xs:text-sm xs:py-1.5 xs:px-3 landscape:text-xs landscape:py-0.5"
          >
            <span className="hidden xs:inline">インストール方法を確認</span>
            <span className="xs:hidden">方法確認</span>
          </Button>
        </div>
      )}

      {/* デバッグ用コントロール */}
      <details className="text-xs text-gray-500 landscape:text-xs">
        <summary>🔧 PWAデバッグ情報</summary>
        <div className="mt-1 xs:mt-2 space-y-1 xs:space-y-2 landscape:space-y-1">
          <Button
            onClick={testServiceWorker}
            variant="outline"
            className="text-xs p-0.5 xs:p-1 landscape:text-xs landscape:p-0.5"
          >
            SWテスト
          </Button>
          <Button
            onClick={copyDebugInfo}
            variant="outline"
            className="text-xs p-0.5 xs:p-1 landscape:text-xs landscape:p-0.5"
          >
            情報コピー
          </Button>
          <pre className="bg-gray-50 p-1 xs:p-2 rounded text-xs overflow-auto max-h-20 xs:max-h-32 landscape:max-h-16">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
};

export default PWAInstallButton;