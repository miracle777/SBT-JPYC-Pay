import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import App from './App';
import './index.css';

// PWA Service Worker Registration with Update Notification
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        import.meta.env.PROD
          ? '/sw.js'
          : '/dev-sw.js?dev-sw'
      );
      
      console.log('✅ PWA: Service Worker registered', registration);
      
      // Update checking with user notification
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 新バージョン利用可能通知
              toast((t) => (
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-sm">🆕 新バージョンが利用可能です</p>
                  <p className="text-xs text-gray-600">アプリを再読み込みして最新版を使用してください</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        window.location.reload();
                        toast.dismiss(t.id);
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      更新
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      後で
                    </button>
                  </div>
                </div>
              ), {
                duration: 15000, // 15秒表示
                icon: '🔄',
              });
            }
          });
        }
      });
      
      // 定期的に更新をチェック
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // 1時間ごと
      
    } catch (error) {
      console.error('❌ PWA: Service Worker registration failed', error);
    }
  });
}

// iOS対応: ホーム画面追加時のスタンドアロン表示
if (
  (navigator as any).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches
) {
  console.log('📱 PWA running in standalone mode');
  
  // スタンドアロンモードでの起動通知
  setTimeout(() => {
    toast.success('📱 PWAモードで起動中\nオフライン機能が利用可能です', {
      duration: 3000,
      icon: '🚀',
    });
  }, 1000);
}

// PWA インストール促進
let deferredPrompt: any;
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 PWA install prompt available');
  e.preventDefault();
  deferredPrompt = e;
  
  // インストール可能通知（初回のみ）
  if (!localStorage.getItem('pwa-install-prompted')) {
    setTimeout(() => {
      toast((t) => (
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-sm">📱 アプリをインストール</p>
          <p className="text-xs text-gray-600">ホーム画面に追加してアプリのように使用できます</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult: any) => {
                    console.log('PWA install choice:', choiceResult.outcome);
                    deferredPrompt = null;
                  });
                }
                localStorage.setItem('pwa-install-prompted', 'true');
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
            >
              インストール
            </button>
            <button
              onClick={() => {
                localStorage.setItem('pwa-install-prompted', 'true');
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              閉じる
            </button>
          </div>
        </div>
      ), {
        duration: 12000,
        icon: '📲',
      });
    }, 5000); // 5秒後に表示
  }
});

// オフライン・オンライン状態の監視
window.addEventListener('online', () => {
  toast.success('🌐 インターネット接続が回復しました', {
    duration: 2000,
    icon: '✅',
  });
});

window.addEventListener('offline', () => {
  toast('📵 オフラインモード\nテンプレート管理は引き続き利用可能です', {
    duration: 4000,
    icon: '⚠️',
  });
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            maxWidth: '400px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);