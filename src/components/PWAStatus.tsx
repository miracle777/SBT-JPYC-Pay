import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface PWAInfo {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: string;
  displayMode: string;
  cacheSize: number;
  swStatus: string;
}

export const PWAStatus: React.FC = () => {
  const [pwaInfo, setPwaInfo] = useState<PWAInfo>({
    isInstalled: false,
    isInstallable: false,
    platform: 'unknown',
    displayMode: 'browser',
    cacheSize: 0,
    swStatus: 'not-supported'
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkPWAStatus();
  }, []);

  const checkPWAStatus = async () => {
    const info: PWAInfo = {
      isInstalled: false,
      isInstallable: false,
      platform: getPlatform(),
      displayMode: getDisplayMode(),
      cacheSize: 0,
      swStatus: 'not-supported'
    };

    // PWA インストール状態チェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      info.isInstalled = true;
    } else if ((window.navigator as any).standalone === true) {
      info.isInstalled = true; // iOS Safari
    }

    // Service Worker状態チェック
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.active) {
            info.swStatus = 'active';
          } else if (registration.installing) {
            info.swStatus = 'installing';
          } else if (registration.waiting) {
            info.swStatus = 'waiting';
          }
          
          // キャッシュサイズ取得
          if (registration.active) {
            const messageChannel = new MessageChannel();
            registration.active.postMessage(
              { type: 'GET_CACHE_SIZE' },
              [messageChannel.port2]
            );
            
            messageChannel.port1.onmessage = (event) => {
              const sizeInMB = (event.data.cacheSize / 1024 / 1024).toFixed(2);
              setPwaInfo(prev => ({ ...prev, cacheSize: parseFloat(sizeInMB) }));
            };
          }
        } else {
          info.swStatus = 'not-registered';
        }
      } catch (error) {
        info.swStatus = 'error';
      }
    }

    // インストール可能状態チェック
    window.addEventListener('beforeinstallprompt', () => {
      info.isInstallable = true;
      setPwaInfo(prev => ({ ...prev, isInstallable: true }));
    });

    setPwaInfo(info);
  };

  const getPlatform = (): string => {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Android/i.test(userAgent)) return 'Android';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS';
    return 'Other';
  };

  const getDisplayMode = (): string => {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if ((window.navigator as any).standalone === true) return 'ios-standalone';
    return 'browser';
  };

  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Service Workerも再登録
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        window.location.reload();
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'installing': case 'waiting': return 'text-yellow-600';
      case 'not-registered': case 'not-supported': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        className="fixed bottom-4 right-4 z-50 bg-white shadow-lg"
      >
        PWA状態確認
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white shadow-2xl rounded-lg p-4 max-w-sm border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">PWA状態</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-xl leading-none"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>プラットフォーム:</span>
          <span className="font-mono">{pwaInfo.platform}</span>
        </div>
        
        <div className="flex justify-between">
          <span>表示モード:</span>
          <span className={`font-mono ${pwaInfo.isInstalled ? 'text-green-600' : 'text-gray-600'}`}>
            {pwaInfo.displayMode}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>インストール状態:</span>
          <span className={pwaInfo.isInstalled ? 'text-green-600' : 'text-gray-600'}>
            {pwaInfo.isInstalled ? '✅ インストール済み' : '❌ 未インストール'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Service Worker:</span>
          <span className={getStatusColor(pwaInfo.swStatus)}>
            {pwaInfo.swStatus}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>キャッシュサイズ:</span>
          <span className="font-mono">{pwaInfo.cacheSize} MB</span>
        </div>
        
        {pwaInfo.isInstallable && !pwaInfo.isInstalled && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-blue-700 text-xs">
            💡 このアプリはインストール可能です
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          <Button
            onClick={checkPWAStatus}
            variant="outline"
            className="text-xs py-1 px-2"
          >
            更新
          </Button>
          <Button
            onClick={clearCache}
            variant="outline"
            className="text-xs py-1 px-2 text-red-600 border-red-300 hover:bg-red-50"
          >
            キャッシュクリア
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PWAStatus;