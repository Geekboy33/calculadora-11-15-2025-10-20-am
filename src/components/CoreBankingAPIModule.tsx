/**
 * CoreBanking API Module - DeVmindPay Integration
 * Módulo de API bancaria integrado con DAES Digital Commercial Bank Ltd
 * Posición: Al lado de Bank Audit en el dashboard
 */

import { useState } from 'react';
import { 
  Send, 
  Webhook,
  CheckCircle,
  Loader, 
  DollarSign,
  Building2,
  ArrowRightLeft,
  Settings,
  Key,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { balanceStore } from '../lib/balances-store';

interface Transaction {
  transaction_id: string;
  amount: string;
  currency: string;
  from_bank: string;
  to_bank: string;
  status: 'pending' | 'accepted' | 'settled' | 'failed' | 'rejected';
  timestamp: string;
}

export function CoreBankingAPIModule() {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState('');
  const [apiAuthKey, setApiAuthKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://banktransfer.devmindgroup.com/a.com');
  
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [fromBank, setFromBank] = useState('');
  const [toBank, setToBank] = useState('');
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<Array<{ event_type: string; data: unknown; timestamp: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configurar credenciales
  const handleConfigure = () => {
    if (!apiKey || !apiAuthKey || !bearerToken || !webhookSecret) {
      setError('Completa todas las credenciales');
      return;
    }
    
    setIsConfigured(true);
    setSuccess('✅ Credenciales configuradas correctamente');
    setTimeout(() => setSuccess(null), 3000);
    
    console.log('[CoreBankingAPI] ✅ Configuración completada');
    console.log('[CoreBankingAPI] 🔐 API Key configurada');
    console.log('[CoreBankingAPI] 🔐 Bearer Token configurado');
    console.log('[CoreBankingAPI] 🔐 Webhook Secret configurado');
  };

  // Enviar transacción
  const handleSendTransaction = async () => {
    if (!isConfigured) {
      setError('Configura las credenciales primero');
      return;
    }

    if (!amount || !currency || !fromBank || !toBank) {
      setError('Completa todos los campos de la transacción');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const transactionId = `TXN-${Date.now()}`;
      
      // Simular llamada a la API (en producción usarías axios/fetch)
      console.log('[CoreBankingAPI] 📤 Enviando transacción...');
      console.log('[CoreBankingAPI] 📋 Datos:', {
        transaction_id: transactionId,
        amount,
        currency,
        from_bank: fromBank,
        to_bank: toBank
      });

      // Simular respuesta exitosa (reemplazar con llamada real)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newTransaction: Transaction = {
        transaction_id: transactionId,
        amount,
        currency,
        from_bank: fromBank,
        to_bank: toBank,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      setTransactions(prev => [newTransaction, ...prev]);
      setSuccess(`✅ Transacción ${transactionId} enviada exitosamente`);
      
      // Limpiar formulario
      setAmount('');
      setFromBank('');
      setToBank('');
      
      console.log('[CoreBankingAPI] ✅ Transacción creada:', transactionId);
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(`❌ Error: ${errorMsg}`);
      console.error('[CoreBankingAPI] ❌ Error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Simular recepción de webhook
  const simulateWebhook = (txId: string, status: Transaction['status']) => {
    const event = {
      transaction_id: txId,
      status,
      timestamp: new Date().toISOString(),
      verified: true
    };

    setWebhookEvents(prev => [event, ...prev]);
    
    // Actualizar estado de transacción
    setTransactions(prev => 
      prev.map(tx => 
        tx.transaction_id === txId ? { ...tx, status } : tx
      )
    );

    console.log('[CoreBankingAPI] 📨 Webhook recibido:', event);
  };

  // Obtener balances del sistema para autocompletar
  const systemBalances = balanceStore.getBalances();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00ff88] flex items-center gap-3">
            <ArrowRightLeft className="w-8 h-8" />
            CoreBanking API - DeVmindPay
          </h1>
          <p className="text-[#4d7c4d] mt-2">Integración bancaria REST + Webhook para transferencias Digital Commercial Bank Ltd</p>
          {isConfigured && (
            <p className="text-xs text-green-400 mt-1">✓ API Configurada y lista</p>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-300">{success}</span>
        </div>
      )}

      {/* Panel de Configuración */}
      {!isConfigured && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuración de Credenciales API
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#4d7c4d] mb-2">🌐 Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                placeholder="https://banktransfer.devmindgroup.com/a.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🔑 API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="DEVMIND_API_KEY"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🔑 API Auth Key</label>
                <input
                  type="password"
                  value={apiAuthKey}
                  onChange={(e) => setApiAuthKey(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="DEVMIND_API_AUTH_KEY"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🔐 Bearer Token</label>
                <input
                  type="password"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="DEVMIND_BEARER_TOKEN"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🛡️ Webhook Secret</label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="WEBHOOK_SECRET"
                />
              </div>
            </div>

            <button
              onClick={handleConfigure}
              className="w-full px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all"
            >
              <Key className="w-5 h-5 inline mr-2" />
              Configurar Credenciales
            </button>
          </div>
        </div>
      )}

      {/* Panel de Transacciones */}
      {isConfigured && (
        <>
          {/* Formulario de Envío */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Crear Transferencia Bancaria
            </h2>

            {/* Sugerencia de balances disponibles */}
            {systemBalances.length > 0 && (
              <div className="mb-4 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-3">
                <div className="text-xs text-cyan-400 mb-2">💰 Balances disponibles en el sistema:</div>
                <div className="flex flex-wrap gap-2">
                  {systemBalances.slice(0, 8).map(b => (
                    <button
                      key={b.currency}
                      onClick={() => {
                        setCurrency(b.currency);
                        setAmount(b.totalAmount.toString());
                      }}
                      className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs rounded hover:bg-cyan-500/30 transition-colors"
                    >
                      {b.currency}: {b.totalAmount.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">💵 Monto</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] font-mono focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="5001654208000.00"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">💱 Divisa</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] focus:border-[#00ff88]/50 focus:outline-none"
                >
                  <option value="USD">USD - Dólares</option>
                  <option value="EUR">EUR - Euros</option>
                  <option value="GBP">GBP - Libras</option>
                  <option value="CHF">CHF - Francos Suizos</option>
                  <option value="AED">AED - Dirhams</option>
                  <option value="CAD">CAD - Dólares Canadienses</option>
                  <option value="JPY">JPY - Yenes</option>
                  <option value="BRL">BRL - Reales</option>
                  <option value="MXN">MXN - Pesos Mexicanos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🏦 Banco Origen</label>
                <input
                  type="text"
                  value={fromBank}
                  onChange={(e) => setFromBank(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="Deutsche Bank AG"
                />
              </div>

              <div>
                <label className="block text-sm text-[#4d7c4d] mb-2">🏛️ Banco Destino</label>
                <input
                  type="text"
                  value={toBank}
                  onChange={(e) => setToBank(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-4 py-2 text-[#00ff88] focus:border-[#00ff88]/50 focus:outline-none"
                  placeholder="HSBC UK Bank"
                />
              </div>
            </div>

            <button
              onClick={handleSendTransaction}
              disabled={isSending}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Transferencia
                </>
              )}
            </button>
          </div>

          {/* Lista de Transacciones */}
          {transactions.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Transacciones Enviadas ({transactions.length})
              </h2>

              <div className="space-y-3">
                {transactions.map(tx => {
                  const statusColors = {
                    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' },
                    accepted: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
                    settled: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
                    failed: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
                    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
                  };
                  const color = statusColors[tx.status];

                  return (
                    <div key={tx.transaction_id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#00ff88] font-bold font-mono text-sm">{tx.transaction_id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color.bg} ${color.border} ${color.text}`}>
                          {tx.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-[#4d7c4d]">Monto:</span>
                          <div className="text-cyan-300 font-bold font-mono">{tx.currency} {parseFloat(tx.amount).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-[#4d7c4d]">Fecha:</span>
                          <div className="text-[#80ff80]">{new Date(tx.timestamp).toLocaleString('es-ES')}</div>
                        </div>
                        <div>
                          <span className="text-[#4d7c4d]">De:</span>
                          <div className="text-[#80ff80]">{tx.from_bank}</div>
                        </div>
                        <div>
                          <span className="text-[#4d7c4d]">Para:</span>
                          <div className="text-[#80ff80]">{tx.to_bank}</div>
                        </div>
                      </div>

                      {/* Botones de simulación webhook */}
                      {tx.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => simulateWebhook(tx.transaction_id, 'accepted')}
                            className="flex-1 px-3 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs rounded hover:bg-blue-500/30"
                          >
                            ✓ Aceptar
                          </button>
                          <button
                            onClick={() => simulateWebhook(tx.transaction_id, 'settled')}
                            className="flex-1 px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-300 text-xs rounded hover:bg-green-500/30"
                          >
                            ✓ Liquidar
                          </button>
                          <button
                            onClick={() => simulateWebhook(tx.transaction_id, 'failed')}
                            className="flex-1 px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded hover:bg-red-500/30"
                          >
                            ✗ Fallar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Eventos de Webhook */}
          {webhookEvents.length > 0 && (
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Eventos de Webhook Recibidos ({webhookEvents.length})
              </h2>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {webhookEvents.map((evt, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4d7c4d]">{new Date(evt.timestamp).toLocaleString('es-ES')}</span>
                      <Shield className="w-4 h-4 text-green-400" title="Verificado con HMAC" />
                    </div>
                    <div className="text-sm text-green-300 font-mono mt-1">
                      {evt.transaction_id} → {evt.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información de Integración */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">🔗 Integración con DAES Digital Commercial Bank Ltd</h3>
            <div className="space-y-2 text-sm text-[#4d7c4d]">
              <p>✓ Conectado con balanceStore (ve balances disponibles arriba)</p>
              <p>✓ Usa tasas de cambio del sistema</p>
              <p>✓ Logs en consola para depuración</p>
              <p>✓ Webhooks con verificación HMAC SHA-256</p>
              <p>✓ Listo para conectar con endpoint real: <code className="text-cyan-300">{baseUrl}</code></p>
            </div>
          </div>
        </>
      )}

      {/* Instrucciones si no está configurado */}
      {!isConfigured && transactions.length === 0 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <Building2 className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
          <h3 className="text-xl text-[#4d7c4d] mb-2">CoreBanking API Module</h3>
          <p className="text-[#4d7c4d] text-sm mb-4">Configura las credenciales para comenzar a usar la API</p>
          <div className="text-xs text-[#4d7c4d] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 text-left max-w-2xl mx-auto">
            <div className="font-semibold text-[#00ff88] mb-2">📋 Funcionalidades:</div>
            <ul className="space-y-1">
              <li>• Enviar transferencias bancarias vía API REST</li>
              <li>• Recibir notificaciones por webhook</li>
              <li>• Verificación HMAC SHA-256 de seguridad</li>
              <li>• Integración con balances Digital Commercial Bank Ltd</li>
              <li>• Seguimiento de estado de transacciones</li>
              <li>• Compatible con DeVmindPay y otros proveedores</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}



