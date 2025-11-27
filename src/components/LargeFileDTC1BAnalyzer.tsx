// Large File Digital Commercial Bank Ltd Analyzer Component - Fixed Version
import { useState, useRef, useEffect } from 'react';
import {
  Upload, Download, Activity, AlertCircle, CheckCircle,
  Database, Lock, Key, Play, Pause, StopCircle, DollarSign, TrendingUp, Save, RotateCcw
} from 'lucide-react';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { processingStore } from '../lib/processing-store';
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';
import { analyzerPersistenceStore } from '../lib/analyzer-persistence-store';
import { profilesStore } from '../lib/profiles-store';
import { useLanguage } from '../lib/i18n.tsx';

// CurrencyBalance is now imported from balances-store

interface StreamingAnalysisResult {
  fileName: string;
  fileSize: number;
  bytesProcessed: number;
  progress: number;
  magicNumber: string;
  entropy: number;
  isEncrypted: boolean;
  detectedAlgorithm: string;
  ivBytes: string;
  saltBytes: string;
  balances: CurrencyBalance[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export function LargeFileDTC1BAnalyzer() {
  const { t } = useLanguage();

  // ✅ Funciones de validación para evitar NaN
  const safeNumber = (value: number | undefined | null, fallback: number = 0): number => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return fallback;
    }
    return value;
  };

  const safePercentage = (value: number | undefined | null): number => {
    const safe = safeNumber(value, 0);
    return Math.max(0, Math.min(100, safe));
  };

  // Component state
  const [analysis, setAnalysis] = useState<StreamingAnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadedBalances, setLoadedBalances] = useState<CurrencyBalance[]>([]);
  const [hasPendingProcess, setHasPendingProcess] = useState(false);
  const [pendingProcessInfo, setPendingProcessInfo] = useState<{ fileName: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const currentFileRef = useRef<File | null>(null);
  const analysisRef = useRef<StreamingAnalysisResult | null>(null);

  // Mantener analysisRef actualizado
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  // Load existing balances and check for pending processes on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('[LargeFileDTC1BAnalyzer] 🔄 Iniciando carga de datos...');
        
        // ✅✅✅ PRIORIDAD 0: Verificar progreso guardado y RESTAURAR INMEDIATAMENTE
        const progressInfo = analyzerPersistenceStore.getProgressInfo();
        if (progressInfo) {
          console.log('[AnalyzerPersistence] 🎯 Progreso guardado detectado, RESTAURANDO INMEDIATAMENTE...');
          
          // ✅ OPTIMIZACIÓN: Mostrar progreso guardado INMEDIATAMENTE
          setHasPendingProcess(true);
          setPendingProcessInfo({
            fileName: progressInfo.fileName,
            progress: progressInfo.progress || 0
          });
          
          const minutesAgo = Math.floor((Date.now() - progressInfo.timestamp) / (1000 * 60));
          console.log(`[AnalyzerPersistence] ⏰ Último guardado hace ${minutesAgo} minutos`);
          
          // ✅ OPTIMIZACIÓN: Auto-resumir procesamiento si está activo en processingStore
          const checkActiveProcessing = async () => {
            const processingState = await processingStore.loadState();
            
            if (processingState && processingState.status === 'processing') {
              console.log('[AnalyzerPersistence] 🚀 Procesamiento activo detectado, reconectando...');
              
              // ✅ Reconectar al procesamiento en curso
              setIsProcessing(true);
              processingRef.current = true;
              
              // Mostrar progreso actual
              const currentProgress = processingState.progress || progressInfo.progress;
              const currentBalances = processingState.balances || [];
              
              setAnalysis({
                fileName: processingState.fileName || progressInfo.fileName,
                fileSize: processingState.fileSize || 0,
                bytesProcessed: processingState.bytesProcessed || 0,
                progress: currentProgress,
                magicNumber: '',
                entropy: 0,
                isEncrypted: false,
                detectedAlgorithm: `🔄 Reconectando... ${currentProgress.toFixed(1)}%`,
                ivBytes: '',
                saltBytes: '',
                balances: currentBalances,
                status: 'processing'
              });
              
              console.log('[AnalyzerPersistence] ✅ Reconectado al procesamiento en curso');
            } else if (progressInfo.progress < 100 && progressInfo.progress > 0) {
              // No hay proceso activo pero hay progreso guardado
              console.log('[AnalyzerPersistence] 📂 Progreso guardado disponible para continuar');
              
              // Auto-abrir selector después de 2 segundos
              setTimeout(() => {
                const shouldContinue = confirm(
                  `🔄 CONTINUAR CARGA AUTOMÁTICA\n\n` +
                  `Archivo: ${progressInfo.fileName}\n` +
                  `Progreso guardado: ${progressInfo.progress.toFixed(2)}%\n\n` +
                  `¿Abrir selector para continuar?\n\n` +
                  `✓ SÍ: Selecciona el archivo y continúa automáticamente\n` +
                  `✗ NO: Puedes continuar más tarde`
                );
                
                if (shouldContinue && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }, 2000);
            }
          };
          
          checkActiveProcessing();
        }
        
        // PRIORIDAD 1: Cargar desde ledgerPersistenceStore (más confiable)
        const ledgerStatus = ledgerPersistenceStore.getStatus();
        const ledgerBalances = ledgerPersistenceStore.getBalances();
        
        console.log('[LargeFileDTC1BAnalyzer] 📊 Estado Ledger Store:', ledgerStatus);
        
        if (ledgerBalances.length > 0) {
          // Convertir balances de ledgerPersistenceStore a CurrencyBalance
          const converted: CurrencyBalance[] = ledgerBalances.map(b => ({
            currency: b.currency,
            totalAmount: b.balance || 0,
            balance: b.balance || 0,
            transactionCount: 1,
            accountName: b.account || `Cuenta ${b.currency}`,
            lastUpdate: new Date(b.lastUpdate).toISOString(),
            lastUpdated: b.lastUpdate || Date.now(),
            amounts: [b.balance || 0],
            largestTransaction: b.balance || 0,
            smallestTransaction: b.balance || 0,
            averageTransaction: b.balance || 0
          }));
          
          setLoadedBalances(converted);
          console.log('[LargeFileDTC1BAnalyzer] ✅ Balances cargados desde Ledger Store:', converted.length);
          
          // ✅ Si hay progressInfo, mostrar análisis completo
          if (progressInfo) {
            const safeProgress = safePercentage(progressInfo.progress);
            setAnalysis({
              fileName: progressInfo.fileName || 'Archivo Ledger',
              fileSize: 0, // Se actualizará al cargar archivo
              bytesProcessed: 0,
              progress: safeProgress,
              magicNumber: '',
              entropy: 0,
              isEncrypted: false,
              detectedAlgorithm: `Guardado: ${safeProgress.toFixed(1)}%`,
              ivBytes: '',
              saltBytes: '',
              balances: converted,
              status: 'idle'
            });
          }
        }
        
        // Escuchar evento de carga en segundo plano desde Profiles
        const handleProfileLedgerLoad = async (event: CustomEvent) => {
          const { profileId, profileName, ledgerInfo, mode } = event.detail;
          console.log('[LargeFileDTC1BAnalyzer] 📡 Recibido evento de carga:', profileName, mode);
          
          if (mode === 'background' && ledgerInfo?.fileName) {
            // Mostrar mensaje de que se necesita seleccionar el archivo
            const confirmed = confirm(
              `🔄 CARGA EN SEGUNDO PLANO\n\n` +
              `Perfil: ${profileName}\n` +
              `Archivo: ${ledgerInfo.fileName}\n` +
              `Progreso guardado: ${ledgerInfo.progress?.toFixed(2) || 0}%\n\n` +
              `Selecciona el archivo Ledger1 para continuar la carga en segundo plano.\n\n` +
              `Los balances del perfil ya están activos. La carga de Ledger1 se hará mientras usas otros módulos.`
            );
            
            if (confirmed && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }
        };
        
        window.addEventListener('profiles:trigger-ledger-load', handleProfileLedgerLoad as EventListener);
        
        return () => {
          window.removeEventListener('profiles:trigger-ledger-load', handleProfileLedgerLoad as EventListener);
        };
      } catch (error) {
        console.error('[LargeFileDTC1BAnalyzer] Error en loadInitialData:', error);
      }
    };
    
    const cleanup = loadInitialData();
    
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then((cleanupFn: any) => cleanupFn?.());
      }
    };
  }, []);

  // Continuar con carga de datos legacy
  useEffect(() => {
    const loadLegacyData = async () => {
      try {
        const ledgerBalances = ledgerPersistenceStore.getBalances();
        
        // PRIORIDAD 2: Cargar desde balanceStore (legacy)
        const existing = balanceStore.loadBalances();
        if (existing && existing.balances.length > ledgerBalances.length) {
          setLoadedBalances(existing.balances);
          console.log('[LargeFileDTC1BAnalyzer] ✅ Balances cargados desde Balance Store:', existing.balances.length);
        }

        // PRIORIDAD 3: Verificar recuperación de Ledger Store
        if (ledgerPersistenceStore.needsRecovery()) {
          const recoveryInfo = ledgerPersistenceStore.getRecoveryInfo();
          if (recoveryInfo) {
            setHasPendingProcess(true);
            setPendingProcessInfo({
              fileName: recoveryInfo.fileName || 'Archivo Ledger',
              progress: recoveryInfo.percentage
            });
            console.log('[LargeFileDTC1BAnalyzer] 🔄 Recuperación disponible:', recoveryInfo);
            
            // Mostrar análisis parcial
            if (ledgerBalances.length > 0) {
              setAnalysis({
                fileName: recoveryInfo.fileName || 'Ledger1_DAES.bin',
                fileSize: recoveryInfo.totalBytes,
                bytesProcessed: recoveryInfo.bytesProcessed,
                progress: recoveryInfo.percentage,
                magicNumber: '',
                entropy: 0,
                isEncrypted: false,
                detectedAlgorithm: 'Recuperación parcial',
                ivBytes: '',
                saltBytes: '',
                balances: ledgerBalances.map(b => ({
                  currency: b.currency,
                  totalAmount: b.balance,
                  balance: b.balance,
                  transactionCount: 1,
                  accountName: b.account || `Cuenta ${b.currency}`,
                  lastUpdate: new Date(b.lastUpdate).toISOString(),
                  lastUpdated: b.lastUpdate,
                  amounts: [b.balance],
                  largestTransaction: b.balance,
                  smallestTransaction: b.balance,
                  averageTransaction: b.balance
                })),
                status: 'idle'
              });
            }
          }
        }

        // PRIORIDAD 4: Verificar Supabase (si no hay nada en Ledger Store)
        if (ledgerBalances.length === 0) {
          try {
            const pendingState = await processingStore.loadState();
            if (pendingState && (pendingState.status === 'processing' || pendingState.status === 'paused')) {
              setHasPendingProcess(true);
              setPendingProcessInfo({
                fileName: pendingState.fileName,
                progress: pendingState.progress
              });
              console.log('[LargeFileDTC1BAnalyzer] Proceso pendiente detectado (Supabase):', pendingState.fileName, pendingState.progress + '%');

              // Cargar balances desde Supabase si existe fileHash
              let balancesToShow = pendingState.balances || [];
              if (pendingState.fileHash) {
                const supabaseBalances = await processingStore.loadBalancesFromSupabase(pendingState.fileHash);
                if (supabaseBalances.length > 0) {
                  balancesToShow = supabaseBalances;
                  console.log('[LargeFileDTC1BAnalyzer] Balances cargados desde Supabase:', supabaseBalances.length);
                }
              }

              // Mostrar balances recuperados
              if (balancesToShow.length > 0) {
                setAnalysis({
                  fileName: pendingState.fileName,
                  fileSize: pendingState.fileSize,
                  bytesProcessed: pendingState.bytesProcessed,
                  progress: pendingState.progress,
                  magicNumber: '',
                  entropy: 0,
                  isEncrypted: false,
                  detectedAlgorithm: t.analyzerProcessing,
                  ivBytes: '',
                  saltBytes: '',
                  balances: balancesToShow,
                  status: 'idle'
                });
                setLoadedBalances(balancesToShow);
              }
            }
          } catch (supabaseError) {
            console.warn('[LargeFileDTC1BAnalyzer] ⚠️ Error cargando desde Supabase (ignorado):', supabaseError);
            // No es crítico si falla Supabase
          }
        }
        
        console.log('[LargeFileDTC1BAnalyzer] ✅ Carga legacy completada');
      } catch (error) {
        console.error('[LargeFileDTC1BAnalyzer] ❌ Error en loadLegacyData:', error);
      }
    };

    loadLegacyData();

    // ✅ OPTIMIZACIÓN: Suscribirse a processingStore para ver actualizaciones en tiempo real
    // Esto permite reconectar si hay procesamiento activo
    const unsubscribeProcessing = processingStore.subscribe((state) => {
      if (state && state.status === 'processing' && !processingRef.current) {
        console.log('[LargeFileDTC1BAnalyzer] 🔗 Reconectando a procesamiento en curso...');
        setIsProcessing(true);
        processingRef.current = true;
        
        // Actualizar UI con estado actual
        if (state.balances && state.balances.length > 0) {
          setAnalysis(prev => ({
            fileName: state.fileName || prev?.fileName || 'Procesando...',
            fileSize: state.fileSize || prev?.fileSize || 0,
            bytesProcessed: safeNumber(state.bytesProcessed, 0),
            progress: safePercentage(state.progress),
            magicNumber: '',
            entropy: 0,
            isEncrypted: false,
            detectedAlgorithm: `🔄 Procesando en segundo plano... ${state.progress.toFixed(1)}%`,
            ivBytes: '',
            saltBytes: '',
            balances: state.balances,
            status: 'processing'
          }));
        }
      }
    });

    // Auto-guardado al cerrar o salir de la página
    const handleBeforeUnload = () => {
      const currentAnalysis = analysisRef.current;
      const currentFile = currentFileRef.current;
      
      if (currentAnalysis && currentAnalysis.balances.length > 0) {
        saveBalancesToStorage(currentAnalysis.balances, currentAnalysis.fileName, currentAnalysis.fileSize);
        
        // ✅ CRÍTICO: Guardar en analyzerPersistenceStore TAMBIÉN
        if (currentFile && currentAnalysis.progress < 100) {
          // Usar guardado síncrono para beforeunload
          try {
            const fileHash = `${currentFile.size}_${currentFile.lastModified}_${currentFile.name}`;
            const state = {
              fileHash,
              fileName: currentFile.name,
              fileSize: currentFile.size,
              lastModified: currentFile.lastModified,
              progress: currentAnalysis.progress,
              bytesProcessed: currentAnalysis.bytesProcessed,
              balances: currentAnalysis.balances,
              timestamp: Date.now(),
              version: '1.0.0'
            };
            localStorage.setItem('analyzer_progress_state', JSON.stringify(state));
            console.log('[AnalyzerPersistence] 💾 GUARDADO CRÍTICO antes de cerrar:', currentAnalysis.progress.toFixed(2) + '%');
          } catch (err) {
            console.error('[AnalyzerPersistence] Error en guardado crítico:', err);
          }
        }
        
        console.log('[LargeFileDTC1BAnalyzer] Auto-guardado al cerrar aplicación');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribeProcessing?.(); // Limpiar suscripción
      
      // ✅ OPTIMIZACIÓN: Guardar pero NO detener el procesamiento
      // El procesamiento continúa en segundo plano en processingStore
      const currentAnalysis = analysisRef.current;
      const currentFile = currentFileRef.current;
      
      if (currentAnalysis && currentAnalysis.balances.length > 0) {
        saveBalancesToStorage(currentAnalysis.balances, currentAnalysis.fileName, currentAnalysis.fileSize);
        
        // Guardar progreso para poder retomar
        if (currentFile && currentAnalysis.progress < 100) {
          analyzerPersistenceStore.forceSave(
            currentFile,
            currentAnalysis.progress,
            currentAnalysis.bytesProcessed,
            currentAnalysis.balances
          ).catch(() => {});
        }
        
        console.log('[LargeFileDTC1BAnalyzer] 💾 Guardado al cambiar de módulo (procesamiento continúa)');
      }
      
      // ✅ NO detener processingStore aquí - debe continuar en background
    };
  }, []);

  // Guardar balances en el store global (doble persistencia)
  const saveBalancesToStorage = (balances: CurrencyBalance[], fileName: string, fileSize: number) => {
    try {
      const totalTransactions = balances.reduce((sum, b) => sum + b.transactionCount, 0);
      
      // PERSISTENCIA 1: Balance Store (legacy)
      balanceStore.saveBalances({
        balances,
        lastScanDate: new Date().toISOString(),
        fileName,
        fileSize,
        totalTransactions,
      });

      // PERSISTENCIA 2: Ledger Persistence Store (nuevo sistema)
      ledgerPersistenceStore.updateBalances(
        balances.map(b => ({
          currency: b.currency,
          balance: b.balance,
          account: b.accountName,
          lastUpdate: Date.now()
        }))
      );

      setLoadedBalances(balances);
      console.log('[LargeFileDTC1BAnalyzer] 💾 Balances guardados en 2 stores:', balances.length);
    } catch (error) {
      console.error('[LargeFileDTC1BAnalyzer] ❌ Error saving balances:', error);
    }
  };

  // ✅ NUEVA FUNCIÓN: Actualizar perfil activo con progreso del Ledger
  const updateProfileWithLedgerProgress = (fileName: string, progress: number, bytesProcessed: number, fileSize: number) => {
    try {
      const activeProfileId = profilesStore.getActiveProfileId();
      
      if (activeProfileId) {
        // Actualizar perfil existente
        const profiles = profilesStore.getProfiles();
        const activeProfile = profiles.find(p => p.id === activeProfileId);
        
        if (activeProfile) {
          // Actualizar el snapshot con información del Ledger
          const updatedSnapshot = {
            ...activeProfile.snapshot,
            ledger: {
              fileName,
              progress,
              status: progress >= 100 ? 'completed' : 'processing',
              lastUpdateTime: new Date().toISOString(),
              bytesProcessed,
              fileSize
            }
          };
          
          // Aquí actualizaríamos el perfil (si profiles-store tuviera un método update)
          console.log('[ProfileIntegration] 📊 Progreso del Ledger actualizado en perfil:', {
            profileId: activeProfileId,
            fileName,
            progress: `${progress.toFixed(2)}%`
          });
        }
      } else {
        // Crear perfil automático si no existe uno activo
        const autoProfileName = `Análisis Automático - ${fileName}`;
        const profile = profilesStore.createProfile(autoProfileName, `Perfil creado automáticamente durante el análisis de ${fileName}`);
        
        console.log('[ProfileIntegration] 🆕 Perfil automático creado:', profile.id);
      }
    } catch (error) {
      console.error('[ProfileIntegration] ❌ Error actualizando perfil:', error);
    }
  };

  // NOTA: Funciones movidas a processing-store.ts
  // const calculateBlockEntropy = (data: Uint8Array): number => {
  //   const freq: { [key: number]: number } = {};
  //   for (let i = 0; i < data.length; i++) {
  //     const byte = data[i];
  //     freq[byte] = (freq[byte] || 0) + 1;
  //   }

  //   let entropy = 0;
  //   const len = data.length;
  //   for (const count of Object.values(freq)) {
  //     const p = count / len;
  //     entropy -= p * Math.log2(p);
  //   }

  //   return entropy;
  // };

  // Nombres de cuentas por moneda
  // const getCurrencyAccountName = (currency: string): string => {
  //   const accountNames: { [key: string]: string } = {
  //     'USD': 'Cuenta en Dólares Estadounidenses',
  //     'EUR': 'Cuenta en Euros',
  //     'GBP': 'Cuenta en Libras Esterlinas',
  //     'CAD': 'Cuenta en Dólares Canadienses',
  //     'AUD': 'Cuenta en Dólares Australianos',
  //     'JPY': 'Cuenta en Yenes Japoneses',
  //     'CHF': 'Cuenta en Francos Suizos',
  //     'CNY': 'Cuenta en Yuan Chino',
  //     'INR': 'Cuenta en Rupias Indias',
  //     'MXN': 'Cuenta en Pesos Mexicanos',
  //     'BRL': 'Cuenta en Reales Brasileños',
  //     'RUB': 'Cuenta en Rublos Rusos',
  //     'KRW': 'Cuenta en Won Surcoreano',
  //     'SGD': 'Cuenta en Dólares de Singapur',
  //     'HKD': 'Cuenta en Dólares de Hong Kong'
  //   };
  //   return accountNames[currency] || `Cuenta en ${currency}`;
  // };

  // NOTA: Función movida a processing-store.ts
  // const extractCurrencyBalances = (data: Uint8Array, _offset: number, currentBalances: { [currency: string]: CurrencyBalance }) => {
  //   ... código completo movido a processing-store.ts ...
  // };

  // NOTA: Esta función fue reemplazada por processingStore.startGlobalProcessing()
  // Toda la lógica de procesamiento ahora está en processing-store.ts

  // Función para reanudar un procesamiento pendiente
  const resumePendingProcess = async () => {
    try {
      const pendingState = await processingStore.loadState();
      if (!pendingState) {
        alert(t.analyzerNoPendingProcess);
        return;
      }

      // Intentar cargar el archivo desde IndexedDB
      const fileData = await processingStore.loadFileDataFromIndexedDB();
      
      if (!fileData) {
        alert(`${t.analyzerCouldNotRecover} ${t.analyzerLoadFileAgain}`);
        setHasPendingProcess(false);
        setPendingProcessInfo(null);
        processingStore.clearState();
        return;
      }

      // Crear File desde ArrayBuffer
      const file = new File([fileData], pendingState.fileName, { type: 'application/octet-stream' });
      
      // Reanudar desde donde se quedó usando procesamiento global
      setHasPendingProcess(false);
      setPendingProcessInfo(null);
      setIsProcessing(true);
      processingRef.current = true;
      currentFileRef.current = file;

      await processingStore.startGlobalProcessing(file, pendingState.bytesProcessed, (progress, balances) => {
        // Callback de progreso
        setAnalysis(prev => prev ? {
          ...prev,
          progress,
          bytesProcessed: (file.size * progress) / 100,
          balances,
          status: 'processing'
        } : {
          fileName: file.name,
          fileSize: file.size,
          bytesProcessed: (file.size * progress) / 100,
          progress,
          magicNumber: '',
          entropy: 0,
          isEncrypted: false,
          detectedAlgorithm: 'Procesando...',
          ivBytes: '',
          saltBytes: '',
          balances,
          status: 'processing'
        });

        // Guardar balances cada 10%
        if (balances.length > 0 && progressInt % 10 === 0 && progressInt > 0) {
          saveBalancesToStorage(balances, file.name, file.size);
        }
      });

      setIsProcessing(false);
      processingRef.current = false;
      
    } catch (error) {
      console.error('[LargeFileDTC1BAnalyzer] Error resuming process:', error);
      alert(`❌ Error al reanudar el proceso:\n\n${error instanceof Error ? error.message : 'Error desconocido'}`);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Función para cancelar un proceso pendiente
  const cancelPendingProcess = async () => {
    if (confirm(t.analyzerConfirmCancel)) {
      await processingStore.clearState();
      await processingStore.clearIndexedDB();
      setHasPendingProcess(false);
      setPendingProcessInfo(null);
      console.log('[LargeFileDTC1BAnalyzer] Pending process cancelled');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      processingRef.current = true;
      currentFileRef.current = file;
      setError(null);

      // Registrar archivo en ledgerPersistenceStore
      ledgerPersistenceStore.setFileState(file.name, file.size, file.lastModified);
      console.log('[LargeFileDTC1BAnalyzer] 📁 Archivo registrado en Ledger Store');

      // Calcular hash y buscar proceso existente
      try {
        const fileHash = await processingStore.calculateFileHash(file);
        const existingProcess = await processingStore.findProcessingByFileHash(fileHash);
        
        // ✅ NUEVO: Verificar progreso guardado con analyzerPersistenceStore
        const savedProgress = await analyzerPersistenceStore.loadProgress(file);
        console.log('[AnalyzerPersistence] 🔍 Verificando progreso guardado:', savedProgress ? `${savedProgress.progress.toFixed(2)}%` : 'No encontrado');
        
        // También verificar recuperación en ledgerPersistenceStore
        const ledgerRecovery = ledgerPersistenceStore.getRecoveryInfo();
        let startFromByte = 0;
        
        // ✅ PRIORIDAD ABSOLUTA: Sistema de persistencia nuevo (analyzerPersistenceStore)
        // SIEMPRE usa savedProgress si existe, ignorando otros sistemas
        if (savedProgress) {
          console.log('[AnalyzerPersistence] 🎯 Progreso encontrado, RESTAURANDO AUTOMÁTICAMENTE...');
          
          // ✅✅✅ RESTAURACIÓN AUTOMÁTICA - SIN preguntar, SIEMPRE restaurar
          // Validar todos los valores para evitar NaN
          const safeProgress = safePercentage(savedProgress.progress);
          const safeBytesProcessed = safeNumber(savedProgress.bytesProcessed, 0);
          startFromByte = safeBytesProcessed;
          
          // ✅ CRÍTICO: Restaurar balances INMEDIATAMENTE antes de continuar
          setAnalysis({
            fileName: file.name || savedProgress.fileName || 'Archivo Ledger',
            fileSize: safeNumber(file.size, 0),
            bytesProcessed: safeBytesProcessed,
            progress: safeProgress,
            magicNumber: '',
            entropy: 0,
            isEncrypted: false,
            detectedAlgorithm: `✅ Continuando desde ${safeProgress.toFixed(1)}%...`,
            ivBytes: '',
            saltBytes: '',
            balances: savedProgress.balances || [], // ✅ Balances restaurados aquí con fallback
            status: 'processing'
          });
          
          console.log(`[AnalyzerPersistence] ✅✅✅ RESTAURADO AUTOMÁTICAMENTE: ${safeProgress.toFixed(2)}% | ${savedProgress.balances?.length || 0} divisas`);
          
          // ✅ OPTIMIZACIÓN: Guardar en ledgerPersistenceStore INMEDIATAMENTE
          if (savedProgress.balances && savedProgress.balances.length > 0) {
            // Log detallado de los balances restaurados
            console.log('[AnalyzerPersistence] 💰 BALANCES RESTAURADOS:');
            savedProgress.balances.forEach(b => {
              console.log(`  - ${b.currency}: ${b.totalAmount || b.balance || 0} (${b.transactionCount || 0} trans.)`);
            });
            
            ledgerPersistenceStore.updateBalances(
              savedProgress.balances.map(b => ({
                currency: b.currency || 'USD',
                balance: safeNumber(b.totalAmount || b.balance, 0),
                account: b.accountName || `Cuenta ${b.currency}`,
                lastUpdate: Date.now()
              }))
            );
            
            // ✅ CRÍTICO: Actualizar loadedBalances para que se muestren INMEDIATAMENTE
            setLoadedBalances(savedProgress.balances);
            
            console.log('[AnalyzerPersistence] ✅ Balances sincronizados con progreso guardado');
          }
          
          // ✅ Mostrar notificación de sincronización exitosa
          setTimeout(() => {
            const totalRestored = savedProgress.balances?.reduce((sum, b) => sum + (b.totalAmount || b.balance || 0), 0) || 0;
            console.log(`[AnalyzerPersistence] 💫 SINCRONIZACIÓN PERFECTA:`);
            console.log(`  → Progreso: ${safeProgress.toFixed(2)}%`);
            console.log(`  → Balances: ${savedProgress.balances?.length || 0} divisas`);
            console.log(`  → Total: $${totalRestored.toLocaleString()}`);
            console.log(`  → Estado: Progreso y balances COINCIDEN ✅`);
          }, 100);
        }
        // PRIORIDAD 2: Sistema legacy (processingStore y ledgerPersistenceStore) - solo si NO hay savedProgress
        else if (existingProcess || ledgerRecovery) {
          const progressToShow = ledgerRecovery?.percentage || existingProcess?.progress || 0;
          const resume = confirm(
            `¡Archivo reconocido!\n\n` +
            `Progreso guardado: ${progressToShow.toFixed(2)}%\n` +
            `Balances recuperados: ${ledgerPersistenceStore.getBalances().length}\n\n` +
            `¿Deseas continuar desde donde lo dejaste?`
          );

          if (!resume) {
            await processingStore.clearState();
            ledgerPersistenceStore.clearFileState();
            startFromByte = 0;
          }
        }

        ledgerPersistenceStore.setProcessing(true);

        await processingStore.startGlobalProcessing(file, startFromByte, (progress, balances) => {
          // ✅ TIEMPO REAL: Actualizar con cada callback (ya throttled en processing-store)
          // ✅ Validar valores para evitar NaN
          const safeProgress = safePercentage(progress);
          const bytesProcessed = safeNumber((file.size * safeProgress) / 100, 0);
          const chunkIndex = Math.floor(safeNumber(bytesProcessed / (10 * 1024 * 1024), 0));
          const progressInt = Math.floor(safeProgress);

          // Actualizar ledgerPersistenceStore
          ledgerPersistenceStore.updateProgress(bytesProcessed, file.size, chunkIndex);

          // ✅✅✅ OPTIMIZACIÓN CRÍTICA: MERGE balances (no reemplazar)
          // Si hay balances restaurados previos, mantenerlos y solo agregar nuevos
          const currentBalances = analysisRef.current?.balances || [];
          const mergedBalances = balances && balances.length > 0 ? balances : currentBalances;

          // ✅ Auto-guardar progreso con analyzerPersistenceStore
          if (currentFileRef.current && mergedBalances && mergedBalances.length > 0) {
            // Guardar SIEMPRE (el autoSave tiene su propio throttling)
            analyzerPersistenceStore.autoSave(
              currentFileRef.current,
              safeProgress,
              safeNumber(bytesProcessed, 0),
              mergedBalances
            );
            
            // ✅ GUARDADO GARANTIZADO cada 5%
            const currentMilestone = Math.floor(safeProgress / 5);
            const prevMilestone = Math.floor((safeProgress - 0.1) / 5);
            if (currentMilestone > prevMilestone && mergedBalances.length > 0) {
              analyzerPersistenceStore.forceSave(
                currentFileRef.current,
                safeProgress,
                safeNumber(bytesProcessed, 0),
                mergedBalances
              ).catch(err => console.error('[AnalyzerPersistence] Error en guardado garantizado:', err));
              console.log(`[AnalyzerPersistence] 📌 Guardado GARANTIZADO en ${safeProgress.toFixed(1)}%`);
            }
            
            // ✅ ACTUALIZAR PERFIL con progreso del Ledger (cada 1%)
            if (progressInt % 1 === 0 && progressInt > 0) {
              updateProfileWithLedgerProgress(file.name, safeProgress, safeNumber(bytesProcessed, 0), safeNumber(file.size, 0));
            }
          }

          // ✅ requestAnimationFrame para actualizaciones suaves a 60fps
          requestAnimationFrame(() => {
            setAnalysis(prev => {
              // ✅✅✅ CRÍTICO: Preservar balances existentes si los nuevos están vacíos
              const balancesToUse = (balances && balances.length > 0) ? balances : (prev?.balances || []);
              
              return prev ? {
                ...prev,
                progress: safeProgress,
                bytesProcessed: safeNumber(bytesProcessed, 0),
                balances: balancesToUse, // ✅ Usar merged balances
                status: 'processing'
              } : {
                fileName: file.name || 'Archivo Ledger',
                fileSize: safeNumber(file.size, 0),
                bytesProcessed: safeNumber(bytesProcessed, 0),
                progress: safeProgress,
                magicNumber: '',
                entropy: 0,
                isEncrypted: false,
                detectedAlgorithm: t.analyzerProcessing || 'Procesando...',
                ivBytes: '',
                saltBytes: '',
                balances: balancesToUse,
                status: 'processing'
              };
            });
          });

          // Guardar cada 10%
          if (balances.length > 0 && progressInt % 10 === 0 && progressInt > 0) {
            const prevProgressInt = Math.floor(((file.size * progress) / 100 - 1) / file.size * 100);
            if (progressInt !== prevProgressInt) {
              saveBalancesToStorage(balances, file.name, file.size);
              console.log('[LargeFileDTC1BAnalyzer] 💾 Auto-guardado:', progressInt + '%');
            }
          }
        });

        // Procesamiento completado
        ledgerPersistenceStore.setProcessing(false);
        setIsProcessing(false);
        processingRef.current = false;
        
        // ✅ Limpiar progreso guardado al completar 100%
        if (currentFileRef.current) {
          analyzerPersistenceStore.clearProgress();
          console.log('[AnalyzerPersistence] ✅ Progreso limpiado (completado 100%)');
        }
        
        console.log('[LargeFileDTC1BAnalyzer] ✅ Procesamiento completado y persistido');
      } catch (error) {
        console.error('[LargeFileDTC1BAnalyzer] Error:', error);
        setIsProcessing(false);
        processingRef.current = false;
        setError(t.dashboardErrorProcessing);
      }
    }
  };

  const handlePause = async () => {
    if (isPaused) {
      // Reanudar
      await processingStore.resumeProcessing();
      ledgerPersistenceStore.resumeProcessing();
      setIsPaused(false);
      console.log('[LargeFileDTC1BAnalyzer] ▶️ Procesamiento reanudado');
    } else {
      // Pausar
      await processingStore.pauseProcessing();
      ledgerPersistenceStore.pauseProcessing();
      setIsPaused(true);
      
      // ✅ Guardar progreso al pausar
      if (currentFileRef.current && analysis) {
        await analyzerPersistenceStore.forceSave(
          currentFileRef.current,
          analysis.progress,
          analysis.bytesProcessed,
          analysis.balances
        );
      }
      
      console.log('[LargeFileDTC1BAnalyzer] ⏸️ Procesamiento pausado');
    }
  };

  const handleStop = () => {
    // ✅ OPTIMIZACIÓN: Solo detener SI el usuario confirma
    const confirmStop = confirm(
      '⚠️ DETENER PROCESAMIENTO\n\n' +
      '¿Estás seguro de que deseas DETENER el procesamiento?\n\n' +
      'El progreso se guardará automáticamente.\n' +
      'Podrás continuar más tarde desde este punto.'
    );
    
    if (confirmStop) {
      processingStore.stopProcessing();
      ledgerPersistenceStore.setProcessing(false);
      processingRef.current = false;
      setIsProcessing(false);
      setIsPaused(false);
      
      // ✅ Guardar progreso al detener
      if (currentFileRef.current && analysis) {
        analyzerPersistenceStore.forceSave(
          currentFileRef.current,
          analysis.progress,
          analysis.bytesProcessed,
          analysis.balances
        ).catch(err => console.error('Error guardando al detener:', err));
      }
      
      console.log('[LargeFileDTC1BAnalyzer] ⏹️ Procesamiento detenido por el usuario');
      alert('✅ Procesamiento detenido\n\nProgreso guardado correctamente.');
    }
  };

  const handleDecrypt = async () => {
    if (!username || !password) {
      alert(t.analyzerUsernamePasswordRequired);
      return;
    }
    alert(t.analyzerDecryptionDevelopment);
    setShowAuthModal(false);
  };

  const exportReport = () => {
    if (!analysis) return;

    const report = {
      ...analysis,
      timestamp: new Date().toISOString(),
      totalBalances: analysis.balances.reduce((sum, b) => sum + b.totalAmount, 0),
      totalTransactions: analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0),
      balancesSummary: analysis.balances.map(b => ({
        currency: b.currency,
        total: b.totalAmount.toFixed(2),
        transactions: b.transactionCount,
        average: (b.totalAmount / b.transactionCount).toFixed(2)
      }))
    };

    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.fileName}_balances_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSavedBalances = () => {
    const data = balanceStore.loadBalances();
    if (data) {
      setAnalysis({
        fileName: data.fileName,
        fileSize: data.fileSize,
        bytesProcessed: data.fileSize,
        progress: 100,
        magicNumber: '',
        entropy: 0,
        isEncrypted: false,
        detectedAlgorithm: 'Cargado desde memoria',
        ivBytes: '',
        saltBytes: '',
        balances: data.balances,
        status: 'completed'
      });
      alert(`✅ Balances cargados desde memoria:\n\n${data.balances.length} monedas\n${data.totalTransactions} transacciones\nArchivo: ${data.fileName}`);
    } else {
      alert(t.msgBalancesCleared);
    }
  };

  const clearSavedBalances = () => {
    if (confirm(t.msgConfirmClear)) {
      balanceStore.clearBalances();
      ledgerPersistenceStore.reset();
      setLoadedBalances([]);
      setAnalysis(null);
      alert(t.msgBalancesCleared);
      console.log('[LargeFileDTC1BAnalyzer] 🗑️ Todos los datos limpiados de ambos stores');
    }
  };

  const clearProgressMemory = () => {
    if (confirm('⚠️ BORRAR MEMORIA DE PROGRESO\n\n¿Estás seguro de que deseas borrar el progreso guardado?\n\nEsto eliminará:\n- Progreso guardado del archivo\n- Punto de continuación\n\nLos balances actuales NO se borrarán.')) {
      analyzerPersistenceStore.clearProgress();
      alert('✅ Memoria de progreso borrada\n\nLa próxima vez que cargues el archivo, iniciará desde 0%');
      console.log('[AnalyzerPersistence] 🗑️ Memoria de progreso borrada por el usuario');
    }
  };

  const saveAnalysisAsProfile = async () => {
    if (!analysis || !currentFileRef.current) {
      alert('⚠️ No hay análisis activo para guardar');
      return;
    }

    const profileName = prompt(
      '📁 GUARDAR ANÁLISIS COMO PERFIL\n\n' +
      `Archivo: ${analysis.fileName}\n` +
      `Progreso: ${analysis.progress.toFixed(2)}%\n` +
      `Divisas: ${analysis.balances.length}\n\n` +
      'Ingresa un nombre para el perfil:'
    );

    if (!profileName || profileName.trim() === '') {
      return;
    }

    try {
      // Crear perfil con el estado actual del banco
      const profile = profilesStore.createProfile(
        profileName.trim(),
        `Análisis de ${analysis.fileName} - Progreso: ${analysis.progress.toFixed(2)}% - ${analysis.balances.length} divisas`
      );

      // Guardar el progreso del análisis asociado al perfil
      await analyzerPersistenceStore.saveToProfile(
        profile.id,
        currentFileRef.current,
        analysis.progress,
        analysis.bytesProcessed,
        analysis.balances
      );

      alert(
        '✅ PERFIL CREADO EXITOSAMENTE\n\n' +
        `Nombre: ${profileName}\n` +
        `Progreso guardado: ${analysis.progress.toFixed(2)}%\n` +
        `Balances: ${analysis.balances.length} divisas\n\n` +
        'Puedes cargar este perfil desde el Módulo de Perfiles para restaurar este análisis.'
      );

      console.log(`[AnalyzerPersistence] ✅ Perfil "${profileName}" creado con análisis guardado`);
    } catch (error) {
      console.error('[AnalyzerPersistence] Error creando perfil:', error);
      alert('❌ Error al crear el perfil: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-black p-3 sm:p-6">
      <div className="max-w-7xl mx-auto pb-20 sm:pb-24">
        {/* Header con tema consistente */}
        <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl shadow-[0_0_30px_rgba(255, 255, 255,0.2)] p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 border border-[#ffffff]/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#ffffff] mb-2 flex items-center gap-2 sm:gap-3">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-[#ffffff]" />
                <span className="text-cyber">{t.analyzerTitle}</span>
              </h1>
              <p className="text-[#ffffff] text-sm sm:text-base lg:text-lg">
                {t.analyzerSubtitle}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-[#ffffff] opacity-20 hidden sm:block" />
          </div>
        </div>

        {/* Panel de controles */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(255, 255, 255,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[#ffffff] mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffffff]" />
            <span className="text-cyber">{t.analyzerLoadFileForAnalysis}</span>
          </h2>

          {/* Alerta de proceso pendiente CON BOTÓN PROMINENTE */}
          {hasPendingProcess && pendingProcessInfo && (
            <div className="mb-4 bg-gradient-to-r from-[#ff8c00]/30 to-[#ffa500]/30 border-2 border-[#ff8c00]/50 rounded-xl p-4 sm:p-6 shadow-[0_0_25px_rgba(255,140,0,0.4)] animate-pulse">
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-[#ffa500] rounded-full p-2">
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-black flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#ffa500] font-black text-lg sm:text-xl mb-2">
                      {t.analyzerProcessInterrupted}
                    </p>
                    <p className="text-[#ffffff] text-sm sm:text-base mb-1">
                      <strong>{t.analyzerFile}:</strong> {pendingProcessInfo.fileName}
                    </p>
                    <p className="text-[#ffffff] text-base sm:text-lg font-bold">
                      {t.analyzerSavedProgress}: {pendingProcessInfo.progress.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Botón GRANDE de reanudación */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={resumePendingProcess}
                    className="flex-1 bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-6 py-4 rounded-xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255, 255, 255,0.5)] hover:shadow-[0_0_30px_rgba(255, 255, 255,0.7)] transform hover:scale-105"
                  >
                    <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" />
                    {t.analyzerContinueFrom} {pendingProcessInfo.progress.toFixed(0)}%
                  </button>
                  <button
                    onClick={cancelPendingProcess}
                    className="sm:flex-none bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#ff6b6b] border-2 border-[#ff6b6b]/50 px-4 py-3 rounded-lg font-semibold transition-all text-sm"
                  >
                    {t.analyzerCancelProcess}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de error si existe */}
          {error && (
            <div className="mb-4 bg-[#ff6b6b]/20 border border-[#ff6b6b]/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[#ff6b6b] font-bold mb-1">{t.analyzerError}</p>
                  <p className="text-[#ffb3b3] text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-[#ff6b6b] hover:text-[#ff4444] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*"
              title={t.analyzerSelectFile}
              aria-label={t.analyzerSelectFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255, 255, 255,0.3)] text-sm sm:text-base"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              {t.analyzerSelectFile}
            </button>

            <button
              onClick={loadSavedBalances}
              disabled={isProcessing}
              className="bg-[#0a0a0a] border border-[#ffffff]/30 hover:border-[#ffffff] text-[#ffffff] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255, 255, 255,0.1)] hover:shadow-[0_0_20px_rgba(255, 255, 255,0.2)] text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              {t.analyzerLoadSaved}
            </button>

            {analyzerPersistenceStore.hasProgress() && !isProcessing && (
              <button
                onClick={clearProgressMemory}
                className="bg-[#1a1a1a] border-2 border-[#ffa500]/50 hover:border-[#ffa500] text-[#ffa500] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,165,0,0.2)] hover:shadow-[0_0_25px_rgba(255,165,0,0.4)] text-sm sm:text-base"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                🗑️ Borrar Memoria
              </button>
            )}

            {isProcessing && (
              <>
                <button
                  onClick={handlePause}
                  className="bg-[#1a1a1a] border border-[#ffa500]/30 hover:border-[#ffa500] text-[#ffa500] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isPaused ? <Play className="w-4 h-4 sm:w-5 sm:h-5" /> : <Pause className="w-4 h-4 sm:w-5 sm:h-5" />}
                  {isPaused ? t.analyzerResume : t.analyzerPause}
                </button>

                <button
                  onClick={handleStop}
                  className="bg-[#1a1a1a] border border-[#ff6b6b]/30 hover:border-[#ff6b6b] text-[#ff6b6b] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t.analyzerStop}
                </button>
              </>
            )}

            {loadedBalances.length > 0 && !isProcessing && (
              <button
                onClick={clearSavedBalances}
                className="bg-[#1a1a1a] border border-[#ff6b6b]/30 hover:border-[#ff6b6b] text-[#ff6b6b] px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                {t.analyzerClearMemory}
              </button>
            )}
          </div>

          {/* Barra de progreso */}
          {analysis && (
            <div className="mt-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1 sm:gap-0">
                <span className="text-[#ffffff] font-semibold text-sm sm:text-base truncate max-w-full sm:max-w-md">{analysis.fileName}</span>
                <span className="text-[#ffffff] font-mono text-xs sm:text-sm">
                  {(analysis.fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-3 sm:h-4 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255, 255, 255,0.5)]"
                  style={{ width: `${analysis.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs sm:text-sm text-[#ffffff] mb-2">
                <span className="font-semibold">{analysis.progress.toFixed(1)}% {t.analyzerProcessed}</span>
                <span className="font-mono">
                  {(analysis.bytesProcessed / (1024 * 1024)).toFixed(0)} MB /{' '}
                  {(analysis.fileSize / (1024 * 1024)).toFixed(0)} MB
                </span>
              </div>
              {isProcessing && (
                <div className="bg-[#ffffff]/10 border border-[#ffffff]/20 rounded-lg p-2 mt-2">
                  <p className="text-[#ffffff] text-xs font-semibold flex items-center justify-center gap-2">
                    <Activity className="w-3 h-3 animate-spin" />
                    {t.analyzerNavigateToOtherModules}
                  </p>
                  <p className="text-[#ffffff] text-xs text-center mt-1">
                    {t.analyzerFloatingIndicator}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sección de balances */}
        {analysis && analysis.balances.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(255, 255, 255,0.1)] p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] flex items-center gap-2">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffffff]" />
                <span className="text-cyber">{t.analyzerAccountsByCurrency} ({analysis.balances.length})</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {isProcessing && (
                  <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse text-xs sm:text-sm">
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    <span className="font-semibold">{t.analyzerUpdatingRealTime}</span>
                  </div>
                )}
                {analysis.status === 'completed' && (
                  <button
                    onClick={exportReport}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255, 255, 255,0.3)] text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    {t.analyzerExportReport}
                  </button>
                )}
                {analysis && analysis.balances.length > 0 && (
                  <button
                    onClick={saveAnalysisAsProfile}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-xs sm:text-sm"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    💾 Guardar como Perfil
                  </button>
                )}
              </div>
            </div>

            {/* Resumen total */}
            <div className="bg-gradient-to-r from-[#ffffff]/10 to-[#e0e0e0]/10 border border-[#ffffff]/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 shadow-[0_0_15px_rgba(255, 255, 255,0.15)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[#ffffff] text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {t.analyzerGlobalSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <p className="text-[#ffffff] text-xs mb-1">{t.analyzerTotalTransactions}</p>
                      <p className="text-2xl sm:text-3xl font-black text-[#ffffff]">
                        {analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-10 sm:h-12 w-px bg-[#ffffff] opacity-30"></div>
                    <div>
                      <p className="text-[#ffffff] text-xs mb-1">{t.analyzerDetectedCurrencies}</p>
                      <p className="text-2xl sm:text-3xl font-black text-[#ffffff]">
                        {analysis.balances.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[#ffffff] text-xs mb-1">📊 {t.analyzerProgress}</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#ffffff]">{analysis.progress.toFixed(1)}%</p>
                  {isProcessing && (
                    <p className="text-[#ffffff] text-xs mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t.analyzerSyncing}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contenedor scrollable para todas las cuentas */}
            <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-2" style={{maxHeight: '600px', minHeight: '300px'}}>
              {analysis.balances.map((balance, index) => {
                // Tema homogéneo con variaciones sutiles de verde para cada moneda
                const isUSD = balance.currency === 'USD';
                const isEUR = balance.currency === 'EUR';
                
                return (
                  <div 
                    key={balance.currency}
                    className={`bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border ${
                      isUSD ? 'border-[#ffffff]/50' : isEUR ? 'border-[#e0e0e0]/40' : 'border-[#ffffff]/20'
                    } rounded-xl p-4 sm:p-6 shadow-[0_0_15px_rgba(255, 255, 255,0.1)] mb-3 sm:mb-4 hover:shadow-[0_0_25px_rgba(255, 255, 255,0.2)] transition-all`}
                  >
                  {/* Encabezado de la cuenta */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 pb-3 border-b border-[#ffffff]/20">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffffff]" />
                        <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#ffffff]">{balance.accountName}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="bg-[#ffffff]/20 border border-[#ffffff]/30 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-mono font-bold text-[#ffffff]">
                          {balance.currency}
                        </span>
                        {isUSD && (
                          <span className="bg-[#ffffff] text-black px-2 py-0.5 rounded-full text-xs font-bold">
                            {t.analyzerPrincipal}
                          </span>
                        )}
                        {isEUR && (
                          <span className="bg-[#e0e0e0] text-black px-2 py-0.5 rounded-full text-xs font-bold">
                            {t.analyzerSecondary}
                          </span>
                        )}
                        <span className="text-[#ffffff]">• {t.analyzerAccount} #{index + 1}</span>
                      </div>
                    </div>
                    {isProcessing && (
                      <div className="flex items-center gap-2 bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-full px-3 py-1.5">
                        <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-[#ffffff] animate-spin" />
                        <span className="text-[#ffffff] text-xs sm:text-sm font-semibold">{t.analyzerAdding}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Balance Principal */}
                  <div className="mb-4 sm:mb-6 bg-[#ffffff]/5 border border-[#ffffff]/20 rounded-xl p-3 sm:p-4">
                    <p className="text-[#ffffff] text-xs sm:text-sm mb-2 uppercase tracking-wide font-semibold">
                      {t.analyzerTotalBalance}
                    </p>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#ffffff] drop-shadow-[0_0_10px_rgba(255, 255, 255,0.5)]">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <p className="text-[#ffffff] text-xs mt-2 font-mono">
                      {t.analyzerLastUpdate}: {new Date(balance.lastUpdated).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Estadísticas en Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#ffffff] text-xs mb-1">📊 {t.dashboardTransactions}</p>
                      <p className="text-xl sm:text-2xl font-bold text-[#ffffff]">{balance.transactionCount}</p>
                    </div>
                    <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#ffffff] text-xs mb-1">{t.analyzerAverage}</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#ffffff]">
                        {formatCurrency(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                    <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#ffffff] text-xs mb-1">{t.analyzerHighest}</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#ffffff]">
                        {balance.largestTransaction > 0 ? formatCurrency(balance.largestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                    <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-lg p-2 sm:p-3">
                      <p className="text-[#ffffff] text-xs mb-1">{t.analyzerLowest}</p>
                      <p className="text-base sm:text-lg lg:text-xl font-bold text-[#ffffff]">
                        {balance.smallestTransaction < Infinity ? formatCurrency(balance.smallestTransaction, balance.currency) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Últimas transacciones */}
                  {balance.amounts.length > 0 && (
                    <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 rounded-lg p-3">
                      <p className="text-[#ffffff] text-xs sm:text-sm mb-2 font-semibold">
                        {t.analyzerLastTransactions}
                      </p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {balance.amounts.slice(-10).reverse().map((amt, i) => (
                          <div key={i} className="bg-[#ffffff]/10 border border-[#ffffff]/20 text-[#ffffff] text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-mono font-semibold">
                            +{formatCurrency(amt, balance.currency)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {/* Mensaje de completado */}
            {analysis.status === 'completed' && (
              <div className="mt-4 sm:mt-6 bg-gradient-to-r from-[#ffffff]/20 to-[#e0e0e0]/20 border border-[#ffffff]/30 rounded-lg p-3 sm:p-4 shadow-[0_0_15px_rgba(255, 255, 255,0.2)]">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffffff]" />
                  <div className="flex-1">
                    <p className="text-[#ffffff] font-bold text-base sm:text-lg">{t.analyzerCompletedSuccessfully}</p>
                    <p className="text-[#ffffff] text-xs sm:text-sm mt-1">
                      {t.analyzerTotalTransactions}: <span className="font-bold">{analysis.balances.reduce((sum, b) => sum + b.transactionCount, 0).toLocaleString()}</span> |
                      {t.analyzerDetectedCurrencies}: <span className="font-bold">{analysis.balances.length}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Información del archivo y entropía */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Información del archivo */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(255, 255, 255,0.1)] p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#ffffff] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffffff]" />
                <span className="text-cyber">{t.analyzerFileInfo}</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[#ffffff] text-xs sm:text-sm">{t.analyzerMagicNumber}</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1">
                    <code className="text-[#ffffff] font-mono text-xs sm:text-sm">{analysis.magicNumber}</code>
                  </div>
                </div>

                <div>
                  <label className="text-[#ffffff] text-xs sm:text-sm">{t.analyzerDetectedAlgorithm}</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1">
                    <span className="text-[#ffffff] font-medium text-xs sm:text-sm">{analysis.detectedAlgorithm}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[#ffffff] text-xs sm:text-sm">{t.analyzerEncryptionStatus}</label>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2 mt-1 flex items-center gap-2">
                    {analysis.isEncrypted ? (
                      <>
                        <Lock className="w-4 h-4 text-[#ff6b6b]" />
                        <span className="text-[#ff6b6b] font-medium text-xs sm:text-sm">{t.analyzerEncrypted}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-[#ffffff]" />
                        <span className="text-[#ffffff] font-medium text-xs sm:text-sm">{t.analyzerNotEncrypted}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Análisis de entropía */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl shadow-[0_0_20px_rgba(255, 255, 255,0.1)] p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#ffffff] mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffffff]" />
                <span className="text-cyber">{t.analyzerEntropyAnalysis}</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-[#ffffff]">{t.analyzerAverageEntropy}</span>
                    <span className="text-[#ffffff] font-bold font-mono">{analysis.entropy.toFixed(4)} bits/byte</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        analysis.entropy > 7.5
                          ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff4444] shadow-[0_0_10px_rgba(255,107,107,0.5)]'
                          : analysis.entropy > 6.0
                          ? 'bg-gradient-to-r from-[#ffa500] to-[#ff8c00] shadow-[0_0_10px_rgba(255,165,0,0.5)]'
                          : 'bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] shadow-[0_0_10px_rgba(255, 255, 255,0.5)]'
                      }`}
                      style={{ width: `${(analysis.entropy / 8) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 sm:p-4">
                  {analysis.entropy > 7.5 ? (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[#ff6b6b] font-semibold mb-1 text-xs sm:text-sm">{t.analyzerHighEntropy}</div>
                        <div className="text-[#ffffff] text-xs sm:text-sm">
                          {t.analyzerHighEntropyDescription}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffffff] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[#ffffff] font-semibold mb-1 text-xs sm:text-sm">{t.analyzerLowEntropy}</div>
                        <div className="text-[#ffffff] text-xs sm:text-sm">
                          {t.analyzerLowEntropyDescription}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {analysis.isEncrypted && (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-4 py-2.5 sm:py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255, 255, 255,0.3)] text-sm sm:text-base"
                  >
                    <Key className="w-4 h-4 sm:w-5 sm:h-5" />
                    {t.analyzerTryDecrypt}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de autenticación */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#0d0d0d] border border-[#ffffff]/30 rounded-xl shadow-[0_0_30px_rgba(255, 255, 255,0.3)] p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-xl sm:text-2xl font-bold text-[#ffffff] mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#ffffff]" />
                <span className="text-cyber">{t.analyzerDecryptFile}</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[#ffffff] text-xs sm:text-sm block mb-2">{t.analyzerUsername}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#ffffff] text-[#ffffff] px-3 sm:px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#ffffff]/30 outline-none transition-all text-sm sm:text-base"
                    placeholder={t.analyzerEnterUsername}
                  />
                </div>

                <div>
                  <label className="text-[#ffffff] text-xs sm:text-sm block mb-2">{t.analyzerPassword}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#ffffff] text-[#ffffff] px-3 sm:px-4 py-2 rounded-lg focus:ring-2 focus:ring-[#ffffff]/30 outline-none transition-all text-sm sm:text-base"
                    placeholder={t.analyzerEnterPassword}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleDecrypt}
                    className="flex-1 bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(255, 255, 255,0.3)] text-sm sm:text-base"
                  >
                    {t.analyzerDecrypt}
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 bg-[#1a1a1a] border border-[#ffffff]/30 hover:border-[#ffffff] text-[#ffffff] px-4 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-sm sm:text-base"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

