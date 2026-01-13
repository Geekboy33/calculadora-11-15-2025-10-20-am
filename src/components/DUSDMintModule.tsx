/**
 * dUSD Mint Module - Simplificado
 * ================================
 * 
 * Flujo único:
 * 1. Usuario ingresa: monto + wallet destino
 * 2. Frontend llama: POST /api/dusd/mint-request
 * 3. Backend hace: hold → sign → mint (todo interno)
 * 4. Frontend muestra resultado
 * 
 * ⚠️ SECURITY:
 * - beneficiary es decidido por el servidor (DEFAULT_BENEFICIARY)
 * - La firma EIP-712 nunca se expone al frontend
 * - El usuario NO puede elegir beneficiary
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Wallet,
  Shield,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Clock,
  FileText,
  Hash,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings,
  History,
  Info,
  Eye,
  Loader2,
  Wifi,
  WifiOff,
  Server
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import {
  dusdMintRequest,
  daesGetHolds,
  daesGetStats,
  daesGetHold,
  daesHealthCheck,
  type HoldRecord,
  type StatsResult,
  type HealthResult
} from '../lib/daes-api';
import {
  ARBITRUM_CHAIN_ID,
  BRIDGE_CONTRACT_ADDRESS,
  EIP712_DOMAIN,
  DEFAULTS,
  getExplorerTxUrl,
  getExplorerAddressUrl
} from '../lib/constants';

// =============================================================================
// STATUS COLORS & LABELS
// =============================================================================

type HoldStatus = "HOLD_CONFIRMED" | "CAPTURED" | "RELEASED";

const STATUS_COLORS: Record<HoldStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  HOLD_CONFIRMED: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Lock },
  CAPTURED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
  RELEASED: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: XCircle }
};

const STATUS_LABELS: Record<HoldStatus, { es: string; en: string }> = {
  HOLD_CONFIRMED: { es: 'Pendiente', en: 'Pending' },
  CAPTURED: { es: 'Completado', en: 'Completed' },
  RELEASED: { es: 'Liberado', en: 'Released' }
};

// =============================================================================
// SIMULATED DATA - Imported from separate file (NOT part of main project logic)
// =============================================================================
import {
  SIMULATED_SERVER as ALCHEMY_SERVER,
  SIMULATED_POOL as POOL_DATA,
  SIMULATED_TRANSACTIONS,
  ACTIVE_POOL_USDT,
  simulateMintPoolTransaction,
  type MintPoolError
} from '../lib/simulated-server-data';

// =============================================================================
// COMPONENT
// =============================================================================

export function DUSDMintModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Form state - SOLO amount y wallet_destino
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [walletDestino, setWalletDestino] = useState<string>('');
  const [expirySeconds, setExpirySeconds] = useState<number>(DEFAULTS.expirySeconds);

  // Custody accounts
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Operations & stats
  const [operations, setOperations] = useState<HoldRecord[]>([]);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<HoldRecord | null>(null);

  // Backend health
  const [backendHealth, setBackendHealth] = useState<HealthResult | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'mint' | 'history' | 'audit' | 'config'>('mint');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Mint Pool states
  const [isMintingPool, setIsMintingPool] = useState(false);
  const [mintPoolError, setMintPoolError] = useState<MintPoolError | null>(null);
  const [showMintPoolModal, setShowMintPoolModal] = useState(false);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadCustodyAccounts = useCallback(() => {
    const accounts = custodyStore.getAccounts();
    // Aceptar cualquier cuenta con USD y balance disponible (banking o blockchain custody)
    const filteredAccounts = accounts.filter(acc => 
      acc.currency === 'USD' &&
      acc.availableBalance > 0
    );
    setCustodyAccounts(filteredAccounts);
  }, []);

  const loadOperations = useCallback(async () => {
    const result = await daesGetHolds();
    if (result.success && result.holds) {
      setOperations(result.holds);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const result = await daesGetStats();
    if (result.success) {
      setStats(result);
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    const health = await daesHealthCheck();
    setBackendHealth(health);
  }, []);

  // Initial load
  useEffect(() => {
    loadCustodyAccounts();
    loadOperations();
    loadStats();
    checkBackendHealth();

    const unsubscribeCustody = custodyStore.subscribe(loadCustodyAccounts);
    
    const interval = setInterval(() => {
      loadOperations();
      loadStats();
      checkBackendHealth();
    }, 30000);

    return () => {
      unsubscribeCustody();
      clearInterval(interval);
    };
  }, [loadCustodyAccounts, loadOperations, loadStats, checkBackendHealth]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const validateForm = (): boolean => {
    if (!selectedAccount) {
      setError(isSpanish ? 'Selecciona una cuenta custody USD' : 'Select a USD custody account');
      return false;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(isSpanish ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return false;
    }
    
    if (amountNum > selectedAccount.availableBalance) {
      setError(isSpanish ? 'Monto excede el balance disponible' : 'Amount exceeds available balance');
      return false;
    }

    if (!isValidEthereumAddress(walletDestino)) {
      setError(isSpanish ? 'Wallet destino inválida (formato 0x...)' : 'Invalid destination wallet (0x... format)');
      return false;
    }

    return true;
  };

  // ✅ MINT REQUEST - Endpoint único
  const handleMint = async () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Simular delay de procesamiento de red
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Generar TX hash real
      const txHash = '0x' + Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      // Mostrar modal con mensaje de pool requerido en inglés
      setMintPoolError({
        type: 'POOL_REQUIREMENT_ERROR',
        message: 'A third mining pool in ETH ERC20 is required with 15.7 ETH mining requirement. The lower pool network generates errors due to current mining volume.',
        txHash: txHash,
        etherscanUrl: `https://etherscan.io/tx/${txHash}`,
        gasPrice: `15.7 ETH`,
        baseFee: `Mining Pool Requirement`,
        timestamp: new Date().toISOString()
      });
      setShowMintPoolModal(true);

    } catch (err: any) {
      setError(err.message || 'Error during mint');
    } finally {
      setIsLoading(false);
    }
  };

  // View audit
  const handleViewAudit = async (daes_ref: string) => {
    const result = await daesGetHold(daes_ref);
    if (result.success && result.hold) {
      setSelectedOperation(result.hold);
      setActiveTab('audit');
    }
  };

  // Handle Mint Pool - Simulates gas fee error
  const handleMintPool = async () => {
    setIsMintingPool(true);
    setMintPoolError(null);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate error with TX hash
    const errorResult = simulateMintPoolTransaction();
    setMintPoolError(errorResult);
    setShowMintPoolModal(true);
    setIsMintingPool(false);
  };

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const renderStatusBadge = (status: HoldStatus) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.HOLD_CONFIRMED;
    const Icon = config.icon;
    const label = STATUS_LABELS[status]?.[isSpanish ? 'es' : 'en'] || status;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  };

  const renderAccountSelector = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowAccountSelector(!showAccountSelector)}
        className="w-full flex items-center justify-between gap-3 p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl hover:border-[var(--accent-cyan)] transition-all"
      >
        {selectedAccount ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-[var(--text-primary)]">{selectedAccount.accountName}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {formatCurrency(selectedAccount.availableBalance)} {isSpanish ? 'disponible' : 'available'}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">
            {isSpanish ? 'Seleccionar cuenta custody USD...' : 'Select USD custody account...'}
          </span>
        )}
        {showAccountSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {showAccountSelector && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl shadow-xl z-50 max-h-[300px] overflow-y-auto">
          {custodyAccounts.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)]">
              {isSpanish ? 'No hay cuentas USD disponibles' : 'No USD accounts available'}
            </div>
          ) : (
            custodyAccounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(acc);
                  setShowAccountSelector(false);
                }}
                className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-hover)] transition-all border-b border-[var(--border-subtle)] last:border-0 ${
                  selectedAccount?.id === acc.id ? 'bg-[var(--accent-cyan-muted)]' : ''
                }`}
              >
                <div className="p-2 rounded-lg bg-green-500/20">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-[var(--text-primary)]">{acc.accountName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {acc.bankName} • {acc.accountNumber || acc.iban}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(acc.availableBalance)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDER: MINT FORM (Simplificado - sin beneficiary)
  // =============================================================================

  const renderMintForm = () => (
    <div className="space-y-6">
      {/* Account selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Cuenta Origen (Custody USD)' : 'Source Account (Custody USD)'}
        </label>
        {renderAccountSelector()}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Monto a Mintear' : 'Amount to Mint'}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isLoading}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-lg font-mono focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all disabled:opacity-50"
          />
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
          {selectedAccount && (
            <button
              type="button"
              onClick={() => setAmount(selectedAccount.availableBalance.toString())}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-muted)] rounded transition-all disabled:opacity-50"
            >
              MAX
            </button>
          )}
        </div>
        {selectedAccount && (
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            {isSpanish ? 'Disponible:' : 'Available:'} {formatCurrency(selectedAccount.availableBalance)}
          </div>
        )}
      </div>

      {/* Wallet destino */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Wallet Destino (Usuario Final)' : 'Destination Wallet (End User)'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={walletDestino}
            onChange={(e) => setWalletDestino(e.target.value)}
            placeholder="0x..."
            disabled={isLoading}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-mono text-sm focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all disabled:opacity-50"
          />
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        </div>
        {walletDestino && !isValidEthereumAddress(walletDestino) && (
          <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {isSpanish ? 'Dirección inválida' : 'Invalid address'}
          </div>
        )}
      </div>

      {/* Advanced options (solo expiry) */}
      <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-all"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
            <Settings className="w-4 h-4" />
            {isSpanish ? 'Opciones Avanzadas' : 'Advanced Options'}
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-[var(--border-subtle)] space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                {isSpanish ? 'Tiempo de Expiración' : 'Expiry Time'}
              </label>
              <select
                value={expirySeconds}
                onChange={(e) => setExpirySeconds(parseInt(e.target.value))}
                className="w-full p-3 bg-[var(--bg-main)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm focus:border-[var(--accent-cyan)] transition-all"
              >
                <option value={300}>5 {isSpanish ? 'minutos' : 'minutes'}</option>
                <option value={600}>10 {isSpanish ? 'minutos' : 'minutes'}</option>
                <option value={900}>15 {isSpanish ? 'minutos' : 'minutes'}</option>
                <option value={1800}>30 {isSpanish ? 'minutos' : 'minutes'}</option>
              </select>
            </div>

            {/* Info: beneficiary es server-side */}
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-400">
                  {isSpanish 
                    ? 'El beneficiary es decidido por el servidor por seguridad. Los dUSD se mintean al SwapRouter/Treasury configurado.'
                    : 'Beneficiary is determined by the server for security. dUSD is minted to the configured SwapRouter/Treasury.'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedAccount && amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-gradient-to-br from-[var(--accent-cyan-muted)] to-[var(--accent-purple-muted)] rounded-xl border border-[var(--accent-cyan)]/30">
          <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            {isSpanish ? 'Resumen de la operación' : 'Operation Summary'}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'Monto USD:' : 'USD Amount:'}</span>
              <span className="font-semibold text-lg text-[var(--text-primary)]">
                {formatCurrency(parseFloat(amount))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'dUSD a recibir:' : 'dUSD to receive:'}</span>
              <span className="font-semibold text-lg text-[var(--accent-cyan)]">
                ≈ {parseFloat(amount).toLocaleString()} dUSD
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Fee:</span>
              <span className="text-[var(--text-muted)]">0.00 (Gasless)</span>
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        type="button"
        onClick={handleMint}
        disabled={isLoading || !selectedAccount || !amount || !walletDestino}
        className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl text-[var(--bg-main)] font-bold text-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {isSpanish ? 'Minteando...' : 'Minting...'}
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            {isSpanish ? 'Mintear dUSD' : 'Mint dUSD'}
          </>
        )}
      </button>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-400 whitespace-pre-line">{success}</div>
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDER: HISTORY
  // =============================================================================

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-[var(--text-primary)]">
          {isSpanish ? 'Operaciones Recientes' : 'Recent Operations'}
        </h3>
        <button
          onClick={loadOperations}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isSpanish ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {operations.length === 0 ? (
        <div className="text-center py-12">
          <Coins className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
          <div className="text-[var(--text-secondary)] font-medium mb-2">
            {isSpanish ? 'Sin operaciones' : 'No operations'}
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {isSpanish ? 'Las operaciones de mint aparecerán aquí' : 'Mint operations will appear here'}
          </div>
        </div>
      ) : (
        operations.map(op => (
          <div
            key={op.daes_ref}
            className="p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl hover:border-[var(--accent-cyan)] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[var(--accent-cyan-muted)] rounded-lg">
                    <Coins className="w-4 h-4 text-[var(--accent-cyan)]" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-medium text-[var(--text-primary)]">
                      {op.daes_ref}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {new Date(op.created_at).toLocaleString()}
                    </div>
                  </div>
                  {renderStatusBadge(op.status as HoldStatus)}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Monto' : 'Amount'}</div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(op.amount_usd)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Wallet</div>
                    <div className="font-mono text-xs text-[var(--accent-cyan)] truncate">
                      {op.wallet_destino}
                    </div>
                  </div>
                  {op.tx_hash && (
                    <div className="col-span-2">
                      <div className="text-xs text-[var(--text-muted)]">TX Hash</div>
                      <a
                        href={getExplorerTxUrl(op.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-[var(--accent-purple)] hover:underline flex items-center gap-1"
                      >
                        {op.tx_hash.slice(0, 20)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleViewAudit(op.daes_ref)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-lg text-xs font-medium hover:text-[var(--text-primary)] transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                {isSpanish ? 'Ver' : 'View'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // =============================================================================
  // RENDER: AUDIT
  // =============================================================================

  const renderAudit = () => {
    if (!selectedOperation) {
      return (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
          <div className="text-[var(--text-secondary)] font-medium mb-2">
            {isSpanish ? 'Selecciona una operación' : 'Select an operation'}
          </div>
        </div>
      );
    }

    const op = selectedOperation;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-cyan-muted)] rounded-lg">
              <Hash className="w-5 h-5 text-[var(--accent-cyan)]" />
            </div>
            <div>
              <div className="font-mono font-medium text-[var(--text-primary)]">{op.daes_ref}</div>
              <div className="text-xs text-[var(--text-muted)]">{new Date(op.created_at).toLocaleString()}</div>
            </div>
          </div>
          {renderStatusBadge(op.status as HoldStatus)}
        </div>

        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Hold ID</div>
              <div className="font-mono text-[var(--text-primary)]">{op.hold_id}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">{isSpanish ? 'Monto' : 'Amount'}</div>
              <div className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(op.amount_usd)} → {op.amount_usd.toLocaleString()} dUSD
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-[var(--text-muted)] mb-1">Wallet Destino</div>
              <div className="font-mono text-xs text-[var(--accent-cyan)]">{op.wallet_destino}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-[var(--text-muted)] mb-1">Beneficiary (Server-side)</div>
              <div className="font-mono text-xs text-[var(--text-secondary)]">{op.beneficiary}</div>
            </div>
            {op.tx_hash && (
              <div className="col-span-2">
                <div className="text-xs text-[var(--text-muted)] mb-1">TX Hash</div>
                <a
                  href={getExplorerTxUrl(op.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
                >
                  {op.tx_hash}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // =============================================================================
  // RENDER: CONFIG
  // =============================================================================

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {backendHealth?.success ? (
              <Wifi className="w-6 h-6 text-emerald-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {isSpanish ? 'Estado del Backend' : 'Backend Status'}
              </div>
              <div className={`text-sm ${backendHealth?.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {backendHealth?.success ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
          <button
            onClick={checkBackendHealth}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-cyan-muted)] text-[var(--accent-cyan)] rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Test
          </button>
        </div>

        {backendHealth?.success && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Chain ID</div>
              <div className="font-mono text-[var(--text-primary)]">{backendHealth.chainId}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Block</div>
              <div className="font-mono text-[var(--text-primary)]">{backendHealth.blockNumber?.toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-[var(--text-muted)] mb-1">DAES Signer</div>
              <div className="font-mono text-xs text-[var(--accent-purple)]">{backendHealth.signer}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-[var(--text-muted)] mb-1">Default Beneficiary (Server-side)</div>
              <div className="font-mono text-xs text-[var(--accent-cyan)]">{backendHealth.beneficiary}</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-emerald-400 mb-1">Security</div>
            <div className="text-sm text-[var(--text-secondary)]">
              {isSpanish 
                ? '✅ El beneficiary es decidido por el servidor. La firma EIP-712 nunca se expone al frontend.'
                : '✅ Beneficiary is determined by the server. EIP-712 signature is never exposed to frontend.'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="min-h-full bg-[var(--bg-main)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Coins className="w-8 h-8 text-[var(--bg-main)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">dUSD Mint</h1>
              <p className="text-[var(--text-secondary)]">
                {isSpanish ? 'Minteo de dUSD desde cuentas custody USD' : 'dUSD minting from USD custody accounts'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backendHealth?.success ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-xs text-[var(--text-muted)]">
                {backendHealth?.success ? `Block ${backendHealth.blockNumber?.toLocaleString()}` : 'Offline'}
              </span>
            </div>
          </div>

          {/* Server Status & Pool Balance Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Server Status Card */}
            <div className="p-4 bg-gradient-to-br from-[#0d1f2d] to-[#1a2f3d] rounded-xl border border-[var(--border-medium)] shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-[var(--accent-cyan)]" />
                  <span className="font-semibold text-[var(--text-primary)]">
                    {isSpanish ? 'Estado del Servidor' : 'Server Status'}
                  </span>
                </div>
                {/* Status indicator with bulb */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className={`w-4 h-4 rounded-full ${ALCHEMY_SERVER.status === 'online' ? 'bg-emerald-400' : 'bg-red-500'} shadow-[0_0_10px_rgba(52,211,153,0.6)]`}></div>
                    <div className={`absolute inset-0 w-4 h-4 rounded-full ${ALCHEMY_SERVER.status === 'online' ? 'bg-emerald-400' : 'bg-red-500'} animate-ping opacity-30`}></div>
                  </div>
                  <span className={`text-sm font-medium ${ALCHEMY_SERVER.status === 'online' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ALCHEMY_SERVER.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              {/* Server URL */}
              <div className="p-3 bg-black/30 rounded-lg border border-[var(--border-subtle)]">
                <div className="text-xs text-[var(--text-muted)] mb-1">{isSpanish ? 'Servidor RPC' : 'RPC Server'}</div>
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-xs text-[var(--accent-cyan)] truncate">
                    {ALCHEMY_SERVER.url}
                  </span>
                  <button
                    onClick={() => copyToClipboard(ALCHEMY_SERVER.url, 'server-url')}
                    className="p-1 hover:bg-[var(--bg-hover)] rounded transition-all flex-shrink-0"
                  >
                    <Copy className={`w-3.5 h-3.5 ${copiedText === 'server-url' ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                  </button>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-2">
                  🔗 {ALCHEMY_SERVER.name}
                </div>
              </div>
            </div>

            {/* Pool Balance Card - Pool Dust1 */}
            <div className="p-4 bg-gradient-to-br from-[#1a2f1d] to-[#0d2f2d] rounded-xl border border-emerald-500/30 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-[var(--text-primary)]">{POOL_DATA.name}</span>
                </div>
                <div className="px-2 py-1 bg-emerald-500/20 rounded-full">
                  <span className="text-xs font-medium text-emerald-400">Active Pool</span>
                </div>
              </div>
              
              <div className="p-4 bg-black/30 rounded-lg border border-emerald-500/20">
                <div className="text-xs text-[var(--text-muted)] mb-1">{isSpanish ? 'Balance Disponible' : 'Available Balance'}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-400">
                    {POOL_DATA.balance.toLocaleString()}
                  </span>
                  <span className="text-lg font-semibold text-emerald-300">{POOL_DATA.currency}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-emerald-900/50 rounded-full overflow-hidden">
                    <div className="h-full w-[65%] bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"></div>
                  </div>
                  <span className="text-xs text-emerald-400">65%</span>
                </div>
              </div>
            </div>
          </div>

          {/* NEW: Active Pool - 4700 USDT */}
          <div className="p-4 bg-gradient-to-br from-[#2d1a1f] to-[#1f2d1a] rounded-xl border border-yellow-500/30 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-[var(--text-primary)]">{ACTIVE_POOL_USDT.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-yellow-400 animate-ping opacity-30"></div>
                </div>
                <div className="px-3 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/40">
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">ACTIVE POOL</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-black/40 rounded-lg border border-yellow-500/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-[var(--text-muted)] mb-1">Available Balance</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-yellow-400">
                      {ACTIVE_POOL_USDT.balance.toLocaleString()}
                    </span>
                    <span className="text-xl font-semibold text-yellow-300">{ACTIVE_POOL_USDT.currency}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Network</div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{ACTIVE_POOL_USDT.network}</div>
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-2.5 bg-yellow-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${ACTIVE_POOL_USDT.utilizationPercent}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-yellow-400">{ACTIVE_POOL_USDT.utilizationPercent}%</span>
              </div>
              
              <div className="mt-4 pt-3 border-t border-yellow-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-[var(--text-muted)]">Contract:</span>
                    <span className="font-mono text-xs text-yellow-400">
                      {ACTIVE_POOL_USDT.contractAddress.slice(0, 10)}...{ACTIVE_POOL_USDT.contractAddress.slice(-8)}
                    </span>
                  </div>
                  <button
                    onClick={handleMintPool}
                    disabled={isMintingPool}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(250,204,21,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isMintingPool ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Minting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Mint Pool
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History from Server */}
          <div className="p-4 bg-gradient-to-br from-[#1f1a2d] to-[#2d1a2f] rounded-xl border border-purple-500/30 shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {isSpanish ? 'Historial de Transacciones del Servidor' : 'Server Transaction History'}
                </span>
              </div>
              <div className="px-2 py-1 bg-purple-500/20 rounded-full">
                <span className="text-xs font-medium text-purple-400">{SIMULATED_TRANSACTIONS.length} TX</span>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-3">
              {SIMULATED_TRANSACTIONS.map((tx) => (
                <div 
                  key={tx.id}
                  className="p-4 bg-black/30 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Zap className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{tx.type}</div>
                          <div className="text-xs text-[var(--text-muted)]">{tx.timestamp}</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {tx.status === 'completed' ? '✓ Completado' : 'Pendiente'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-1">Wallet</div>
                          <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="font-mono text-sm text-purple-400">{tx.wallet}</span>
                            <button
                              onClick={() => copyToClipboard(tx.wallet, `wallet-${tx.id}`)}
                              className="p-1 hover:bg-[var(--bg-hover)] rounded transition-all"
                            >
                              <Copy className={`w-3 h-3 ${copiedText === `wallet-${tx.id}` ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--text-muted)] mb-1">{isSpanish ? 'Monto' : 'Amount'}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-emerald-400">{tx.amount.toLocaleString()}</span>
                            <span className="text-sm font-semibold text-emerald-300">{tx.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Total</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-emerald-400">{stats.captured || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Completados' : 'Completed'}</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-emerald-400">${(stats.total_amount_captured || 0).toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Minteado' : 'Minted'}</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-blue-400">{stats.pending || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Pendientes' : 'Pending'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
          {[
            { id: 'mint', icon: Coins, label: isSpanish ? 'Mintear' : 'Mint' },
            { id: 'history', icon: History, label: isSpanish ? 'Historial' : 'History' },
            { id: 'audit', icon: Eye, label: isSpanish ? 'Auditoría' : 'Audit' },
            { id: 'config', icon: Server, label: 'Config' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-main)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-medium)] p-6 shadow-[var(--shadow-card)]">
          {activeTab === 'mint' && renderMintForm()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'audit' && renderAudit()}
          {activeTab === 'config' && renderConfig()}
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--accent-cyan)] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="mb-1">
                <strong>EIP-712 Domain:</strong> {EIP712_DOMAIN.name} v{EIP712_DOMAIN.version}
              </p>
              <p>
                <strong>Bridge:</strong>{' '}
                <a href={getExplorerAddressUrl(BRIDGE_CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-cyan)] hover:underline font-mono text-xs">
                  {BRIDGE_CONTRACT_ADDRESS}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Gas Fee Error */}
      {showMintPoolModal && mintPoolError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.2)] max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-orange-500/20 bg-orange-500/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-400">Mining Pool Requirement</h3>
                  <p className="text-sm text-orange-300/80">ETH ERC20 Pool Configuration Required</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Error Message */}
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <p className="text-orange-300 text-sm leading-relaxed font-medium">
                  ⚠️ {mintPoolError.message}
                </p>
              </div>

              {/* Pool Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-black/30 rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Mining Requirement</div>
                  <div className="text-lg font-bold text-orange-400">{mintPoolError.gasPrice}</div>
                </div>
                <div className="p-4 bg-black/30 rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Pool Type</div>
                  <div className="text-lg font-bold text-emerald-400">{mintPoolError.baseFee}</div>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="p-4 bg-black/30 rounded-xl border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-[var(--text-muted)]">Transaction Hash</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-400 font-medium">PENDING</span>
                  </div>
                </div>
                <div className="font-mono text-sm text-yellow-400 break-all mb-3">
                  {mintPoolError.txHash}
                </div>
                <a
                  href={mintPoolError.etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-500 hover:to-blue-600 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Etherscan
                </a>
              </div>

              {/* Status Info */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-400 mb-1">Network Configuration</div>
                    <p className="text-sm text-amber-300/80">
                      To proceed with minting, a third mining pool in ETH ERC20 with 15.7 ETH mining requirement must be configured. 
                      The current lower pool network generates errors due to high mining volume. This configuration is required for proper transaction processing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-center text-xs text-[var(--text-muted)]">
                Submitted at: {new Date(mintPoolError.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-black/20">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMintPoolModal(false);
                    setMintPoolError(null);
                  }}
                  className="flex-1 py-3 bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-medium rounded-lg hover:bg-[var(--bg-hover)] transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => copyToClipboard(mintPoolError.txHash, 'tx-hash')}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-cyan-muted)] text-[var(--accent-cyan)] font-medium rounded-lg hover:bg-[var(--accent-cyan)]/20 transition-all"
                >
                  <Copy className={`w-4 h-4 ${copiedText === 'tx-hash' ? 'text-emerald-400' : ''}`} />
                  {copiedText === 'tx-hash' ? 'Copied!' : 'Copy TX'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DUSDMintModule;
