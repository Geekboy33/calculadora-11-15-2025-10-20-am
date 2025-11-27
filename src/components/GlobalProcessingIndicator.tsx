import { useState, useEffect } from 'react';
import { Activity, Pause, Play, X, CheckCircle, AlertCircle, Database, RotateCcw } from 'lucide-react';
import { processingStore, ProcessingState } from '../lib/processing-store';
import { useLanguage } from '../lib/i18n';

export function GlobalProcessingIndicator() {
  const { language } = useLanguage();
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);

  const isSpanish = language === 'es';

  useEffect(() => {
    const loadAndSubscribe = async () => {
      await processingStore.loadState();
      const unsubscribe = processingStore.subscribe((state) => {
        setProcessingState(state);
        if (state && (state.status === 'paused' || state.progress < 100)) {
          setShowContinuePrompt(true);
        } else {
          setShowContinuePrompt(false);
        }
      });
      return unsubscribe;
    };

    let cleanup: (() => void) | undefined;
    loadAndSubscribe().then(unsub => { cleanup = unsub; });

    return () => cleanup?.();
  }, []);

  if (!processingState || processingState.status === 'idle' || processingState.progress >= 100) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = () => {
    switch (processingState.status) {
      case 'processing':
        return 'bg-blue-600';
      case 'paused':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-white/20';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'processing':
        return <Activity className="w-4 h-4 animate-pulse" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (processingState.status) {
      case 'processing':
        return isSpanish ? 'Procesando' : 'Processing';
      case 'paused':
        return isSpanish ? 'Pausado' : 'Paused';
      case 'completed':
        return isSpanish ? 'Completado' : 'Completed';
      case 'error':
        return 'Error';
      default:
        return isSpanish ? 'Desconocido' : 'Unknown';
    }
  };

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className={`${getStatusColor()} text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-semibold">{processingState.progress.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 animate-fade-in">
      <div className="bg-[#0d0d0d] border border-[#ffffff]/30 rounded-lg shadow-[0_0_20px_rgba(255, 255, 255,0.2)] overflow-hidden">
        {/* Header */}
        <div className={`${getStatusColor()} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-white font-semibold text-sm">{getStatusText()}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/20 rounded p-1 transition-colors"
              title="Minimizar"
            >
              <span className="text-xs">_</span>
            </button>
            {processingState.status === 'completed' && (
              <button
                onClick={async () => await processingStore.clearState()}
                className="text-white hover:bg-white/20 rounded p-1 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Nombre del archivo */}
          <div>
            <div className="text-xs text-[#ffffff] mb-1">{isSpanish ? 'Archivo:' : 'File:'}</div>
            <div className="text-sm text-[#ffffff] font-mono truncate" title={processingState.fileName}>
              {processingState.fileName}
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex justify-between text-xs text-[#ffffff] mb-2">
              <span>{isSpanish ? 'Progreso' : 'Progress'}</span>
              <span className="font-semibold">{processingState.progress.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-[#0a0a0a] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  processingState.status === 'completed'
                    ? 'bg-white/20'
                    : processingState.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-[#ffffff]'
                }`}
                style={{ width: `${processingState.progress}%` }}
              />
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[#ffffff]">{isSpanish ? 'Procesado:' : 'Processed:'}</div>
              <div className="text-[#ffffff] font-semibold">
                {formatBytes(processingState.bytesProcessed)}
              </div>
            </div>
            <div>
              <div className="text-[#ffffff]">{isSpanish ? 'Total:' : 'Total:'}</div>
              <div className="text-[#ffffff] font-semibold">
                {formatBytes(processingState.fileSize)}
              </div>
            </div>
            <div>
              <div className="text-[#ffffff]">Chunk:</div>
              <div className="text-[#ffffff] font-semibold">
                {processingState.chunkIndex} / {processingState.totalChunks}
              </div>
            </div>
            <div>
              <div className="text-[#ffffff]">{isSpanish ? 'Monedas:' : 'Currencies:'}</div>
              <div className="text-[#ffffff] font-semibold">
                {processingState.balances.length}
              </div>
            </div>
          </div>

          {/* Estado de sincronización */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#ffffff]">
              {isSpanish ? 'Última actualización:' : 'Last update:'} {formatTime(processingState.lastUpdateTime)}
            </span>
            {processingState.syncStatus === 'syncing' && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Activity className="w-3 h-3 animate-spin" />
                <span className="font-semibold">{isSpanish ? 'Sincronizando...' : 'Syncing...'}</span>
              </div>
            )}
            {processingState.syncStatus === 'synced' && processingState.lastSyncTime && (
              <div className="flex items-center gap-1 text-white">
                <CheckCircle className="w-3 h-3" />
                <span className="font-semibold">{isSpanish ? 'Guardado en nube' : 'Saved to cloud'}</span>
              </div>
            )}
            {processingState.syncStatus === 'error' && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                <span className="font-semibold">{isSpanish ? 'Error sincronización' : 'Sync error'}</span>
              </div>
            )}
            {processingState.syncStatus === 'local-only' && (
              <div className="flex items-center gap-1 text-orange-400">
                <AlertCircle className="w-3 h-3" />
                <span className="font-semibold">{isSpanish ? 'Solo local' : 'Local only'}</span>
              </div>
            )}
          </div>

          {/* Mensaje de error */}
          {processingState.status === 'error' && processingState.errorMessage && (
            <div className="bg-red-900/20 border border-red-500/30 rounded p-2 text-xs text-red-300">
              {processingState.errorMessage}
            </div>
          )}

          {/* Botón para continuar proceso pausado */}
          {processingState.status === 'paused' && (
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate-to-analyzer'));
              }}
              className="w-full bg-gradient-to-r from-[#ffa500] to-[#ff8c00] hover:from-[#ff8c00] hover:to-[#ff7700] text-black px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,165,0,0.4)]"
            >
              <Play className="w-4 h-4" />
              Ir al Analizador para Reanudar
            </button>
          )}

          {/* Mensaje de proceso activo */}
          {processingState.status === 'processing' && (
            <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded p-3 text-center">
              <p className="text-[#ffffff] text-xs font-semibold flex items-center justify-center gap-2">
                <Activity className="w-3 h-3 animate-spin" />
                {isSpanish 
                  ? 'El archivo se está procesando en segundo plano'
                  : 'File is being processed in the background'}
              </p>
              <p className="text-[#ffffff] text-xs mt-1">
                ✓ {isSpanish 
                  ? 'Puedes navegar libremente sin interrumpir la carga'
                  : 'You can navigate freely without interrupting the load'}
              </p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {processingState.status === 'completed' && (
            <div className="bg-white/10/20 border border-white/30/30 rounded p-2 text-xs text-white">
              ✓ Procesamiento completado exitosamente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

