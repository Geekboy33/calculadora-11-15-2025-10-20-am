// Preload script para Electron
// Este archivo se ejecuta antes de que se cargue la página web
// y tiene acceso a las APIs de Node.js

const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Información del sistema
  platform: process.platform,
  arch: process.arch,
  version: process.versions.electron,
  
  // Métodos seguros
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Notificaciones
  showNotification: (title, body) => {
    new Notification(title, { body });
  }
});

console.log('DAES CoreBanking - Electron preload script loaded');

