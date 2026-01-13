// vite.config.ts
import { defineConfig } from "file:///C:/Users/USER/Desktop/calculator%2011%2015%202025%20%2010%2024%20am/calculadora-11-15-2025-10-20-am/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/USER/Desktop/calculator%2011%2015%202025%20%2010%2024%20am/calculadora-11-15-2025-10-20-am/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "./",
  // Rutas relativas para Electron
  server: {
    host: "0.0.0.0",
    port: 4e3,
    strictPort: false,
    open: true,
    proxy: {
      // Proxy todas las llamadas /api al backend Express en puerto 3000
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("[Vite Proxy] Error:", err.message);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("[Vite Proxy] Enviando:", req.method, req.url, "\u2192 http://localhost:3000" + req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("[Vite Proxy] Respuesta:", proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          "react-vendor": ["react", "react-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "crypto-vendor": ["crypto-js", "buffer"],
          "ui-vendor": ["lucide-react"],
          // Feature chunks - Banking & API modules
          "banking-modules": [
            "./src/components/AdvancedBankingDashboard.tsx",
            "./src/components/CoreBankingAPIModule.tsx",
            "./src/components/BankBlackScreen.tsx"
          ],
          // Feature chunks - API modules
          "api-modules": [
            "./src/components/APIGlobalModule.tsx",
            "./src/components/APIDigitalModule.tsx",
            "./src/components/APIDAESModule.tsx",
            "./src/components/APIVUSDModule.tsx",
            "./src/components/APIVUSD1Module.tsx",
            "./src/components/APIDAESPledgeModule.tsx"
          ],
          // Feature chunks - Custody & Analytics
          "custody-modules": [
            "./src/components/CustodyAccountsModule.tsx",
            "./src/components/CustodyBlackScreen.tsx"
          ],
          // Feature chunks - Analysis tools
          "analysis-modules": [
            "./src/components/DTC1BProcessor.tsx",
            "./src/components/DTC1BAnalyzer.tsx",
            "./src/components/LargeFileDTC1BAnalyzer.tsx",
            "./src/components/AdvancedBinaryReader.tsx",
            "./src/components/EnhancedBinaryViewer.tsx"
          ],
          // Feature chunks - Audit & Reports
          "audit-modules": [
            "./src/components/AuditBankWindow.tsx",
            "./src/components/AuditLogViewer.tsx",
            "./src/components/AuditBankReport.tsx"
          ],
          // Stores
          "stores": [
            "./src/lib/store.ts",
            "./src/lib/balances-store.ts",
            "./src/lib/custody-store.ts",
            "./src/lib/processing-store.ts"
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1e3,
    cssCodeSplit: true,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug"]
      },
      format: {
        comments: false
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU0VSXFxcXERlc2t0b3BcXFxcY2FsY3VsYXRvciAxMSAxNSAyMDI1ICAxMCAyNCBhbVxcXFxjYWxjdWxhZG9yYS0xMS0xNS0yMDI1LTEwLTIwLWFtXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxVU0VSXFxcXERlc2t0b3BcXFxcY2FsY3VsYXRvciAxMSAxNSAyMDI1ICAxMCAyNCBhbVxcXFxjYWxjdWxhZG9yYS0xMS0xNS0yMDI1LTEwLTIwLWFtXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9VU0VSL0Rlc2t0b3AvY2FsY3VsYXRvciUyMDExJTIwMTUlMjAyMDI1JTIwJTIwMTAlMjAyNCUyMGFtL2NhbGN1bGFkb3JhLTExLTE1LTIwMjUtMTAtMjAtYW0vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIGJhc2U6ICcuLycsIC8vIFJ1dGFzIHJlbGF0aXZhcyBwYXJhIEVsZWN0cm9uXHJcbiAgc2VydmVyOiB7XHJcbiAgICBob3N0OiAnMC4wLjAuMCcsXHJcbiAgICBwb3J0OiA0MDAwLFxyXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsXHJcbiAgICBvcGVuOiB0cnVlLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgLy8gUHJveHkgdG9kYXMgbGFzIGxsYW1hZGFzIC9hcGkgYWwgYmFja2VuZCBFeHByZXNzIGVuIHB1ZXJ0byAzMDAwXHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVml0ZSBQcm94eV0gRXJyb3I6JywgZXJyLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgX3JlcykgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1ZpdGUgUHJveHldIEVudmlhbmRvOicsIHJlcS5tZXRob2QsIHJlcS51cmwsICdcdTIxOTIgaHR0cDovL2xvY2FsaG9zdDozMDAwJyArIHJlcS51cmwpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBwcm94eS5vbigncHJveHlSZXMnLCAocHJveHlSZXMsIHJlcSwgX3JlcykgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1ZpdGUgUHJveHldIFJlc3B1ZXN0YTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddLFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAvLyBWZW5kb3IgY2h1bmtzXHJcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgICAgICAgICdzdXBhYmFzZS12ZW5kb3InOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxyXG4gICAgICAgICAgJ2NyeXB0by12ZW5kb3InOiBbJ2NyeXB0by1qcycsICdidWZmZXInXSxcclxuICAgICAgICAgICd1aS12ZW5kb3InOiBbJ2x1Y2lkZS1yZWFjdCddLFxyXG5cclxuICAgICAgICAgIC8vIEZlYXR1cmUgY2h1bmtzIC0gQmFua2luZyAmIEFQSSBtb2R1bGVzXHJcbiAgICAgICAgICAnYmFua2luZy1tb2R1bGVzJzogW1xyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9BZHZhbmNlZEJhbmtpbmdEYXNoYm9hcmQudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQ29yZUJhbmtpbmdBUElNb2R1bGUudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQmFua0JsYWNrU2NyZWVuLnRzeCcsXHJcbiAgICAgICAgICBdLFxyXG5cclxuICAgICAgICAgIC8vIEZlYXR1cmUgY2h1bmtzIC0gQVBJIG1vZHVsZXNcclxuICAgICAgICAgICdhcGktbW9kdWxlcyc6IFtcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQVBJR2xvYmFsTW9kdWxlLnRzeCcsXHJcbiAgICAgICAgICAgICcuL3NyYy9jb21wb25lbnRzL0FQSURpZ2l0YWxNb2R1bGUudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQVBJREFFU01vZHVsZS50c3gnLFxyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9BUElWVVNETW9kdWxlLnRzeCcsXHJcbiAgICAgICAgICAgICcuL3NyYy9jb21wb25lbnRzL0FQSVZVU0QxTW9kdWxlLnRzeCcsXHJcbiAgICAgICAgICAgICcuL3NyYy9jb21wb25lbnRzL0FQSURBRVNQbGVkZ2VNb2R1bGUudHN4JyxcclxuICAgICAgICAgIF0sXHJcblxyXG4gICAgICAgICAgLy8gRmVhdHVyZSBjaHVua3MgLSBDdXN0b2R5ICYgQW5hbHl0aWNzXHJcbiAgICAgICAgICAnY3VzdG9keS1tb2R1bGVzJzogW1xyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9DdXN0b2R5QWNjb3VudHNNb2R1bGUudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQ3VzdG9keUJsYWNrU2NyZWVuLnRzeCcsXHJcbiAgICAgICAgICBdLFxyXG5cclxuICAgICAgICAgIC8vIEZlYXR1cmUgY2h1bmtzIC0gQW5hbHlzaXMgdG9vbHNcclxuICAgICAgICAgICdhbmFseXNpcy1tb2R1bGVzJzogW1xyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9EVEMxQlByb2Nlc3Nvci50c3gnLFxyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9EVEMxQkFuYWx5emVyLnRzeCcsXHJcbiAgICAgICAgICAgICcuL3NyYy9jb21wb25lbnRzL0xhcmdlRmlsZURUQzFCQW5hbHl6ZXIudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQWR2YW5jZWRCaW5hcnlSZWFkZXIudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvRW5oYW5jZWRCaW5hcnlWaWV3ZXIudHN4JyxcclxuICAgICAgICAgIF0sXHJcblxyXG4gICAgICAgICAgLy8gRmVhdHVyZSBjaHVua3MgLSBBdWRpdCAmIFJlcG9ydHNcclxuICAgICAgICAgICdhdWRpdC1tb2R1bGVzJzogW1xyXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy9BdWRpdEJhbmtXaW5kb3cudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQXVkaXRMb2dWaWV3ZXIudHN4JyxcclxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvQXVkaXRCYW5rUmVwb3J0LnRzeCcsXHJcbiAgICAgICAgICBdLFxyXG5cclxuICAgICAgICAgIC8vIFN0b3Jlc1xyXG4gICAgICAgICAgJ3N0b3Jlcyc6IFtcclxuICAgICAgICAgICAgJy4vc3JjL2xpYi9zdG9yZS50cycsXHJcbiAgICAgICAgICAgICcuL3NyYy9saWIvYmFsYW5jZXMtc3RvcmUudHMnLFxyXG4gICAgICAgICAgICAnLi9zcmMvbGliL2N1c3RvZHktc3RvcmUudHMnLFxyXG4gICAgICAgICAgICAnLi9zcmMvbGliL3Byb2Nlc3Npbmctc3RvcmUudHMnLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxyXG4gICAgdGVyc2VyT3B0aW9uczoge1xyXG4gICAgICBjb21wcmVzczoge1xyXG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcclxuICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxyXG4gICAgICAgIHB1cmVfZnVuY3M6IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5kZWJ1ZyddLFxyXG4gICAgICB9LFxyXG4gICAgICBmb3JtYXQ6IHtcclxuICAgICAgICBjb21tZW50czogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTJjLFNBQVMsb0JBQW9CO0FBQ3hlLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBO0FBQUEsRUFDTixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxNQUVMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLFdBQVcsQ0FBQyxPQUFPLGFBQWE7QUFDOUIsZ0JBQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxNQUFNLFNBQVM7QUFDckMsb0JBQVEsSUFBSSx1QkFBdUIsSUFBSSxPQUFPO0FBQUEsVUFDaEQsQ0FBQztBQUNELGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxTQUFTO0FBQzVDLG9CQUFRLElBQUksMEJBQTBCLElBQUksUUFBUSxJQUFJLEtBQUssaUNBQTRCLElBQUksR0FBRztBQUFBLFVBQ2hHLENBQUM7QUFDRCxnQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUM1QyxvQkFBUSxJQUFJLDJCQUEyQixTQUFTLFlBQVksSUFBSSxHQUFHO0FBQUEsVUFDckUsQ0FBQztBQUFBLFFBQ0g7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQTtBQUFBLFVBRVosZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsbUJBQW1CLENBQUMsdUJBQXVCO0FBQUEsVUFDM0MsaUJBQWlCLENBQUMsYUFBYSxRQUFRO0FBQUEsVUFDdkMsYUFBYSxDQUFDLGNBQWM7QUFBQTtBQUFBLFVBRzVCLG1CQUFtQjtBQUFBLFlBQ2pCO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUdBLGVBQWU7QUFBQSxZQUNiO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUdBLG1CQUFtQjtBQUFBLFlBQ2pCO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQTtBQUFBLFVBR0Esb0JBQW9CO0FBQUEsWUFDbEI7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBO0FBQUEsVUFHQSxpQkFBaUI7QUFBQSxZQUNmO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUdBLFVBQVU7QUFBQSxZQUNSO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsSUFDdkIsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2YsWUFBWSxDQUFDLGVBQWUsZUFBZTtBQUFBLE1BQzdDO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
