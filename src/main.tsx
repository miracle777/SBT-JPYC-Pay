import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import App from './App';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultWallets, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, rainbowWallet, walletConnectWallet, coinbaseWallet, trustWallet } from '@rainbow-me/rainbowkit/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, sepolia } from 'wagmi/chains';
import { initializeAnalytics, setupPWATracking, trackSWUpdate, trackError } from './utils/analytics';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { debugWalletConnect } from './config/walletconnect';

// Wagmi / RainbowKit - Using getDefaultConfig for better compatibility

// Google Analytics 初期化
initializeAnalytics();

// GA初期化完了後にテストイベントを送信
setTimeout(() => {
  // アプリ起動イベント
  if (window.gtag) {
    window.gtag('event', 'app_start', {
      event_category: 'Application',
      event_label: 'App Started',
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`
    });
    console.log('📱 GA: App start event sent');
  }
}, 2000);

// ページコンポーネントのimport
import Dashboard from './pages/Dashboard';
import QRPayment from './pages/QRPayment';
import SBTManagement from './pages/SBTManagement';
import Settings from './pages/Settings';
import SetupGuide from './pages/SetupGuide';
import ShopAdmin from './pages/ShopAdmin';
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
      
      // PWAトラッキングのセットアップ
      setupPWATracking();
      
      // Update checking with user notification
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Service Worker更新をトラッキング
              trackSWUpdate();
              
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
      
      // エラーをトラッキング
      trackError(String(error), 'service_worker_registration');
      
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
    trackError(String(error), 'service_worker_error');
    
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
        path: "setup-guide",
        element: <SetupGuide />,
      },
      {
        path: "shop-admin",
        element: <ShopAdmin />,
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
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'dummy-project-id-for-development';
if (!import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID) {
  console.warn('⚠️ VITE_WALLET_CONNECT_PROJECT_ID is not set. Using dummy projectId.');
  console.log('📝 WalletConnect機能を使用する場合は環境変数を設定してください: VITE_WALLET_CONNECT_PROJECT_ID=your_project_id');
  console.log('💡 MetaMaskなど他のウォレットは正常に動作します。');
} else {
  console.log('✅ WalletConnect Project ID configured:', projectId.substring(0, 10) + '...');
}

// Get app URL - use hardcoded production URL, fallback to location.origin for development
const appUrl = typeof window !== 'undefined' 
  ? (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
      ? window.location.origin
      : 'https://shop.jpyc-pay.app')
  : 'https://shop.jpyc-pay.app';

const appIcon = `${appUrl}/icons/icon-192x192.png`;

// Debug: Log wallet detection before creating connectors
console.log('🔍 Wallet Detection (INITIAL):');
console.log('  window.ethereum:', typeof window !== 'undefined' && (window as any).ethereum ? '✅ Found' : '❌ Not found');
console.log('  isMetaMask:', typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask ? '✅ true' : '❌ false');
if (typeof window !== 'undefined' && (window as any).ethereum) {
  console.log('  ethereum object:', (window as any).ethereum);
}

// チェーン設定
const chains = [mainnet, polygon, sepolia] as const;

// RainbowKit - 推奨ウォレットを明示的に指定
const wallets = [
  {
    groupName: '推奨',
    wallets: [
      metaMaskWallet,
      walletConnectWallet,
      coinbaseWallet,
      trustWallet,
      rainbowWallet,
    ],
  },
];

// WalletConnect設定のデバッグ情報
console.log('🔧 WalletConnect Debug Info:');
console.log('  Project ID:', projectId);
console.log('  App URL:', appUrl);
console.log('  App Icon:', appIcon);

const connectors = connectorsForWallets(wallets, {
  appName: 'SBT masaru21 Pay(仮)',
  projectId,
  appDescription: 'SBTスタンプカード発行・QR決済管理システム',
  appUrl: appUrl,
  appIcon: appIcon,
});

// Wagmi Config
const config = createConfig({
  connectors,
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false,
  multiInjectedProviderDiscovery: false,
});

console.log('🔧 RainbowKit Config Created:', config ? '✅' : '❌');
console.log('🔑 WalletConnect ProjectID:', projectId ? `✅ Set (${projectId.substring(0, 10)}...)` : '❌ Not set');
console.log('📱 Configured Wallets:', wallets[0].wallets.length);

// WalletConnect詳細デバッグ
debugWalletConnect();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider 
          modalSize="compact"
          initialChain={polygon}
          showRecentTransactions={false}
          theme={null}
          locale="ja"
        >
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
        <Analytics />
        <SpeedInsights />
      </RainbowKitProvider>
    </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>
);