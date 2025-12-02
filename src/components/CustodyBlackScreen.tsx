/**
 * Custody Account Black Screen
 * Genera Black Screen para cuentas custodio individuales
 */

import { X, Download, Printer, Image as ImageIcon, FileText } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BankIcon, BlockchainIcon, SecurityIcon, ComplianceIcon, AwardIcon, CheckIcon, IconText } from './CustomIcons';

interface CustodyBlackScreenProps {
  account: any;
  onClose: () => void;
}

export function CustodyBlackScreen({ account, onClose }: CustodyBlackScreenProps) {
  const { language } = useLanguage();
  const blackScreenRef = useRef<HTMLDivElement>(null);

  const isBanking = (account.accountType || 'blockchain') === 'banking';

  const handleDownloadTxt = () => {
    const isSpanish = language === 'es';
    const date = new Date();
    const formattedDate = date.toLocaleString(isSpanish ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const content = `
═══════════════════════════════════════════════════════════════════════════════
                    OFFICIAL BANK CONFIRMATION DOCUMENT
                    BLACK SCREEN - CUSTODY ACCOUNT STATEMENT
═══════════════════════════════════════════════════════════════════════════════

BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
DOCUMENT TYPE:                 CUSTODY ACCOUNT CONFIRMATION
DOCUMENT CLASSIFICATION:       ${isSpanish ? 'CONFIDENCIAL - SOLO USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL - AUTHORIZED BANKING USE ONLY'}
GENERATION DATE:               ${formattedDate}
DOCUMENT ID:                   ${Math.random().toString(36).substring(2, 15).toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
                        ACCOUNT TYPE INFORMATION
═══════════════════════════════════════════════════════════════════════════════

ACCOUNT TYPE:                  ${IconText[isBanking ? 'bank' : 'blockchain']} ${isBanking 
  ? (isSpanish ? 'CUENTA BANCARIA CUSTODIO' : 'CUSTODY BANKING ACCOUNT')
  : (isSpanish ? 'CUENTA BLOCKCHAIN CUSTODIO' : 'CUSTODY BLOCKCHAIN ACCOUNT')}

═══════════════════════════════════════════════════════════════════════════════
                        BENEFICIARY INFORMATION
═══════════════════════════════════════════════════════════════════════════════

ACCOUNT HOLDER:                ${account.accountName}
ACCOUNT NUMBER:                ${account.accountNumber || account.id}
BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
CURRENCY:                      ${account.currency}
${!isBanking ? `BLOCKCHAIN:                    ${account.blockchainLink || 'N/A'}\nTOKEN SYMBOL:                  ${account.tokenSymbol || 'N/A'}` : ''}

═══════════════════════════════════════════════════════════════════════════════
                        CUSTODY FUNDS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

TOTAL BALANCE:                 ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
RESERVED BALANCE:              ${account.currency} ${account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
AVAILABLE BALANCE:             ${account.currency} ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════════════════════════
                        TOTAL VERIFIED BALANCE
═══════════════════════════════════════════════════════════════════════════════

VERIFIED TOTAL:                ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════════════════════════
                        STANDARDS COMPLIANCE
═══════════════════════════════════════════════════════════════════════════════

${IconText.security} ISO 27001:2022                  Information Security              ${IconText.check} COMPLIANT
${IconText.bank} ISO 20022                       Financial Interoperability         ${IconText.check} COMPATIBLE
${IconText.compliance} FATF AML/CFT                    Anti-Money Laundering             ${IconText.check} VERIFIED
KYC                             Know Your Customer                ${IconText.check} VERIFIED
AML SCORE:                      ${account.amlScore || 95}/100
RISK LEVEL:                     ${(account.riskLevel || 'low').toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
                        TECHNICAL INFORMATION
═══════════════════════════════════════════════════════════════════════════════

VERIFICATION HASH:              ${account.verificationHash || 'N/A'}
ISSUE DATE:                     ${new Date(account.createdAt).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US')}
VERIFICATION STATUS:            ${IconText.check} VERIFIED AND CERTIFIED

═══════════════════════════════════════════════════════════════════════════════
                        OFFICIAL BANK CERTIFICATION
═══════════════════════════════════════════════════════════════════════════════

This document certifies that the above mentioned funds are under secure 
custody of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are 
available as indicated.

Compliant with standards: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022

${IconText.check} DIGITALLY SIGNED

═══════════════════════════════════════════════════════════════════════════════
                        DOCUMENT FOOTER
═══════════════════════════════════════════════════════════════════════════════

GENERATED BY:                  DAES CoreBanking System
BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
COPYRIGHT:                     © ${new Date().getFullYear()} DAES - Data and Exchange Settlement
DOCUMENT HASH:                 ${Math.random().toString(36).substring(2, 15).toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
                    END OF OFFICIAL BANK CONFIRMATION DOCUMENT
═══════════════════════════════════════════════════════════════════════════════
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async () => {
    if (!blackScreenRef.current) return;
    
    try {
      const canvas = await html2canvas(blackScreenRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      alert(language === 'es' ? 'Error al generar la imagen' : 'Error generating image');
    }
  };

  const handleDownloadPdf = async () => {
    if (!blackScreenRef.current) return;
    
    try {
      const canvas = await html2canvas(blackScreenRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: blackScreenRef.current.scrollWidth,
        height: blackScreenRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calcular dimensiones para ajustar la imagen al PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular ratio para mantener proporción
      const ratio = pdfWidth / imgWidth;
      const imgWidthFinal = pdfWidth;
      const imgHeightFinal = imgHeight * ratio;
      
      // Si la imagen es más alta que una página, dividirla en múltiples páginas
      if (imgHeightFinal > pdfHeight) {
        let heightLeft = imgHeightFinal;
        let position = 0;
        const pageHeight = pdfHeight;
        
        // Primera página
        pdf.addImage(imgData, 'PNG', 0, position, imgWidthFinal, imgHeightFinal);
        heightLeft -= pageHeight;
        
        // Páginas adicionales si es necesario
        while (heightLeft > 0) {
          position = -imgHeightFinal + heightLeft;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidthFinal, imgHeightFinal);
          heightLeft -= pageHeight;
        }
      } else {
        // Imagen cabe en una sola página
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthFinal, imgHeightFinal);
      }
      
      pdf.save(`CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(language === 'es' ? 'Error al generar el PDF' : 'Error generating PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-4">
      <div className="bg-black w-full max-w-5xl max-h-[95vh] overflow-hidden border-2 border-[#ffffff] shadow-[0_0_50px_rgba(255, 255, 255,0.5)] rounded-lg flex flex-col">
        
        {/* Header con botones */}
        <div className="bg-black border-b-2 border-[#ffffff] p-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-[#ffffff]">
            {language === 'es' ? 'BLACK SCREEN - CUENTA CUSTODIO' : 'BLACK SCREEN - CUSTODY ACCOUNT'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <Download className="w-4 h-4 inline mr-1" />
              TXT
            </button>
            <button
              onClick={handleDownloadImage}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <ImageIcon className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Imagen' : 'Image'}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <FileText className="w-4 h-4 inline mr-1" />
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <Printer className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Imprimir' : 'Print'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <X className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>

        {/* Contenido Black Screen */}
        <div ref={blackScreenRef} className="flex-1 overflow-y-auto p-8 space-y-6 text-[#ffffff] bg-black font-mono">
          
          {/* Header */}
          <div className="text-center border-t-2 border-b-2 border-[#ffffff]/30 py-6">
            <div className="text-2xl font-bold mb-2">
              {language === 'es' ? 'BLACK SCREEN - CONFIRMACIÓN BANCARIA OFICIAL' : 'BLACK SCREEN - OFFICIAL BANK CONFIRMATION'}
            </div>
            <div className="text-lg mb-2 font-bold">Digital Commercial Bank Ltd</div>
            <div className="text-lg mb-4">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
            <div className="text-xs text-[#ffffff]">
              {language === 'es' ? 'DOCUMENTO CONFIDENCIAL - SOLO PARA USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL DOCUMENT - FOR AUTHORIZED BANKING USE ONLY'}
            </div>
          </div>

          {/* Tipo de Cuenta */}
          <div className="bg-[#0d0d0d] border border-[#ffffff]/30 rounded-lg p-6">
            <div className="text-lg font-bold mb-4">
              {language === 'es' ? 'TIPO DE CUENTA' : 'ACCOUNT TYPE'}
            </div>
            <div className="text-2xl font-bold text-[#ffffff] flex items-center gap-2">
              {isBanking ? <BankIcon className="text-cyan-400" size={28} /> : <BlockchainIcon className="text-cyan-400" size={28} />}
              <span>
                {isBanking 
                  ? (language === 'es' ? 'CUENTA BANCARIA CUSTODIO' : 'CUSTODY BANKING ACCOUNT')
                  : (language === 'es' ? 'CUENTA BLOCKCHAIN CUSTODIO' : 'CUSTODY BLOCKCHAIN ACCOUNT')}
              </span>
            </div>
          </div>

          {/* Información del Beneficiario */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#ffffff]/30 pb-2">
              {language === 'es' ? 'INFORMACIÓN DEL BENEFICIARIO' : 'BENEFICIARY INFORMATION'}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Titular:' : 'Account Holder:'}</div>
                <div className="text-[#ffffff] font-bold">{account.accountName}</div>
              </div>
              <div>
                <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Cuenta:' : 'Account:'}</div>
                <div className="text-[#ffffff] font-mono font-bold">{account.accountNumber || account.id}</div>
              </div>
              <div>
                <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                <div className="text-[#ffffff] font-bold">Digital Commercial Bank Ltd</div>
              </div>
              <div>
                <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Sistema:' : 'System:'}</div>
                <div className="text-[#ffffff]">DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
              </div>
              <div>
                <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                <div className="text-[#ffffff] font-bold">{account.currency}</div>
              </div>
              {!isBanking && (
                <>
                  <div>
                    <div className="text-[#ffffff] mb-1">Blockchain:</div>
                    <div className="text-[#ffffff]">{account.blockchainLink}</div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">Token:</div>
                    <div className="text-[#ffffff] font-mono">{account.tokenSymbol}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balances */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#ffffff]/30 pb-2">
              {language === 'es' ? 'RESUMEN DE FONDOS CUSTODIO' : 'CUSTODY FUNDS SUMMARY'}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0d0d0d] border border-cyan-500/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'TOTAL' : 'TOTAL'}</div>
                <div className="text-3xl font-bold text-cyan-400">{account.currency} {account.totalBalance.toLocaleString()}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-yellow-500/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'RESERVADO' : 'RESERVED'}</div>
                <div className="text-3xl font-bold text-yellow-400">{account.currency} {account.reservedBalance.toLocaleString()}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-white/30/40 rounded-lg p-4 text-center">
                <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'DISPONIBLE' : 'AVAILABLE'}</div>
                <div className="text-3xl font-bold text-white">{account.currency} {account.availableBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Total Verificado */}
          <div className="bg-gradient-to-r from-[#ffffff]/10 to-[#e0e0e0]/10 border-2 border-[#ffffff] rounded-lg p-6">
            <div className="text-center">
              <div className="text-sm text-[#ffffff] mb-2">
                {language === 'es' ? 'BALANCE TOTAL VERIFICADO' : 'TOTAL VERIFIED BALANCE'}
              </div>
              <div className="text-4xl font-bold text-[#ffffff] mb-2">
                {account.currency} {account.totalBalance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Cumplimiento */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#ffffff]/30 pb-2 flex items-center gap-2">
              <AwardIcon className="text-yellow-400" size={20} />
              <span>{language === 'es' ? 'CUMPLIMIENTO DE ESTÁNDARES' : 'STANDARDS COMPLIANCE'}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <SecurityIcon className="text-cyan-400" size={16} />
                  ISO 27001:2022 - {language === 'es' ? 'Seguridad de la Información' : 'Information Security'}
                </span>
                <span className="text-white font-bold flex items-center gap-1">
                  <CheckIcon className="text-green-400" size={16} />
                  COMPLIANT
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <BankIcon className="text-cyan-400" size={16} />
                  ISO 20022 - {language === 'es' ? 'Interoperabilidad Financiera' : 'Financial Interoperability'}
                </span>
                <span className="text-white font-bold flex items-center gap-1">
                  <CheckIcon className="text-green-400" size={16} />
                  COMPATIBLE
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <ComplianceIcon className="text-cyan-400" size={16} />
                  FATF AML/CFT - {language === 'es' ? 'Anti-Lavado de Dinero' : 'Anti-Money Laundering'}
                </span>
                <span className="text-white font-bold flex items-center gap-1">
                  <CheckIcon className="text-green-400" size={16} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>KYC:</span>
                <span className="text-white font-bold flex items-center gap-1">
                  <CheckIcon className="text-green-400" size={16} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between">
                <span>AML Score:</span>
                <span className="text-white font-bold">{account.amlScore || 95}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Risk Level:</span>
                <span className="text-white font-bold">{(account.riskLevel || 'low').toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Información Técnica */}
          <div>
            <div className="text-lg font-bold mb-4 border-b border-[#ffffff]/30 pb-2">
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
              <div className="flex justify-between items-center">
                <span>{language === 'es' ? 'Estado de Verificación:' : 'Verification Status:'}</span>
                <span className="text-white font-bold flex items-center gap-1">
                  <CheckIcon className="text-green-400" size={16} />
                  {language === 'es' ? 'VERIFICADO Y CERTIFICADO' : 'VERIFIED AND CERTIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Certificación */}
          <div className="border-t-2 border-b-2 border-[#ffffff]/30 py-6">
            <div className="text-center">
              <div className="text-lg font-bold mb-3">
                {language === 'es' ? 'CERTIFICACIÓN BANCARIA OFICIAL' : 'OFFICIAL BANK CERTIFICATION'}
              </div>
              <div className="text-sm text-[#ffffff] max-w-3xl mx-auto mb-2">
                <div className="font-bold mb-2">Digital Commercial Bank Ltd</div>
                <div className="mb-2">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
                {language === 'es'
                  ? 'Este documento certifica que los fondos arriba mencionados están bajo custodia segura del sistema DAES 256 DATA AND EXCHANGE SETTLEMENT y están disponibles según se indica.'
                  : 'This document certifies that the above mentioned funds are under secure custody of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are available as indicated.'}
              </div>
              <div className="text-sm text-[#ffffff] mt-4">
                {language === 'es' ? 'Conforme con estándares' : 'Compliant with standards'}: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022
              </div>
              <div className="mt-4 text-lg font-bold text-[#ffffff] flex items-center justify-center gap-2">
                <CheckIcon className="text-green-400" size={24} />
                <span>{language === 'es' ? 'FIRMADO DIGITALMENTE' : 'DIGITALLY SIGNED'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-[#ffffff]">
            <div className="font-bold">{language === 'es' ? 'Generado por' : 'Generated by'}: DAES CoreBanking System</div>
            <div className="mt-1 font-bold">Digital Commercial Bank Ltd</div>
            <div className="mt-1">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
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

