import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // ✅ Compresión Gzip
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
    }),
    
    // ✅ Compresión Brotli (15-20% mejor que Gzip)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      deleteOriginFile: false,
    }),

    // ✅ PWA con Service Worker para caché offline
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Digital Commercial Bank - CoreBanking Platform',
        short_name: 'CoreBanking',
        description: 'Sistema bancario completo con análisis de archivos DTC1B, custody accounts, y proof of reserves',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
              },
            },
          },
          {
            urlPattern: /\.(woff|woff2|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 4000,
    strictPort: false,
    open: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'crypto-vendor': ['crypto-js', 'buffer'],
          'ui-vendor': ['lucide-react'],

          // Feature chunks - Banking & API modules
          'banking-modules': [
            './src/components/AdvancedBankingDashboard.tsx',
            './src/components/CoreBankingAPIModule.tsx',
            './src/components/BankBlackScreen.tsx',
          ],

          // Feature chunks - API modules
          'api-modules': [
            './src/components/APIGlobalModule.tsx',
            './src/components/APIDigitalModule.tsx',
            './src/components/APIDAESModule.tsx',
            './src/components/APIVUSDModule.tsx',
            './src/components/APIVUSD1Module.tsx',
            './src/components/APIDAESPledgeModule.tsx',
          ],

          // Feature chunks - Custody & Analytics
          'custody-modules': [
            './src/components/CustodyAccountsModule.tsx',
            './src/components/CustodyBlackScreen.tsx',
          ],

          // Feature chunks - Analysis tools
          'analysis-modules': [
            './src/components/DTC1BProcessor.tsx',
            './src/components/DTC1BAnalyzer.tsx',
            './src/components/LargeFileDTC1BAnalyzer.tsx',
            './src/components/AdvancedBinaryReader.tsx',
            './src/components/EnhancedBinaryViewer.tsx',
          ],

          // Feature chunks - Audit & Reports
          'audit-modules': [
            './src/components/AuditBankWindow.tsx',
            './src/components/AuditLogViewer.tsx',
            './src/components/AuditBankReport.tsx',
          ],

          // Stores
          'stores': [
            './src/lib/store.ts',
            './src/lib/balances-store.ts',
            './src/lib/custody-store.ts',
            './src/lib/processing-store.ts',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      format: {
        comments: false,
      },
    },
  },
});
