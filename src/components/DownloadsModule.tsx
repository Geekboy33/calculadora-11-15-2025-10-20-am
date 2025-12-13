/**
 * Downloads Module - Centro de Descargas
 * Permite descargar versiones de escritorio para Windows, Mac y Linux
 * Incluye verificación de actualizaciones para la versión de escritorio
 */

import { useState, useEffect } from 'react';
import { 
  Download, Monitor, Apple, Terminal, CheckCircle, Clock, HardDrive, Shield, 
  Zap, Globe, Package, ExternalLink, RefreshCw, AlertCircle, ArrowUpCircle,
  Database, Folder
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface DownloadItem {
  id: string;
  platform: 'windows' | 'mac' | 'linux';
  name: string;
  version: string;
  size: string;
  filename: string;
  downloadUrl: string;
  releaseDate: string;
  features: string[];
  requirements: string[];
}

interface UpdaterStatus {
  status: string;
  data?: {
    version?: string;
    percent?: number;
    message?: string;
  };
}

// Detectar si estamos en Electron
declare global {
  interface Window {
    electronAPI?: {
      getAppInfo: () => Promise<{
        version: string;
        name: string;
        userDataPath: string;
        databasePath: string;
        isDev: boolean;
        platform: string;
      }>;
      checkForUpdates: () => void;
      onUpdaterStatus: (callback: (status: UpdaterStatus) => void) => () => void;
      isElectron: boolean;
      platform: string;
    };
  }
}

export function DownloadsModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Electron state
  const [isElectron, setIsElectron] = useState(false);
  const [appInfo, setAppInfo] = useState<{
    version: string;
    userDataPath: string;
    databasePath: string;
    platform: string;
  } | null>(null);
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  const currentVersion = '1.0.0';
  const releaseDate = '2025-12-13';
  const githubReleasesUrl = 'https://github.com/Geekboy33/calculadora-11-15-2025-10-20-am/releases';

  useEffect(() => {
    // Detectar Electron
    if (window.electronAPI?.isElectron) {
      setIsElectron(true);
      
      // Obtener info de la app
      window.electronAPI.getAppInfo().then(info => {
        setAppInfo({
          version: info.version,
          userDataPath: info.userDataPath,
          databasePath: info.databasePath,
          platform: info.platform,
        });
      });

      // Escuchar estado del actualizador
      const unsubscribe = window.electronAPI.onUpdaterStatus((status) => {
        setUpdaterStatus(status);
        if (status.status === 'checking-for-update') {
          setCheckingUpdates(true);
        } else {
          setCheckingUpdates(false);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const handleCheckUpdates = () => {
    if (window.electronAPI?.checkForUpdates) {
      setCheckingUpdates(true);
      window.electronAPI.checkForUpdates();
    }
  };

  const downloads: DownloadItem[] = [
    {
      id: 'windows-x64',
      platform: 'windows',
      name: 'Windows (64-bit)',
      version: currentVersion,
      size: '~85 MB',
      filename: 'LedgerDAESTerminal-Setup.exe',
      downloadUrl: `${githubReleasesUrl}/latest`,
      releaseDate,
      features: [
        isSpanish ? 'Instalador con opción Actualizar' : 'Installer with Update option',
        isSpanish ? 'NO borra datos al actualizar' : 'Does NOT delete data on update',
        isSpanish ? 'Actualizaciones automáticas' : 'Auto-updates',
        isSpanish ? 'Acceso directo en escritorio' : 'Desktop shortcut',
      ],
      requirements: [
        'Windows 10/11 (64-bit)',
        '4 GB RAM',
        '500 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
    {
      id: 'windows-portable',
      platform: 'windows',
      name: 'Windows Portable',
      version: currentVersion,
      size: '~80 MB',
      filename: 'LedgerDAESTerminal-Portable.exe',
      downloadUrl: `${githubReleasesUrl}/latest`,
      releaseDate,
      features: [
        isSpanish ? 'No requiere instalación' : 'No installation required',
        isSpanish ? 'Ejecutar desde USB' : 'Run from USB',
        isSpanish ? 'Portátil' : 'Portable',
      ],
      requirements: [
        'Windows 10/11',
        '4 GB RAM',
        '100 MB ' + (isSpanish ? 'espacio libre' : 'free space'),
      ],
    },
    {
      id: 'mac-x64',
      platform: 'mac',
      name: 'macOS (Intel)',
      version: currentVersion,
      size: '~95 MB',
      filename: 'LedgerDAESTerminal.dmg',
      downloadUrl: `${githubReleasesUrl}/latest`,
      releaseDate,
      features: [
        isSpanish ? 'Compatible con Mac Intel' : 'Intel Mac compatible',
        isSpanish ? 'Integración con macOS' : 'macOS integration',
        isSpanish ? 'Actualizaciones automáticas' : 'Auto-updates',
      ],
      requirements: [
        'macOS 10.15+ (Catalina)',
        '4 GB RAM',
        '500 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
    {
      id: 'linux-appimage',
      platform: 'linux',
      name: 'Linux (AppImage)',
      version: currentVersion,
      size: '~90 MB',
      filename: 'LedgerDAESTerminal.AppImage',
      downloadUrl: `${githubReleasesUrl}/latest`,
      releaseDate,
      features: [
        isSpanish ? 'AppImage universal' : 'Universal AppImage',
        isSpanish ? 'No requiere instalación' : 'No installation required',
        isSpanish ? 'Compatible con mayoría de distros' : 'Compatible with most distros',
      ],
      requirements: [
        'Ubuntu 20.04+ / Fedora 34+',
        '4 GB RAM',
        '500 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'windows':
        return <Monitor className="w-8 h-8" />;
      case 'mac':
        return <Apple className="w-8 h-8" />;
      case 'linux':
        return <Terminal className="w-8 h-8" />;
      default:
        return <Monitor className="w-8 h-8" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'windows':
        return 'from-blue-500 to-blue-700';
      case 'mac':
        return 'from-gray-400 to-gray-600';
      case 'linux':
        return 'from-orange-500 to-orange-700';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const handleDownload = (item: DownloadItem) => {
    // Abrir página de releases donde el usuario puede descargar el archivo correcto
    window.open(item.downloadUrl, '_blank');
  };

  // Función para verificar si la carpeta release existe (solo en Electron)
  const handleOpenReleaseFolder = () => {
    if (window.electronAPI) {
      // En Electron, abrir carpeta de release
      alert(isSpanish 
        ? 'Abre la carpeta del proyecto y busca /release después de compilar.'
        : 'Open the project folder and look for /release after building.');
    }
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: isSpanish ? 'Rendimiento Nativo' : 'Native Performance',
      description: isSpanish 
        ? 'Aplicación de escritorio optimizada con Electron'
        : 'Desktop app optimized with Electron',
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: isSpanish ? 'Base de Datos Local' : 'Local Database',
      description: isSpanish
        ? 'IndexedDB persistente que sobrevive a actualizaciones'
        : 'Persistent IndexedDB that survives updates',
    },
    {
      icon: <ArrowUpCircle className="w-6 h-6" />,
      title: isSpanish ? 'Actualizaciones Seguras' : 'Safe Updates',
      description: isSpanish
        ? 'Actualiza sin perder datos ni configuraciones'
        : 'Update without losing data or settings',
    },
    {
      icon: <Folder className="w-6 h-6" />,
      title: isSpanish ? 'Carpeta de Datos' : 'Data Folder',
      description: isSpanish
        ? 'Todos los datos en carpeta accesible del usuario'
        : 'All data in accessible user folder',
    },
  ];

  const getUpdaterStatusMessage = () => {
    if (!updaterStatus) return null;
    
    switch (updaterStatus.status) {
      case 'checking-for-update':
        return { text: isSpanish ? 'Verificando actualizaciones...' : 'Checking for updates...', color: 'text-yellow-400' };
      case 'update-available':
        return { text: isSpanish ? `Nueva versión ${updaterStatus.data?.version} disponible` : `New version ${updaterStatus.data?.version} available`, color: 'text-green-400' };
      case 'update-not-available':
        return { text: isSpanish ? 'Ya tienes la última versión' : 'You have the latest version', color: 'text-green-400' };
      case 'download-progress':
        return { text: isSpanish ? `Descargando: ${Math.round(updaterStatus.data?.percent || 0)}%` : `Downloading: ${Math.round(updaterStatus.data?.percent || 0)}%`, color: 'text-cyan-400' };
      case 'update-downloaded':
        return { text: isSpanish ? 'Actualización lista para instalar' : 'Update ready to install', color: 'text-green-400' };
      case 'error':
        return { text: isSpanish ? `Error: ${updaterStatus.data?.message}` : `Error: ${updaterStatus.data?.message}`, color: 'text-red-400' };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d0d0d] to-[#1a1a1a] border-b border-white/10 p-8 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Download className="w-10 h-10 text-cyan-400" />
              {isSpanish ? 'Centro de Descargas' : 'Download Center'}
            </h1>
            <p className="text-white/70">
              {isSpanish 
                ? 'Descarga LedgerDAESTerminal para tu sistema operativo'
                : 'Download LedgerDAESTerminal for your operating system'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-white/50 text-sm">{isSpanish ? 'Versión Actual' : 'Current Version'}</div>
            <div className="text-2xl font-bold text-cyan-400">v{appInfo?.version || currentVersion}</div>
            <div className="text-white/50 text-xs mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {releaseDate}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
        {/* Notice: Build Required */}
        {!isElectron && (
          <div className="bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/40 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500/20 p-3 rounded-xl">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-2">
                  {isSpanish ? '📦 Compilación Requerida' : '📦 Build Required'}
                </h3>
                <p className="text-white/70 mb-4">
                  {isSpanish 
                    ? 'Los archivos de descarga aún no están publicados. Para obtener la aplicación de escritorio, debes compilarla localmente usando los comandos de abajo.'
                    : 'Download files are not yet published. To get the desktop app, you need to build it locally using the commands below.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const buildSection = document.querySelector('[data-build-instructions]');
                      if (buildSection) buildSection.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-500/30 transition-all"
                  >
                    <Terminal className="w-4 h-4" />
                    {isSpanish ? 'Ver instrucciones' : 'View instructions'}
                  </button>
                  <a
                    href={githubReleasesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    GitHub Releases
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Electron Info Panel (si estamos en Electron) */}
        {isElectron && appInfo && (
          <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-cyan-500/20 p-3 rounded-xl">
                  <Monitor className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    {isSpanish ? 'Aplicación de Escritorio Activa' : 'Desktop App Active'}
                  </h3>
                  <div className="text-white/70 text-sm space-y-1">
                    <p><span className="text-white/50">Versión:</span> v{appInfo.version}</p>
                    <p><span className="text-white/50">Plataforma:</span> {appInfo.platform}</p>
                    <p><span className="text-white/50">Carpeta de datos:</span> <code className="text-xs bg-black/30 px-2 py-1 rounded">{appInfo.userDataPath}</code></p>
                  </div>
                  
                  {/* Updater Status */}
                  {updaterStatus && getUpdaterStatusMessage() && (
                    <div className={`mt-3 ${getUpdaterStatusMessage()?.color}`}>
                      {getUpdaterStatusMessage()?.text}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  checkingUpdates 
                    ? 'bg-white/10 text-white/50 cursor-wait'
                    : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Verificar actualizaciones' : 'Check for updates'}
              </button>
            </div>
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all"
            >
              <div className="text-cyan-400 mb-3">{feature.icon}</div>
              <h3 className="text-white font-bold mb-2">{feature.title}</h3>
              <p className="text-white/60 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Data Persistence Info */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-green-500/20 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-2">
                {isSpanish ? 'Tus Datos Están Seguros' : 'Your Data is Safe'}
              </h3>
              <p className="text-white/70 mb-3">
                {isSpanish 
                  ? 'Al actualizar la aplicación, todos tus datos, perfiles, historiales y configuraciones se mantienen intactos. Los datos se almacenan en una carpeta separada que no se modifica durante las actualizaciones.'
                  : 'When updating the app, all your data, profiles, histories and settings remain intact. Data is stored in a separate folder that is not modified during updates.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  ✓ {isSpanish ? 'Perfiles' : 'Profiles'}
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  ✓ {isSpanish ? 'Base de datos' : 'Database'}
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  ✓ {isSpanish ? 'Historiales' : 'Histories'}
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  ✓ {isSpanish ? 'APIs configuradas' : 'Configured APIs'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Downloads Section */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-cyan-400" />
            {isSpanish ? 'Versiones Disponibles' : 'Available Versions'}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {downloads.map((item) => (
              <div 
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/30 transition-all"
              >
                {/* Platform Header */}
                <div className={`bg-gradient-to-r ${getPlatformColor(item.platform)} p-4 flex items-center gap-4`}>
                  <div className="bg-white/20 p-3 rounded-xl">
                    {getPlatformIcon(item.platform)}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{item.name}</h3>
                    <div className="text-white/80 text-sm">
                      v{item.version} • {item.size}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Features */}
                  <div className="mb-4">
                    <h4 className="text-white/70 text-xs uppercase tracking-wide mb-2">
                      {isSpanish ? 'Características' : 'Features'}
                    </h4>
                    <ul className="space-y-1">
                      {item.features.map((feature, idx) => (
                        <li key={idx} className="text-white/80 text-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div className="mb-4">
                    <h4 className="text-white/70 text-xs uppercase tracking-wide mb-2">
                      {isSpanish ? 'Requisitos' : 'Requirements'}
                    </h4>
                    <ul className="space-y-1">
                      {item.requirements.map((req, idx) => (
                        <li key={idx} className="text-white/60 text-sm">• {req}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(item)}
                    className="w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/25"
                  >
                    <Download className="w-5 h-5" />
                    {isSpanish ? 'Descargar' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub Releases Link */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">
                {isSpanish ? 'Todas las Versiones' : 'All Releases'}
              </h3>
              <p className="text-white/60 text-sm">
                {isSpanish 
                  ? 'Consulta todas las versiones disponibles en GitHub'
                  : 'Check all available versions on GitHub'}
              </p>
            </div>
            <a
              href={githubReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              GitHub Releases
            </a>
          </div>
        </div>

        {/* Build Instructions */}
        <div data-build-instructions className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-yellow-400" />
            {isSpanish ? '⚡ Compilar Aplicación de Escritorio' : '⚡ Build Desktop App'}
          </h3>
          <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-green-400"># {isSpanish ? 'Compilar para Windows' : 'Build for Windows'}</div>
            <div className="text-white">npm run electron:build:win</div>
            <div className="text-green-400 mt-3"># {isSpanish ? 'Compilar para macOS' : 'Build for macOS'}</div>
            <div className="text-white">npm run electron:build:mac</div>
            <div className="text-green-400 mt-3"># {isSpanish ? 'Compilar para Linux' : 'Build for Linux'}</div>
            <div className="text-white">npm run electron:build:linux</div>
          </div>
          <p className="text-white/50 text-xs mt-3">
            {isSpanish 
              ? 'Los archivos compilados se guardarán en la carpeta /release'
              : 'Compiled files will be saved in the /release folder'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default DownloadsModule;
