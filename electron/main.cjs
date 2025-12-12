const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Determinar si estamos en desarrollo o producción
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

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
    },
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'default',
    autoHideMenuBar: false,
  });

  // Cargar la aplicación
  if (isDev) {
    // En desarrollo, cargar desde Vite dev server
    mainWindow.loadURL('http://localhost:4000');
    mainWindow.webContents.openDevTools();
  } else {
    // En producción, cargar el archivo index.html compilado
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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

// Menú de la aplicación
const menuTemplate = [
  {
    label: 'LedgerDAESTerminal',
    submenu: [
      { role: 'about', label: 'Acerca de LedgerDAESTerminal' },
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
      }
    ]
  }
];

app.whenReady().then(() => {
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

