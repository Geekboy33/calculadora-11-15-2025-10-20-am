const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Información de la app
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdaterStatus: (callback) => {
    ipcRenderer.on('updater-status', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('updater-status', callback);
  },
  
  // Eventos del menú
  onMenuExportDatabase: (callback) => {
    ipcRenderer.on('menu-export-database', () => callback());
    return () => ipcRenderer.removeListener('menu-export-database', callback);
  },
  
  // Verificar si estamos en Electron
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
});

console.log('[Preload] LedgerDAESTerminal preload script loaded');
