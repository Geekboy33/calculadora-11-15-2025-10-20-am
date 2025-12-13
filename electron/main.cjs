const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Determinar si estamos en desarrollo o producción
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Auto-updater (solo en producción)
let autoUpdater = null;
if (!isDev) {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
  } catch (e) {
    console.log('Auto-updater not available:', e.message);
  }
}

let mainWindow;

// Obtener la ruta de datos del usuario (persiste entre actualizaciones)
const userDataPath = app.getPath('userData');
const databasePath = path.join(userDataPath, 'databases');

// Asegurar que existan las carpetas de datos
function ensureDataDirectories() {
  const directories = [
    databasePath,
    path.join(userDataPath, 'profiles'),
    path.join(userDataPath, 'backups'),
    path.join(userDataPath, 'exports'),
    path.join(userDataPath, 'logs'),
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[Main] Created directory:', dir);
    }
  });

  console.log('[Main] Data directories ready at:', userDataPath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'default',
    autoHideMenuBar: false,
  });

  // Cargar la aplicación
  if (isDev) {
    mainWindow.loadURL('http://localhost:4000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Verificar actualizaciones al iniciar (solo en producción)
    if (autoUpdater && !isDev) {
      setTimeout(() => {
        checkForUpdates(true);
      }, 3000);
    }
  });

  // Abrir enlaces externos en el navegador predeterminado
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// AUTO-UPDATER
// ════════════════════════════════════════════════════════════════════════════

function checkForUpdates(silent = false) {
  if (!autoUpdater) {
    if (!silent) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Actualizaciones',
        message: 'El sistema de actualizaciones no está disponible en modo desarrollo.',
      });
    }
    return;
  }

  autoUpdater.checkForUpdates().catch(err => {
    console.error('[AutoUpdater] Error checking for updates:', err);
    if (!silent) {
      dialog.showErrorBox('Error', 'No se pudo verificar actualizaciones: ' + err.message);
    }
  });
}

if (autoUpdater) {
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
    sendStatusToWindow('checking-for-update');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendStatusToWindow('update-available', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización disponible',
      message: `Nueva versión ${info.version} disponible.\n\n¿Desea descargarla ahora?\n\nSus datos y configuraciones se conservarán.`,
      buttons: ['Descargar', 'Después'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] No updates available');
    sendStatusToWindow('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('[AutoUpdater] Download progress:', Math.round(progress.percent) + '%');
    sendStatusToWindow('download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version);
    sendStatusToWindow('update-downloaded', info);
    
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Actualización lista',
      message: `La versión ${info.version} se descargó correctamente.\n\n¿Reiniciar ahora para aplicar la actualización?\n\nSus datos se conservarán.`,
      buttons: ['Reiniciar ahora', 'Después'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
    sendStatusToWindow('error', { message: err.message });
  });
}

function sendStatusToWindow(status, data = {}) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('updater-status', { status, data });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// IPC HANDLERS
// ════════════════════════════════════════════════════════════════════════════

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    userDataPath: userDataPath,
    databasePath: databasePath,
    isDev: isDev,
    platform: process.platform,
  };
});

ipcMain.handle('check-for-updates', () => {
  checkForUpdates(false);
});

ipcMain.handle('get-user-data-path', () => {
  return userDataPath;
});

ipcMain.handle('get-database-path', () => {
  return databasePath;
});

// ════════════════════════════════════════════════════════════════════════════
// MENÚ DE LA APLICACIÓN
// ════════════════════════════════════════════════════════════════════════════

const menuTemplate = [
  {
    label: 'LedgerDAESTerminal',
    submenu: [
      { role: 'about', label: 'Acerca de LedgerDAESTerminal' },
      { type: 'separator' },
      {
        label: 'Buscar actualizaciones...',
        click: () => checkForUpdates(false),
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide', label: 'Ocultar' },
      { role: 'hideOthers', label: 'Ocultar otros' },
      { role: 'unhide', label: 'Mostrar todo' },
      { type: 'separator' },
      { role: 'quit', label: 'Salir' }
    ]
  },
  {
    label: 'Archivo',
    submenu: [
      {
        label: 'Abrir carpeta de datos',
        click: () => {
          shell.openPath(userDataPath);
        }
      },
      {
        label: 'Exportar base de datos',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('menu-export-database');
          }
        }
      },
      { type: 'separator' },
      { role: 'close', label: 'Cerrar ventana' }
    ]
  },
  {
    label: 'Editar',
    submenu: [
      { role: 'undo', label: 'Deshacer' },
      { role: 'redo', label: 'Rehacer' },
      { type: 'separator' },
      { role: 'cut', label: 'Cortar' },
      { role: 'copy', label: 'Copiar' },
      { role: 'paste', label: 'Pegar' },
      { role: 'selectAll', label: 'Seleccionar todo' }
    ]
  },
  {
    label: 'Ver',
    submenu: [
      { role: 'reload', label: 'Recargar' },
      { role: 'forceReload', label: 'Forzar recarga' },
      { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Tamaño real' },
      { role: 'zoomIn', label: 'Acercar' },
      { role: 'zoomOut', label: 'Alejar' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Pantalla completa' }
    ]
  },
  {
    label: 'Ventana',
    submenu: [
      { role: 'minimize', label: 'Minimizar' },
      { role: 'zoom', label: 'Zoom' },
      { type: 'separator' },
      { role: 'front', label: 'Traer al frente' }
    ]
  },
  {
    label: 'Ayuda',
    submenu: [
      {
        label: 'Documentación',
        click: async () => {
          await shell.openExternal('https://github.com/Geekboy33/calculadora-11-15-2025-10-20-am');
        }
      },
      {
        label: 'Soporte',
        click: async () => {
          await shell.openExternal('https://github.com/Geekboy33/calculadora-11-15-2025-10-20-am/issues');
        }
      },
      { type: 'separator' },
      {
        label: 'Verificar actualizaciones',
        click: () => checkForUpdates(false),
      }
    ]
  }
];

// ════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════════════

app.whenReady().then(() => {
  // Crear carpetas de datos
  ensureDataDirectories();
  
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Seguridad: deshabilitar la creación de nuevas ventanas
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

console.log('[Main] LedgerDAESTerminal started');
console.log('[Main] Version:', app.getVersion());
console.log('[Main] User data path:', userDataPath);
console.log('[Main] Is dev:', isDev);
