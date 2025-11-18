import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/**/*.png',
        'icons/**/*.svg',
        'sbt-images/**/*.png',
        'browserconfig.xml',
        // manifest.json は Workbox の precache から除外（runtimeCaching で管理）
      ],
      manifest: false, // 外部manifest.jsonを使用
      injectRegister: 'auto',
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,webp}',
          'icons/**/*.png',
          'browserconfig.xml',
          // manifest.json は ここでも除外
        ],
        // additionalManifestEntries は空（すべて globPatterns で管理）
        additionalManifestEntries: [],
        // ファイルサイズ制限を緩和（画像データ含むため）
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        runtimeCaching: [
          // manifest.json - ネットワーク優先
          {
            urlPattern: /\/manifest\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'manifest-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 24 * 60 * 60, // 1日
              },
              networkTimeoutSeconds: 2,
            },
          },
          // アプリ本体のナビゲーション
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'page-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1日
              },
              networkTimeoutSeconds: 3,
            },
          },
          // 静的アセット（JS, CSS）
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
              },
            },
          },
          // 画像キャッシュ
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
              },
            },
          },
        ],
        // オフライン時のフォールバック
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/api\//, /\.json$/, /\/sw\.js$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // PWA登録エラーを防ぐ
        disableDevLogs: false,
        mode: 'production',
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    // PWA最適化
    rollupOptions: {
      output: {
        // チャンク分割でキャッシュ効率化
        manualChunks: {
          'vendor-web3': ['ethers', 'viem', 'wagmi'],
          'vendor-ui': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['react-hot-toast', 'uuid', 'qrcode'],
        },
      },
    },
    // ServiceWorkerのビルド最適化
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
  },
});