import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, RefreshCw, Download } from 'lucide-react';

interface OracleData {
  rate: number;
  timestamp: string;
  source: string;
}

interface FondoAccount {
  id: number;
  nombre: string;
  monto_usd: number;
  direccion_usdt: string;
}

interface ConversionResult {
  cuenta: string;
  monto_usd: number;
  monto_usdt: number;
  txHash?: string;
  estado: string;
}

const JSONTransactionsModule = () => {
  const [activeTab, setActiveTab] = useState<'oracle' | 'fondos' | 'procesar' | 'resultados'>('oracle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Oracle State
  const [oracleData, setOracleData] = useState<OracleData | null>(null);

  // Fondos State
  const [fondosData, setFondosData] = useState<FondoAccount[]>([]);

  // Resultados State
  const [results, setResults] = useState<ConversionResult[]>([]);

  // Fetch Oracle Price
  const fetchOraclePrice = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/json/oracle');
      if (!response.ok) throw new Error('Error al obtener el oráculo');
      const data = await response.json();
      setOracleData(data);
      setSuccess('✅ Oráculo actualizado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load Fondos Data
  const loadFondosData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/json/fondos');
      if (!response.ok) throw new Error('Error al cargar fondos.json');
      const data = await response.json();
      setFondosData(data.cuentas || []);
      setSuccess('✅ Datos de fondos cargados');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create Example Fondos
  const createExampleFondos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/json/crear-ejemplo', { method: 'POST' });
      if (!response.ok) throw new Error('Error al crear ejemplo');
      await loadFondosData();
      setSuccess('✅ Archivo de ejemplo creado');
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Process Batch
  const processBatch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const response = await fetch('/api/json/procesar-lotes', { method: 'POST' });
      if (!response.ok) throw new Error('Error al procesar lotes');
      const data = await response.json();
      setResults(data.resultados || []);
      setActiveTab('resultados');
      setSuccess(`✅ Procesadas ${data.resultados.length} transacciones`);
    } catch (err: any) {
      setError(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            📊 Transacciones JSON
          </h2>
          <p className="text-slate-400 mt-1">Procesamiento por lotes de conversiones USD → USDT</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-200">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {['oracle', 'fondos', 'procesar', 'resultados'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'oracle' && '🔗 Oráculo'}
            {tab === 'fondos' && '📁 Fondos.json'}
            {tab === 'procesar' && '⚙️ Procesar'}
            {tab === 'resultados' && '✅ Resultados'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {/* Oracle Tab */}
        {activeTab === 'oracle' && (
          <OracleTab
            oracleData={oracleData}
            loading={loading}
            onFetch={fetchOraclePrice}
          />
        )}

        {/* Fondos Tab */}
        {activeTab === 'fondos' && (
          <FondosTab
            fondosData={fondosData}
            loading={loading}
            onLoad={loadFondosData}
            onCreateExample={createExampleFondos}
          />
        )}

        {/* Procesar Tab */}
        {activeTab === 'procesar' && (
          <ProcesarTab
            loading={loading}
            onProcess={processBatch}
          />
        )}

        {/* Resultados Tab */}
        {activeTab === 'resultados' && (
          <ResultadosTab results={results} />
        )}
      </div>
    </div>
  );
};

// Oracle Tab Component
const OracleTab = ({ oracleData, loading, onFetch }) => (
  <div className="space-y-4">
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Precio USDT/USD</h3>
          <p className="text-slate-400 text-sm">Fuente: CoinGecko API</p>
        </div>
        <button
          onClick={onFetch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {oracleData && (
        <div className="bg-slate-900/50 rounded p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Tasa:</span>
            <span className="text-white font-bold text-lg">1 USDT = ${oracleData.rate.toFixed(6)} USD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Actualizado:</span>
            <span className="text-slate-300">{new Date(oracleData.timestamp).toLocaleString('es-ES')}</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Fondos Tab Component
const FondosTab = ({ fondosData, loading, onLoad, onCreateExample }) => (
  <div className="space-y-4">
    <div className="flex gap-3 mb-4">
      <button
        onClick={onLoad}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Cargando...' : '📂 Cargar fondos.json'}
      </button>
      <button
        onClick={onCreateExample}
        disabled={loading}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Creando...' : '➕ Crear Ejemplo'}
      </button>
    </div>

    {fondosData.length > 0 ? (
      <div className="space-y-2">
        {fondosData.map((cuenta) => (
          <div key={cuenta.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">{cuenta.nombre}</p>
                <p className="text-slate-400 text-sm">ID: {cuenta.id}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-400">${cuenta.monto_usd}</p>
                <p className="text-slate-400 text-xs">USD</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-2 truncate">{cuenta.direccion_usdt}</p>
          </div>
        ))}
      </div>
    ) : (
      <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
        <Download className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No hay datos de fondos</p>
      </div>
    )}
  </div>
);

// Procesar Tab Component
const ProcesarTab = ({ loading, onProcess }) => (
  <div className="space-y-4">
    <div className="bg-slate-800/50 rounded-lg p-8 border border-slate-700 text-center">
      <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Procesar Lotes</h3>
      <p className="text-slate-400 mb-6">Inicia el procesamiento de todas las transacciones en fondos.json</p>
      <button
        onClick={onProcess}
        disabled={loading}
        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold disabled:opacity-50"
      >
        {loading ? '⏳ Procesando...' : '▶️ Procesar Transacciones'}
      </button>
    </div>
  </div>
);

// Resultados Tab Component
const ResultadosTab = ({ results }) => (
  <div className="space-y-4">
    {results.length > 0 ? (
      <div className="space-y-2">
        {results.map((result, idx) => (
          <div key={idx} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-white font-semibold">{result.cuenta}</p>
                <p className={`text-sm ${result.estado.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {result.estado}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-400">{result.monto_usdt.toFixed(6)} USDT</p>
                <p className="text-slate-400 text-xs">${result.monto_usd}</p>
              </div>
            </div>
            {result.txHash && (
              <p className="text-slate-500 text-xs truncate">Hash: {result.txHash}</p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">
          Los resultados aparecerán aquí después de procesar las transacciones
        </p>
      </div>
    )}
  </div>
);

export default JSONTransactionsModule;









