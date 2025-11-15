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
      ],
      manifest: false, // 外部manifest.jsonを使用
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,webp}',
          'icons/**/*.png',
          'manifest.json',
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
        suppressWarnings: true,
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
  },
});