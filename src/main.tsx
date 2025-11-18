import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import App from './App';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

// Wagmi / RainbowKit (adapted for wagmi v2 / @wagmi/connectors)
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, WagmiConfig } from 'wagmi';
import { mainnet, polygon, goerli } from 'wagmi/chains';
import { http } from 'viem';
import { metaMask, injected, walletConnect } from '@wagmi/connectors';

// ページコンポーネントのimport
import Dashboard from './pages/Dashboard';
import QRPayment from './pages/QRPayment';
import SBTManagement from './pages/SBTManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

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
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      更新
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      後で
                    </button>
                  </div>
                </div>
              ), {
                duration: Infinity,
                icon: '🔄',
                style: {
                  maxWidth: '400px',
                },
              });
            }
          });
        }
      });

      // Periodic update checking (every hour)
      setInterval(async () => {
        try {
          await registration.update();
        } catch (error) {
          console.log('🔄 Service Worker update check failed:', error);
        }
      }, 60 * 60 * 1000); // 1 hour

    } catch (error) {
      console.error('❌ PWA: Service Worker registration failed:', error);
      
      // SW registration failure notification
      setTimeout(() => {
        toast.error('PWA機能の登録に失敗しました\n一部機能が制限される可能性があります', {
          duration: 8000,
          icon: '⚠️',
        });
      }, 2000);
    }
  });

  // SW registration state change monitoring
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 PWA: Service Worker controller changed');
    
    // App update completed notification
    setTimeout(() => {
      toast.success('✨ アプリが最新版に更新されました！', {
        duration: 4000,
        icon: '🚀',
      });
    }, 1000);
  });

  // SW error monitoring
  navigator.serviceWorker.addEventListener('error', (error) => {
    console.error('❌ PWA: Service Worker error:', error);
    
    setTimeout(() => {
      toast.error('PWAサービスでエラーが発生しました\nページを再読み込みしてください', {
        duration: 6000,
        icon: '🔧',
      });
    }, 3000);
  });

  // Handle SW messages
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      window.location.reload();
    }
  });

  // Track app install status (通知は無効化 - ヘッダーにインストールボタンがあるため)
  let deferredPrompt: any;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // インストール通知は表示しない（ヘッダーのインストールボタンを使用）
  });

  // PWAインストール完了時のUUID生成
  window.addEventListener('appinstalled', () => {
    console.log('📱 PWA installed successfully');
    
    // 店舗IDが未設定の場合のみ生成
    try {
      const existingShopInfo = localStorage.getItem('shop-info');
      const shopInfo = existingShopInfo ? JSON.parse(existingShopInfo) : {};
      
      if (!shopInfo.id) {
        // UUID形式の店舗ID生成
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 8);
        const shopId = `shop-${timestamp}-${random}`;
        
        // 店舗情報に追加
        const updatedShopInfo = {
          ...shopInfo,
          id: shopId,
          createdAt: new Date().toISOString(),
        };
        
        localStorage.setItem('shop-info', JSON.stringify(updatedShopInfo));
        console.log('🆔 PWAインストール時に店舗ID生成:', shopId);
        
        // 成功通知
        setTimeout(() => {
          toast.success('🎉 PWAインストール完了！\n店舗IDが自動生成されました', {
            duration: 5000,
            icon: '✨',
          });
        }, 1000);
      }
    } catch (error) {
      console.error('PWAインストール時の店舗ID生成エラー:', error);
    }
  });
}

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

// React Router v7対応の設定
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "qr-payment",
        element: <QRPayment />,
      },
      {
        path: "sbt-management", 
        element: <SBTManagement />,
      },
      {
        path: "sbt", 
        element: <SBTManagement />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});

// Configure chains and transports for wagmi v2
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
if (!projectId) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work.');
}

const chains = [mainnet, polygon, goerli] as const;

// Provide simple HTTP transports using chain RPC defaults (fallback to public endpoints)
const transports = {
  [mainnet.id]: http(mainnet.rpcUrls.default.http[0] ?? 'https://cloudflare-eth.com'),
  [polygon.id]: http(polygon.rpcUrls.default.http[0] ?? 'https://polygon-rpc.com'),
  [goerli.id]: http(goerli.rpcUrls.default.http[0] ?? 'https://rpc.ankr.com/eth_goerli'),
};

const connectors = [
  metaMask(),
  injected(),
  walletConnect({ projectId }),
];

const wagmiConfig = createConfig({
  chains,
  connectors,
  transports,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <RainbowKitProvider>
          <RouterProvider router={router} />
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
      </RainbowKitProvider>
    </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>
);