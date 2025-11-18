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
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

    if (isIOS) {
      // iOSはbeforeinstallpromptイベントがサポートされない
      showIOSInstallModal();
    } else if (isAndroid && isChrome) {
      alert('📱 Android Chromeでのインストール方法:\n\n1. メニュー（⋮）をタップ\n2. 「ホーム画面に追加」を選択\n3. 「インストール」をタップ');
    } else if (/Windows/i.test(userAgent)) {
      alert('💷 Windowsでのインストール方法:\n\n1. アドレスバー右のインストールアイコン\n2. またはメニューから「アプリをインストール」');
    } else {
      alert('📱 PWAインストール方法:\n\nブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選択してください');
    }

    updateDebugInfo('manualGuidanceShown', `Platform: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Other'}`);
  };

  const showIOSInstallModal = () => {
    // iOS専用の詳細インストールガイドを表示
    const modal = document.createElement('div');
    modal.className = 'ios-install-modal';
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin: 20px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
          <div style="text-align: center; margin-bottom: 16px;">
            <h2 style="margin: 0; color: #007AFF; font-size: 18px; font-weight: 600;">
              📱 iOSでPWAをインストール
            </h2>
          </div>
          
          <div style="color: #333; line-height: 1.5; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0; font-weight: 500;">🔴 iOSでは自動インストールができません</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">以下の手順で手動インストールしてください：</p>
            
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #007AFF;">手順 1: 共有ボタンをタップ</p>
              <p style="margin: 0; font-size: 14px; color: #666;">画面下部の「□↑」ボタンをタップ</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #007AFF;">手順 2: ホーム画面に追加</p>
              <p style="margin: 0; font-size: 14px; color: #666;">「ホーム画面に追加」を選択</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 12px; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #007AFF;">手順 3: 追加を確認</p>
              <p style="margin: 0; font-size: 14px; color: #666;">「追加」ボタンをタップして完了</p>
            </div>
          </div>
          
          <div style="text-align: center;">
            <button 
              onclick="this.closest('.ios-install-modal').remove()"
              style="
                background: #007AFF;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                width: 100%;
              "
            >
              理解しました
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // モーダルの背景をクリックしたら閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
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

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const canShowNativePrompt = isInstallable && !isIOS; // iOSでは自動プロンプトは使えない

  return (
    <div className="bg-white bg-opacity-95 backdrop-blur-sm border border-gray-200 rounded-lg p-2 xs:p-3 shadow-lg space-y-2 xs:space-y-3 text-xs xs:text-sm landscape:space-y-1 landscape:p-2">
      {/* iOSの場合、常に手動インストールガイドを表示 */}
      {isIOS && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2 xs:p-3 landscape:p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">📱</span>
            <p className="text-blue-800 font-medium text-xs xs:text-sm">
              iOS PWAインストール可能
            </p>
          </div>
          <p className="text-blue-700 text-xs mb-2 landscape:mb-1">
            iOSでは手動インストールが必要です
          </p>
          <Button
            onClick={showManualInstallGuidance}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 xs:py-2 xs:px-4 w-full landscape:py-1 landscape:text-xs"
          >
            <span className="hidden xs:inline">📆 インストール手順を表示</span>
            <span className="xs:hidden">📆 手順表示</span>
          </Button>
        </div>
      )}

      {/* Android/PCで自動プロンプトがある場合 */}
      {canShowNativePrompt && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2 xs:p-3 landscape:p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600">✨</span>
            <p className="text-green-800 font-medium text-xs xs:text-sm">
              アプリとしてインストール可能
            </p>
          </div>
          <Button
            onClick={handleInstallClick}
            className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-3 xs:py-2 xs:px-4 w-full landscape:py-1 landscape:text-xs"
          >
            <span className="hidden xs:inline">📱 今すぐインストール</span>
            <span className="xs:hidden">📱 インストール</span>
          </Button>
        </div>
      )}

      {/* 自動プロンプトがない非-iOS環境 */}
      {!canShowNativePrompt && !isIOS && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2 xs:p-3 landscape:p-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-600">💡</span>
            <p className="text-gray-700 font-medium text-xs xs:text-sm">
              PWA利用可能
            </p>
          </div>
          <p className="text-gray-600 text-xs mb-2 landscape:mb-1">
            ブラウザメニューからインストールできます
          </p>
          <Button
            onClick={showManualInstallGuidance}
            variant="outline"
            className="text-xs py-1.5 px-3 xs:py-2 xs:px-4 w-full border-gray-300 landscape:py-1 landscape:text-xs"
          >
            <span className="hidden xs:inline">インストール方法を確認</span>
            <span className="xs:hidden">方法確認</span>
          </Button>
        </div>
      )}

      {/* デバッグ用コントロール */}
      <details className="bg-gray-50 border border-gray-300 rounded-md p-2 text-xs text-gray-600 landscape:text-xs">
        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">🔧 PWAデバッグ情報</summary>
        <div className="mt-2 xs:mt-3 space-y-2 xs:space-y-3 landscape:space-y-1 landscape:mt-1">
          <div className="flex gap-2 landscape:gap-1">
            <Button
              onClick={testServiceWorker}
              variant="outline"
              className="text-xs py-1 px-2 flex-1 border-gray-300 hover:bg-gray-100 landscape:text-xs landscape:py-0.5 landscape:px-1"
            >
              SWテスト
            </Button>
            <Button
              onClick={copyDebugInfo}
              variant="outline"
              className="text-xs py-1 px-2 flex-1 border-gray-300 hover:bg-gray-100 landscape:text-xs landscape:py-0.5 landscape:px-1"
            >
              情報コピー
            </Button>
          </div>
          <div className="bg-white border border-gray-200 rounded p-2 xs:p-3 landscape:p-1">
            <pre className="text-xs overflow-auto max-h-24 xs:max-h-32 landscape:max-h-16 whitespace-pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
};

export default PWAInstallButton;