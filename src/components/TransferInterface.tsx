import { useState, useEffect } from 'react';
import { Send, AlertCircle, CheckCircle, Key, DollarSign, FileText, TrendingDown, History, Wallet } from 'lucide-react';
import { transactionsStore, FileAccount, Transaction } from '../lib/transactions-store';
import { CryptoUtils } from '../lib/crypto';

export function TransferInterface() {
  const [accounts, setAccounts] = useState<FileAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<FileAccount | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [fee, setFee] = useState('0');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string; transactionId?: string } | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount && selectedCurrency) {
      loadCurrentBalance();
      loadTransactionHistory();
    }
  }, [selectedAccount, selectedCurrency]);

  useEffect(() => {
    validateTransfer();
  }, [amount, fee, currentBalance]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const loadedAccounts = await transactionsStore.getAvailableAccounts();
      setAccounts(loadedAccounts);

      if (loadedAccounts.length > 0) {
        setSelectedAccount(loadedAccounts[0]);
        if (loadedAccounts[0].balances.length > 0) {
          setSelectedCurrency(loadedAccounts[0].balances[0].currency);
        }
      }
    } catch (error) {
      console.error('[TransferInterface] Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadCurrentBalance = async () => {
    if (!selectedAccount || !selectedCurrency) return;

    try {
      const balance = await transactionsStore.getCurrentBalance(
        selectedAccount.fileHash,
        selectedCurrency
      );
      setCurrentBalance(balance);
    } catch (error) {
      console.error('[TransferInterface] Error loading balance:', error);
    }
  };

  const loadTransactionHistory = async () => {
    if (!selectedAccount) return;

    try {
      const history = await transactionsStore.getTransactionHistory(selectedAccount.fileHash, 20);
      setTransactionHistory(history);
    } catch (error) {
      console.error('[TransferInterface] Error loading history:', error);
    }
  };

  const validateTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setValidationError(null);
      return;
    }

    if (!selectedAccount || !selectedCurrency) {
      setValidationError('Selecciona una cuenta y moneda');
      return;
    }

    const transferAmount = parseFloat(amount);
    const transferFee = parseFloat(fee) || 0;
    const totalRequired = transferAmount + transferFee;

    if (currentBalance < totalRequired) {
      setValidationError(
        `Fondos insuficientes. Disponible: ${currentBalance.toFixed(2)} ${selectedCurrency}, Requerido: ${totalRequired.toFixed(2)} ${selectedCurrency}`
      );
    } else {
      setValidationError(null);
    }
  };

  const handleAccountChange = (fileHash: string) => {
    const account = accounts.find(a => a.fileHash === fileHash);
    if (account) {
      setSelectedAccount(account);
      if (account.balances.length > 0) {
        setSelectedCurrency(account.balances[0].currency);
      }
    }
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      if (!selectedAccount || !selectedCurrency) {
        throw new Error('Selecciona una cuenta y moneda');
      }

      if (!recipientAddress) {
        throw new Error('Ingresa la dirección del destinatario');
      }

      if (!amount || parseFloat(amount) <= 0) {
        throw new Error('Ingresa un monto válido');
      }

      const transferAmount = parseFloat(amount);
      const transferFee = parseFloat(fee) || 0;

      const validation = await transactionsStore.validateSufficientFunds(
        selectedAccount.fileHash,
        selectedCurrency,
        transferAmount,
        transferFee
      );

      if (!validation.valid) {
        throw new Error(
          `Fondos insuficientes. Disponible: ${validation.currentBalance.toFixed(2)} ${selectedCurrency}, Requerido: ${validation.required.toFixed(2)} ${selectedCurrency}`
        );
      }

      const debitResult = await transactionsStore.createDebitTransaction(
        selectedAccount.fileHash,
        selectedAccount.fileName,
        selectedCurrency,
        transferAmount,
        recipientAddress,
        recipientName || 'Sin nombre',
        description || `Transferencia de ${transferAmount} ${selectedCurrency}`,
        transferFee,
        'Counterparty API'
      );

      if (!debitResult.success) {
        throw new Error(debitResult.error || 'Error al crear la transacción');
      }

      console.log('[TransferInterface] Transacción creada:', debitResult.transaction?.id);

      await transactionsStore.updateTransactionStatus(
        debitResult.transaction!.id,
        'completed',
        `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );

      setResult({
        success: true,
        message: `✅ Transferencia completada exitosamente!\n\nMonto: ${transferAmount} ${selectedCurrency}\nComisión: ${transferFee} ${selectedCurrency}\nDestinatario: ${recipientAddress}\n\nBalance anterior: ${debitResult.transaction!.balanceBefore.toFixed(2)} ${selectedCurrency}\nBalance nuevo: ${debitResult.transaction!.balanceAfter.toFixed(2)} ${selectedCurrency}`,
        transactionId: debitResult.transaction!.id
      });

      setAmount('');
      setRecipientAddress('');
      setRecipientName('');
      setDescription('');
      setFee('0');

      await loadCurrentBalance();
      await loadTransactionHistory();

    } catch (error) {
      console.error('[TransferInterface] Transfer error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al procesar la transferencia'
      });
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-white';
      case 'pending': return 'text-yellow-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallida';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loadingAccounts) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="text-[#ffffff] text-xl">Cargando cuentas disponibles...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl border border-[#ffffff]/20 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-[#ffa500] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#ffffff] mb-4">No hay cuentas disponibles</h2>
            <p className="text-[#ffffff] mb-6">
              Para realizar transferencias, primero debes procesar un archivo Digital Commercial Bank Ltd completo en el Analizador de Archivos Grandes.
            </p>
            <p className="text-[#ffffff] text-sm">
              El archivo debe estar procesado al 100% para que los balances estén disponibles para transferencias.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto pb-24">
        <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl shadow-[0_0_30px_rgba(255, 255, 255,0.2)] p-8 mb-6 border border-[#ffffff]/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#ffffff] mb-2 flex items-center gap-3">
                <Send className="w-10 h-10 text-[#ffffff]" />
                <span className="text-cyber">Transferencias Desde Digital Commercial Bank Ltd</span>
              </h1>
              <p className="text-[#ffffff] text-lg">
                Transfiere fondos desde tus archivos Digital Commercial Bank Ltd procesados
              </p>
            </div>
            <TrendingDown className="w-16 h-16 text-[#ffffff] opacity-20" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-2xl font-bold text-[#ffffff] mb-6 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-[#ffffff]" />
              Nueva Transferencia
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                    <Wallet className="w-4 h-4 inline mr-1" />
                    Archivo Digital Commercial Bank Ltd Origen
                  </label>
                  <select
                    value={selectedAccount?.fileHash || ''}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                    required
                  >
                    {accounts.map(account => (
                      <option key={account.fileHash} value={account.fileHash}>
                        {account.fileName} ({account.balances.length} monedas)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                    Moneda
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                    required
                  >
                    {selectedAccount?.balances.map(balance => (
                      <option key={balance.currency} value={balance.currency}>
                        {balance.currency} - {formatCurrency(balance.totalAmount, balance.currency)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedAccount && selectedCurrency && (
                <div className="bg-[#0a0a0a] border border-[#ffffff]/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ffffff]">Balance Actual Disponible:</span>
                    <span className="text-2xl font-bold text-[#ffffff]">
                      {formatCurrency(currentBalance, selectedCurrency)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                  Dirección del Destinatario
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff] font-mono"
                  placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                  Nombre del Destinatario (Opcional)
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                    Comisión
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Selector de Porcentajes */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                <label className="text-sm text-purple-400 mb-3 block font-semibold">
                  ⚡ Carga Rápida - % del Balance Disponible
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 20, 50, 75, 100].map(percentage => {
                    const calculatedAmount = (currentBalance * percentage) / 100;

                    return (
                      <button
                        key={percentage}
                        type="button"
                        onClick={() => setAmount(calculatedAmount.toFixed(2))}
                        className="px-3 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all text-sm font-bold hover:scale-105"
                      >
                        <div className="text-lg mb-1">{percentage}%</div>
                        <div className="text-xs opacity-80">
                          {selectedCurrency} {calculatedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-400 text-center">
                  💰 Disponible: {selectedCurrency} {currentBalance.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#ffffff] mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-[#ffffff] px-4 py-2 rounded-lg focus:outline-none focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]"
                  rows={3}
                  placeholder="Descripción de la transferencia..."
                />
              </div>

              {validationError && (
                <div className="bg-[#ff6b6b]/20 border border-[#ff6b6b]/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                  <p className="text-[#ff6b6b] text-sm">{validationError}</p>
                </div>
              )}

              {amount && !validationError && (
                <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-lg p-4">
                  <h3 className="text-[#ffffff] font-semibold mb-2">Resumen de Transferencia</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#ffffff]">Monto:</span>
                      <span className="text-[#ffffff] font-semibold">{parseFloat(amount).toFixed(2)} {selectedCurrency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#ffffff]">Comisión:</span>
                      <span className="text-[#ffffff] font-semibold">{parseFloat(fee).toFixed(2)} {selectedCurrency}</span>
                    </div>
                    <div className="border-t border-[#ffffff]/20 pt-2 flex justify-between">
                      <span className="text-[#ffffff] font-bold">Total a Debitar:</span>
                      <span className="text-[#ffffff] font-bold text-lg">
                        {(parseFloat(amount) + parseFloat(fee)).toFixed(2)} {selectedCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#ffffff]">Nuevo Balance:</span>
                      <span className="text-[#ffffff] font-semibold">
                        {(currentBalance - parseFloat(amount) - parseFloat(fee)).toFixed(2)} {selectedCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!validationError || !amount}
                className="w-full bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#e0e0e0] hover:to-[#e0e0e0] text-black px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255, 255, 255,0.3)] hover:shadow-[0_0_30px_rgba(255, 255, 255,0.5)]"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Procesando Transferencia...' : 'Ejecutar Transferencia'}
              </button>
            </form>

            {result && (
              <div className={`mt-6 ${result.success ? 'bg-[#ffffff]/10 border-[#ffffff]/50' : 'bg-[#ff6b6b]/10 border-[#ff6b6b]/50'} border rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-[#ffffff] flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-[#ff6b6b] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`${result.success ? 'text-[#ffffff]' : 'text-[#ff6b6b]'} font-semibold mb-2`}>
                      {result.success ? 'Transferencia Exitosa' : 'Error en Transferencia'}
                    </p>
                    <p className="text-[#ffffff] text-sm whitespace-pre-line">{result.message}</p>
                    {result.transactionId && (
                      <p className="text-[#ffffff] text-xs mt-2 font-mono">
                        ID: {result.transactionId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-xl font-bold text-[#ffffff] mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-[#ffffff]" />
                Historial Reciente
              </h3>

              {transactionHistory.length === 0 ? (
                <p className="text-[#ffffff] text-sm text-center py-8">
                  No hay transacciones registradas
                </p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {transactionHistory.map(tx => (
                    <div
                      key={tx.id}
                      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-semibold ${getStatusColor(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </span>
                        <span className="text-xs text-[#ffffff]">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-[#ffffff]">Monto:</span>
                          <span className="text-sm text-[#ffffff] font-semibold">
                            -{tx.amount.toFixed(2)} {tx.currency}
                          </span>
                        </div>
                        {tx.fee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-[#ffffff]">Comisión:</span>
                            <span className="text-xs text-[#ffffff]">
                              -{tx.fee.toFixed(2)} {tx.currency}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-xs text-[#ffffff]">Balance After:</span>
                          <span className="text-xs text-[#ffffff]">
                            {tx.balanceAfter.toFixed(2)} {tx.currency}
                          </span>
                        </div>
                        {tx.recipientAddress && (
                          <div className="text-xs text-[#ffffff] truncate font-mono mt-2">
                            → {tx.recipientAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
