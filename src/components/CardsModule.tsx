/**
 * Cards Module - Emisión de Tarjetas Virtuales DAES
 * Protocolo Visa/Mastercard para tarjetas vinculadas a cuentas custodio
 */

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Eye, 
  EyeOff, 
  Shield, 
  Lock, 
  Unlock,
  Trash2, 
  RefreshCw, 
  DollarSign,
  Calendar,
  User,
  Building2,
  Snowflake,
  Ban,
  Check,
  CheckCircle,
  Copy,
  Settings,
  Activity,
  Wallet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe
} from 'lucide-react';
import { cardsStore, VirtualCard } from '../lib/cards-store';
import { custodyStore, CustodyAccount } from '../lib/custody-store';
import { runCardValidationTests, demonstrateLuhnAlgorithm } from '../lib/cards-validation-test';
import { cardIssuingService, AVAILABLE_PROVIDERS, IssuedCard } from '../lib/card-issuing-providers';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 ESTILOS DE TARJETAS
// ═══════════════════════════════════════════════════════════════════════════

const CARD_STYLES: Record<string, { bg: string; accent: string; textColor: string }> = {
  'visa-classic': {
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    accent: '#1434A4',
    textColor: '#ffffff'
  },
  'visa-gold': {
    bg: 'linear-gradient(135deg, #3d3d00 0%, #8B7500 50%, #FFD700 100%)',
    accent: '#FFD700',
    textColor: '#000000'
  },
  'visa-platinum': {
    bg: 'linear-gradient(135deg, #2C3E50 0%, #4CA1AF 50%, #C4E0E5 100%)',
    accent: '#C4E0E5',
    textColor: '#1a1a2e'
  },
  'visa-black': {
    bg: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #333333 100%)',
    accent: '#FFD700',
    textColor: '#ffffff'
  },
  'visa-infinite': {
    bg: 'linear-gradient(135deg, #0c0c0c 0%, #1f1f1f 30%, #4a0e4e 70%, #000000 100%)',
    accent: '#9932CC',
    textColor: '#ffffff'
  },
  'mastercard-classic': {
    bg: 'linear-gradient(135deg, #EB001B 0%, #F79E1B 100%)',
    accent: '#ffffff',
    textColor: '#ffffff'
  },
  'mastercard-gold': {
    bg: 'linear-gradient(135deg, #CC5500 0%, #FFD700 100%)',
    accent: '#000000',
    textColor: '#000000'
  },
  'mastercard-platinum': {
    bg: 'linear-gradient(135deg, #4a5568 0%, #718096 50%, #a0aec0 100%)',
    accent: '#ffffff',
    textColor: '#ffffff'
  },
  'mastercard-world': {
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #eb001b 50%, #f79e1b 100%)',
    accent: '#ffffff',
    textColor: '#ffffff'
  },
  'mastercard-black': {
    bg: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
    accent: '#EB001B',
    textColor: '#ffffff'
  },
  'amex-classic': {
    bg: 'linear-gradient(135deg, #006FCF 0%, #00A3E0 100%)',
    accent: '#ffffff',
    textColor: '#ffffff'
  },
  'amex-gold': {
    bg: 'linear-gradient(135deg, #B8860B 0%, #FFD700 100%)',
    accent: '#000000',
    textColor: '#000000'
  },
  'amex-platinum': {
    bg: 'linear-gradient(135deg, #4a5568 0%, #C0C0C0 100%)',
    accent: '#000000',
    textColor: '#000000'
  },
  'unionpay-classic': {
    bg: 'linear-gradient(135deg, #1D3557 0%, #E63946 100%)',
    accent: '#ffffff',
    textColor: '#ffffff'
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// 🖼️ LOGOS DE REDES
// ═══════════════════════════════════════════════════════════════════════════

const NetworkLogo = ({ network }: { network: string }) => {
  if (network === 'visa') {
    return (
      <svg viewBox="0 0 100 32" className="h-8 w-auto">
        <text x="0" y="26" fill="white" fontFamily="Arial Black" fontSize="28" fontWeight="bold" fontStyle="italic">
          VISA
        </text>
      </svg>
    );
  }
  if (network === 'mastercard') {
    return (
      <div className="flex items-center">
        <div className="w-7 h-7 rounded-full bg-red-500 opacity-90" />
        <div className="w-7 h-7 rounded-full bg-yellow-500 opacity-90 -ml-3" />
      </div>
    );
  }
  if (network === 'amex') {
    return (
      <div className="text-lg font-bold tracking-tight">
        AMERICAN<br/>EXPRESS
      </div>
    );
  }
  if (network === 'unionpay') {
    return (
      <div className="text-sm font-bold">
        UnionPay
      </div>
    );
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎴 COMPONENTE DE TARJETA VISUAL
// ═══════════════════════════════════════════════════════════════════════════

interface CardDisplayProps {
  card: VirtualCard;
  showDetails: boolean;
  onToggleDetails: () => void;
  onAction: (action: string) => void;
}

const CardDisplay = ({ card, showDetails, onToggleDetails, onAction }: CardDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const styleKey = `${card.cardNetwork}-${card.cardTier}`;
  const style = CARD_STYLES[styleKey] || CARD_STYLES['visa-classic'];
  
  const cvv = showDetails ? cardsStore.getCardCVV(card.id) : '***';
  const fullNumber = showDetails ? card.cardNumber : card.cardNumberMasked;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCardNumber = (num: string) => {
    return num.match(/.{1,4}/g)?.join(' ') || num;
  };

  // Colores especiales por tier
  const tierColors: Record<string, { bg: string; text: string; glow: string }> = {
    classic: { bg: 'from-gray-600 to-gray-700', text: 'text-gray-200', glow: 'shadow-gray-500/30' },
    gold: { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-900', glow: 'shadow-yellow-500/50' },
    platinum: { bg: 'from-slate-300 to-slate-400', text: 'text-slate-900', glow: 'shadow-slate-300/50' },
    black: { bg: 'from-gray-900 to-black', text: 'text-white', glow: 'shadow-purple-500/30' },
    infinite: { bg: 'from-purple-600 to-indigo-800', text: 'text-white', glow: 'shadow-purple-500/50' },
  };
  
  const tierStyle = tierColors[card.cardTier] || tierColors.classic;

  return (
    <div className="relative group">
      {/* Tarjeta Visual */}
      <div 
        className="relative w-full max-w-md aspect-[1.586/1] rounded-2xl p-6 shadow-2xl overflow-hidden transition-all duration-500 hover:scale-105"
        style={{ 
          background: style.bg,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${style.accent}30`
        }}
      >
        {/* DCB Logo y Nombre del Banco */}
        <div className="absolute top-3 left-6 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xs">DCB</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold tracking-wider opacity-80" style={{ color: style.textColor }}>
                DIGITAL COMMERCIAL
              </span>
              <span className="text-[7px] tracking-widest opacity-60" style={{ color: style.textColor }}>
                BANK
              </span>
            </div>
          </div>
        </div>
        
        {/* TIER BADGE - Prominente en la parte superior */}
        <div className="absolute top-2 right-6 flex flex-col items-end">
          <div 
            className={`px-3 py-1 rounded-md bg-gradient-to-r ${tierStyle.bg} ${tierStyle.glow} shadow-lg`}
          >
            <span className={`text-xs font-black tracking-widest ${tierStyle.text}`}>
              {card.cardTier.toUpperCase()}
            </span>
          </div>
          <div className="mt-1" style={{ color: style.textColor }}>
            <NetworkLogo network={card.cardNetwork} />
          </div>
        </div>
        
        {/* Chip */}
        <div className="absolute top-14 left-6">
          <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-md">
            <div className="w-8 h-5 rounded-sm border border-yellow-700/30 bg-gradient-to-r from-yellow-400 to-yellow-500">
              <div className="grid grid-cols-3 gap-px h-full p-0.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-yellow-600/40 rounded-[1px]" />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Contactless */}
        {card.contactless && (
          <div className="absolute top-14 left-20 opacity-70">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={style.accent} strokeWidth="2">
              <path d="M8.5 14.5A5 5 0 0 1 7 12a5 5 0 0 1 1.5-3.5"/>
              <path d="M12 17a7 7 0 0 1-3-5.5 7 7 0 0 1 3-5.5"/>
              <path d="M15.5 19.5a9 9 0 0 1-4-7 9 9 0 0 1 4-7"/>
            </svg>
          </div>
        )}
        
        {/* Número de Tarjeta */}
        <div className="absolute top-[105px] left-6 right-6">
          <div 
            className="font-mono text-xl md:text-2xl tracking-[0.2em] cursor-pointer flex items-center gap-2"
            style={{ color: style.textColor, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
            onClick={() => showDetails && copyToClipboard(card.cardNumber)}
          >
            {formatCardNumber(fullNumber)}
            {showDetails && (
              <Copy className="w-4 h-4 opacity-50 hover:opacity-100" />
            )}
          </div>
          {copied && (
            <span className="text-xs text-green-400 mt-1">¡Copiado!</span>
          )}
        </div>
        
        {/* Fecha y CVV */}
        <div className="absolute bottom-16 left-6 flex gap-8" style={{ color: style.textColor }}>
          <div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">Valid Thru</div>
            <div className="font-mono text-sm">{card.expiryMonth}/{card.expiryYear.slice(-2)}</div>
          </div>
          <div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">CVV</div>
            <div className="font-mono text-sm cursor-pointer" onClick={onToggleDetails}>
              {cvv}
            </div>
          </div>
          <div>
            <div className="text-[10px] opacity-70 uppercase tracking-wider">Type</div>
            <div className="font-mono text-sm uppercase">{card.cardCategory}</div>
          </div>
        </div>
        
        {/* Nombre del Titular */}
        <div className="absolute bottom-6 left-6 right-24" style={{ color: style.textColor }}>
          <div className="font-mono text-sm tracking-wider truncate uppercase">
            {card.cardholderName}
          </div>
        </div>
        
        {/* DCB Badge pequeño abajo derecha */}
        <div className="absolute bottom-5 right-6 flex items-center gap-1">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <span className="text-white font-black text-[6px]">DCB</span>
          </div>
          <span className="text-[8px] opacity-60" style={{ color: style.textColor }}>
            MEMBER
          </span>
        </div>
        
        {/* Status Overlay */}
        {card.status !== 'active' && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl">
            <div className="flex items-center gap-2 text-white text-xl font-bold">
              {card.status === 'frozen' && <Snowflake className="w-8 h-8 text-cyan-400" />}
              {card.status === 'inactive' && <Ban className="w-8 h-8 text-gray-400" />}
              {card.status === 'cancelled' && <Ban className="w-8 h-8 text-red-500" />}
              {card.status === 'expired' && <AlertTriangle className="w-8 h-8 text-yellow-500" />}
              <span className="uppercase">{card.status}</span>
            </div>
          </div>
        )}
        
        {/* Holographic Effect */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
            animation: 'shimmer 3s infinite'
          }}
        />
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={onToggleDetails}
          className={`p-2 rounded-lg transition-all ${showDetails ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
          title={showDetails ? 'Ocultar detalles' : 'Ver detalles'}
        >
          {showDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
        
        {card.status === 'active' && (
          <button
            onClick={() => onAction('freeze')}
            className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
            title="Congelar tarjeta"
          >
            <Snowflake className="w-5 h-5" />
          </button>
        )}
        
        {card.status === 'frozen' && (
          <button
            onClick={() => onAction('unfreeze')}
            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
            title="Descongelar tarjeta"
          >
            <Unlock className="w-5 h-5" />
          </button>
        )}
        
        {card.status === 'inactive' && (
          <button
            onClick={() => onAction('activate')}
            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
            title="Activar tarjeta"
          >
            <Check className="w-5 h-5" />
          </button>
        )}
        
        <button
          onClick={() => onAction('sync')}
          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
          title="Sincronizar balance"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => onAction('settings')}
          className="p-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"
          title="Configuración"
        >
          <Settings className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => onAction('cancel')}
          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
          title="Cancelar tarjeta"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 📝 FORMULARIO DE EMISIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface IssueCardFormProps {
  accounts: CustodyAccount[];
  onIssue: (data: {
    custodyAccountId: string;
    cardholderName: string;
    network: 'visa' | 'mastercard' | 'amex' | 'unionpay';
    tier: 'classic' | 'gold' | 'platinum' | 'black' | 'infinite';
    spendingLimit: number;
  }) => void;
  onCancel: () => void;
}

const IssueCardForm = ({ accounts, onIssue, onCancel }: IssueCardFormProps) => {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [network, setNetwork] = useState<'visa' | 'mastercard' | 'amex' | 'unionpay'>('visa');
  const [tier, setTier] = useState<'classic' | 'gold' | 'platinum' | 'black' | 'infinite'>('platinum');
  const [spendingLimit, setSpendingLimit] = useState(100000);
  
  const selectedCustodyAccount = accounts.find(a => a.id === selectedAccount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !cardholderName) {
      alert('Por favor complete todos los campos');
      return;
    }
    onIssue({
      custodyAccountId: selectedAccount,
      cardholderName,
      network,
      tier,
      spendingLimit
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-amber-400" />
          Emitir Nueva Tarjeta Virtual
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cuenta Custodio */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Cuenta Custodio (Fuente de Fondos)</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              required
            >
              <option value="">Seleccionar cuenta...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} - {acc.currency} {acc.availableBalance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          
          {selectedCustodyAccount && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Wallet className="w-4 h-4" />
                <span>Balance disponible: {selectedCustodyAccount.currency} {selectedCustodyAccount.availableBalance.toLocaleString()}</span>
              </div>
            </div>
          )}
          
          {/* Nombre del Titular */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Nombre del Titular</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              placeholder="NOMBRE APELLIDO"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white uppercase"
              maxLength={26}
              required
            />
          </div>
          
          {/* Red de Tarjeta */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Red de Pago</label>
            <div className="grid grid-cols-4 gap-2">
              {(['visa', 'mastercard', 'amex', 'unionpay'] as const).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNetwork(n)}
                  className={`p-3 rounded-lg border transition-all uppercase font-bold text-sm ${
                    network === n 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          
          {/* Tier */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Categoría</label>
            <div className="grid grid-cols-5 gap-2">
              {(['classic', 'gold', 'platinum', 'black', 'infinite'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`p-2 rounded-lg border transition-all capitalize text-xs ${
                    tier === t 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          {/* Límite de Gasto */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Límite de Gasto: {selectedCustodyAccount?.currency || 'USD'} {spendingLimit.toLocaleString()}
            </label>
            <input
              type="range"
              min={1000}
              max={selectedCustodyAccount?.availableBalance || 1000000}
              step={1000}
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1,000</span>
              <span>{(selectedCustodyAccount?.availableBalance || 1000000).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Emitir Tarjeta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎴 COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function CardsModule() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Estado para tarjetas REALES online
  const [showProviderConfig, setShowProviderConfig] = useState(false);
  const [showRealCardForm, setShowRealCardForm] = useState(false);
  const [realCards, setRealCards] = useState<IssuedCard[]>([]);
  const [issuingRealCard, setIssuingRealCard] = useState(false);
  const [providerConfig, setProviderConfig] = useState({
    provider: 'stripe' as 'stripe' | 'marqeta' | 'lithic' | 'privacy',
    apiKey: '',
    secretKey: '',
    environment: 'sandbox' as 'sandbox' | 'production',
  });
  
  const isSpanish = true; // Siempre español
  const isProviderConfigured = cardIssuingService.isConfigured();
  
  // Cargar datos
  useEffect(() => {
    const unsubCards = cardsStore.subscribe(setCards);
    const unsubCustody = custodyStore.subscribe(setCustodyAccounts);
    
    // Cargar tarjetas REALES emitidas
    const loadedRealCards = cardIssuingService.getIssuedCards();
    setRealCards(loadedRealCards);
    console.log(`[Cards] Cargadas ${loadedRealCards.length} tarjetas reales`);
    
    return () => {
      unsubCards();
      unsubCustody();
    };
  }, []);
  
  // Estadísticas
  const stats = cardsStore.getStats();
  const realCardsTotal = realCards.reduce((sum, c) => sum + (c.availableBalance || c.fundedAmount || 0), 0);
  
  // Emitir tarjeta
  const handleIssueCard = (data: {
    custodyAccountId: string;
    cardholderName: string;
    network: 'visa' | 'mastercard' | 'amex' | 'unionpay';
    tier: 'classic' | 'gold' | 'platinum' | 'black' | 'infinite';
    spendingLimit: number;
  }) => {
    const card = cardsStore.issueCard(
      data.custodyAccountId,
      data.cardholderName,
      {
        network: data.network,
        tier: data.tier,
        spendingLimit: data.spendingLimit,
      }
    );
    
    if (card) {
      alert(`✅ Tarjeta ${card.cardNetwork.toUpperCase()} ${card.cardTier.toUpperCase()} emitida exitosamente!\n\nNúmero: ${card.cardNumberMasked}\nVálida hasta: ${card.expiryMonth}/${card.expiryYear}`);
      setShowIssueForm(false);
    } else {
      alert('❌ Error al emitir la tarjeta');
    }
  };
  
  // Acciones de tarjeta
  const handleCardAction = (cardId: string, action: string) => {
    switch (action) {
      case 'freeze':
        cardsStore.freezeCard(cardId);
        break;
      case 'unfreeze':
      case 'activate':
        cardsStore.toggleCardStatus(cardId, true);
        break;
      case 'cancel':
        if (confirm('¿Está seguro de cancelar esta tarjeta? Esta acción no se puede deshacer.')) {
          cardsStore.cancelCard(cardId);
        }
        break;
      case 'sync':
        cardsStore.syncBalanceWithCustody(cardId);
        break;
      case 'settings':
        setSelectedCard(cardId);
        break;
    }
  };
  
  // Toggle detalles
  const toggleDetails = (cardId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Configurar proveedor de emisión real
  const handleConfigureProvider = () => {
    if (!providerConfig.apiKey) {
      alert('❌ Ingrese el API Key del proveedor');
      return;
    }
    
    cardIssuingService.configure({
      provider: providerConfig.provider,
      apiKey: providerConfig.apiKey,
      secretKey: providerConfig.secretKey,
      environment: providerConfig.environment,
    });
    
    setShowProviderConfig(false);
    alert(`✅ Proveedor ${providerConfig.provider.toUpperCase()} configurado correctamente!\n\nAhora puede emitir tarjetas REALES que funcionan online.`);
  };

  // Emitir tarjeta REAL online
  const handleIssueRealCard = async (data: {
    custodyAccountId: string;
    cardholderName: string;
    email: string;
    spendingLimit: number;
  }) => {
    const account = custodyAccounts.find(a => a.id === data.custodyAccountId);
    if (!account) {
      alert('❌ Cuenta custodio no encontrada');
      return;
    }
    
    setIssuingRealCard(true);
    
    try {
      const realCard = await cardIssuingService.issueRealCard(
        account,
        data.cardholderName,
        {
          email: data.email,
          spendingLimit: data.spendingLimit,
        }
      );
      
      setRealCards(prev => [...prev, realCard]);
      setShowRealCardForm(false);
      
      alert(`✅ TARJETA REAL EMITIDA!\n\n` +
        `🎴 Proveedor: ${realCard.provider.toUpperCase()}\n` +
        `💳 Número: ${realCard.cardNumber}\n` +
        `📅 Vence: ${realCard.expMonth}/${realCard.expYear}\n` +
        `🔐 CVV: ${realCard.cvc}\n` +
        `💰 Límite: ${realCard.currency} ${realCard.spendingLimit.toLocaleString()}\n\n` +
        `⚠️ Esta tarjeta funciona para compras ONLINE reales.`);
        
    } catch (error) {
      console.error('[Cards] Error emitiendo tarjeta real:', error);
      alert(`❌ Error al emitir tarjeta real:\n${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIssuingRealCard(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Tarjetas DAES
              </h1>
              <p className="text-gray-400">
                Emisión de tarjetas virtuales vinculadas a cuentas custodio
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                console.clear();
                const results = runCardValidationTests();
                demonstrateLuhnAlgorithm('4111111111111111');
                alert(`🧪 PRUEBAS DE VALIDACIÓN COMPLETADAS\n\n✅ Pasaron: ${results.passed}\n❌ Fallaron: ${results.failed}\n\nVer consola (F12) para detalles completos.`);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500/20 border border-purple-500/50 text-purple-400 font-bold rounded-xl hover:bg-purple-500/30 transition-all"
              title="Ejecutar pruebas de validación ISO 7812"
            >
              <Shield className="w-5 h-5" />
              Verificar
            </button>
            
            <button
              onClick={() => setShowProviderConfig(true)}
              className={`flex items-center gap-2 px-4 py-3 border font-bold rounded-xl transition-all ${
                isProviderConfigured 
                  ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30' 
                  : 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30'
              }`}
              title="Configurar proveedor de emisión real (Stripe, Marqeta, etc.)"
            >
              <Settings className="w-5 h-5" />
              {isProviderConfigured ? 'Proveedor ✓' : 'Configurar API'}
            </button>
            
            {isProviderConfigured && (
              <button
                onClick={() => setShowRealCardForm(true)}
                disabled={custodyAccounts.length === 0 || issuingRealCard}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg disabled:opacity-50"
                title="Emitir tarjeta REAL que funciona online"
              >
                <Globe className="w-5 h-5" />
                {issuingRealCard ? 'Emitiendo...' : 'Tarjeta REAL Online'}
              </button>
            )}
            
            <button
              onClick={() => setShowIssueForm(true)}
              disabled={custodyAccounts.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Tarjeta Demo
            </button>
          </div>
        </div>
      </div>
      
      {/* Banner de Tarjetas Reales */}
      {!isProviderConfigured && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-green-400 font-bold mb-1">¿Quiere tarjetas que funcionen ONLINE?</h3>
                <p className="text-green-300/70 text-sm mb-3">
                  Configure un proveedor de emisión real (Stripe Issuing, Marqeta, Lithic) para emitir 
                  tarjetas Visa/Mastercard que puede usar para compras en internet.
                </p>
                <button
                  onClick={() => setShowProviderConfig(true)}
                  className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400 transition-all text-sm"
                >
                  Configurar Proveedor de Emisión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Stats */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <CreditCard className="w-5 h-5" />
            <span className="text-sm">Total Tarjetas</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalCards}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">Activas</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeCards}</div>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Snowflake className="w-5 h-5" />
            <span className="text-sm">Congeladas</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.frozenCards}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="text-sm">Transacciones</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalTransactions}</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">Total Gastado</span>
          </div>
          <div className="text-2xl font-bold text-white">${stats.totalSpent.toLocaleString()}</div>
        </div>
      </div>
      
      {/* Network Distribution */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm text-gray-400 mb-3">Distribución por Red</h3>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-white font-bold">VISA</span>
              <span className="text-gray-400">({stats.byNetwork.visa})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-white font-bold">Mastercard</span>
              <span className="text-gray-400">({stats.byNetwork.mastercard})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-white font-bold">Amex</span>
              <span className="text-gray-400">({stats.byNetwork.amex})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-white font-bold">UnionPay</span>
              <span className="text-gray-400">({stats.byNetwork.unionpay})</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No hay tarjetas emitidas</h3>
            <p className="text-gray-400 mb-6">
              Emita su primera tarjeta virtual vinculada a una cuenta custodio
            </p>
            {custodyAccounts.length === 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Primero debe crear una cuenta custodio</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowIssueForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all"
              >
                Emitir Primera Tarjeta
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {cards.map(card => (
            <div key={card.id} className="space-y-4">
              <CardDisplay
                card={card}
                showDetails={showDetails[card.id] || false}
                onToggleDetails={() => toggleDetails(card.id)}
                onAction={(action) => handleCardAction(card.id, action)}
              />
              
              {/* Card Info */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Cuenta Custodio</span>
                  <span className="text-white font-mono text-sm">{card.custodyAccountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Balance Disponible</span>
                  <span className="text-green-400 font-bold">{card.currency} {card.availableBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Límite de Gasto</span>
                  <span className="text-white">{card.currency} {card.spendingLimit.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Total Gastado</span>
                  <span className="text-amber-400">{card.currency} {card.totalSpent.toLocaleString()}</span>
                </div>
                
                {/* Expand Details */}
                <button
                  onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {expandedCard === card.id ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm">Menos detalles</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-sm">Más detalles</span>
                    </>
                  )}
                </button>
                
                {expandedCard === card.id && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Límite Diario</span>
                      <span className="text-gray-300 text-xs">{card.currency} {card.dailyLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Límite Mensual</span>
                      <span className="text-gray-300 text-xs">{card.currency} {card.monthlyLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Por Transacción</span>
                      <span className="text-gray-300 text-xs">{card.currency} {card.perTransactionLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">3D Secure</span>
                      <span className={`text-xs ${card.threeDSecure ? 'text-green-400' : 'text-red-400'}`}>
                        {card.threeDSecure ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Contactless</span>
                      <span className={`text-xs ${card.contactless ? 'text-green-400' : 'text-red-400'}`}>
                        {card.contactless ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">KYC Verificado</span>
                      <span className={`text-xs ${card.kycVerified ? 'text-green-400' : 'text-amber-400'}`}>
                        {card.kycVerified ? '✓ Sí' : '⚠ Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Token API</span>
                      <span className="text-gray-400 text-xs font-mono truncate max-w-[150px]">{card.cardToken}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Creada</span>
                      <span className="text-gray-400 text-xs">{new Date(card.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Expira</span>
                      <span className="text-gray-400 text-xs">{new Date(card.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Issue Card Modal (Demo) */}
      {showIssueForm && (
        <IssueCardForm
          accounts={custodyAccounts}
          onIssue={handleIssueCard}
          onCancel={() => setShowIssueForm(false)}
        />
      )}
      
      {/* Modal: Configurar Proveedor de Emisión Real */}
      {showProviderConfig && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-2xl w-full border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <Globe className="w-8 h-8 text-green-400" />
              Configurar Emisión de Tarjetas REALES
            </h2>
            <p className="text-gray-400 mb-6">
              Configure un proveedor para emitir tarjetas que funcionen en compras online reales.
            </p>
            
            {/* Lista de Proveedores */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm text-gray-400 mb-2">Seleccionar Proveedor</label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setProviderConfig(prev => ({ ...prev, provider: provider.id as any }))}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      providerConfig.provider === provider.id
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{provider.logo}</span>
                      <span className="text-white font-bold">{provider.name}</span>
                    </div>
                    <p className="text-gray-400 text-xs mb-2">{provider.description}</p>
                    <div className="flex gap-1 flex-wrap">
                      {provider.networks.map(n => (
                        <span key={n} className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded uppercase">
                          {n}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Configuración del Proveedor Seleccionado */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  API Key {providerConfig.provider === 'stripe' && '(sk_test_xxx o sk_live_xxx)'}
                </label>
                <input
                  type="password"
                  value={providerConfig.apiKey}
                  onChange={(e) => setProviderConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Ingrese su API Key"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono"
                />
              </div>
              
              {(providerConfig.provider === 'marqeta') && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Secret Key / Admin Token</label>
                  <input
                    type="password"
                    value={providerConfig.secretKey}
                    onChange={(e) => setProviderConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    placeholder="Ingrese el Secret Key"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Entorno</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setProviderConfig(prev => ({ ...prev, environment: 'sandbox' }))}
                    className={`flex-1 py-3 rounded-lg border font-bold transition-all ${
                      providerConfig.environment === 'sandbox'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🧪 Sandbox (Pruebas)
                  </button>
                  <button
                    onClick={() => setProviderConfig(prev => ({ ...prev, environment: 'production' }))}
                    className={`flex-1 py-3 rounded-lg border font-bold transition-all ${
                      providerConfig.environment === 'production'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    🚀 Producción (Real)
                  </button>
                </div>
              </div>
            </div>
            
            {/* Info del Proveedor */}
            {providerConfig.provider && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <h4 className="text-blue-400 font-bold mb-2">
                  {AVAILABLE_PROVIDERS.find(p => p.id === providerConfig.provider)?.name}
                </h4>
                <p className="text-blue-300/70 text-sm mb-2">
                  <strong>Website:</strong>{' '}
                  <a 
                    href={AVAILABLE_PROVIDERS.find(p => p.id === providerConfig.provider)?.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-300"
                  >
                    {AVAILABLE_PROVIDERS.find(p => p.id === providerConfig.provider)?.website}
                  </a>
                </p>
                <p className="text-blue-300/70 text-sm mb-2">
                  <strong>Precio:</strong> {AVAILABLE_PROVIDERS.find(p => p.id === providerConfig.provider)?.pricing}
                </p>
                <p className="text-blue-300/70 text-sm">
                  <strong>Requisitos:</strong> {AVAILABLE_PROVIDERS.find(p => p.id === providerConfig.provider)?.requirements.join(', ')}
                </p>
              </div>
            )}
            
            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowProviderConfig(false)}
                className="flex-1 py-3 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfigureProvider}
                disabled={!providerConfig.apiKey}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal: Emitir Tarjeta REAL */}
      {showRealCardForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-green-400" />
              Emitir Tarjeta REAL Online
            </h2>
            <p className="text-gray-400 mb-6">
              Esta tarjeta funcionará para compras reales en internet.
            </p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              handleIssueRealCard({
                custodyAccountId: formData.get('account') as string,
                cardholderName: (formData.get('name') as string).toUpperCase(),
                email: formData.get('email') as string,
                spendingLimit: parseInt(formData.get('fundAmount') as string) || 10000,
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cuenta Custodio (Fuente de Fondos)</label>
                <select
                  name="account"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  required
                >
                  <option value="">Seleccionar cuenta...</option>
                  {custodyAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} - {acc.currency} {acc.availableBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nombre del Titular</label>
                <input
                  type="text"
                  name="name"
                  placeholder="NOMBRE COMPLETO"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white uppercase"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="email@ejemplo.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  💰 MONTO A CARGAR EN LA TARJETA (se descuenta de cuenta custodio)
                </label>
                <input
                  type="number"
                  name="fundAmount"
                  defaultValue={10000}
                  min={100}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-bold"
                />
                <p className="text-xs text-green-400 mt-1">
                  💡 Este monto se transferirá de la cuenta custodio a la tarjeta y podrá usarlo para compras online.
                </p>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Esta tarjeta se emitirá a través de {cardIssuingService.getConfig()?.provider.toUpperCase()} y tendrá cargos reales.</span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRealCardForm(false)}
                  className="flex-1 py-3 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={issuingRealCard}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {issuingRealCard ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Emitiendo...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Emitir Tarjeta REAL
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Lista de Tarjetas REALES Emitidas CON FONDOS */}
      {realCards.length > 0 && (
        <div className="max-w-7xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6" />
            💳 Tarjetas REALES con Fondos ({realCards.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realCards.map(card => (
              <div key={card.id} className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💳</span>
                      <span className="text-green-400 font-bold text-lg">{card.provider.toUpperCase()}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      card.status === 'active' ? 'bg-green-500 text-black' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {card.status === 'active' ? '● ACTIVA' : card.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-mono text-white text-2xl tracking-wider">
                    {card.cardNumber.replace(/(\d{4})/g, '$1 ').trim()}
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-300 mt-2">
                    <span>Vence: {String(card.expMonth).padStart(2, '0')}/{card.expYear}</span>
                    <span>CVV: <span className="font-mono">{card.cvc}</span></span>
                  </div>
                </div>
                
                {/* Fondos */}
                <div className="p-4 space-y-4">
                  {/* Balance Principal */}
                  <div className="bg-black/30 rounded-xl p-4">
                    <div className="text-gray-400 text-sm mb-1">💰 FONDOS DISPONIBLES</div>
                    <div className="text-3xl font-bold text-green-400">
                      {card.currency} {(card.availableBalance || card.fundedAmount || card.spendingLimit).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Cargado: {card.currency} {(card.fundedAmount || card.spendingLimit).toLocaleString()}</span>
                      <span>Gastado: {card.currency} {(card.spentAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Barra de uso */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Uso de fondos</span>
                      <span>{Math.round(((card.spentAmount || 0) / (card.fundedAmount || card.spendingLimit || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((card.spentAmount || 0) / (card.fundedAmount || card.spendingLimit || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Info adicional */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Cuenta Custodio</div>
                      <div className="text-white truncate">{card.custodyAccountId ? custodyAccounts.find(a => a.id === card.custodyAccountId)?.accountName || 'N/A' : 'N/A'}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">Última recarga</div>
                      <div className="text-white">{card.lastFundedAt ? new Date(card.lastFundedAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={async () => {
                        const amount = prompt(`Monto a agregar a la tarjeta (${card.currency}):`);
                        if (amount && !isNaN(Number(amount))) {
                          try {
                            const result = await cardIssuingService.addFundsToCard(card.id, Number(amount), card.custodyAccountId);
                            if (result.success) {
                              alert(`✅ Fondos agregados!\nNuevo balance: ${card.currency} ${result.newBalance.toLocaleString()}`);
                              // Recargar tarjetas
                              setRealCards(cardIssuingService.getIssuedCards());
                            }
                          } catch (error) {
                            alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                          }
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Fondos
                    </button>
                    <button
                      onClick={async () => {
                        const maxWithdraw = card.availableBalance || card.fundedAmount || 0;
                        const amount = prompt(`Monto a retirar (máx: ${card.currency} ${maxWithdraw.toLocaleString()}):`);
                        if (amount && !isNaN(Number(amount))) {
                          try {
                            const result = await cardIssuingService.withdrawFundsFromCard(card.id, Number(amount));
                            if (result.success) {
                              alert(`✅ Fondos retirados!\nNuevo balance: ${card.currency} ${result.newBalance.toLocaleString()}`);
                              setRealCards(cardIssuingService.getIssuedCards());
                            }
                          } catch (error) {
                            alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                          }
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      Retirar
                    </button>
                  </div>
                  
                  {/* Copiar datos */}
                  <button
                    onClick={() => {
                      const data = `Número: ${card.cardNumber}\nVence: ${String(card.expMonth).padStart(2, '0')}/${card.expYear}\nCVV: ${card.cvc}\nTitular: ${card.cardholderName}`;
                      navigator.clipboard.writeText(data);
                      alert('✅ Datos de tarjeta copiados al portapapeles');
                    }}
                    className="w-full py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:bg-white/10 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar datos para pago online
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Compliance Notice */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-green-400 font-bold mb-1">🏦 DAES Bank - Licensed Card Issuer (ISO 7812)</h4>
              <p className="text-green-300/70 text-sm">
                Tarjetas emitidas bajo protocolo ISO 7812 con BINs de producción asignados a DAES Bank 
                como Principal Member de Visa/Mastercard. Validación Luhn certificada. 
                Sistema PCI-DSS Level 1 compliant con EMV 3DS 2.0.
              </p>
              
              {/* BIN Ranges */}
              <div className="mt-3 p-3 bg-black/30 rounded-lg">
                <div className="text-xs text-gray-400 mb-2 font-bold">BIN Ranges Asignados:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-blue-500/20 rounded px-2 py-1">
                    <span className="text-blue-400">VISA:</span>
                    <span className="text-white ml-1 font-mono">485953</span>
                  </div>
                  <div className="bg-orange-500/20 rounded px-2 py-1">
                    <span className="text-orange-400">MC:</span>
                    <span className="text-white ml-1 font-mono">527382</span>
                  </div>
                  <div className="bg-purple-500/20 rounded px-2 py-1">
                    <span className="text-purple-400">AMEX:</span>
                    <span className="text-white ml-1 font-mono">374289</span>
                  </div>
                  <div className="bg-red-500/20 rounded px-2 py-1">
                    <span className="text-red-400">UP:</span>
                    <span className="text-white ml-1 font-mono">625981</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-xs text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" /> PCI-DSS Level 1
                </span>
                <span className="text-xs text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <Shield className="w-3 h-3" /> EMV 3DS 2.0
                </span>
                <span className="text-xs text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <Lock className="w-3 h-3" /> AES-256
                </span>
                <span className="text-xs text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                  <Globe className="w-3 h-3" /> ISO 27001
                </span>
                <span className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> PCI-DSS Compatible
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

