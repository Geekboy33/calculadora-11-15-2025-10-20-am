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
import { downloadPDF } from '../lib/download-helper';

interface CustodyBlackScreenProps {
  account: any;
  onClose: () => void;
}

export function CustodyBlackScreen({ account, onClose }: CustodyBlackScreenProps) {
  const { language } = useLanguage();
  const blackScreenRef = useRef<HTMLDivElement>(null);

  const isBanking = (account.accountType || 'blockchain') === 'banking';

  const generateTxtContent = () => {
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

    const documentHash = Math.random().toString(36).substring(2, 15).toUpperCase();
    const documentId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const verificationHash = account.verificationHash || '3ad65ff0d75b1962d188...';

    return `
═══════════════════════════════════════════════════════════════════════════════
                    OFFICIAL BANK CONFIRMATION DOCUMENT
                    BLACK SCREEN - CUSTODY ACCOUNT STATEMENT
═══════════════════════════════════════════════════════════════════════════════

BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
DOCUMENT TYPE:                 CUSTODY ACCOUNT CONFIRMATION
DOCUMENT CLASSIFICATION:       ${isSpanish ? 'CONFIDENCIAL - SOLO USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL - AUTHORIZED BANKING USE ONLY'}
GENERATION DATE:               ${formattedDate}
DOCUMENT ID:                   ${documentId}

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

VERIFICATION HASH:              ${verificationHash}
ISSUE DATE:                     ${new Date(account.createdAt || Date.now()).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })}
VERIFICATION STATUS:            ${IconText.check} VERIFIED AND CERTIFIED

═══════════════════════════════════════════════════════════════════════════════
                        OFFICIAL BANK CERTIFICATION
═══════════════════════════════════════════════════════════════════════════════

Digital Commercial Bank Ltd
System DAES 256 DATA AND EXCHANGE SETTLEMENT

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
DOCUMENT HASH:                 ${documentHash}
CoreBanking v1.0.0
ISO 4217 Compliant
PCI-DSS Ready

═══════════════════════════════════════════════════════════════════════════════
                    END OF OFFICIAL BANK CONFIRMATION DOCUMENT
═══════════════════════════════════════════════════════════════════════════════
`;
  };

  const handleDownloadTxt = () => {
    const content = generateTxtContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxtAsPDF = async () => {
    try {
      const content = generateTxtContent();
      const filename = `CustodyAccount_${account.accountNumber || account.id}`;
      await downloadPDF(content, filename);
    } catch (error) {
      console.error('Error generating PDF from TXT:', error);
      alert(language === 'es' ? 'Error al generar el PDF desde TXT' : 'Error generating PDF from TXT');
    }
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
      // Guardar posición de scroll original
      const originalScrollTop = blackScreenRef.current.scrollTop;
      
      // Asegurar que el scroll esté en la parte superior antes de capturar
      blackScreenRef.current.scrollTop = 0;
      
      // Esperar a que el scroll se complete y el contenido se renderice
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Obtener las dimensiones completas del contenido
      const fullWidth = blackScreenRef.current.scrollWidth;
      const fullHeight = blackScreenRef.current.scrollHeight;
      
      const canvas = await html2canvas(blackScreenRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        removeContainer: false
      });
      
      // Restaurar posición de scroll original
      blackScreenRef.current.scrollTop = originalScrollTop;
      
      const imgData = canvas.toDataURL('image/png', 1.0);
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
        
        // Primera página - mostrar desde el inicio (posición 0)
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthFinal, imgHeightFinal);
        heightLeft -= pageHeight;
        
        // Páginas adicionales si es necesario
        while (heightLeft > 0) {
          position = heightLeft - imgHeightFinal;
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
              <Download className="w-4 h-4" />
              TXT
            </button>
            <button
              onClick={handleDownloadTxtAsPDF}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleDownloadImage}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <ImageIcon className="w-4 h-4" />
              {language === 'es' ? 'Imagen' : 'Image'}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              {language === 'es' ? 'PDF Imagen' : 'PDF Image'}
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
          
          {/* Header - Diseño Bancario Profesional */}
          <div className="text-center border-t-4 border-b-4 border-[#ffffff] py-8 bg-gradient-to-b from-[#1a1a1a] to-black">
            <div className="text-3xl font-bold mb-3 tracking-wider text-[#ffffff] uppercase">
              {language === 'es' ? 'BLACK SCREEN - CONFIRMACIÓN BANCARIA OFICIAL' : 'BLACK SCREEN - OFFICIAL BANK CONFIRMATION'}
            </div>
            <div className="text-xl mb-2 font-bold text-[#ffffff]">Digital Commercial Bank Ltd</div>
            <div className="text-lg mb-4 text-[#ffffff] font-semibold">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
            <div className="text-sm text-[#ffffff] font-semibold border-t border-b border-[#ffffff]/30 py-2 mt-4">
              {language === 'es' ? 'DOCUMENTO CONFIDENCIAL - SOLO PARA USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL DOCUMENT - FOR AUTHORIZED BANKING USE ONLY'}
            </div>
          </div>

          {/* Tipo de Cuenta - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-4 border-b border-[#ffffff]/30 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'TIPO DE CUENTA' : 'ACCOUNT TYPE'}
            </div>
            <div className="text-3xl font-bold text-[#ffffff] flex items-center gap-3">
              {isBanking ? <BankIcon className="text-cyan-400" size={32} /> : <BlockchainIcon className="text-cyan-400" size={32} />}
              <span className="tracking-wide">
                {isBanking 
                  ? (language === 'es' ? 'CUENTA BANCARIA CUSTODIO' : 'CUSTODY BANKING ACCOUNT')
                  : (language === 'es' ? 'CUENTA BLOCKCHAIN CUSTODIO' : 'CUSTODY BLOCKCHAIN ACCOUNT')}
              </span>
            </div>
          </div>

          {/* Información del Beneficiario - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'INFORMACIÓN DEL BENEFICIARIO' : 'BENEFICIARY INFORMATION'}
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Titular:' : 'Account Holder:'}</div>
                <div className="text-[#ffffff] font-bold text-base">{account.accountName}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Cuenta:' : 'Account:'}</div>
                <div className="text-[#ffffff] font-mono font-bold text-base">{account.accountNumber || account.id}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                <div className="text-[#ffffff] font-bold text-base">Digital Commercial Bank Ltd</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Sistema:' : 'System:'}</div>
                <div className="text-[#ffffff] text-base">DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                <div className="text-[#ffffff] font-bold text-base">{account.currency}</div>
              </div>
              {!isBanking && (
                <>
                  <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                    <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">Blockchain:</div>
                    <div className="text-[#ffffff] text-base">{account.blockchainLink}</div>
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                    <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">Token:</div>
                    <div className="text-[#ffffff] font-mono text-base">{account.tokenSymbol}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balances - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'RESUMEN DE FONDOS CUSTODIO' : 'CUSTODY FUNDS SUMMARY'}
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-cyan-500/60 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'TOTAL' : 'TOTAL'}</div>
                <div className="text-4xl font-bold text-cyan-400">{account.currency} {account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-yellow-500/60 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'RESERVADO' : 'RESERVED'}</div>
                <div className="text-4xl font-bold text-yellow-400">{account.currency} {account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-white/50 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'DISPONIBLE' : 'AVAILABLE'}</div>
                <div className="text-4xl font-bold text-white">{account.currency} {account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Total Verificado - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-4 border-[#ffffff] rounded-xl p-8 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <div className="text-center">
              <div className="text-base text-[#ffffff]/80 mb-3 uppercase tracking-widest">
                {language === 'es' ? 'BALANCE TOTAL VERIFICADO' : 'TOTAL VERIFIED BALANCE'}
              </div>
              <div className="text-5xl font-bold text-[#ffffff] mb-2 tracking-tight">
                {account.currency} {account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Cumplimiento - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide flex items-center gap-3">
              <AwardIcon className="text-yellow-400" size={24} />
              <span>{language === 'es' ? 'CUMPLIMIENTO DE ESTÁNDARES' : 'STANDARDS COMPLIANCE'}</span>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <SecurityIcon className="text-cyan-400" size={18} />
                  ISO 27001:2022 - {language === 'es' ? 'Seguridad de la Información' : 'Information Security'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  COMPLIANT
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <BankIcon className="text-cyan-400" size={18} />
                  ISO 20022 - {language === 'es' ? 'Interoperabilidad Financiera' : 'Financial Interoperability'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  COMPATIBLE
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <ComplianceIcon className="text-cyan-400" size={18} />
                  FATF AML/CFT - {language === 'es' ? 'Anti-Lavado de Dinero' : 'Anti-Money Laundering'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">KYC:</span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">AML Score:</span>
                <span className="text-white font-bold text-base">{account.amlScore || 95}/100</span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">Risk Level:</span>
                <span className="text-white font-bold text-base">{(account.riskLevel || 'low').toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Información Técnica - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'INFORMACIÓN TÉCNICA' : 'TECHNICAL INFORMATION'}
            </div>
            <div className="space-y-4 text-base">
              <div className="flex justify-between items-start bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Hash de Verificación:' : 'Verification Hash:'}</span>
                <span className="text-purple-400 font-mono text-sm break-all text-right max-w-[70%]">
                  {account.verificationHash || '3ad65ff0d75b1962d188...'}
                </span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Fecha de Emisión:' : 'Issue Date:'}</span>
                <span className="text-white text-base">
                  {new Date(account.createdAt || Date.now()).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Estado de Verificación:' : 'Verification Status:'}</span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  {language === 'es' ? 'VERIFICADO Y CERTIFICADO' : 'VERIFIED AND CERTIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Certificación - Diseño Bancario Profesional */}
          <div className="border-t-4 border-b-4 border-[#ffffff] py-8 bg-gradient-to-b from-[#1a1a1a] to-black">
            <div className="text-center">
              <div className="text-2xl font-bold mb-5 uppercase tracking-wider">
                {language === 'es' ? 'CERTIFICACIÓN BANCARIA OFICIAL' : 'OFFICIAL BANK CERTIFICATION'}
              </div>
              <div className="text-base text-[#ffffff] max-w-3xl mx-auto mb-5">
                <div className="font-bold text-lg mb-3">Digital Commercial Bank Ltd</div>
                <div className="font-semibold text-base mb-4">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
                <div className="text-base leading-relaxed mb-4">
                  {language === 'es'
                    ? 'Este documento certifica que los fondos arriba mencionados están bajo custodia segura del sistema DAES 256 DATA AND EXCHANGE SETTLEMENT y están disponibles según se indica.'
                    : 'This document certifies that the above mentioned funds are under secure custody of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are available as indicated.'}
                </div>
              </div>
              <div className="text-base text-[#ffffff] mt-5 mb-5 font-semibold">
                {language === 'es' ? 'Conforme con estándares' : 'Compliant with standards'}: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022
              </div>
              <div className="mt-6 text-xl font-bold text-[#ffffff] flex items-center justify-center gap-3">
                <CheckIcon className="text-green-400" size={28} />
                <span className="uppercase tracking-wide">{language === 'es' ? 'FIRMADO DIGITALMENTE' : 'DIGITALLY SIGNED'}</span>
              </div>
            </div>
          </div>

          {/* Footer - Diseño Bancario Profesional */}
          <div className="text-center text-sm text-[#ffffff] border-t-2 border-[#ffffff]/40 pt-6 bg-gradient-to-b from-black to-[#0a0a0a]">
            <div className="font-bold mb-3 text-base">{language === 'es' ? 'Generado por' : 'Generated by'}: DAES CoreBanking System</div>
            <div className="font-bold mb-2 text-base">Digital Commercial Bank Ltd</div>
            <div className="mb-2 text-base">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
            <div className="mb-4 text-base">© {new Date().getFullYear()} DAES - Data and Exchange Settlement</div>
            <div className="mt-4 text-xs space-y-2">
              <div className="font-semibold">
                {language === 'es' ? 'Hash del Documento' : 'Document Hash'}: {Math.random().toString(36).substring(2, 15).toUpperCase()}
              </div>
              <div className="mt-3 text-[#ffffff]/90 font-semibold">
                CoreBanking v1.0.0
              </div>
              <div className="text-[#ffffff]/90 font-semibold">
                ISO 4217 Compliant
              </div>
              <div className="text-[#ffffff]/90 font-semibold">
                PCI-DSS Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

