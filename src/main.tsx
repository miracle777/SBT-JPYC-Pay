import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        import.meta.env.PROD
          ? '/sw.js'
          : '/dev-sw.js?dev-sw'
      );
      
      console.log('✅ PWA: Service Worker registered', registration);
      
      // Update checking
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('🔄 PWA: New version available! Reload to update.');
              // 自動更新の通知もここで可能
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
}

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