/**
 * Ledger Status Indicator
 * Indicador global del estado del archivo Ledger1
 * Muestra en todos los módulos si el archivo está cargado y permite refrescar
 */

import { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, Upload, Play } from 'lucide-react';
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';
import { useLanguage } from '../lib/i18n';

interface LedgerStatusIndicatorProps {
  onLoadFile?: () => void;
  showFullDetails?: boolean;
}

export function LedgerStatusIndicator({ onLoadFile, showFullDetails = false }: LedgerStatusIndicatorProps) {
  const { language } = useLanguage();
  const [status, setStatus] = useState(ledgerPersistenceStore.getStatus());
  const [showDetails, setShowDetails] = useState(false);
  const isSpanish = language === 'es';

  useEffect(() => {
    const unsubscribe = ledgerPersistenceStore.subscribe(() => {
      setStatus(ledgerPersistenceStore.getStatus());
    });

    return unsubscribe;
  }, []);

  const getStatusColor = () => {
    if (!status.isLoaded) return 'text-red-400 border-red-500 bg-red-500/10';
    if (status.isProcessing) return 'text-yellow-400 border-yellow-500 bg-yellow-500/10';
    if (status.isComplete) return 'text-white border-white/30 bg-white/20/10';
    return 'text-orange-400 border-orange-500 bg-orange-500/10';
  };

  const getStatusIcon = () => {
    if (!status.isLoaded) return <AlertTriangle className="w-4 h-4" />;
    if (status.isProcessing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (status.isComplete) return <CheckCircle className="w-4 h-4" />;
    return <Database className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!status.isLoaded) {
      return isSpanish ? 'Ledger No Cargado' : 'Ledger Not Loaded';
    }
    if (status.isProcessing) {
      return isSpanish ? `Procesando: ${status.progress.toFixed(1)}%` : `Processing: ${status.progress.toFixed(1)}%`;
    }
    if (status.isComplete) {
      return isSpanish ? 'Ledger Listo' : 'Ledger Ready';
    }
    return isSpanish ? 'Ledger Parcial' : 'Ledger Partial';
  };

  const recoveryInfo = ledgerPersistenceStore.getRecoveryInfo();

  return (
    <div className="relative">
      {/* Indicador Compacto */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${getStatusColor()} hover:opacity-80`}
        title={isSpanish ? 'Click para ver detalles' : 'Click for details'}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        {status.balancesCount > 0 && (
          <span className="px-2 py-0.5 bg-black/30 rounded text-xs">
            {status.balancesCount} {isSpanish ? 'balances' : 'balances'}
          </span>
        )}
      </button>

      {/* Panel de Detalles */}
      {(showDetails || showFullDetails) && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-[#0d0d0d] border-2 border-cyan-500/50 rounded-lg shadow-2xl z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {isSpanish ? 'Estado del Ledger' : 'Ledger Status'}
            </h3>
            {!showFullDetails && (
              <button
                onClick={() => setShowDetails(false)}
                className="text-cyan-400 hover:text-cyan-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Información del Archivo */}
          {status.fileName ? (
            <div className="space-y-3">
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-xs text-cyan-300/60 mb-1">
                  {isSpanish ? 'Archivo:' : 'File:'}
                </div>
                <div className="text-sm text-white font-mono truncate">
                  {status.fileName}
                </div>
              </div>

              {/* Progreso */}
              {status.isProcessing && (
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-yellow-300/60">
                      {isSpanish ? 'Progreso:' : 'Progress:'}
                    </span>
                    <span className="text-sm text-yellow-300 font-bold">
                      {status.progress.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-white/20 transition-all duration-300"
                      style={{ width: `${status.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Balances */}
              {status.balancesCount > 0 && (
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">
                      {isSpanish ? 'Balances Cargados:' : 'Loaded Balances:'}
                    </span>
                    <span className="text-lg text-white font-bold">
                      {status.balancesCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Estado de Completado */}
              {status.isComplete && (
                <div className="bg-white/10/30 border border-white/30/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {isSpanish 
                        ? '✅ Ledger completamente procesado'
                        : '✅ Ledger fully processed'}
                    </span>
                  </div>
                </div>
              )}

              {/* Recuperación Disponible */}
              {recoveryInfo && !status.isComplete && (
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-300 mb-2">
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {isSpanish 
                        ? 'Recuperación disponible'
                        : 'Recovery available'}
                    </span>
                  </div>
                  <div className="text-xs text-orange-300/80">
                    {isSpanish 
                      ? `Última carga: ${recoveryInfo.percentage.toFixed(1)}%`
                      : `Last load: ${recoveryInfo.percentage.toFixed(1)}%`}
                  </div>
                </div>
              )}

              {/* Última Sincronización */}
              {status.lastSync > 0 && (
                <div className="text-xs text-cyan-300/40">
                  {isSpanish ? 'Última actualización:' : 'Last update:'}{' '}
                  {new Date(status.lastSync).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <div className="text-red-300 font-semibold mb-2">
                {isSpanish 
                  ? 'No hay archivo Ledger cargado'
                  : 'No Ledger file loaded'}
              </div>
              <div className="text-red-300/60 text-sm mb-4">
                {isSpanish 
                  ? 'Carga el archivo para acceder a los balances'
                  : 'Load the file to access balances'}
              </div>
              {onLoadFile && (
                <button
                  onClick={onLoadFile}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-4 h-4" />
                  {isSpanish ? 'Cargar Archivo Ledger' : 'Load Ledger File'}
                </button>
              )}
            </div>
          )}

          {/* Botón de Refrescar */}
          {status.fileName && onLoadFile && (
            <button
              onClick={onLoadFile}
              className="w-full mt-3 px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {isSpanish ? 'Refrescar Ledger' : 'Refresh Ledger'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

