import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
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
