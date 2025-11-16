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
        'manifest.json',
        'sbt-images/**/*.png',
      ],
      manifest: false, // 外部manifest.jsonを使用
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,webp}',
          'icons/**/*.png',
          'manifest.json',
          'sbt-images/**/*.png',
        ],
        // ファイルサイズ制限を緩和（画像データ含むため）
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          // 画像キャッシュ（外部リソース）
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
              },
            },
          },
          // IPFS・Pinata APIキャッシュ（短時間）
          {
            urlPattern: /^https:\/\/api\.pinata\.cloud\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pinata-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5分
              },
              networkTimeoutSeconds: 10,
            },
          },
          // ブロックチェーンRPC（キャッシュしない）
          {
            urlPattern: /^https:\/\/.*\.(alchemyapi\.io|infura\.io|polygonscan\.com).*/,
            handler: 'NetworkOnly',
          },
          // アプリ本体のアセット（積極的キャッシュ）
          {
            urlPattern: /^\/.*\.(js|css|html)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
              },
            },
          },
        ],
        // オフライン時のルーティング
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/api\//, /\.json$/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
        suppressWarnings: true,
      },
      // PWA アップデート通知
      useCredentials: true,
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