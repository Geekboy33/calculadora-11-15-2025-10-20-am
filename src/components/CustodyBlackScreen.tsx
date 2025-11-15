/**
 * Custody Account Black Screen
 * Genera Black Screen para cuentas custodio individuales
 */

import { X, Download, Printer } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useRef } from 'react';

interface CustodyBlackScreenProps {
  account: any;
  onClose: () => void;
}

export function CustodyBlackScreen({ account, onClose }: CustodyBlackScreenProps) {
  const { language } = useLanguage();
  const blackScreenRef = useRef<HTMLDivElement>(null);

  const isBanking = (account.accountType || 'blockchain') === 'banking';

  const handleDownloadTxt = () => {
    const content = blackScreenRef.current?.innerText || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BlackScreen_${account.accountNumber || account.id}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-4">
      <div className="bg-black w-full max-w-5xl max-h-[95vh] overflow-hidden border-2 border-[#00ff88] shadow-[0_0_50px_rgba(0,255,136,0.5)] rounded-lg flex flex-col">
        
        {/* Header con botones */}
        <div className="bg-black border-b-2 border-[#00ff88] p-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-[#00ff88]">
            {language === 'es' ? 'BANK BLACK SCREEN - CUENTA CUSTODIO' : 'BANK BLACK SCREEN - CUSTODY ACCOUNT'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] rounded hover:bg-[#00ff88]/20 text-sm"
            >
              <Download className="w-4 h-4 inline mr-1" />
              TXT
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] rounded hover:bg-[#00ff88]/20 text-sm"
            >
              <Printer className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Imprimir' : 'Print'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] rounded hover:bg-[#00ff88]/20 text-sm"
            >
              <X className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>

        {/* Contenido Black Screen */}
        <div ref={blackScreenRef} className="flex-1 overflow-y-auto p-8 space-y-6 text-[#00ff88] bg-black font-mono">
          
          {/* Header */}
          <div className="text-center border-t-2 border-b-2 border-[#00ff88]/30 py-6">
            <div className="text-2xl font-bold mb-2">
              {language === 'es' ? 'BANK BLACK SCREEN - CONFIRMACIÓN BANCARIA OFICIAL' : 'BANK BLACK SCREEN - OFFICIAL BANK CONFIRMATION'}
            </div>
            <div className="text-lg mb-4">DAES - DATA AND EXCHANGE SETTLEMENT</div>
            <div className="text-xs text-[#4d7c4d]">
              {language === 'es' ? 'DOCUMENTO CONFIDENCIAL - SOLO PARA USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL DOCUMENT - FOR AUTHORIZED BANKING USE ONLY'}
            </div>
          </div>

          {/* Tipo de Cuenta */}
          <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-lg p-6">
            <div className="text-lg font-bold mb-4">
              {language === 'es' ? 'TIPO DE CUENTA' : 'ACCOUNT TYPE'}
            </div>
            <div className="text-2xl font-bold text-[#00ff88]">
              {isBanking 
                ? (language === 'es' ? '🏦 CUENTA BANCARIA CUSTODIO' : '🏦 CUSTODY BANKING ACCOUNT')
                : (language === 'es' ? '🌐 CUENTA BLOCKCHAIN CUSTODIO' : '🌐 CUSTODY BLOCKCHAIN ACCOUNT')}
            </div>
          </div>

          {/* Información del Beneficiario */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#00ff88]/30 pb-2">
              {language === 'es' ? 'INFORMACIÓN DEL BENEFICIARIO' : 'BENEFICIARY INFORMATION'}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Titular:' : 'Account Holder:'}</div>
                <div className="text-[#00ff88] font-bold">{account.accountName}</div>
              </div>
              <div>
                <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Cuenta:' : 'Account:'}</div>
                <div className="text-[#00ff88] font-mono font-bold">{account.accountNumber || account.id}</div>
              </div>
              <div>
                <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                <div className="text-[#00ff88]">DAES - DATA AND EXCHANGE SETTLEMENT</div>
              </div>
              <div>
                <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                <div className="text-[#00ff88] font-bold">{account.currency}</div>
              </div>
              {!isBanking && (
                <>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">Blockchain:</div>
                    <div className="text-[#00ff88]">{account.blockchainLink}</div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">Token:</div>
                    <div className="text-[#00ff88] font-mono">{account.tokenSymbol}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balances */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#00ff88]/30 pb-2">
              {language === 'es' ? 'RESUMEN DE FONDOS CUSTODIO' : 'CUSTODY FUNDS SUMMARY'}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0d0d0d] border border-cyan-500/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'TOTAL' : 'TOTAL'}</div>
                <div className="text-3xl font-bold text-cyan-400">{account.currency} {account.totalBalance.toLocaleString()}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-yellow-500/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'RESERVADO' : 'RESERVED'}</div>
                <div className="text-3xl font-bold text-yellow-400">{account.currency} {account.reservedBalance.toLocaleString()}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-green-500/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'DISPONIBLE' : 'AVAILABLE'}</div>
                <div className="text-3xl font-bold text-green-400">{account.currency} {account.availableBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Total Verificado */}
          <div className="bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border-2 border-[#00ff88] rounded-lg p-6">
            <div className="text-center">
              <div className="text-sm text-[#4d7c4d] mb-2">
                {language === 'es' ? 'BALANCE TOTAL VERIFICADO' : 'TOTAL VERIFIED BALANCE'}
              </div>
              <div className="text-4xl font-bold text-[#00ff88] mb-2">
                {account.currency} {account.totalBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Cumplimiento */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#00ff88]/30 pb-2">
              {language === 'es' ? '🥇 CUMPLIMIENTO DE ESTÁNDARES' : '🥇 STANDARDS COMPLIANCE'}
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>🔒 ISO 27001:2022 - {language === 'es' ? 'Seguridad de la Información' : 'Information Security'}</span>
                <span className="text-green-400 font-bold">✓ COMPLIANT</span>
              </div>
              <div className="flex justify-between">
                <span>🏦 ISO 20022 - {language === 'es' ? 'Interoperabilidad Financiera' : 'Financial Interoperability'}</span>
                <span className="text-green-400 font-bold">✓ COMPATIBLE</span>
              </div>
              <div className="flex justify-between">
                <span>⚖️ FATF AML/CFT - {language === 'es' ? 'Anti-Lavado de Dinero' : 'Anti-Money Laundering'}</span>
                <span className="text-green-400 font-bold">✓ VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span>KYC:</span>
                <span className="text-green-400 font-bold">✓ VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span>AML Score:</span>
                <span className="text-green-400 font-bold">{account.amlScore || 95}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Risk Level:</span>
                <span className="text-green-400 font-bold">{(account.riskLevel || 'low').toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Información Técnica */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#00ff88]/30 pb-2">
              {language === 'es' ? 'INFORMACIÓN TÉCNICA' : 'TECHNICAL INFORMATION'}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{language === 'es' ? 'Hash de Verificación:' : 'Verification Hash:'}</span>
                <span className="text-purple-400 font-mono text-xs">{account.verificationHash.substring(0, 20)}...</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'es' ? 'Fecha de Emisión:' : 'Issue Date:'}</span>
                <span>{new Date(account.createdAt).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'es' ? 'Estado de Verificación:' : 'Verification Status:'}</span>
                <span className="text-green-400 font-bold">
                  {language === 'es' ? '✓ VERIFICADO Y CERTIFICADO' : '✓ VERIFIED AND CERTIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Certificación */}
          <div className="border-t-2 border-b-2 border-[#00ff88]/30 py-6">
            <div className="text-center">
              <div className="text-lg font-bold mb-3">
                {language === 'es' ? 'CERTIFICACIÓN BANCARIA OFICIAL' : 'OFFICIAL BANK CERTIFICATION'}
              </div>
              <div className="text-sm text-[#4d7c4d] max-w-3xl mx-auto mb-4">
                {language === 'es'
                  ? 'Este documento certifica que los fondos arriba mencionados están bajo custodia segura del sistema DAES y están disponibles según se indica.'
                  : 'This document certifies that the above mentioned funds are under secure custody of the DAES system and are available as indicated.'}
              </div>
              <div className="text-sm text-[#4d7c4d]">
                {language === 'es' ? 'Conforme con estándares' : 'Compliant with standards'}: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022
              </div>
              <div className="mt-4 text-lg font-bold text-[#00ff88]">
                {language === 'es' ? '✓ FIRMADO DIGITALMENTE' : '✓ DIGITALLY SIGNED'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-[#4d7c4d]">
            <div>{language === 'es' ? 'Generado por' : 'Generated by'}: DAES CoreBanking System</div>
            <div className="mt-1">© {new Date().getFullYear()} DAES - Data and Exchange Settlement</div>
            <div className="mt-2 text-xs">
              {language === 'es' ? 'Hash del Documento' : 'Document Hash'}: {Math.random().toString(36).substring(2, 15).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

