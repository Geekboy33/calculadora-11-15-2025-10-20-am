/**
 * Downloads Module - Centro de Descargas
 * Permite descargar versiones de escritorio para Windows, Mac y Linux
 */

import { useState } from 'react';
import { Download, Monitor, Apple, Terminal, CheckCircle, Clock, HardDrive, Shield, Zap, Globe, Package, ExternalLink } from 'lucide-react';
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

export function DownloadsModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const currentVersion = '1.0.0';
  const releaseDate = '2025-12-12';

  const downloads: DownloadItem[] = [
    {
      id: 'windows-x64',
      platform: 'windows',
      name: 'Windows (64-bit)',
      version: currentVersion,
      size: '~85 MB',
      filename: `ledgerdaesterminal-${currentVersion}-win-x64.exe`,
      downloadUrl: `/downloads/ledgerdaesterminal-${currentVersion}-win-x64.exe`,
      releaseDate,
      features: [
        isSpanish ? 'Instalador automático' : 'Automatic installer',
        isSpanish ? 'Acceso directo en escritorio' : 'Desktop shortcut',
        isSpanish ? 'Actualizaciones automáticas' : 'Auto-updates',
        isSpanish ? 'Modo offline disponible' : 'Offline mode available',
      ],
      requirements: [
        'Windows 10/11 (64-bit)',
        '4 GB RAM',
        '500 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
    {
      id: 'windows-x86',
      platform: 'windows',
      name: 'Windows (32-bit)',
      version: currentVersion,
      size: '~80 MB',
      filename: `ledgerdaesterminal-${currentVersion}-win-ia32.exe`,
      downloadUrl: `/downloads/ledgerdaesterminal-${currentVersion}-win-ia32.exe`,
      releaseDate,
      features: [
        isSpanish ? 'Compatible con sistemas antiguos' : 'Compatible with older systems',
        isSpanish ? 'Instalador automático' : 'Automatic installer',
        isSpanish ? 'Modo offline disponible' : 'Offline mode available',
      ],
      requirements: [
        'Windows 7/8/10 (32-bit)',
        '2 GB RAM',
        '400 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
    {
      id: 'mac-universal',
      platform: 'mac',
      name: 'macOS (Universal)',
      version: currentVersion,
      size: '~95 MB',
      filename: `ledgerdaesterminal-${currentVersion}-mac-universal.dmg`,
      downloadUrl: `/downloads/ledgerdaesterminal-${currentVersion}-mac-universal.dmg`,
      releaseDate,
      features: [
        isSpanish ? 'Compatible con Intel y Apple Silicon' : 'Intel & Apple Silicon compatible',
        isSpanish ? 'Integración con macOS' : 'macOS integration',
        isSpanish ? 'Notificaciones nativas' : 'Native notifications',
      ],
      requirements: [
        'macOS 10.15+',
        '4 GB RAM',
        '500 MB ' + (isSpanish ? 'espacio en disco' : 'disk space'),
      ],
    },
    {
      id: 'linux-deb',
      platform: 'linux',
      name: 'Linux (Debian/Ubuntu)',
      version: currentVersion,
      size: '~75 MB',
      filename: `ledgerdaesterminal-${currentVersion}-linux-x64.deb`,
      downloadUrl: `/downloads/ledgerdaesterminal-${currentVersion}-linux-x64.deb`,
      releaseDate,
      features: [
        isSpanish ? 'Paquete .deb para fácil instalación' : '.deb package for easy installation',
        isSpanish ? 'Integración con el sistema' : 'System integration',
      ],
      requirements: [
        'Ubuntu 20.04+ / Debian 10+',
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

  const handleDownload = async (item: DownloadItem) => {
    setDownloading(item.id);
    setDownloadProgress(0);

    // Simular progreso de descarga
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Después de "completar", mostrar mensaje
    setTimeout(() => {
      clearInterval(interval);
      setDownloadProgress(100);
      
      setTimeout(() => {
        setDownloading(null);
        setDownloadProgress(0);
        
        // Mostrar alerta de que la versión está en desarrollo
        alert(isSpanish 
          ? `⚠️ La versión de escritorio está en desarrollo.\n\nPor ahora, puedes usar la versión web en:\nhttp://localhost:4000\n\nPróximamente estará disponible el archivo:\n${item.filename}`
          : `⚠️ Desktop version is under development.\n\nFor now, you can use the web version at:\nhttp://localhost:4000\n\nComing soon:\n${item.filename}`
        );
      }, 500);
    }, 3000);
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: isSpanish ? 'Rendimiento Nativo' : 'Native Performance',
      description: isSpanish 
        ? 'Aplicación de escritorio optimizada para máximo rendimiento'
        : 'Desktop app optimized for maximum performance',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: isSpanish ? 'Seguridad Mejorada' : 'Enhanced Security',
      description: isSpanish
        ? 'Almacenamiento local encriptado y conexiones seguras'
        : 'Encrypted local storage and secure connections',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: isSpanish ? 'Modo Offline' : 'Offline Mode',
      description: isSpanish
        ? 'Trabaja sin conexión y sincroniza cuando te reconectes'
        : 'Work offline and sync when you reconnect',
    },
    {
      icon: <Package className="w-6 h-6" />,
      title: isSpanish ? 'Actualizaciones Automáticas' : 'Auto Updates',
      description: isSpanish
        ? 'Recibe las últimas funciones automáticamente'
        : 'Receive the latest features automatically',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d0d0d] to-[#1a1a1a] border-b border-white/10 p-8 sticky top-0 z-10">
        <div className="flex items-center justify-between">
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
            <div className="text-2xl font-bold text-cyan-400">v{currentVersion}</div>
            <div className="text-white/50 text-xs mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {releaseDate}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-8">
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
                    disabled={downloading !== null}
                    className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                      downloading === item.id
                        ? 'bg-cyan-600 cursor-wait'
                        : downloading !== null
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg hover:shadow-cyan-500/25'
                    }`}
                  >
                    {downloading === item.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isSpanish ? 'Descargando...' : 'Downloading...'} {Math.min(100, Math.round(downloadProgress))}%
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        {isSpanish ? 'Descargar' : 'Download'} {item.filename.split('-').pop()}
                      </>
                    )}
                  </button>

                  {/* Progress Bar */}
                  {downloading === item.id && (
                    <div className="mt-3 bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, downloadProgress)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Web Version Notice */}
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-cyan-500/20 p-3 rounded-xl">
              <Globe className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-2">
                {isSpanish ? '¿Prefieres la versión web?' : 'Prefer the web version?'}
              </h3>
              <p className="text-white/70 mb-4">
                {isSpanish 
                  ? 'También puedes acceder a DAES CoreBanking directamente desde tu navegador sin necesidad de instalar nada.'
                  : 'You can also access DAES CoreBanking directly from your browser without installing anything.'}
              </p>
              <a 
                href="http://localhost:4000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/30 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                {isSpanish ? 'Abrir versión web' : 'Open web version'}
              </a>
            </div>
          </div>
        </div>

        {/* Build Instructions (for developers) */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            {isSpanish ? 'Para Desarrolladores' : 'For Developers'}
          </h3>
          <p className="text-white/70 mb-4">
            {isSpanish 
              ? 'Para compilar la versión de escritorio localmente, ejecuta:'
              : 'To build the desktop version locally, run:'}
          </p>
          <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm">
            <div className="text-green-400"># {isSpanish ? 'Instalar dependencias de Electron' : 'Install Electron dependencies'}</div>
            <div className="text-white">npm install electron electron-builder --save-dev</div>
            <div className="text-white/50 mt-3"># {isSpanish ? 'Compilar para Windows' : 'Build for Windows'}</div>
            <div className="text-white">npm run electron:build:win</div>
            <div className="text-white/50 mt-3"># {isSpanish ? 'Compilar para todas las plataformas' : 'Build for all platforms'}</div>
            <div className="text-white">npm run electron:build</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DownloadsModule;

