/**
 * 3D Secure Module - Generador y Verificador de Códigos
 * Sistema de autenticación de transacciones
 */

import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Mail,
  RefreshCw,
  Check,
  X,
  Clock,
  CreditCard,
  AlertTriangle,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Send,
  History,
  Settings,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { threeDSecureService, ThreeDSChallenge, ThreeDSConfig } from '../lib/three-d-secure';
import { cardIssuingService, IssuedCard } from '../lib/card-issuing-providers';
import { cardsStore, VirtualCard } from '../lib/cards-store';

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 COMPONENTE DE INGRESO DE CÓDIGO OTP
// ═══════════════════════════════════════════════════════════════════════════

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const OTPInput = ({ length = 6, value, onChange, disabled }: OTPInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return; // Solo números
    
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join(''));
    
    // Auto-focus siguiente
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
  };
  
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all
            ${disabled 
              ? 'bg-gray-800 border-gray-700 text-gray-500' 
              : 'bg-white/5 border-white/20 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/30'
            }`}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ⏱️ CONTADOR DE TIEMPO
// ═══════════════════════════════════════════════════════════════════════════

const CountdownTimer = ({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (left <= 0) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-red-400' : 'text-amber-400'}`}>
      <Clock className="w-4 h-4" />
      <span className="font-mono text-lg">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 MODAL DE VERIFICACIÓN 3DS
// ═══════════════════════════════════════════════════════════════════════════

interface VerificationModalProps {
  challenge: ThreeDSChallenge;
  onClose: () => void;
  onVerify: (code: string) => void;
  onResend: () => void;
}

const VerificationModal = ({ challenge, onClose, onVerify, onResend }: VerificationModalProps) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const handleVerify = async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    await new Promise(r => setTimeout(r, 500)); // Simular delay
    onVerify(code);
    setVerifying(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl shadow-green-500/10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Verificación 3D Secure</h2>
          <p className="text-gray-400 text-sm">Ingrese el código de seguridad</p>
        </div>
        
        {/* Info de transacción */}
        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Comercio</span>
            <span className="text-white font-bold">{challenge.merchant}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Monto</span>
            <span className="text-green-400 font-bold text-lg">
              {challenge.currency} {challenge.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Tarjeta</span>
            <span className="text-white font-mono">**** {challenge.cardLast4}</span>
          </div>
        </div>
        
        {/* Método de envío */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2 text-blue-400 text-sm">
            {challenge.otpMethod === 'sms' && <Smartphone className="w-4 h-4" />}
            {challenge.otpMethod === 'email' && <Mail className="w-4 h-4" />}
            {challenge.otpMethod === 'app' && <Shield className="w-4 h-4" />}
            <span>Código enviado a: <strong>{challenge.otpSentTo}</strong></span>
          </div>
        </div>
        
        {/* Input de código */}
        <div className="mb-4">
          <OTPInput
            value={code}
            onChange={setCode}
            disabled={challenge.status !== 'pending'}
          />
        </div>
        
        {/* Mostrar código (para demo) */}
        <div className="text-center mb-4">
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 mx-auto"
          >
            {showCode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showCode ? 'Ocultar código' : 'Ver código (demo)'}
          </button>
          {showCode && (
            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <span className="text-amber-400 font-mono text-2xl tracking-widest">{challenge.otpCode}</span>
            </div>
          )}
        </div>
        
        {/* Timer y intentos */}
        <div className="flex items-center justify-between mb-6">
          <CountdownTimer 
            expiresAt={challenge.expiresAt} 
            onExpire={() => {}} 
          />
          <span className="text-gray-500 text-sm">
            Intentos: {challenge.attempts}/{challenge.maxAttempts}
          </span>
        </div>
        
        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying || challenge.status !== 'pending'}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Verificar Código
              </>
            )}
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onResend}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reenviar
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎴 COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function ThreeDSecureModule() {
  const [challenges, setChallenges] = useState<ThreeDSChallenge[]>([]);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [realCards, setRealCards] = useState<IssuedCard[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ThreeDSChallenge | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form para generar código
  const [selectedCard, setSelectedCard] = useState('');
  const [amount, setAmount] = useState('100');
  const [merchant, setMerchant] = useState('Amazon');
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email' | 'app'>('sms');
  const [phoneNumber, setPhoneNumber] = useState('+1234567890');
  const [email, setEmail] = useState('user@example.com');
  
  // Código generado standalone
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  
  useEffect(() => {
    const unsub = threeDSecureService.subscribe(setChallenges);
    const unsubCards = cardsStore.subscribe(setCards);
    setRealCards(cardIssuingService.getIssuedCards());
    return () => {
      unsub();
      unsubCards();
    };
  }, []);
  
  // Generar challenge
  const handleGenerateChallenge = () => {
    const card = cards.find(c => c.id === selectedCard) || realCards.find(c => c.id === selectedCard);
    if (!card) {
      alert('Seleccione una tarjeta');
      return;
    }
    
    const challenge = threeDSecureService.createChallenge({
      cardId: card.id,
      cardLast4: 'cardNumber' in card ? card.cardNumber.slice(-4) : card.last4,
      amount: parseFloat(amount) || 100,
      currency: card.currency,
      merchant,
      method: otpMethod,
      phoneNumber: otpMethod === 'sms' ? phoneNumber : undefined,
      email: otpMethod === 'email' ? email : undefined,
    });
    
    setActiveChallenge(challenge);
    setShowGenerator(false);
  };
  
  // Verificar código
  const handleVerify = (code: string) => {
    if (!activeChallenge) return;
    
    const result = threeDSecureService.verifyOTP(activeChallenge.id, code);
    
    if (result.success) {
      alert(`✅ AUTENTICACIÓN EXITOSA\n\n` +
        `Transacción: ${result.transactionId}\n` +
        `CAVV: ${result.authenticationValue}\n` +
        `ECI: ${result.eci}\n` +
        `Estado: ${result.status}`);
      setActiveChallenge(null);
    } else {
      alert(`❌ ${result.message}`);
      // Actualizar challenge
      const updated = threeDSecureService.getChallenge(activeChallenge.id);
      if (updated) setActiveChallenge(updated);
      if (result.status === 'REJECTED' || result.status === 'EXPIRED') {
        setActiveChallenge(null);
      }
    }
  };
  
  // Reenviar código
  const handleResend = () => {
    if (!activeChallenge) return;
    
    const result = threeDSecureService.resendOTP(activeChallenge.id);
    if (result.success) {
      alert(`✅ ${result.message}\n\nNuevo código: ${result.newCode}`);
      const updated = threeDSecureService.getChallenge(activeChallenge.id);
      if (updated) setActiveChallenge(updated);
    } else {
      alert(`❌ ${result.message}`);
    }
  };
  
  // Generar código standalone
  const handleGenerateStandalone = (type: 'numeric' | 'alphanumeric' | 'totp') => {
    const result = threeDSecureService.generateCode(type);
    setGeneratedCode(result);
  };
  
  // Copiar código
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('✅ Código copiado');
  };
  
  const pendingChallenges = challenges.filter(c => c.status === 'pending');
  const allCards = [...cards, ...realCards];

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                3D Secure
              </h1>
              <p className="text-gray-400">
                Generador de códigos OTP para autenticación de transacciones
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                showHistory 
                  ? 'bg-purple-500/20 border-purple-500 text-purple-400' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <History className="w-4 h-4" />
              Historial
            </button>
            <button
              onClick={() => setShowGenerator(true)}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold rounded-lg hover:from-green-400 hover:to-emerald-400 transition-all flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              Generar Código
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">Autenticados</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {challenges.filter(c => c.status === 'verified').length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm">Pendientes</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {pendingChallenges.length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <X className="w-5 h-5" />
            <span className="text-sm">Fallidos</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {challenges.filter(c => c.status === 'failed').length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-500/20 to-gray-600/10 border border-gray-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Expirados</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {challenges.filter(c => c.status === 'expired').length}
          </div>
        </div>
      </div>
      
      {/* Generador de Código Rápido */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Generador de Códigos OTP Rápido
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => handleGenerateStandalone('numeric')}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
            >
              <div className="text-white font-bold mb-1">Numérico (6 dígitos)</div>
              <div className="text-gray-400 text-sm">Código estándar bancario</div>
            </button>
            
            <button
              onClick={() => handleGenerateStandalone('alphanumeric')}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
            >
              <div className="text-white font-bold mb-1">Alfanumérico (8 caracteres)</div>
              <div className="text-gray-400 text-sm">Mayor seguridad</div>
            </button>
            
            <button
              onClick={() => handleGenerateStandalone('totp')}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left"
            >
              <div className="text-white font-bold mb-1">TOTP (Basado en tiempo)</div>
              <div className="text-gray-400 text-sm">Como Google Authenticator</div>
            </button>
          </div>
          
          {generatedCode && (
            <div className="bg-black/30 rounded-xl p-6 text-center">
              <div className="text-gray-400 text-sm mb-2">Código Generado</div>
              <div className="text-4xl font-mono font-bold text-green-400 tracking-widest mb-4">
                {generatedCode.code}
              </div>
              <div className="flex items-center justify-center gap-4">
                <CountdownTimer expiresAt={generatedCode.expiresAt} onExpire={() => setGeneratedCode(null)} />
                <button
                  onClick={() => copyCode(generatedCode.code)}
                  className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Challenges Pendientes */}
      {pendingChallenges.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8">
          <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Verificaciones Pendientes ({pendingChallenges.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingChallenges.map(challenge => (
              <div 
                key={challenge.id}
                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 cursor-pointer hover:bg-amber-500/20 transition-all"
                onClick={() => setActiveChallenge(challenge)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-amber-400 font-bold">{challenge.merchant}</span>
                  <CountdownTimer expiresAt={challenge.expiresAt} onExpire={() => {}} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-xl">
                    {challenge.currency} {challenge.amount.toLocaleString()}
                  </span>
                  <span className="text-gray-400 font-mono">**** {challenge.cardLast4}</span>
                </div>
                <div className="mt-2 text-sm text-gray-400">
                  Click para verificar
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Historial */}
      {showHistory && (
        <div className="max-w-6xl mx-auto mb-8">
          <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Autenticaciones
          </h3>
          
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left text-gray-400 text-sm p-4">Fecha</th>
                  <th className="text-left text-gray-400 text-sm p-4">Comercio</th>
                  <th className="text-left text-gray-400 text-sm p-4">Monto</th>
                  <th className="text-left text-gray-400 text-sm p-4">Tarjeta</th>
                  <th className="text-left text-gray-400 text-sm p-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {challenges.slice(0, 20).map(challenge => (
                  <tr key={challenge.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(challenge.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-white">{challenge.merchant}</td>
                    <td className="p-4 text-white font-bold">
                      {challenge.currency} {challenge.amount.toLocaleString()}
                    </td>
                    <td className="p-4 text-gray-400 font-mono">**** {challenge.cardLast4}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        challenge.status === 'verified' ? 'bg-green-500/20 text-green-400' :
                        challenge.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        challenge.status === 'expired' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {challenge.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Información de Seguridad */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-bold mb-1">Protocolo 3D Secure 2.0</h4>
              <p className="text-blue-300/70 text-sm">
                Este sistema implementa el estándar EMV 3DS para autenticación de transacciones.
                Los códigos OTP tienen validez de 5 minutos y máximo 3 intentos.
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Verified by Visa
                </span>
                <span className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Mastercard SecureCode
                </span>
                <span className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Amex SafeKey
                </span>
                <span className="text-xs text-blue-400/60 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> EMV 3DS 2.0
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Generación */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-lg w-full border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Key className="w-6 h-6 text-green-400" />
              Generar Código 3D Secure
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tarjeta</label>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">Seleccionar tarjeta...</option>
                  {allCards.map(card => (
                    <option key={card.id} value={card.id}>
                      {'cardNumber' in card 
                        ? `**** ${card.cardNumber.slice(-4)} - ${card.currency}`
                        : `**** ${card.last4} - ${card.currency}`
                      }
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Monto</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Comercio</label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Método de envío</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sms', 'email', 'app'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setOtpMethod(method)}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                        otpMethod === method 
                          ? 'bg-green-500/20 border-green-500 text-green-400' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {method === 'sms' && <Smartphone className="w-5 h-5" />}
                      {method === 'email' && <Mail className="w-5 h-5" />}
                      {method === 'app' && <Shield className="w-5 h-5" />}
                      <span className="text-xs uppercase">{method}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {otpMethod === 'sms' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              )}
              
              {otpMethod === 'email' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                  />
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowGenerator(false)}
                  className="flex-1 py-3 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGenerateChallenge}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Generar y Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Verificación */}
      {activeChallenge && activeChallenge.status === 'pending' && (
        <VerificationModal
          challenge={activeChallenge}
          onClose={() => setActiveChallenge(null)}
          onVerify={handleVerify}
          onResend={handleResend}
        />
      )}
    </div>
  );
}

